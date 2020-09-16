odoo.define('sms/static/src/models/notification-group/notification-group.js', function (require) {
'use strict';

const {
    'Feature/defineActionExtensions': defineActionExtensions,
    'Feature/defineSlice': defineFeatureSlice,
} = require('mail/static/src/model/utils.js');

const actionExtensions = defineActionExtensions({
    /**
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {function} param0.original
     * @param {NotificationGroup} notificationGroup
     */
    'NotificationGroup/openCancelAction'(
        { env, original },
        notificationGroup
    ) {
        if (notificationGroup.$$$type(this) !== 'sms') {
            return original(...arguments);
        }
        env.bus.trigger('do-action', {
            action: 'sms.sms_cancel_action',
            options: {
                additional_context: {
                    default_model: notificationGroup.$$$resModel(this),
                    unread_counter: notificationGroup.$$$notifications(this).length,
                },
            },
        });
    },
    /**
     * @private
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {function} param0.original
     * @param {NotificationGroup} notificationGroup
     */
    'NotificationGroup/_openDocuments'(
        { env, original },
        notificationGroup
    ) {
        if (notificationGroup.$$$type(this) !== 'sms') {
            return original(...arguments);
        }
        env.bus.trigger('do-action', {
            action: {
                name: env._t("SMS Failures"),
                type: 'ir.actions.act_window',
                view_mode: 'kanban,list,form',
                views: [[false, 'kanban'], [false, 'list'], [false, 'form']],
                target: 'current',
                res_model: notificationGroup.$$$resModel(this),
                domain: [['message_has_sms_error', '=', true]],
            },
        });
        if (env.messaging.$$$device(this).$$$isMobile(this)) {
            // messaging menu has a higher z-index than views so it must
            // be closed to ensure the visibility of the view
            env.invoke('MessagingMenu/close',
                notificationGroup.$$$messagingMenu(this)
            );
        }
    },
});

return defineFeatureSlice(
    'sms/static/src/models/notification-group/notification-group.js',
    actionExtensions,
);

});
