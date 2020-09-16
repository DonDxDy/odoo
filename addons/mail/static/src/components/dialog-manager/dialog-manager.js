odoo.define('mail/static/src/components/dialog-manager/dialog-manager.js', function (require) {
'use strict';

const usingModels = require('mail/static/src/component-mixins/using-models/using-models.js');

const { Component, QWeb } = owl;

class DialogManager extends usingModels(Component) {

    mounted() {
        this._checkDialogOpen();
    }

    patched() {
        this._checkDialogOpen();
    }

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * @private
     */
    _checkDialogOpen() {
        if (!this.env.messaging) {
            /**
             * Messaging not created, which means essential models like
             * dialog manager are not ready, so open status of dialog in DOM
             * is omitted during this (short) period of time.
             */
            return;
        }
        if (this.env.messaging.$$$dialogManager(this).$$$dialogs(this).length > 0) {
            document.body.classList.add('modal-open');
        } else {
            document.body.classList.remove('modal-open');
        }
    }

}

Object.assign(DialogManager, {
    props: {},
    template: 'mail.DialogManager',
});

QWeb.registerComponent('DialogManager', DialogManager);

return DialogManager;

});
