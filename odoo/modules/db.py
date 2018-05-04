# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

import odoo.modules
import logging

_logger = logging.getLogger(__name__)

def is_initialized(cr):
    """ Check if a database has been initialized for the ORM.

    The database can be initialized with the 'initialize' function below.

    """
    return odoo.tools.table_exists(cr, 'ir_module_module')

def initialize(cr):
    """ Initialize a database with for the ORM.

    This executes base/data/base_data.sql, creates the ir_module_categories
    (taken from each module descriptor file), and creates the ir_module_module
    and ir_model_data entries.

    """
    f = odoo.modules.get_module_resource('base', 'data', 'base_data.sql')
    if not f:
        m = "File not found: 'base.sql' (provided by module 'base')."
        _logger.critical(m)
        raise IOError(m)
    base_sql_file = odoo.tools.misc.file_open(f)
    try:
        cr.execute(base_sql_file.read())
        cr.commit()
    finally:
        base_sql_file.close()

    for i in odoo.modules.get_modules():
        mod_path = odoo.modules.get_module_path(i)
        if not mod_path:
            continue

        # This will raise an exception if no/unreadable descriptor file.
        info = odoo.modules.load_information_from_description_file(i)

        if not info:
            continue
        categories = info['category'].split('/')
        category_id = create_categories(cr, categories)

        if info['installable']:
            state = 'uninstalled'
        else:
            state = 'uninstallable'

        cr.execute('INSERT INTO ir_module_module \
                (author, website, name, shortdesc, description, \
                    category_id, auto_install, state, web, license, application, icon, sequence, summary) \
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id', (
            info['author'],
            info['website'], i, info['name'],
            info['description'], category_id,
            info['auto_install'], state,
            info['web'],
            info['license'],
            info['application'], info['icon'],
            info['sequence'], info['summary']))
        id = cr.fetchone()[0]
        cr.execute('INSERT INTO ir_model_data \
            (name,model,module, res_id, noupdate) VALUES (%s,%s,%s,%s,%s)', (
                'module_'+i, 'ir.module.module', 'base', id, True))
        dependencies = info['depends']
        for d in dependencies:
            cr.execute('INSERT INTO ir_module_module_dependency \
                    (module_id,name) VALUES (%s, %s)', (id, d))

    cr.commit()

    return expand_install(cr, ())

def expand_install(cr, installing):
    """ From a number of selected modules, select both missing dependencies
    and auto_install modules
    """
    cr.execute("""
SELECT m.name, m.state, every(m.auto_install), 
       array_remove(array_agg(d.name), NULL)
FROM ir_module_module m
LEFT JOIN ir_module_module_dependency d ON (m.id = d.module_id)
GROUP BY m.name, m.state
""")
    rows = cr.fetchall()
    installable = {name for name, st, *_ in rows if st not in ('installed', 'uninstallable')}
    dependencies = {
        name: set(deps) & installable
        for name, *_, deps in rows
        if name in installable
    }
    autos = {
        name: set(deps) & installable
        for name, _, auto, deps in rows
        if auto
        if name in installable
    }

    to_install = set()
    to_check = list(installing)

    # first add dependencies of explicitly selected modules
    while to_check:
        m = to_check.pop()
        # already selected or already installed
        if m in to_install or m not in dependencies:
            continue

        to_install.add(m)
        to_check.extend(dependencies.get(m, ()))

    # then add auto_installs
    count = -1
    while count < len(to_install):
        count = len(to_install)
        for name, deps in autos.items():
            if name not in to_install and deps <= to_install:
                to_install.add(name)

    return to_install

def expand_dependents(cr, modules):
    cr.execute("""
SELECT imd.name, array_agg(m.name)
FROM ir_module_module_dependency imd
JOIN ir_module_module m ON (imd.module_id = m.id)
WHERE m.state not in ('uninstalled', 'uninstallable')
GROUP BY imd.name
    """)

    dependents = {n: set(d) for n, d in cr.fetchall()}

    mods = set()
    to_check = list(modules)

    while to_check:
        m = to_check.pop()
        if m in mods:
            continue

        mods.add(m)
        to_check.extend(dependents.get(m, ()))
    return mods

def create_categories(cr, categories):
    """ Create the ir_module_category entries for some categories.

    categories is a list of strings forming a single category with its
    parent categories, like ['Grand Parent', 'Parent', 'Child'].

    Return the database id of the (last) category.

    """
    p_id = None
    category = []
    while categories:
        category.append(categories[0])
        xml_id = 'module_category_' + ('_'.join(x.lower() for x in category)).replace('&', 'and').replace(' ', '_')
        # search via xml_id (because some categories are renamed)
        cr.execute("SELECT res_id FROM ir_model_data WHERE name=%s AND module=%s AND model=%s",
                   (xml_id, "base", "ir.module.category"))

        c_id = cr.fetchone()
        if not c_id:
            cr.execute('INSERT INTO ir_module_category \
                    (name, parent_id) \
                    VALUES (%s, %s) RETURNING id', (categories[0], p_id))
            c_id = cr.fetchone()[0]
            cr.execute('INSERT INTO ir_model_data (module, name, res_id, model) \
                       VALUES (%s, %s, %s, %s)', ('base', xml_id, c_id, 'ir.module.category'))
        else:
            c_id = c_id[0]
        p_id = c_id
        categories = categories[1:]
    return p_id

def has_unaccent(cr):
    """ Test if the database has an unaccent function.

    The unaccent is supposed to be provided by the PostgreSQL unaccent contrib
    module but any similar function will be picked by OpenERP.

    """
    cr.execute("SELECT proname FROM pg_proc WHERE proname='unaccent'")
    return len(cr.fetchall()) > 0
