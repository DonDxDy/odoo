odoo.define('mail/static/src/components/moderation-discard-dialog/moderation-discard-dialog.js', function (require) {
'use strict';

const Dialog = require('web.OwlDialog');
const usingModels = require('mail/static/src/component-mixins/using-models/using-models.js');

const { Component, QWeb } = owl;
const { useRef } = owl.hooks;

class ModerationDiscardDialog extends usingModels(Component) {

    /**
     * @override
     */
    constructor(...args) {
        super(...args);
        // to manually trigger the dialog close event
        this._dialogRef = useRef('dialog');
    }

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * @returns {string}
     */
    getBody() {
        if (this.messages.length === 1) {
            return this.env._t("You are going to discard 1 message.");
        }
        return _.str.sprintf(
            this.env._t("You are going to discard %s messages."),
            this.messages.length
        );
    }

    /**
     * @returns {string}
     */
    getTitle() {
        return this.env._t("Confirmation");
    }

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * @private
     */
    _onClickCancel() {
        this._dialogRef.comp._close();
    }

    /**
     * @private
     */
    _onClickDiscard() {
        this._dialogRef.comp._close();
        this.env.invoke('Message/moderateMessages', this.messages, 'discard');
    }

}

Object.assign(ModerationDiscardDialog, {
    components: { Dialog },
    props: {
        messages: {
            type: Array,
            element: Object,
            validate(p) {
                for (const i of p) {
                    if (i.constructor.modelName !== 'Message') {
                        return false;
                    }
                }
                return true;
            },
        },
    },
    template: 'mail.ModerationDiscardDialog',
});

QWeb.registerComponent('ModerationDiscardDialog', ModerationDiscardDialog);

return ModerationDiscardDialog;

});
