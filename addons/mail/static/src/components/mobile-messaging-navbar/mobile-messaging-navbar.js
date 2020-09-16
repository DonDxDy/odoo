odoo.define('mail/static/src/components/mobile-messaging-navbar/mobile-messaging-navbar.js', function (require) {
'use strict';

const usingModels = require('mail/static/src/component-mixins/using-models/using-models.js');

const { Component } = owl;

class MobileMessagingNavbar extends usingModels(Component) {

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * @private
     * @param {MouseEvent} ev
     */
    _onClick(ev) {
        this.trigger('o-select-mobile-messaging-navbar-tab', {
            tabId: ev.currentTarget.dataset.tabId,
        });
    }

}

Object.assign(MobileMessagingNavbar, {
    defaultProps: {
        tabs: [],
    },
    props: {
        activeTabId: String,
        tabs: {
            type: Array,
            element: {
                type: Object,
                shape: {
                    icon: {
                        type: String,
                        optional: true,
                    },
                    id: String,
                    label: String,
                },
            },
        },
    },
    template: 'mail.MobileMessagingNavbar',
});

return MobileMessagingNavbar;

});
