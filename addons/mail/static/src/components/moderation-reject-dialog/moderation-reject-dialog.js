odoo.define('mail/static/src/components/moderation-reject-dialog/moderation-reject-dialog.js', function (require) {
'use strict';

const Dialog = require('web.OwlDialog');
const usingModels = require('mail/static/src/component-mixins/using-models/using-models.js');

const { Component, QWeb, useState } = owl;
const { useRef } = owl.hooks;

class ModerationRejectDialog extends usingModels(Component) {

    /**
     * @override
     */
    constructor(...args) {
        super(...args);
        this.state = useState({
            title: this.env._t("Message Rejected"),
            comment: this.env._t("Your message was rejected by moderator."),
        });
        // to manually trigger the dialog close event
        this._dialogRef = useRef('dialog');
    }

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * @returns {string}
     */
    get SEND_EXPLANATION_TO_AUTHOR() {
        return this.env._t("Send explanation to author");
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
    _onClickReject() {
        this._dialogRef.comp._close();
        const kwargs = {
            title: this.state.title,
            comment: this.state.comment,
        };
        this.env.invoke('Message/moderateMessages', this.messages, 'reject', kwargs);
    }

}

Object.assign(ModerationRejectDialog, {
    components: Dialog,
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
    template: 'mail.ModerationRejectDialog',
});

QWeb.registerComponent('ModerationRejectDialog', ModerationRejectDialog);

return ModerationRejectDialog;

});
