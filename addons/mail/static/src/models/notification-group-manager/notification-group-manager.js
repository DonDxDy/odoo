odoo.define('mail/static/src/models/notification-group-manager/notification-group-manager.js', function (require) {
'use strict';

const {
    'Feature/defineActions': defineActions,
    'Feature/defineModel': defineModel,
    'Feature/defineSlice': defineFeatureSlice,
    'Field/link': link,
    'Field/one2many': one2many,
} = require('mail/static/src/model/utils.js');

const actions = defineActions({
    /**
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {NotificationGroupManager} notificationGroupManager
     */
    'NotificationGroupManager/computeGroups'(
        { env },
        notificationGroupManager
    ) {
        for (const group of notificationGroupManager.$$$groups(this)) {
            env.invoke('Record/delete', group);
        }
        const groups = [];
        // TODO batch insert, better logic task-2258605
        for (const notification of env.messaging.$$$currentPartner(this).$$$failureNotifications(this)) {
            const thread = notification.$$$message(this).$$$originThread(this);
            // Notifications are grouped by model and notification_type.
            // Except for channel where they are also grouped by id because
            // we want to open the actual channel in discuss or chat window
            // and not its kanban/list/form view.
            const channelId = thread.$$$model(this) === 'mail.channel'
                ? thread.$$$id(this)
                : null;
            const id = `${thread.$$$model(this)}/${channelId}/${notification.$$$type(this)}`;
            const group = env.invoke('NotificationGroup/insert', {
                $$$id: id,
                $$$resModel: thread.$$$model(this),
                $$$resModelName: thread.$$$modelName(this),
                $$$type: notification.$$$type(this),
            });
            env.invoke('Record/update', group, {
                $$$notifications: link(notification),
            });
            // keep res_id only if all notifications are for the same record
            // set null if multiple records are present in the group
            let res_id = group.$$$resId(this);
            if (group.$$$resId(this) === undefined) {
                res_id = thread.$$$id(this);
            } else if (group.$$$resId(this) !== thread.$$$id(this)) {
                res_id = null;
            }
            // keep only the most recent date from all notification messages
            let date = group.$$$date(this);
            if (!date) {
                date = notification.$$$message(this).$$$date(this);
            } else {
                date = moment.max(
                    group.$$$date(this),
                    notification.$$$message(this).$$$date(this)
                );
            }
            env.invoke('Record/update', group, {
                $$$date: date,
                $$$resId: res_id,
            });
            // avoid linking the same group twice when adding a notification
            // to an existing group
            if (!groups.includes(group)) {
                groups.push(group);
            }
        }
        env.invoke('Record/update', notificationGroupManager, {
            $$$groups: link(groups),
        });
    },
});

const model = defineModel({
    name: 'NotificationGroupManager',
    fields: {
        $$$groups: one2many('NotificationGroup'),
    },
});

return defineFeatureSlice(
    'mail/static/src/models/notification-group-manager/notification-group-manager.js',
    actions,
    model,
);

});
