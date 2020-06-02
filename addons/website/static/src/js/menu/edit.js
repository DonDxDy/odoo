odoo.define('website.editMenu', function (require) {
'use strict';

var core = require('web.core');
var websiteNavbarData = require('website.navbar');
var wysiwygLoader = require('web_editor.loader');


var _t = core._t;

/**
 * Todo in this file:
 * - rename file to something like "PageManager" or "PageWidget"
 *
 * The role of this file:
 *
 * - auto-start the editor if configured
 * - show a tooltip
 * - start the widgets
 *
 * - handle welcome message
 *   - render welcome message if the page is empty
 *   - remove render message when editing
 *
 * \-- to move in the editor? --\
 *
 *
 * \-- to export --\
 * - show the building block message
 *
 */
/**
 * Adds the behavior when clicking on the 'edit' button (+ editor interaction)
 */
var EditPageMenu = websiteNavbarData.WebsiteNavbarActionWidget.extend({
    // todo: refactor this on all files to remove this way of loading assets
    assetLibs: ['web_editor.compiled_assets_wysiwyg', 'website.compiled_assets_wysiwyg'],

    xmlDependencies: ['/website/static/src/xml/website.editor.xml'],
    actions: _.extend({}, websiteNavbarData.WebsiteNavbarActionWidget.prototype.actions, {
        edit: '_startEditMode',
        on_save: '_onSave',
    }),
    custom_events: _.extend({}, websiteNavbarData.WebsiteNavbarActionWidget.custom_events || {}, {
        content_will_be_destroyed: '_onContentWillBeDestroyed',
        content_was_recreated: '_onContentWasRecreated',
        snippet_will_be_cloned: '_onSnippetWillBeCloned',
        snippet_cloned: '_onSnippetCloned',
        snippet_dropped: '_onSnippetDropped',
        edition_will_stopped: '_onEditionWillStop',
        edition_was_stopped: '_onEditionWasStopped',
        request_save: '_onSnippetRequestSave',
    }),

    /**
     * @constructor
     */
    init: function () {
        this._super.apply(this, arguments);
        var context;
        this.trigger_up('context_get', {
            extra: true,
            callback: function (ctx) {
                context = ctx;
            },
        });
        this._editorAutoStart = (context.editable && window.location.search.indexOf('enable_editor') >= 0);
        var url = window.location.href.replace(/([?&])&*enable_editor[^&#]*&?/, '\$1');
        window.history.replaceState({}, null, url);
    },
    /**
     * Auto-starts the editor if necessary or add the welcome message otherwise.
     *
     * @override
     */
    start: async function () {
        var def = this._super.apply(this, arguments);

        // If we auto start the editor, do not show a welcome message
        if (this._editorAutoStart) {
            return Promise.all([def, this._startEditMode()]);
        }

        // Check that the page is empty
        var $wrap = this._targetForEdition().filter('#wrapwrap.homepage').find('#wrap');

        if ($wrap.length && $wrap.html().trim() === '') {
            // If readonly empty page, show the welcome message
            this.$welcomeMessage = $(core.qweb.render('website.homepage_editor_welcome_message'));
            this.$welcomeMessage.addClass('o_homepage_editor_welcome_message');
            this.$welcomeMessage.css('min-height', $wrap.parent('main').height() - ($wrap.outerHeight(true) - $wrap.height()));
            $wrap.empty().append(this.$welcomeMessage);
        }

        setTimeout(function () {
            if ($('.o_tooltip.o_animated').length) {
                $('.o_tooltip_container').addClass('show');
            }
        }, 1000); // ugly hack to wait that tooltip is loaded
        // todo: remove me - used when developping
        // this._startEditMode();

        return def;
    },

    //--------------------------------------------------------------------------
    // Actions
    //--------------------------------------------------------------------------

    /**
     * Creates an editor instance and appends it to the DOM. Also remove the
     * welcome message if necessary.
     *
     * @private
     * @returns {Promise}
     */
    _startEditMode: async function () {
        // todo: refactor
        // Add class in navbar and hide the navbar.
        this.trigger_up('edit_mode');

        if (this.editModeEnable) {
            return;
        }
        this.trigger_up('widgets_stop_request', {
            $target: this._targetForEdition(),
        });
        if (this.$welcomeMessage) {
            this.$welcomeMessage.detach(); // detach from the readonly rendering before the clone by summernote
        }
        this.editModeEnable = true;



        this.wysiwyg = await this._createWysiwyg();
        // todo: refactor attachTo by using the editor layout config.
        await this.wysiwyg.attachTo($('#wrapwrap'));



        var res = await new Promise( (resolve, reject) => {
            this.trigger_up('widgets_start_request', {
                editableMode: true,
                onSuccess: resolve,
                onFailure: reject,
            });
        });
        // Trigger a mousedown on the main edition area to focus it,
        // which is required for Summernote to activate.
        return res;
    },

    _createWysiwyg: async function () {
        var context;
        this.trigger_up('context_get', {
            callback: function (ctx) {
                context = ctx;
            },
        });

        const Wysiwyg = await wysiwygLoader.loadWysiwyg();

        return new Wysiwyg(this, {
            snippets: 'website.snippets',
            recordInfo: {
                context: context,
                data_res_model: 'website',
                data_res_id: context.website_id,
            }, value: $('#wrapwrap')[0].outerHTML,
            enableWebsite: true,
            saveButton: true,
            location: [document.getElementById('wrapwrap'), 'replace'],
        });
    },
    /**
     * On save, the editor will ask to parent widgets if something needs to be
     * done first. The website navbar will receive that demand and asks to its
     * action-capable components to do something. For example, the content menu
     * handles page-related options saving. However, some users with limited
     * access rights do not have the content menu... but the website navbar
     * expects that the save action is performed. So, this empty action is
     * defined here so that all users have an 'on_save' related action.
     *
     * @private
     * @todo improve the system to somehow declare required/optional actions
     */
    _onSave: function () {},

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * Returns the target for edition.
     *
     * @private
     * @returns {JQuery}
     */
    _targetForEdition: function () {
        return $('#wrapwrap'); // TODO should know about this element another way
    },

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * Called when content will be destroyed in the page. Notifies the
     * WebsiteRoot that is should stop the public widgets.
     *
     * @private
     * @param {OdooEvent} ev
     */
    _onContentWillBeDestroyed: function (ev) {
        this.trigger_up('widgets_stop_request', {
            $target: ev.data.$target,
        });
    },
    /**
     * Called when content was recreated in the page. Notifies the
     * WebsiteRoot that is should start the public widgets.
     *
     * @private
     * @param {OdooEvent} ev
     */
    _onContentWasRecreated: function (ev) {
        this.trigger_up('widgets_start_request', {
            editableMode: true,
            $target: ev.data.$target,
        });
    },
    /**
     * Called when edition will stop. Notifies the
     * WebsiteRoot that is should stop the public widgets.
     *
     * @private
     * @param {OdooEvent} ev
     */
    _onEditionWillStop: function (ev) {
        this.$editorMessageElements && this.$editorMessageElements.removeAttr('data-editor-message');
        this.trigger_up('widgets_stop_request', {
            $target: this._targetForEdition(),
        });
    },
    /**
     * Called when edition was stopped. Notifies the
     * WebsiteRoot that is should start the public widgets.
     *
     * @private
     * @param {OdooEvent} ev
     */
    _onEditionWasStopped: function (ev) {
        this.trigger_up('widgets_start_request', {
            $target: this._targetForEdition(),
        });
        this.editModeEnable = false;
    },
    /**
     * Called when a snippet is about to be cloned in the page. Notifies the
     * WebsiteRoot that is should destroy the animations for this snippet.
     *
     * @private
     * @param {OdooEvent} ev
     */
    _onSnippetWillBeCloned: function (ev) {
        this.trigger_up('widgets_stop_request', {
            $target: ev.data.$target,
        });
    },
    /**
     * Called when a snippet is cloned in the page. Notifies the WebsiteRoot
     * that is should start the public widgets for this snippet and the snippet it
     * was cloned from.
     *
     * @private
     * @param {OdooEvent} ev
     */
    _onSnippetCloned: function (ev) {
        this.trigger_up('widgets_start_request', {
            editableMode: true,
            $target: ev.data.$target,
        });
        // TODO: remove in saas-12.5, undefined $origin will restart #wrapwrap
        if (ev.data.$origin) {
            this.trigger_up('widgets_start_request', {
                editableMode: true,
                $target: ev.data.$origin,
            });
        }
    },
    /**
     * Called when a snippet is dropped in the page. Notifies the WebsiteRoot
     * that is should start the public widgets for this snippet. Also add the
     * editor messages.
     *
     * @private
     * @param {OdooEvent} ev
     */
    _onSnippetDropped: function (ev) {
        this.trigger_up('widgets_start_request', {
            editableMode: true,
            $target: ev.data.$target,
        });
        // this._addEditorMessages();
    },

    /**
     * Snippet (menu_data) can request to save the document to leave the page
     *
     * @private
     * @param {OdooEvent} ev
     * @param {object} ev.data
     * @param {function} ev.data.onSuccess
     * @param {function} ev.data.onFailure
     */
    _onSnippetRequestSave: function (ev) {
        this.save(false).then(ev.data.onSuccess, ev.data.onFailure);
    },
});

websiteNavbarData.websiteNavbarRegistry.add(EditPageMenu, '#edit-page-menu');
});
