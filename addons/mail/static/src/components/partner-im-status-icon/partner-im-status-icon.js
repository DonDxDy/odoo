odoo.define('mail/static/src/components/partner-im-status-icon/partner-im-status-icon.js', function (require) {
'use strict';

const usingModels = require('mail/static/src/component-mixins/using-models/using-models.js');

const { Component } = owl;

class PartnerImStatusIcon extends usingModels(Component) {

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * @private
     * @param {MouseEvent} ev
     */
    _onClick(ev) {
        if (!this.hasOpenChat) {
            return;
        }
        this.env.invoke('Partner/openChat',
            this.partner
        );
    }

}

Object.assign(PartnerImStatusIcon, {
    defaultProps: {
        hasBackground: true,
        hasOpenChat: false,
    },
    props: {
        partner: {
            type: Object,
            validate(p) {
                if (p.constructor.modelName !== 'Partner') {
                    return false;
                }
                return true;
            },
        },
        hasBackground: Boolean,
        /**
         * Determines whether a click on `this` should open a chat with
         * `this.partner`.
         */
        hasOpenChat: Boolean,
    },
    template: 'mail.PartnerImStatusIcon',
});

return PartnerImStatusIcon;

});
