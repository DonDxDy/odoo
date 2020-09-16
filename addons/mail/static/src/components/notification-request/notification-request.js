odoo.define('mail/static/src/components/notification-request/notification-request.js', function (require) {
'use strict';

const usingModels = require('mail/static/src/component-mixins/using-models/using-models.js');

const { Component, QWeb } = owl;

class NotificationRequest extends usingModels(Component) {

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * @returns {string}
     */
    getHeaderText() {
        return _.str.sprintf(
            this.env._t("%s has a request"),
            this.env.messaging.$$$partnerRoot(this).$$$nameOrDisplayName(this)
        );
    }

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * Handle the response of the user when prompted whether push notifications
     * are granted or denied.
     *
     * @private
     * @param {string} value
     */
    _handleResponseNotificationPermission(value) {
        // manually force recompute because the permission is not in the store
        this.env.invoke('Record/update',
            this.env.messaging.$$$messagingMenu(this)
        );
        if (value !== 'granted') {
            this.env.services['bus_service'].sendNotification(
                this.env._t("Permission denied"),
                this.env._t("Odoo will not have the permission to send native notifications on this device.")
            );
        }
    }

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * @private
     */
    _onClick() {
        const windowNotification = this.env.browser.Notification;
        const def = windowNotification && windowNotification.requestPermission();
        if (def) {
            def.then(this._handleResponseNotificationPermission.bind(this));
        }
        if (!this.env.messaging.$$$device(this).$$$isMobile(this)) {
            this.env.invoke('MessagingMenu/close',
                this.env.messaging.$$$messagingMenu(this)
            );
        }
    }

}

Object.assign(NotificationRequest, {
    props: {},
    template: 'mail.NotificationRequest',
});

QWeb.registerComponent('NotificationRequest', NotificationRequest);

return NotificationRequest;

});
