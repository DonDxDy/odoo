odoo.define('mail/static/src/components/mail-template/mail-template.js', function (require) {
'use strict';

const usingModels = require('mail/static/src/component-mixins/using-models/using-models.js');

const { Component } = owl;

class MailTemplate extends usingModels(Component) {

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * @private
     * @param {MouseEvent} ev
     */
    _onClickPreview(ev) {
        ev.stopPropagation();
        ev.preventDefault();
        this.env.invoke('MailTemplate/preview',
            this.mailTemplate,
            this.activity
        );
    }

    /**
     * @private
     * @param {MouseEvent} ev
     */
    _onClickSend(ev) {
        ev.stopPropagation();
        ev.preventDefault();
        this.env.invoke('MailTemplate/send',
            this.mailTemplate,
            this.activity
        );
    }

}

Object.assign(MailTemplate, {
    props: {
        activity: {
            type: Object,
            validate(p) {
                if (p.constructor.modelName !== 'Activity') {
                    return false;
                }
                return true;
            },
        },
        mailTemplate: {
            type: Object,
            validate(p) {
                if (p.constructor.modelName !== 'MailTemplate') {
                    return false;
                }
                return true;
            },
        },
    },
    template: 'mail.MailTemplate',
});

return MailTemplate;

});
