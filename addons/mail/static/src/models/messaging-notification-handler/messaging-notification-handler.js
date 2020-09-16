odoo.define('mail/static/src/models/messaging-notification-handler/messaging-notification-handler.js', function (require) {
'use strict';

const {
    'Feature/defineActions': defineActions,
    'Feature/defineModel': defineModel,
    'Feature/defineSlice': defineFeatureSlice,
    'Field/insert': insert,
    'Field/link': link,
    'Field/one2one': one2one,
} = require('mail/static/src/model/utils.js');

const PREVIEW_MSG_MAX_SIZE = 350; // optimal for native English speakers

const actions = defineActions({
    /**
     * Fetch messaging data initially to populate the store specifically for
     * the current users. This includes pinned channels for instance.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {MessagingNotificationHandler} messagingNotificationHandler
     */
    'MessagingNotificationHandler/start'(
        { env },
        messagingNotificationHandler
    ) {
        env.services.bus_service.onNotification(
            null,
            notifs => env.invoke(
                'MessagingNotificationHandler/_handleNotifications',
                messagingNotificationHandler,
                notifs
            )
        );
        env.services.bus_service.startPolling();
    },
    /**
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {MessagingNotificationHandler} messagingNotificationHandler
     */
    'MessagingNotificationHandler/stop'(
        { env },
        messagingNotificationHandler
    ) {
        env.services['bus_service'].off('notification');
        env.services['bus_service'].stopPolling();
    },
    /**
     * @private
     * @param {Object} _
     * @param {Object[]} notifications
     * @returns {Object[]}
     */
    'MessagingNotificationHandler/_filterNotificationsOnUnsubscribe'(
        _,
        notifications
    ) {
        const unsubscribedNotif = notifications.find(notif =>
            notif[1].info === 'unsubscribe');
        if (unsubscribedNotif) {
            notifications = notifications.filter(notif =>
                notif[0][1] !== 'mail.channel' ||
                notif[0][2] !== unsubscribedNotif[1].id
            );
        }
        return notifications;
    },
    /**
     * @private
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {MessagingNotificationHandler} notificationHandler
     * @param {Object[]} notifications
     * @param {Array|string} notifications[i][0] meta-data of the notification.
     * @param {string} notifications[i][0][0] name of database this
     *   notification comes from.
     * @param {string} notifications[i][0][1] type of notification.
     * @param {integer} notifications[i][0][2] usually id of related type
     *   of notification. For instance, with `mail.channel`, this is the id
     *   of the channel.
     * @param {Object} notifications[i][1] payload of the notification
     */
    async 'MessagingNotificationHandler/_handleNotifications'(
        { env },
        notificationHandler,
        notifications
    ) {
        const filteredNotifications =
            env.invoke(
                'MessagingNotificationHandler/_filterNotificationsOnUnsubscribe',
                notifications
            );
        const proms = filteredNotifications.map(notification => {
            const [channel, message] = notification;
            if (typeof channel === 'string') {
                // uuid notification, only for (livechat) public handler
                return;
            }
            const [, model, id] = channel;
            switch (model) {
                case 'ir.needaction':
                    return env.invoke(
                        'MessagingNotificationHandler/_handleNotificationNeedaction',
                        notificationHandler,
                        message
                    );
                case 'mail.channel':
                    return env.invoke(
                        'MessagingNotificationHandler/_handleNotificationChannel',
                        notificationHandler,
                        id,
                        message
                    );
                case 'res.partner':
                    if (id !== env.messaging.$$$currentPartner(this).$$$id(this)) {
                        // ignore broadcast to other partners
                        return;
                    }
                    return env.invoke(
                        'MessagingNotificationHandler/_handleNotificationPartner',
                        notificationHandler,
                        message
                    );
                default:
                    console.warn(`MessagingNotificationHandler: Unhandled notification "${model}"`);
                    return;
            }
        });
        await env.invoke(
            'Record/doAsync',
            notificationHandler,
            () => Promise.all(proms)
        );
    },
    /**
     * @private
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {MessagingNotificationHandler} notificationHandler
     * @param {integer} channelId
     * @param {Object} data
     * @param {string} [data.info]
     * @param {boolean} [data.is_typing]
     * @param {integer} [data.last_message_id]
     * @param {integer} [data.partner_id]
     */
    async 'MessagingNotificationHandler/_handleNotificationChannel'(
        { env },
        notificationHandler,
        channelId,
        data
    ) {
        const {
            info,
            is_typing,
            last_message_id,
            partner_id,
            partner_name,
        } = data;
        switch (info) {
            case 'channel_fetched':
                return env.invoke(
                    'MessagingNotificationHandler/_handleNotificationChannelFetched',
                    notificationHandler,
                    channelId,
                    {
                        last_message_id,
                        partner_id,
                    }
                );
            case 'channel_seen':
                return env.invoke(
                    'MessagingNotificationHandler/_handleNotificationChannelSeen',
                    notificationHandler,
                    channelId,
                    {
                        last_message_id,
                        partner_id,
                    }
                );
            case 'typing_status':
                return env.invoke(
                    'MessagingNotificationHandler/_handleNotificationChannelTypingStatus',
                    notificationHandler,
                    channelId,
                    {
                        is_typing,
                        partner_id,
                        partner_name,
                    }
                );
            default:
                return env.invoke(
                    'MessagingNotificationHandler/_handleNotificationChannelMessage',
                    notificationHandler,
                    channelId,
                    data
                );
        }
    },
    /**
     * @private
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {MessagingNotificationHandler} notificationHandler
     * @param {integer} channelId
     * @param {Object} param3
     * @param {integer} param3.last_message_id
     * @param {integer} param3.partner_id
     */
    async 'MessagingNotificationHandler/_handleNotificationChannelFetched'(
        { env },
        notificationHandler,
        channelId,
        {
            last_message_id,
            partner_id,
        }
    ) {
        const channel = env.invoke('Thread/findFromId', {
            $$$id: channelId,
            $$$model: 'mail.channel',
        });
        if (!channel) {
            // for example seen from another browser, the current one has no
            // knowledge of the channel
            return;
        }
        if (channel.$$$channelType(this) === 'channel') {
            // disabled on `channel` channels for performance reasons
            return;
        }
        env.invoke('ThreadPartnerSeenInfo/insert', {
            $$$channelId: channel.$$$id(this),
            $$$lastFetchedMessage: insert({
                $$$id: last_message_id,
            }),
            $$$partnerId: partner_id,
        });
        env.invoke('MessageSeenIndicator/insert', {
            $$$channelId: channel.$$$id(this),
            $$$messageId: last_message_id,
        });
        // FIXME force the computing of message values (cf task-2261221)
        env.invoke(
            'MessageSeenIndicator/recomputeFetchedValues',
            channel
        );
    },
    /**
     * @private
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {MessagingNotificationHandler} notificationHandler
     * @param {integer} channelId
     * @param {Object} messageData
     */
    async 'MessagingNotificationHandler/_handleNotificationChannelMessage'(
        { env },
        notificationHandler,
        channelId,
        messageData
    ) {
        let channel = env.invoke('Thread/findFromId', {
            $$$id: channelId,
            $$$model: 'mail.channel',
        });
        const wasChannelExisting = !!channel;
        const convertedData = env.invoke('Message/convertData', messageData);
        const oldMessage = env.invoke('Message/findFromId', convertedData);
        // locally save old values, as insert would overwrite them
        const oldMessageModerationStatus = (
            oldMessage && oldMessage.$$$moderationStatus(this)
        );
        const oldMessageWasModeratedByCurrentPartner = (
            oldMessage && oldMessage.$$$isModeratedByCurrentPartner(this)
        );
        // Fetch missing info from channel before going further. Inserting
        // a channel with incomplete info can lead to issues. This is in
        // particular the case with the `uuid` field that is assumed
        // "required" by the rest of the code and is necessary for some
        // features such as chat windows.
        if (!channel) {
            channel = (
                await env.invoke(
                    'Record/doAsync',
                    notificationHandler,
                    () => env.invoke(
                        'Thread/performRpcChannelInfo',
                        { ids: [channelId] }
                    )
                )
            )[0];
        }
        if (!channel.$$$isPinned(this)) {
            env.invoke('Thread/pin', channel);
        }
        const message = env.invoke('Message/insert', convertedData);
        env.invoke(
            'MessagingNotificationHandler/_notifyThreadViewsMessageReceived',
            notificationHandler,
            message
        );
        // If the message was already known: nothing else should be done,
        // except if it was pending moderation by the current partner, then
        // decrement the moderation counter.
        if (oldMessage) {
            if (
                oldMessageModerationStatus === 'pending_moderation' &&
                message.$$$moderationStatus(this) !== 'pending_moderation' &&
                oldMessageWasModeratedByCurrentPartner
            ) {
                const moderation = env.messaging.$$$moderation(this);
                env.invoke('Record/update', moderation, {
                    $$$counter: moderation.$$$counter(this) - 1,
                });
            }
            return;
        }
        // If the current partner is author, do nothing else.
        if (message.$$$author(this) === env.messaging.$$$currentPartner(this)) {
            return;
        }
        // Message from mailing channel should not make a notification in
        // Odoo for users with notification "Handled by Email".
        // Channel has been marked as read server-side in this case, so
        // it should not display a notification by incrementing the
        // unread counter.
        if (
            channel.$$$isMassMailing(this) &&
            env.session.notification_type === 'email'
        ) {
            return;
        }
        // In all other cases: update counter and notify if necessary.
        // Chat from OdooBot is considered disturbing and should only be
        // shown on the menu, but no notification and no thread open.
        const isChatWithOdooBot = (
            channel.$$$correspondent(this) &&
            channel.$$$correspondent(this) === env.messaging.$$$partnerRoot(this)
        );
        if (!isChatWithOdooBot) {
            const isOdooFocused = env.services['bus_service'].isOdooFocused();
            // Notify if out of focus
            if (!isOdooFocused && channel.$$$isChatChannel(this)) {
                env.invoke(
                    'MessagingNotificationHandler/_notifyNewChannelMessageWhileOutOfFocus',
                    notificationHandler,
                    {
                        channel,
                        message,
                    }
                );
            }
            if (
                channel.$$$model(this) === 'mail.channel' &&
                channel.$$$channelType(this) !== 'channel'
            ) {
                // disabled on non-channel threads and
                // on `channel` channels for performance reasons
                env.invoke('Thread/markAsFetched', channel);
            }
            // (re)open chat on receiving new message
            if (channel.$$$channelType(this) !== 'channel') {
                env.invoke(
                    'ChatWindowManager/openThread',
                    env.messaging.$$$chatWindowManager(this),
                    channel
                );
            }
        }
        // If the channel wasn't known its correct counter was fetched at
        // the start of the method, no need update it here.
        if (!wasChannelExisting) {
            return;
        }
        // manually force recompute of counter
        env.invoke(
            'Record/update',
            notificationHandler.$$$messaging(this).$$$messagingMenu(this)
        );
    },
    /**
     * Called when a channel has been seen, and the server responds with the
     * last message seen. Useful in order to track last message seen.
     *
     * @private
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {MessagingNotificationHandler} notificationHandler
     * @param {integer} channelId
     * @param {Object} param3
     * @param {integer} param3.last_message_id
     * @param {integer} param3.partner_id
     */
    async 'MessagingNotificationHandler/_handleNotificationChannelSeen'(
        { env },
        notificationHandler,
        channelId,
        {
            last_message_id,
            partner_id,
        }
    ) {
        const channel = env.invoke('Thread/findFromId', {
            $$$id: channelId,
            $$$model: 'mail.channel',
        });
        if (!channel) {
            // for example seen from another browser, the current one has no
            // knowledge of the channel
            return;
        }
        const lastMessage = env.invoke('Message/insert', {
            $$$id: last_message_id,
        });
        // restrict computation of seen indicator for "non-channel" channels
        // for performance reasons
        const shouldComputeSeenIndicators = channel.$$$channelType(this) !== 'channel';
        if (shouldComputeSeenIndicators) {
            env.invoke('ThreadPartnerSeenInfo/insert', {
                $$$channelId: channel.$$$id(this),
                $$$lastSeenMessage: link(lastMessage),
                $$$partnerId: partner_id,
            });
            env.invoke('MessageSeenIndicator/insert', {
                $$$channelId: channel.$$$id(this),
                $$$messageId: lastMessage.$$$id(this),
            });
        }
        if (env.messaging.$$$currentPartner(this).$$$id(this) === partner_id) {
            env.invoke('Record/update', channel, {
                $$$lastSeenByCurrentPartnerMessageId: last_message_id,
                $$$pendingSeenMessageId: undefined,
            });
        }
        if (shouldComputeSeenIndicators) {
            // FIXME force the computing of thread values (cf task-2261221)
            env.invoke('Thread/computeLastCurrentPartnerMessageSeenByEveryone', channel);
            // FIXME force the computing of message values (cf task-2261221)
            env.invoke('MessageSeenIndicator/recomputeSeenValues', channel);
        }
        // manually force recompute of counter
        env.invoke(
            'record/update',
            notificationHandler.$$$messaging(this).$$$messagingMenu(this)
        );
    },
    /**
     * @private
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {MessagingNotificationHandler} notificationHandler
     * @param {integer} channelId
     * @param {Object} param3
     * @param {boolean} param3.is_typing
     * @param {integer} param3.partner_id
     * @param {string} param3.partner_name
     */
    'MessagingNotificationHandler/_handleNotificationChannelTypingStatus'(
        { env },
        notificationHandler,
        channelId,
        {
            is_typing,
            partner_id,
            partner_name,
        }
    ) {
        const channel = env.invoke('Thread/findFromId', {
            $$$id: channelId,
            $$$model: 'mail.channel',
        });
        if (!channel) {
            return;
        }
        const partner = env.invoke('Partner/insert', {
            $$$id: partner_id,
            $$$name: partner_name,
        });
        if (partner === env.messaging.$$$currentPartner(this)) {
            // Ignore management of current partner is typing notification.
            return;
        }
        if (is_typing) {
            if (channel.$$$typingMembers(this).includes(partner)) {
                env.invoke(
                    'Thread/refreshOtherMemberTypingMember',
                    channel,
                    partner
                );
            } else {
                env.invoke(
                    'Thread/registerOtherMemberTypingMember',
                    channel,
                    partner
                );
            }
        } else {
            if (!channel.$$$typingMembers(this).includes(partner)) {
                // Ignore no longer typing notifications of members that
                // are not registered as typing something.
                return;
            }
            env.invoke(
                'Thread/unregisterOtherMemberTypingMember',
                channel,
                partner
            );
        }
    },
    /**
     * @private
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {MessagingNotificationHandler} notificationHandler
     * @param {Object} data
     */
    'MessagingNotificationHandler/_handleNotificationNeedaction'(
        { env },
        notificationHandler,
        data
    ) {
        const message = env.invoke(
            'Message/insert',
            env.invoke('Message/convertData', data)
        );
        const inboxMailbox = env.messaging.$$$inbox(this);
        env.invoke('Record/update', inboxMailbox, {
            $$$counter: inboxMailbox.$$$counter(this) + 1,
        });
        for (const thread of message.$$$threads(this)) {
            if (
                thread.$$$channelType(this) === 'channel' &&
                message.$$$isNeedaction(this)
            ) {
                env.invoke('Record/update', thread, {
                    $$$messageNeedactionCounter: thread.$$$messageNeedactionCounter(this) + 1,
                });
            }
        }
        // manually force recompute of counter
        env.invoke(
            'record/update',
            notificationHandler.$$$messaging(this).$$$messagingMenu(this)
        );
    },
    /**
     * @private
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {MessagingNotificationHandler} notificationHandler
     * @param {Object} data
     * @param {string} [data.info]
     * @param {string} [data.type]
     */
    async 'MessagingNotificationHandler/_handleNotificationPartner'(
        { env },
        notificationHandler,
        data
    ) {
        const {
            info,
            type,
        } = data;
        if (type === 'activity_updated') {
            env.bus.trigger('activity_updated', data);
        } else if (type === 'author') {
            return env.invoke(
                'MessagingNotificationHandler/_handleNotificationPartnerAuthor',
                notificationHandler,
                data
            );
        } else if (info === 'channel_seen') {
            return env.invoke(
                'MessagingNotificationHandler/_handleNotificationChannelSeen',
                notificationHandler,
                data.channel_id,
                data
            );
        } else if (type === 'deletion') {
            return env.invoke(
                'MessagingNotificationHandler/_handleNotificationPartnerDeletion',
                notificationHandler,
                data
            );
        } else if (type === 'message_notification_update') {
            return env.invoke(
                'MessagingNotificationHandler/_handleNotificationPartnerMessageNotificationUpdate',
                notificationHandler,
                data.elements
            );
        } else if (type === 'mark_as_read') {
            return env.invoke(
                'MessagingNotificationHandler/_handleNotificationPartnerMarkAsRead',
                notificationHandler,
                data
            );
        } else if (type === 'moderator') {
            return env.invoke(
                'MessagingNotificationHandler/_handleNotificationPartnerModerator',
                notificationHandler,
                data
            );
        } else if (type === 'simple_notification') {
            const escapedTitle = owl.utils.escape(data.title);
            const escapedMessage = owl.utils.escape(data.message);
            env.services['notification'].notify({
                message: escapedMessage,
                sticky: data.sticky,
                title: escapedTitle,
                type: data.warning ? 'warning' : 'danger',
            });
        } else if (type === 'toggle_star') {
            return env.invoke(
                'MessagingNotificationHandler/_handleNotificationPartnerToggleStar',
                notificationHandler,
                data
            );
        } else if (info === 'transient_message') {
            return env.invoke(
                'MessagingNotificationHandler/_handleNotificationPartnerTransientMessage',
                notificationHandler,
                data
            );
        } else if (info === 'unsubscribe') {
            return env.invoke(
                'MessagingNotificationHandler/_handleNotificationPartnerUnsubscribe',
                notificationHandler,
                data.id
            );
        } else if (type === 'user_connection') {
            return env.invoke(
                'MessagingNotificationHandler/_handleNotificationPartnerUserConnection',
                notificationHandler,
                data
            );
        } else {
            return env.invoke(
                'MessagingNotificationHandler/_handleNotificationPartnerChannel',
                notificationHandler,
                data
            );
        }
    },
    /**
     * @private
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {MessagingNotificationHandler} notificationHandler
     * @param {Object} data
     * @param {Object} data.message
     */
    'MessagingNotificationHandler/_handleNotificationPartnerAuthor'(
        { env },
        notificationHandler,
        data
    ) {
        env.invoke(
            'Message/insert',
            env.invoke('Message/convertData', data.message)
        );
    },
    /**
     * @private
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {MessagingNotificationHandler} notificationHandler
     * @param {Object} data
     * @param {string} data.channel_type
     * @param {integer} data.id
     * @param {string} [data.info]
     * @param {boolean} data.is_minimized
     * @param {string} data.name
     * @param {string} data.state
     * @param {string} data.uuid
     */
    'MessagingNotificationHandler/_handleNotificationPartnerChannel'(
        { env },
        notificationHandler,
        data
    ) {
        const convertedData = env.invoke('Thread/convertData', {
            $$$model: 'mail.channel',
            ...data
        });
        if (!convertedData.$$$members) {
            // channel_info does not return all members of channel for
            // performance reasons, but code is expecting to know at
            // least if the current partner is member of it.
            // (e.g. to know when to display "invited" notification)
            // Current partner can always be assumed to be a member of
            // channels received through this notification.
            convertedData.$$$members = link(env.messaging.$$$currentPartner(this));
        }
        let channel = env.invoke('Thread/findFromId', convertedData);
        const wasCurrentPartnerMember = (
            channel &&
            channel.$$$members(this).includes(env.messaging.$$$currentPartner(this))
        );

        channel = env.invoke('Thread/insert', convertedData);
        if (
            channel.$$$channelType(this) === 'channel' &&
            data.info !== 'creation' &&
            !wasCurrentPartnerMember
        ) {
            env.services['notification'].notify({
                message: _.str.sprintf(
                    env._t("You have been invited to: %s"),
                    owl.utils.escape(channel.$$$name(this))
                ),
                title: env._t("Invitation"),
                type: 'warning',
            });
        }
        // a new thread with unread messages could have been added
        // manually force recompute of counter
        env.invoke('Record/update',
            notificationHandler.$$$messaging(this).$$$messagingMenu(this)
        );
    },
    /**
     * @private
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {MessagingNotificationHandler} notificationHandler
     * @param {Object} param2
     * @param {integer[]} param2.messag_ids
     */
    'MessagingNotificationHandler/_handleNotificationPartnerDeletion'(
        { env },
        notificationHandler,
        { message_ids }
    ) {
        const moderationMailbox = env.messaging.$$$moderation(this);
        for (const id of message_ids) {
            const message = env.invoke('Message/findFromId', { $$$id: id });
            if (message) {
                if (
                    message.$$$moderationStatus(this) === 'pending_moderation' &&
                    message.$$$originThread(this).$$$isModeratedByCurrentPartner(this)
                ) {
                    env.invoke('Record/update', moderationMailbox, {
                        $$$counter: moderationMailbox.$$$counter(this) - 1,
                    });
                }
                env.invoke('Record/delete', message);
            }
        }
        // deleting message might have deleted notifications, force recompute
        env.invoke(
            'NotificationGroupManager/computeGroups',
            notificationHandler.$$$messaging(this).$$$notificationGroupManager(this)
        );
        // manually force recompute of counter (after computing the groups)
        env.invoke(
            'Record/update',
            notificationHandler.$$$messaging(this).$$$messagingMenu(this)
        );
    },
    /**
     * @private
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {MessagingNotificationHandler} notificationHandler
     * @param {Object} data
     */
    'MessagingNotificationHandler/_handleNotificationPartnerMessageNotificationUpdate'(
        { env },
        notificationHandler,
        data
    ) {
        for (const messageData of data) {
            const message = env.invoke('Message/insert',
                env.invoke('Message/convertData', messageData)
            );
            // implicit: failures are sent by the server as notification
            // only if the current partner is author of the message
            if (
                !message.$$$author(this) &&
                notificationHandler.$$$messaging(this).$$$currentPartner(this)
            ) {
                env.invoke('Record/update', message, {
                    $$$author: link(
                        notificationHandler.$$$messaging(this).$$$currentPartner(this)
                    ),
                });
            }
        }
        env.invoke(
            'NotificationGroupManager/computeGroups',
            notificationHandler.$$$messaging(this).$$$notificationGroupManager(this)
        );
        // manually force recompute of counter (after computing the groups)
        env.invoke(
            'Record/update',
            notificationHandler.$$$messaging(this).$$$messagingMenu(this)
        );
    },
    /**
     * @private
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {MessagingNotificationHandler} notificationHandler
     * @param {Object} param2
     * @param {integer[]} [param2.channel_ids
     * @param {integer[]} [param2.message_ids=[]]
     */
    'MessagingNotificationHandler/_handleNotificationPartnerMarkAsRead'(
        { env },
        notificationHandler,
        {
            channel_ids,
            message_ids = [],
        }
    ) {
        const inboxMailbox = env.messaging.$$$inbox(this);

        // 1. move messages from inbox to history
        for (const message_id of message_ids) {
            // We need to ignore all not yet known messages because we don't want them
            // to be shown partially as they would be linked directly to mainCache
            // Furthermore, server should not send back all message_ids marked as read
            // but something like last read message_id or something like that.
            // (just imagine you mark 1000 messages as read ... )
            const message = env.invoke('Message/findFromId', { $$$id: message_id });
            if (message) {
                env.invoke('Record/update', message, {
                    $$$isNeedaction: false,
                    $$$isHistory: true,
                });
            }
        }

        // 2. remove "needaction" from channels
        let channels;
        if (channel_ids) {
            channels = channel_ids
                .map(
                    id => env.invoke('Thread/findFromId', {
                        $$$id: id,
                        $$$model: 'mail.channel',
                    })
                )
                .filter(thread => !!thread);
        } else {
            // flux specific: channel_ids unset means "mark all as read"
            channels = env.invoke(
                'Thread/all',
                thread => thread.$$$model(this) === 'mail.channel'
            );
        }
        for (const channel of channels) {
            env.invoke('Record/update', channel, {
                $$$messageNeedactionCounter: 0,
            });
        }
        env.invoke('Record/update', inboxMailbox, {
            $$$counter: inboxMailbox.$$$counter(this) - message_ids.length,
        });
        // manually force recompute of counter
        env.invoke(
            'Record/update',
            notificationHandler.$$$messaging(this).$$$messagingMenu(this)
        );
    },
    /**
     * @private
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {MessagingNotificationHandler} notificationHandler
     * @param {Object} param2
     * @param {Object} param2.message
     */
    'MessagingNotificationHandler/_handleNotificationPartnerModerator'(
        { env },
        notificationHandler,
        { message: data }
    ) {
        env.invoke('Message/insert',
            env.invoke('Message/convertData', data)
        );
        const moderationMailbox = env.messaging.$$$moderation(this);
        if (moderationMailbox) {
            env.invoke('Record/update', moderationMailbox, {
                $$$counter: moderationMailbox.$$$counter(this) + 1,
            });
        }
        // manually force recompute of counter
        env.invoke(
            'Record/update',
            notificationHandler.$$$messaging(this).$$$messagingMenu(this)
        );
    },
    /**
     * @private
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {MessagingNotificationHandler} notificationHandler
     * @param {Object} param2
     * @param {integer[]} param2.message_ids
     * @param {boolean} param2.starred
     */
    'MessagingNotificationHandler/_handleNotificationPartnerToggleStar'(
        { env },
        notificationHandler,
        {
            message_ids = [],
            starred,
        }
    ) {
        const starredMailbox = env.messaging.$$$starred(this);
        for (const messageId of message_ids) {
            const message = env.invoke(
                'Message/findFromId',
                { $$$id: messageId }
            );
            if (!message) {
                continue;
            }
            env.invoke('Record/update', message, {
                $$$isStarred: starred,
            });
            env.invoke('Record/update', starredMailbox, {
                $$$counter: starred
                    ? starredMailbox.$$$counter(this) + 1
                    : starredMailbox.$$$counter(this) - 1,
            });
        }
    },
    /**
     * On receiving a transient message, i.e. a message which does not come
     * from a member of the channel. Usually a log message, such as one
     * generated from a command with ('/').
     *
     * @private
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {MessagingNotificationHandler} notificationHandler
     * @param {Object} data
     */
    'MessagingNotificationHandler/_handleNotificationPartnerTransientMessage'(
        { env },
        notificationHandler,
        data
    ) {
        const convertedData = env.invoke('Message/convertData', data);
        const lastMessageId = env.invoke('Message/all').reduce(
            (lastMessageId, message) => Math.max(lastMessageId, message.$$$id(this)),
            0
        );
        const partnerRoot = env.messaging.$$$partnerRoot(this);
        const message = env.invoke('Message/create', {
            ...convertedData,
            $$$author: link(partnerRoot),
            $$$id: lastMessageId + 0.01,
            $$$isTransient: true,
        });
        env.invoke('MessagingNotificationHandler/_notifyThreadViewsMessageReceived',
            notificationHandler,
            message
        );
        // manually force recompute of counter
        env.invoke('Record/update',
            notificationHandler.$$$messaging(this).$$$messagingMenu(this)
        );
    },
    /**
     * @private
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {MessagingNotificationHandler} notificationHandler
     * @param {integer} channelId
     */
    'MessagingNotificationHandler/_handleNotificationPartnerUnsubscribe'(
        { env },
        notificationHandler,
        channelId
    ) {
        const channel = env.invoke('Thread/findFromId', {
            $$$id: channelId,
            $$$model: 'mail.channel',
        });
        if (!channel) {
            return;
        }
        let message;
        if (channel.$$$correspondent(this)) {
            const correspondent = channel.$$$correspondent(this);
            message = _.str.sprintf(
                env._t("You unpinned your conversation with <b>%s</b>."),
                owl.utils.escape(correspondent.$$$name(this))
            );
        } else {
            message = _.str.sprintf(
                env._t("You unsubscribed from <b>%s</b>."),
                owl.utils.escape(channel.$$$name(this))
            );
        }
        // We assume that arriving here the server has effectively
        // unpinned the channel
        env.invoke('Record/update', channel, {
            $$$isServerPinned: false,
        });
        env.services['notification'].notify({
            message,
            title: env._t("Unsubscribed"),
            type: 'warning',
        });
    },
    /**
     * @private
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {MessagingNotificationHandler} notificationHandler
     * @param {Object} param2
     * @param {string} param2.message
     * @param {integer} param2.partner_id
     * @param {string} param2.title
     */
    async 'MessagingNotificationHandler/_handleNotificationPartnerUserConnection'(
        { env },
        notificationHandler,
        {
            message,
            partner_id,
            title,
        }
    ) {
        // If the current user invited a new user, and the new user is
        // connecting for the first time while the current user is present
        // then open a chat for the current user with the new user.
        env.services['bus_service'].sendNotification(title, message);
        const chat = await doAsync(
            notificationHandler,
            () => env.invoke('Messaging/getChat', { partnerId: partner_id })
        );
        if (!chat) {
            return;
        }
        env.invoke('ChatWindowManager/openThread',
            env.messaging.$$$chatWindowManager(this),
            chat
        );
    },
    /**
     * @private
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {MessagingNotificationHandler} notificationHandler
     * @param {Object} param2
     * @param {Thread} param2.channel
     * @param {Message} param2.message
     */
    'MessagingNotificationHandler/_notifyNewChannelMessageWhileOutOfFocus'(
        { env },
        notificationHandler,
        {
            channel,
            message,
        }
    ) {
        const author = message.$$$author(this);
        const messaging = env.messaging;
        let notificationTitle;
        if (!author) {
            notificationTitle = env._t("New message");
        } else {
            const authorName = author.$$$nameOrDisplayName(this);
            if (channel.$$$channelType(this) === 'channel') {
                // hack: notification template does not support OWL components,
                // so we simply use their template to make HTML as if it comes
                // from component
                const channelIcon = env.qweb.renderToString('mail.ThreadIcon', {
                    env,
                    thread: channel,
                });
                const channelName = owl.utils.escape(channel.$$$displayName(this));
                const channelNameWithIcon = channelIcon + channelName;
                notificationTitle = _.str.sprintf(
                    env._t("%s from %s"),
                    owl.utils.escape(authorName),
                    channelNameWithIcon
                );
            } else {
                notificationTitle = owl.utils.escape(authorName);
            }
        }
        const notificationContent = message.$$$prettyBody(this).substr(0, PREVIEW_MSG_MAX_SIZE);
        env.services['bus_service'].sendNotification(notificationTitle, notificationContent);
        env.invoke('Record/update', messaging, {
            $$$outOfFocusUnreadMessageCounter: messaging.$$$outOfFocusUnreadMessageCounter(this) + 1,
        });
        const titlePattern = messaging.$$$outOfFocusUnreadMessageCounter(this) === 1
            ? env._t("%d Message")
            : env._t("%d Messages");
        env.bus.trigger('set_title_part', {
            part: '_chat',
            title: _.str.sprintf(titlePattern, messaging.$$$outOfFocusUnreadMessageCounter(this)),
        });
    },
    /**
     * Notifies threadViews about the given message being just received.
     * This can allow them adjust their scroll position if applicable.
     *
     * @private
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {MessagingNotificationHandler} notificationHandler
     * @param {Message} message
     */
    'MessagingNotificationHandler/_notifyThreadViewsMessageReceived'(
        { env },
        notificationHandler,
        message
    ) {
        for (const thread of message.$$$threads(this)) {
            for (const threadView of thread.$$$threadViews(this)) {
                env.invoke('ThreadView/addComponentHint',
                    threadView,
                    'message-received',
                    { message }
                );
            }
        }
    },
});

const model = defineModel({
    name: 'MessagingNotificationHandler',
    fields: {
        $$$messaging: one2one('Messaging', {
            inverse: '$$$notificationHandler',
        }),
    },
});

return defineFeatureSlice(
    'mail/static/src/models/messaging-notification-handler/messaging-notification-handler.js',
    actions,
    model,
);

});
