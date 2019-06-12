odoo.define('website.editor.menu', function (require) {
'use strict';

var Dialog = require('web.Dialog');
var session = require('web.session');
var Widget = require('web.Widget');
var core = require('web.core');
var Wysiwyg = require('web_editor.wysiwyg.root');

var _t = core._t;

var WysiwygMultizone = Wysiwyg.extend({
    assetLibs: Wysiwyg.prototype.assetLibs.concat(['website.compiled_assets_wysiwyg']),
    // _getWysiwygContructor: function () {
    //     return odoo.__DEBUG__.services['web_editor.wysiwyg.multizone'];
    // }
});

var EditorMenu = Widget.extend({
    template: 'website.editorbar',
    xmlDependencies: ['/website/static/src/xml/website.editor.xml'],
    events: {
        'click button[data-action=save]': '_onSaveClick',
        'click button[data-action=cancel]': '_onCancelClick',
    },
    custom_events: {
        request_save: '_onSnippetRequestSave',
    },

    /**
     * @override
     */
    willStart: function () {
        var self = this;
        this.$el = null; // temporary null to avoid hidden error (@see start)
        return this._super()
            .then(function () {
                self.wysiwyg = self._wysiwygInstance();
                return self.wysiwyg.attachTo($('#wrapwrap'));
            });
    },
    /**
     * @override
     */
    start: function () {
        var self = this;
        this.$el.css({width: '100%'});
        return this._super().then(function () {
            self.trigger_up('edit_mode');
            $('body').addClass('editor_enable');
            self.$el.css({width: ''});
        });
    },
    /**
     * @override
     */
    destroy: function () {
        $('body').removeClass('editor_enable');
        this.trigger_up('readonly_mode');
        this._super.apply(this, arguments);
    },

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * Asks the user if they really wants to discard their changes (if any),
     * then simply reloads the page if they want to.
     *
     * @param {boolean} [reload=true]
     *        true if the page has to be reloaded when the user answers yes
     *        (do nothing otherwise but add this to allow class extension)
     * @returns {Deferred}
     */
    cancel: function (reload) {
        var self = this;
        var def = new Promise(function (resolve, reject) {
            if (!self.wysiwyg.isDirty()) {
                resolve();
            } else {
                var confirm = Dialog.confirm(self, _t("If you discard the current edition, all unsaved changes will be lost. You can cancel to return to the edition mode."), {
                    confirm_callback: resolve,
                });
                confirm.on('closed', self, reject);
            }
        });

        return def.then(function () {
            self.trigger_up('edition_will_stopped');
            if (reload !== false) {
                self.wysiwyg.destroy();
                return self._reload();
            } else {
                self.wysiwyg.destroy();
                self.trigger_up('readonly_mode');
                self.trigger_up('edition_was_stopped');
                self.destroy();
            }
        });
    },
    /**
     * Asks the snippets to clean themself, then saves the page, then reloads it
     * if asked to.
     *
     * @param {boolean} [reload=true]
     *        true if the page has to be reloaded after the save
     * @returns {Deferred}
     */
    save: function (reload) {
        var self = this;
        this.trigger_up('edition_will_stopped');
        return this.wysiwyg.save().then(function (result) {
            if (result.isDirty && reload !== false) {
                // remove top padding because the connected bar is not visible
                $('body').removeClass('o_connected_user');
                return self._reload();
            } else {
                self.wysiwyg.destroy();
                self.trigger_up('edition_was_stopped');
                self.destroy();
            }
        });
    },

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * @private
     */
    _wysiwygInstance: function () {
        var context;
        this.trigger_up('context_get', {
            callback: function (ctx) {
                context = ctx;
            },
        });

        var res_id;
        var res_model;
        var xpath;

        return new WysiwygMultizone(this, {
            plugins: {
                OdooWebsite: true,
            },
            xhr: {
                csrf_token: odoo.csrf_token,
                user_id: session.uid || session.user_id,
                data_res_model: 'website',
                data_res_id: context.website_id,
                get res_id () {
                    return res_id;
                },
                set res_id (id) {
                    return res_id = id;
                },
                get res_model () {
                    return res_model;
                },
                set res_model (model) {
                    return res_model = model;
                },
                get xpath () {
                    return xpath;
                },
                set xpath (x) {
                    return xpath = x;
                },
            },
            snippets: 'website.snippets',
            dropblockStayOpen: true,
            isEditableNode: function (archNode) {
                if (archNode.isRoot()) {
                    return false;
                }
                if (!archNode.className) {
                    return undefined;
                }
                if (archNode.className.contains('o_not_editable')) {
                    return false;
                }
                if (archNode.className.contains('o_editable')) {
                    return true;
                }
            },
        });
    },
    /**
     * Reloads the page in non-editable mode, with the right scrolling.
     *
     * @private
     * @returns {Deferred} (never resolved, the page is reloading anyway)
     */
    _reload: function () {
        $('body').addClass('o_wait_reload');
        this.wysiwyg.destroy();
        this.$el.hide();
        window.location.hash = 'scrollTop=' + window.document.body.scrollTop;
        window.location.reload(true);
        return new Promise(function () {});
    },

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * Called when the "Discard" button is clicked -> discards the changes.
     *
     * @private
     */
    _onCancelClick: function () {
        this.cancel(false);
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
    /**
     * Called when the "Save" button is clicked -> saves the changes.
     *
     * @private
     */
    _onSaveClick: function () {
        this.save();
    },
});

return EditorMenu;
});
