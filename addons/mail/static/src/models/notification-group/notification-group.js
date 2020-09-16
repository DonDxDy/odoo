odoo.define('mail/static/src/models/notification-group/notification-group.js', function (require) {
'use strict';

const {
    'Feature/defineActions': defineActions,
    'Feature/defineModel': defineModel,
    'Feature/defineSlice': defineFeatureSlice,
    'Field/attr': attr,
    'Field/insert': insert,
    'Field/many2one': many2one,
    'Field/one2many': one2many,
    'Field/unlink': unlink,
} = require('mail/static/src/model/utils.js');

const actions = defineActions({
    /**
     * Opens the view that allows to cancel all notifications of the group.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {NotificationGroup} notificationGroup
     */
    'NotificationGroup/openCancelAction'(
        { env },
        notificationGroup
    ) {
        if (notificationGroup.$$$type(this) !== 'email') {
            return;
        }
        env.bus.trigger('do-action', {
            action: 'mail.mail_resend_cancel_action',
            options: {
                additional_context: {
                    default_model: notificationGroup.$$$resModel(this),
                    unread_counter: notificationGroup.$$$notifications(this).length,
                },
            },
        });
    },
    /**
     * Opens the view that displays either the single record of the group or
     * all the records in the group.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {NotificationGroup} notificationGroup
     */
    'NotificationGroup/openDocuments'(
        { env },
        notificationGroup
    ) {
        if (notificationGroup.$$$thread(this)) {
            env.invoke('Thread/open',
                notificationGroup.$$$thread(this)
            );
        } else {
            env.invoke('NotificationGroup/_openDocuments', notificationGroup);
        }
    },
    /**
     * Opens the view that displays all the records of the group.
     *
     * @private
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {NotificationGroup} notificationGroup
     */
    'NotificationGroup/_openDocuments'(
        { env },
        notificationGroup
    ) {
        if (notificationGroup.$$$type(this) !== 'email') {
            return;
        }
        env.bus.trigger('do-action', {
            action: {
                name: env._t("Mail Failures"),
                type: 'ir.actions.act_window',
                view_mode: 'kanban,list,form',
                views: [[false, 'kanban'], [false, 'list'], [false, 'form']],
                target: 'current',
                res_model: notificationGroup.$$$resModel(this),
                domain: [['message_has_error', '=', true]],
            },
        });
        if (env.messaging.$$$device(this).$$$isMobile(this)) {
            // messaging menu has a higher z-index than views so it must
            // be closed to ensure the visibility of the view
            env.invoke('MessagingMenu/close',
                env.messaging.$$$messagingMenu(this)
            );
        }
    },
});

const model = defineModel({
    name: 'NotificationGroup',
    fields: {
        $$$date: attr(),
        $$$id: attr({
            id: true,
        }),
        $$$notifications: one2many('Notification'),
        $$$resId: attr(),
        $$$resModel: attr(),
        $$$resModelName: attr(),
        /**
         * Related thread when the notification group concerns a single thread.
         */
        $$$thread: many2one('Thread', {
            /**
             * @param {Object} param0
             * @param {NotificationGroup} param0.record
             * @returns {Thread|undefined}
             */
            compute({ record }) {
                if (record.$$$resId(this)) {
                    return insert({
                        $$$id: record.$$$resId(this),
                        $$$model: record.$$$resModel(this),
                    });
                }
                return unlink();
            },
        }),
        $$$type: attr(),
    },
});

return defineFeatureSlice(
    'mail/static/src/models/notification-group/notification-group.js',
    actions,
    model,
);

});
