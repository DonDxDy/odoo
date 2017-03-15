# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

""" Models registries.

"""
from collections import Mapping, defaultdict, deque
from contextlib import closing
from functools import partial
from operator import attrgetter
import itertools
import logging
import os
import sys
import threading
import time

import odoo
from .. import api, SUPERUSER_ID
from odoo.tools import (assertion_report, lazy_classproperty, config,
                        convert_file, ustr, load_language,
                        lazy_property, table_exists, topological_sort, OrderedSet)
from odoo.tools.lru import LRU

from . import migration
from .module import (initialize_sys_path, runs_post_install, run_unit_tests,
                     load_openerp_module, adapt_version)

_logger = logging.getLogger(__name__)
_test_logger = logging.getLogger('odoo.tests')


class Registry(Mapping):
    """ Model registry for a particular database.

    The registry is essentially a mapping between model names and model classes.
    There is one registry instance per database.

    """
    _lock = threading.RLock()
    _saved_lock = None

    @lazy_classproperty
    def registries(cls):
        """ A mapping from database names to registries. """
        size = config.get('registry_lru_size', None)
        if not size:
            # Size the LRU depending of the memory limits
            if os.name != 'posix':
                # cannot specify the memory limit soft on windows...
                size = 42
            else:
                # A registry takes 10MB of memory on average, so we reserve
                # 10Mb (registry) + 5Mb (working memory) per registry
                avgsz = 15 * 1024 * 1024
                size = int(config['limit_memory_soft'] / avgsz)
        return LRU(size)

    def __new__(cls, db_name):
        """ Return the registry for the given database name."""
        with cls._lock:
            try:
                return cls.registries[db_name]
            except KeyError:
                return cls.new(db_name)
            finally:
                # set db tracker - cleaned up at the WSGI dispatching phase in
                # odoo.service.wsgi_server.application
                threading.current_thread().dbname = db_name

    @classmethod
    def new(cls, db_name, force_demo=False, status=None, update_module=False):
        """ Create and return a new registry for the given database name. """
        with cls._lock:
            with odoo.api.Environment.manage():
                registry = object.__new__(cls)
                registry.init(db_name)

                # Initializing a registry will call general code which will in
                # turn call Registry() to obtain the registry being initialized.
                # Make it available in the registries dictionary then remove it
                # if an exception is raised.
                cls.delete(db_name)
                cls.registries[db_name] = registry
                try:
                    registry.setup_signaling()
                    registry.load_modules(force_demo, status, update_module)
                except Exception:
                    _logger.exception('Failed to load registry')
                    del cls.registries[db_name]
                    raise

                # load_modules() above can replace the registry by calling
                # indirectly new() again (when modules have to be uninstalled).
                # Yeah, crazy.
                init_parent = registry._init_parent
                registry = cls.registries[db_name]
                registry._init_parent.update(init_parent)

                with closing(registry.cursor()) as cr:
                    registry.do_parent_store(cr)
                    cr.commit()

        registry.ready = True

        if update_module:
            # only in case of update, otherwise we'll have an infinite reload loop!
            registry.signal_registry_change()
        return registry

    def init(self, db_name):
        self.models = {}    # model name/model instance mapping
        self._sql_error = {}
        self._init = True
        self._init_parent = {}
        self._assertion_report = assertion_report.assertion_report()
        self._fields_by_model = None
        self._post_init_queue = deque()

        # modules fully loaded (maintained during init phase by `loading` module)
        self._init_modules = set()
        self.updated_modules = []       # installed/updated modules

        self.db_name = db_name
        self._db = odoo.sql_db.db_connect(db_name)

        # special cursor for test mode; None means "normal" mode
        self.test_cr = None

        # Indicates that the registry is
        self.ready = False

        # Inter-process signaling (used only when odoo.multi_process is True):
        # The `base_registry_signaling` sequence indicates the whole registry
        # must be reloaded.
        # The `base_cache_signaling sequence` indicates all caches must be
        # invalidated (i.e. cleared).
        self.registry_sequence = None
        self.cache_sequence = None

        self.cache = LRU(8192)
        # Flag indicating if at least one model cache has been cleared.
        # Useful only in a multi-process context.
        self.cache_cleared = False

        with closing(self.cursor()) as cr:
            has_unaccent = odoo.modules.db.has_unaccent(cr)
            if odoo.tools.config['unaccent'] and not has_unaccent:
                _logger.warning("The option --unaccent was given but no unaccent() function was found in database.")
            self.has_unaccent = odoo.tools.config['unaccent'] and has_unaccent

    @classmethod
    def delete(cls, db_name):
        """ Delete the registry linked to a given database. """
        with cls._lock:
            if db_name in cls.registries:
                cls.registries[db_name].clear_caches()
                del cls.registries[db_name]

    @classmethod
    def delete_all(cls):
        """ Delete all the registries. """
        with cls._lock:
            for db_name in cls.registries.keys():
                cls.delete(db_name)

    #
    # Mapping abstract methods implementation
    # => mixin provides methods keys, items, values, get, __eq__, and __ne__
    #
    def __len__(self):
        """ Return the size of the registry. """
        return len(self.models)

    def __iter__(self):
        """ Return an iterator over all model names. """
        return iter(self.models)

    def __getitem__(self, model_name):
        """ Return the model with the given name or raise KeyError if it doesn't exist."""
        return self.models[model_name]

    def __call__(self, model_name):
        """ Same as ``self[model_name]``. """
        return self.models[model_name]

    def __setitem__(self, model_name, model):
        """ Add or replace a model in the registry."""
        self.models[model_name] = model

    @lazy_classproperty
    def model_cache(cls):
        """ A cache for model classes, indexed by their base classes. """
        # we cache 256 classes per registry on average
        return LRU(cls.registries.count * 256)

    @lazy_property
    def field_sequence(self):
        """ Return a function mapping a field to an integer. The value of a
            field is guaranteed to be strictly greater than the value of the
            field's dependencies.
        """
        # map fields on their dependents
        dependents = {
            field: set(dep for dep, _ in model._field_triggers[field] if dep != field)
            for model in self.itervalues()
            for field in model._fields.itervalues()
        }
        # sort them topologically, and associate a sequence number to each field
        mapping = {
            field: num
            for num, field in enumerate(reversed(topological_sort(dependents)))
        }
        return mapping.get

    def clear_manual_fields(self):
        """ Invalidate the cache for manual fields. """
        self._fields_by_model = None

    def get_manual_fields(self, cr, model_name):
        """ Return the manual fields (as a dict) for the given model. """
        if self._fields_by_model is None:
            # Query manual fields for all models at once
            self._fields_by_model = dic = defaultdict(dict)
            cr.execute('SELECT * FROM ir_model_fields WHERE state=%s', ('manual',))
            for field in cr.dictfetchall():
                dic[field['model']][field['name']] = field
        return self._fields_by_model[model_name]

    def do_parent_store(self, cr):
        env = odoo.api.Environment(cr, SUPERUSER_ID, {})
        for model_name in self._init_parent:
            if model_name in env:
                env[model_name]._parent_store_compute()
        self._init = False

    def descendants(self, model_names, *kinds):
        """ Return the models corresponding to ``model_names`` and all those
        that inherit/inherits from them.
        """
        assert all(kind in ('_inherit', '_inherits') for kind in kinds)
        funcs = [attrgetter(kind + '_children') for kind in kinds]

        models = OrderedSet()
        queue = deque(model_names)
        while queue:
            model = self[queue.popleft()]
            models.add(model._name)
            for func in funcs:
                queue.extend(func(model))
        return models

    def load(self, cr, module):
        """ Load a given module in the registry, and return the names of the
        modified models.

        At the Python level, the modules are already loaded, but not yet on a
        per-registry level. This method populates a registry with the given
        modules, i.e. it instanciates all the classes of a the given module
        and registers them in the registry.

        """
        from .. import models

        lazy_property.reset_all(self)

        # Instantiate registered classes (via the MetaModel automatic discovery
        # or via explicit constructor call), and add them to the pool.
        model_names = []
        for cls in models.MetaModel.module_to_models.get(module.name, []):
            # models register themselves in self.models
            model = cls._build_model(self, cr)
            model_names.append(model._name)

        return self.descendants(model_names, '_inherit')

    def setup_models(self, cr, partial=False):
        """ Complete the setup of models.
            This must be called after loading modules and before using the ORM.

            :param partial: ``True`` if all models have not been loaded yet.
        """
        lazy_property.reset_all(self)
        env = odoo.api.Environment(cr, SUPERUSER_ID, {})

        # load custom models (except when loading 'base')
        if self._init_modules:
            ir_model = env['ir.model']
            cr.execute('SELECT * FROM ir_model WHERE state=%s', ('manual',))
            for model_data in cr.dictfetchall():
                model_class = ir_model._instanciate(model_data)
                model_class._build_model(self, cr)

        # prepare the setup on all models
        models = env.values()
        for model in models:
            model._prepare_setup()

        # do the actual setup from a clean state
        self._m2m = {}
        for model in models:
            model._setup_base(partial)

        for model in models:
            model._setup_fields(partial)

        for model in models:
            model._setup_complete()

    def post_init(self, func, *args, **kwargs):
        """ Register a function to call at the end of :meth:`~.init_models`. """
        self._post_init_queue.append(partial(func, *args, **kwargs))

    def init_models(self, cr, model_names, context):
        """ Initialize a list of models (given by their name). Call methods
            ``_auto_init`` and ``init`` on each model to create or update the
            database tables supporting the models.

            The ``context`` may contain the following items:
             - ``module``: the name of the module being installed/updated, if any;
             - ``update_custom_fields``: whether custom fields should be updated.
        """
        if 'module' in context:
            _logger.info('module %s: creating or updating database tables', context['module'])

        env = odoo.api.Environment(cr, SUPERUSER_ID, context)
        models = [env[model_name] for model_name in model_names]

        for model in models:
            model._auto_init()
            model.init()

        while self._post_init_queue:
            func = self._post_init_queue.popleft()
            func()

        if models:
            models[0].recompute()
        cr.commit()

        # make sure all tables are present
        missing = [name
                   for name, model in env.items()
                   if not model._abstract and not table_exists(cr, model._table)]
        if missing:
            _logger.warning("Models have no table: %s.", ", ".join(missing))
            # recreate missing tables following model dependencies
            deps = {name: model._depends for name, model in env.items()}
            for name in topological_sort(deps):
                if name in missing:
                    _logger.info("Recreate table of model %s.", name)
                    env[name].init()
            cr.commit()
            # check again, and log errors if tables are still missing
            for name, model in env.items():
                if not model._abstract and not table_exists(cr, model._table):
                    _logger.error("Model %s has no table.", name)

    def clear_caches(self):
        """ Clear the caches associated to methods decorated with
        ``tools.ormcache`` or ``tools.ormcache_multi`` for all the models.
        """
        self.cache.clear()
        for model in self.models.itervalues():
            model.clear_caches()

    def setup_signaling(self):
        """ Setup the inter-process signaling on this registry. """
        if not odoo.multi_process:
            return

        with self.cursor() as cr:
            # The `base_registry_signaling` sequence indicates when the registry
            # must be reloaded.
            # The `base_cache_signaling` sequence indicates when all caches must
            # be invalidated (i.e. cleared).
            cr.execute("SELECT sequence_name FROM information_schema.sequences WHERE sequence_name='base_registry_signaling'")
            if not cr.fetchall():
                cr.execute("CREATE SEQUENCE base_registry_signaling INCREMENT BY 1 START WITH 1")
                cr.execute("SELECT nextval('base_registry_signaling')")
                cr.execute("CREATE SEQUENCE base_cache_signaling INCREMENT BY 1 START WITH 1")
                cr.execute("SELECT nextval('base_cache_signaling')")

            cr.execute(""" SELECT base_registry_signaling.last_value,
                                  base_cache_signaling.last_value
                           FROM base_registry_signaling, base_cache_signaling""")
            self.registry_sequence, self.cache_sequence = cr.fetchone()
            _logger.debug("Multiprocess load registry signaling: [Registry: %s] [Cache: %s]",
                          self.registry_sequence, self.cache_sequence)

    def check_signaling(self):
        """ Check whether the registry has changed, and performs all necessary
        operations to update the registry. Return an up-to-date registry.
        """
        if not odoo.multi_process:
            return self

        with closing(self.cursor()) as cr:
            cr.execute(""" SELECT base_registry_signaling.last_value,
                                  base_cache_signaling.last_value
                           FROM base_registry_signaling, base_cache_signaling""")
            r, c = cr.fetchone()
            _logger.debug("Multiprocess signaling check: [Registry - %s -> %s] [Cache - %s -> %s]",
                          self.registry_sequence, r, self.cache_sequence, c)
            # Check if the model registry must be reloaded
            if self.registry_sequence != r:
                _logger.info("Reloading the model registry after database signaling.")
                self = Registry.new(self.db_name)
            # Check if the model caches must be invalidated.
            elif self.cache_sequence != c:
                _logger.info("Invalidating all model caches after database signaling.")
                self.clear_caches()
                self.cache_cleared = False
            self.registry_sequence = r
            self.cache_sequence = c

        return self

    def signal_registry_change(self):
        """ Notifies other processes that the registry has changed. """
        if odoo.multi_process:
            _logger.info("Registry changed, signaling through the database")
            with closing(self.cursor()) as cr:
                cr.execute("select nextval('base_registry_signaling')")
                self.registry_sequence = cr.fetchone()[0]

    def signal_caches_change(self):
        """ Notifies other processes if caches have been invalidated. """
        if odoo.multi_process and self.cache_cleared:
            # signal it through the database to other processes
            _logger.info("At least one model cache has been invalidated, signaling through the database.")
            with closing(self.cursor()) as cr:
                cr.execute("select nextval('base_cache_signaling')")
                self.cache_sequence = cr.fetchone()[0]
                self.cache_cleared = False

    def in_test_mode(self):
        """ Test whether the registry is in 'test' mode. """
        return self.test_cr is not None

    def enter_test_mode(self):
        """ Enter the 'test' mode, where one cursor serves several requests. """
        assert self.test_cr is None
        self.test_cr = self._db.test_cursor()
        assert Registry._saved_lock is None
        Registry._saved_lock = Registry._lock
        Registry._lock = DummyRLock()

    def leave_test_mode(self):
        """ Leave the test mode. """
        assert self.test_cr is not None
        self.clear_caches()
        self.test_cr.force_close()
        self.test_cr = None
        assert Registry._saved_lock is not None
        Registry._lock = Registry._saved_lock
        Registry._saved_lock = None

    def cursor(self):
        """ Return a new cursor for the database. The cursor itself may be used
            as a context manager to commit/rollback and close automatically.
        """
        cr = self.test_cr
        if cr is not None:
            # While in test mode, we use one special cursor across requests. The
            # test cursor uses a reentrant lock to serialize accesses. The lock
            # is granted here by cursor(), and automatically released by the
            # cursor itself in its method close().
            cr.acquire()
            return cr
        return self._db.cursor()

    def load_modules(self, force_demo=False, status=None, update_module=False):
        initialize_sys_path()

        force = []
        if force_demo:
            force.append('demo')

        with self.cursor() as cr:
            if not odoo.modules.db.is_initialized(cr):
                _logger.info("init db")
                odoo.modules.db.initialize(cr)
                update_module = True    # process auto-installed modules
                config["init"]["all"] = 1
                config['update']['all'] = 1
                if not config['without_demo']:
                    config["demo"]['all'] = 1

            env = api.Environment(cr, SUPERUSER_ID, {})

            if 'base' in config['update'] or 'all' in config['update']:
                cr.execute("update ir_module_module set state=%s where name=%s and state=%s", ('to upgrade', 'base', 'installed'))

            # STEP 1: LOAD BASE (must be done before module dependencies can be computed for later steps)
            graph = odoo.modules.graph.Graph()
            graph.add_module(cr, 'base', force)
            if not graph:
                _logger.critical('module base cannot be loaded! (hint: verify addons-path)')
                raise ImportError('Module `base` cannot be loaded! (hint: verify addons-path)')

            # processed_modules: for cleanup step after install
            # loaded_modules: to avoid double loading
            loaded_modules, processed_modules = self.load_module_graph(
                cr, graph, perform_checks=update_module, report=self._assertion_report)

            load_lang = config.pop('load_language')
            if load_lang or update_module:
                # some base models are used below, so make sure they are set up
                self.setup_models(cr, partial=True)

            if load_lang:
                for lang in load_lang.split(','):
                    load_language(cr, lang)

            # STEP 2: Mark other modules to be loaded/updated
            if update_module:
                Module = env['ir.module.module']
                if ('base' in config['init']) or ('base' in config['update']):
                    _logger.info('updating modules list')
                    Module.update_list()

                self._check_module_names(cr, itertools.chain(config['init'].keys(), config['update'].keys()))

                module_names = [k for k, v in config['init'].items() if v]
                if module_names:
                    modules = Module.search([('state', '=', 'uninstalled'), ('name', 'in', module_names)])
                    if modules:
                        modules.button_install()

                module_names = [k for k, v in config['update'].items() if v]
                if module_names:
                    modules = Module.search([('state', '=', 'installed'), ('name', 'in', module_names)])
                    if modules:
                        modules.button_upgrade()

                cr.execute("update ir_module_module set state=%s where name=%s", ('installed', 'base'))
                Module.invalidate_cache(['state'])

            # STEP 3: Load marked modules (skipping base which was done in STEP 1)
            # IMPORTANT: this is done in two parts, first loading all installed or
            #            partially installed modules (i.e. installed/to upgrade), to
            #            offer a consistent system to the second part: installing
            #            newly selected modules.
            #            We include the modules 'to remove' in the first step, because
            #            they are part of the "currently installed" modules. They will
            #            be dropped in STEP 6 later, before restarting the loading
            #            process.
            # IMPORTANT 2: We have to loop here until all relevant modules have been
            #              processed, because in some rare cases the dependencies have
            #              changed, and modules that depend on an uninstalled module
            #              will not be processed on the first pass.
            #              It's especially useful for migrations.
            previously_processed = -1
            while previously_processed < len(processed_modules):
                previously_processed = len(processed_modules)
                processed_modules += self.load_marked_modules(
                    cr, graph, ['installed', 'to upgrade', 'to remove'],
                    force, self._assertion_report, loaded_modules, update_module)
                if update_module:
                    processed_modules += self.load_marked_modules(
                        cr, graph, ['to install'], force, self._assertion_report,
                        loaded_modules, update_module)

            self.setup_models(cr)

            # STEP 3.5: execute migration end-scripts
            migrations = migration.MigrationManager(cr, graph)
            for package in graph:
                migrations.migrate_module(package, 'end')

            # STEP 4: Finish and cleanup installations
            if processed_modules:
                cr.execute("""select model,name from ir_model where id NOT IN (select distinct model_id from ir_model_access)""")
                for (model, name) in cr.fetchall():
                    m = self.get(model)
                    if m and not m._abstract and not m._transient:
                        _logger.warning('The model %s has no access rules, consider adding one. E.g. access_%s,access_%s,model_%s,,1,0,0,0',
                                        model, model.replace('.', '_'), model.replace('.', '_'), model.replace('.', '_'))

                # Temporary warning while we remove access rights on osv_memory objects, as they have
                # been replaced by owner-only access rights
                cr.execute("""select distinct mod.model, mod.name from ir_model_access acc, ir_model mod where acc.model_id = mod.id""")
                for (model, name) in cr.fetchall():
                    if model in self and self[model]._transient:
                        _logger.warning('The transient model %s (%s) should not have explicit access rules!', model, name)

                cr.execute("SELECT model from ir_model")
                for (model,) in cr.fetchall():
                    if model in self:
                        env[model]._check_removed_columns(log=True)
                    elif _logger.isEnabledFor(logging.INFO):    # more an info that a warning...
                        _logger.warning("Model %s is declared but cannot be loaded! (Perhaps a module was partially removed or renamed)", model)

                # Cleanup orphan records
                env['ir.model.data']._process_end(processed_modules)

            for kind in ('init', 'demo', 'update'):
                config[kind] = {}

            cr.commit()

            # STEP 5: Uninstall modules to remove
            if update_module:
                # Remove records referenced from ir_model_data for modules to be
                # removed (and removed the references from ir_model_data).
                cr.execute("SELECT name, id FROM ir_module_module WHERE state=%s", ('to remove',))
                modules_to_remove = dict(cr.fetchall())
                if modules_to_remove:
                    pkgs = reversed([p for p in graph if p.name in modules_to_remove])
                    for pkg in pkgs:
                        uninstall_hook = pkg.info.get('uninstall_hook')
                        if uninstall_hook:
                            py_module = sys.modules['odoo.addons.%s' % (pkg.name,)]
                            getattr(py_module, uninstall_hook)(cr, self)

                    Module = env['ir.module.module']
                    Module.browse(modules_to_remove.values()).module_uninstall()
                    # Recursive reload, should only happen once, because there should be no
                    # modules to remove next time
                    cr.commit()
                    _logger.info('Reloading registry once more after uninstalling modules')
                    api.Environment.reset()
                    return odoo.modules.registry.Registry.new(cr.dbname, force_demo, status, update_module)

            # STEP 6: verify custom views on every model
            if update_module:
                View = env['ir.ui.view']
                for model in self:
                    try:
                        View._validate_custom_views(model)
                    except Exception as e:
                        _logger.warning('invalid custom view(s) for model %s: %s', model, ustr(e))

            if self._assertion_report.failures:
                _logger.error('At least one test failed when loading the modules.')
            else:
                _logger.info('Modules loaded.')

            # STEP 8: call _register_hook on every model
            for model in env.values():
                model._register_hook()

            # STEP 9: save installed/updated modules for post-install tests
            self.updated_modules += processed_modules
            cr.commit()

    def load_marked_modules(self, cr, graph, states, force, report, loaded_modules, perform_checks):
        """Loads modules marked with ``states``, adding them to ``graph`` and
           ``loaded_modules`` and returns a list of installed/upgraded modules."""
        processed_modules = []
        while True:
            cr.execute("SELECT name from ir_module_module WHERE state IN %s", (tuple(states),))
            module_list = [name for (name,) in cr.fetchall() if name not in graph]
            if not module_list:
                break
            graph.add_modules(cr, module_list, force)
            _logger.debug('Updating graph with %d more modules', len(module_list))
            loaded, processed = self.load_module_graph(cr, graph, report=report, skip_modules=loaded_modules, perform_checks=perform_checks)
            processed_modules.extend(processed)
            loaded_modules.extend(loaded)
            if not processed:
                break
        return processed_modules

    def load_module_graph(self, cr, graph, perform_checks=True, skip_modules=None, report=None):
        """Migrates+Updates or Installs all module nodes from ``graph``
           :param graph: graph of module nodes to load
           :param status: deprecated parameter, unused, left to avoid changing signature in 8.0
           :param perform_checks: whether module descriptors should be checked for validity (prints warnings
                                  for same cases)
           :param skip_modules: optional list of module names (packages) which have previously been loaded and can be skipped
           :return: list of modules that were installed or updated
        """
        def load_test(module_name, idref, mode):
            cr.commit()
            try:
                _load_data(cr, module_name, idref, mode, 'test')
                return True
            except Exception:
                _test_logger.exception(
                    'module %s: an exception occurred in a test', module_name)
                return False
            finally:
                cr.rollback()
                # avoid keeping stale xml_id, etc. in cache
                self.clear_caches()

        def _get_files_of_kind(kind):
            if kind == 'demo':
                kind = ['demo_xml', 'demo']
            elif kind == 'data':
                kind = ['init_xml', 'update_xml', 'data']
            if isinstance(kind, str):
                kind = [kind]
            files = []
            for k in kind:
                for f in package.data[k]:
                    files.append(f)
                    if k.endswith('_xml') and not (k == 'init_xml' and not f.endswith('.xml')):
                        # init_xml, update_xml and demo_xml are deprecated except
                        # for the case of init_xml with yaml, csv and sql files as
                        # we can't specify noupdate for those file.
                        correct_key = 'demo' if k.count('demo') else 'data'
                        _logger.warning(
                            "module %s: key '%s' is deprecated in favor of '%s' for file '%s'.",
                            package.name, k, correct_key, f
                        )
            return files

        def _load_data(cr, module_name, idref, mode, kind):
            """

            kind: data, demo, test, init_xml, update_xml, demo_xml.

            noupdate is False, unless it is demo data or it is csv data in
            init mode.

            """
            try:
                if kind in ('demo', 'test'):
                    threading.currentThread().testing = True
                for filename in _get_files_of_kind(kind):
                    _logger.info("loading %s/%s", module_name, filename)
                    noupdate = False
                    if kind in ('demo', 'demo_xml') or (filename.endswith('.csv') and kind in ('init', 'init_xml')):
                        noupdate = True
                    convert_file(cr, module_name, filename, idref, mode, noupdate, kind, report)
            finally:
                if kind in ('demo', 'test'):
                    threading.currentThread().testing = False

        processed_modules = []
        loaded_modules = []
        migrations = migration.MigrationManager(cr, graph)
        module_count = len(graph)
        _logger.info('loading %d modules...', module_count)

        self.clear_manual_fields()

        # register, instantiate and initialize models for each modules
        t0 = time.time()
        t0_sql = odoo.sql_db.sql_counter

        for index, package in enumerate(graph, 1):
            module_name = package.name
            module_id = package.id

            if skip_modules and module_name in skip_modules:
                continue

            _logger.debug('loading module %s (%d/%d)', module_name, index, module_count)
            migrations.migrate_module(package, 'pre')
            load_openerp_module(package.name)

            new_install = package.state == 'to install'
            if new_install:
                py_module = sys.modules['odoo.addons.%s' % (module_name,)]
                pre_init = package.info.get('pre_init_hook')
                if pre_init:
                    getattr(py_module, pre_init)(cr)

            model_names = self.load(cr, package)

            loaded_modules.append(package.name)
            if hasattr(package, 'init') or hasattr(package, 'update') or package.state in ('to install', 'to upgrade'):
                self.setup_models(cr, partial=True)
                self.init_models(cr, model_names, {'module': package.name})

            idref = {}

            mode = 'update'
            if hasattr(package, 'init') or package.state == 'to install':
                mode = 'init'

            if hasattr(package, 'init') or hasattr(package, 'update') or package.state in ('to install', 'to upgrade'):
                env = api.Environment(cr, SUPERUSER_ID, {})
                # Can't put this line out of the loop: ir.module.module will be
                # registered by init_models() above.
                module = env['ir.module.module'].browse(module_id)

                if perform_checks:
                    module.check()

                if package.state == 'to upgrade':
                    # upgrading the module information
                    module.write(module.get_values_from_terp(package.data))
                _load_data(cr, module_name, idref, mode, kind='data')
                has_demo = hasattr(package, 'demo') or (package.dbdemo and package.state != 'installed')
                if has_demo:
                    _load_data(cr, module_name, idref, mode, kind='demo')
                    cr.execute('update ir_module_module set demo=%s where id=%s', (True, module_id))
                    module.invalidate_cache(['demo'])

                migrations.migrate_module(package, 'post')

                # Update translations for all installed languages
                overwrite = odoo.tools.config["overwrite_existing_translations"]
                module.with_context(overwrite=overwrite).update_translations()

                self._init_modules.add(package.name)

                if new_install:
                    post_init = package.info.get('post_init_hook')
                    if post_init:
                        getattr(py_module, post_init)(cr, self)

                # validate all the views at a whole
                env['ir.ui.view']._validate_module_views(module_name)

                if has_demo:
                    # launch tests only in demo mode, allowing tests to use demo data.
                    if config.options['test_enable']:
                        # Yamel test
                        report.record_result(load_test(module_name, idref, mode))
                        # Python tests
                        env['ir.http']._clear_routing_map()     # force routing map to be rebuilt
                        report.record_result(run_unit_tests(module_name, cr.dbname))

                processed_modules.append(package.name)

                ver = adapt_version(package.data['version'])
                # Set new modules and dependencies
                module.write({'state': 'installed', 'latest_version': ver})

                package.load_state = package.state
                package.load_version = package.installed_version
                package.state = 'installed'
                for kind in ('init', 'demo', 'update'):
                    if hasattr(package, kind):
                        delattr(package, kind)

            self._init_modules.add(package.name)
            cr.commit()

        _logger.log(25, "%s modules loaded in %.2fs, %s queries", len(graph), time.time() - t0, odoo.sql_db.sql_counter - t0_sql)

        self.clear_manual_fields()

        cr.commit()

        return loaded_modules, processed_modules

    def _check_module_names(self, cr, module_names):
        mod_names = set(module_names)
        # ignore dummy 'all' module
        if 'base' in mod_names and 'all' in mod_names:
            mod_names.remove('all')
        if mod_names:
            cr.execute("SELECT count(id) AS count FROM ir_module_module WHERE name in %s", (tuple(mod_names),))
            if cr.dictfetchone()['count'] != len(mod_names):
                # find out what module name(s) are incorrect:
                cr.execute("SELECT name FROM ir_module_module")
                incorrect_names = mod_names.difference([x['name'] for x in cr.dictfetchall()])
                _logger.warning('invalid module names, ignored: %s', ", ".join(incorrect_names))


class DummyRLock(object):
    """ Dummy reentrant lock, to be used while running rpc and js tests """
    def acquire(self):
        pass
    def release(self):
        pass
    def __enter__(self):
        self.acquire()
    def __exit__(self, type, value, traceback):
        self.release()


class RegistryManager(object):
    """ Model registries manager.

    This is deprecated, use :class:`Registry` instead.

    """
    @classmethod
    def get(cls, db_name, force_demo=False, status=None, update_module=False):
        return Registry(db_name)

    @classmethod
    def new(cls, db_name, force_demo=False, status=None, update_module=False):
        return Registry.new(db_name, force_demo, status, update_module)

    @classmethod
    def delete(cls, db_name):
        return Registry.delete(db_name)

    @classmethod
    def delete_all(cls):
        return Registry.delete_all()

    @classmethod
    def clear_caches(cls, db_name):
        return Registry(db_name).clear_caches()

    @classmethod
    def check_registry_signaling(cls, db_name):
        registry = Registry(db_name)
        return registry != registry.check_signaling()

    @classmethod
    def signal_caches_change(cls, db_name):
        return Registry(db_name).signal_caches_change()

    @classmethod
    def signal_registry_change(cls, db_name):
        return Registry(db_name).signal_registry_change()
