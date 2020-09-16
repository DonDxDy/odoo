odoo.define('snailmail/static/src/components/snailmail-notification-popover/snailmail-notification-popover.js', function (require) {
'use strict';

const usingModels = require('mail/static/src/component-mixins/using-models/using-models.js');

const { Component } = owl;

class SnailmailNotificationPopover extends usingModels(Component) {

    /**
     * @returns {string}
     */
    get iconClass() {
        switch (this.notification.$$$status(this)) {
            case 'sent':
                return 'fa fa-check';
            case 'ready':
                return 'fa fa-clock-o';
            case 'canceled':
                return 'fa fa-trash-o';
            default:
                return 'fa fa-exclamation text-danger';
        }
    }

    /**
     * @returns {string}
     */
    get iconTitle() {
        switch (this.notification.$$$status(this)) {
            case 'sent':
                return this.env._t("Sent");
            case 'ready':
                return this.env._t("Awaiting Dispatch");
            case 'canceled':
                return this.env._t("Canceled");
            default:
                return this.env._t("Error");
        }
    }

    /**
     * @returns {Notification}
     */
    get notification() {
        // Messages from snailmail are considered to have at most one notification.
        return this.message.$$$notifications(this)[0];
    }

}

Object.assign(SnailmailNotificationPopover, {
    props: {
        message: {
            type: Object,
            validate(p) {
                if (p.constructor.modelName !== 'Message') {
                    return false;
                }
                return true;
            },
        },
    },
    template: 'snailmail.SnailmailNotificationPopover',
});

return SnailmailNotificationPopover;

});
