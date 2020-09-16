odoo.define('mail/static/src/models/messaging/messaging.js', function (require) {
'use strict';

const {
    'Feature/defineActions': defineActions,
    'Feature/defineModel': defineModel,
    'Feature/defineSlice': defineFeatureSlice,
    'Field/attr': attr,
    'Field/create': create,
    'Field/many2one': many2one,
    'Field/one2many': one2many,
    'Field/one2one': one2one,
} = require('mail/static/src/model/utils.js');

const actions = defineActions({
    /**
     * Open the form view of the record with provided id and model.
     * Gets the chat with the provided person and returns it.
     *
     * If a chat is not appropriate, a notification is displayed instead.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Object} param1
     * @param {integer} [param1.partnerId]
     * @param {integer} [param1.userId]
     * @returns {Thread|undefined}
     */
    async 'Messaging/getChat'(
        { env },
        {
            partnerId,
            userId,
        }
    ) {
        if (userId) {
            const user = env.invoke('User/insert', {
                $$$id: userId,
            });
            return env.invoke('User/getChat', user);
        }
        if (partnerId) {
            const partner = env.invoke('Partner/insert', {
                $$$id: partnerId,
            });
            return env.invoke('Partner/getChat', partner);
        }
    },
    /**
     * @param {Object} param0
     * @param {web.env} param0.env
     * @returns {boolean}
     */
    'Messaging/isNotificationPermissionDefault'(
        { env }
    ) {
        const windowNotification = env.browser.Notification;
        return windowNotification
            ? windowNotification.permission === 'default'
            : false;
    },
    /**
     * Opens a chat with the provided person and returns it.
     *
     * If a chat is not appropriate, a notification is displayed instead.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Messaging} messaging
     * @param {Object} person forwarded to @see `Messaging/getChat`
     * @param {Object} [options] forwarded to @see `Thread/open`
     * @returns {thread|undefined}
     */
    async 'Messaging/openChat'(
        { env },
        messaging,
        person,
        options
    ) {
        const chat = await env.invoke(
            'Record/doAsync',
            messaging,
            () => env.invoke('Messaging/getChat', person)
        );
        if (!chat) {
            return;
        }
        await env.invoke(
            'Record/doAsync',
            messaging,
            () => env.invoke('Thread/open', chat, options)
        );
        return chat;
    },
    /**
     * Opens the form view of the record with provided id and model.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Object} param1
     * @param {integer} param1.id
     * @param {string} param1.model
     */
    async 'Messaging/openDocument'(
        { env },
        {
            id,
            model,
        }
    ) {
        env.bus.trigger('do-action', {
            action: {
                type: 'ir.actions.act_window',
                res_model: model,
                views: [[false, 'form']],
                res_id: id,
            },
        });
        if (env.messaging.$$$device(this).$$$isMobile(this)) {
            // messaging menu has a higher z-index than views so it must
            // be closed to ensure the visibility of the view
            env.invoke(
                'MessagingMenu/close',
                env.messaging.$$$messagingMenu(this)
            );
        }
    },
    /**
     * Opens the most appropriate view that is a profile for provided id and
     * model.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Messaging} messaging
     * @param {Object} param2
     * @param {integer} param2.id
     * @param {string} param2.model
     */
    async 'Messaging/openProfile'(
        { env },
        messaging,
        {
            id,
            model,
        }
    ) {
        if (model === 'res.partner') {
            const partner = env.invoke('Partner/insert', {
                $$$id: id,
            });
            return env.invoke('Partner/openProfile', partner);
        }
        if (model === 'res.users') {
            const user = env.invoke('User/insert', {
                $$$id: id,
            });
            return env.invoke('User/openProfile', user);
        }
        if (model === 'mail.channel') {
            let channel = env.invoke('Thread/findFromId', {
                $$$: id,
                $$$model: 'mail.channel',
            });
            if (!channel) {
                channel = (
                    await env.invoke(
                        'Record/doAsync',
                        messaging,
                        () => env.invoke('Thread/performRpcChannelInfo', {
                            ids: [id],
                        })
                    )
                )[0];
            }
            if (!channel) {
                env.services['notification'].notify({
                    message: env._t("You can only open the profile of existing channels."),
                    type: 'warning',
                });
                return;
            }
            return env.invoke('Thread/openProfile', channel);
        }
        return env.invoke('Messaging/openDocument', { id, model });
    },
    /**
     * Starts messaging and related records.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Messaging} messaging
     */
    async 'Messaging/start'(
        { env },
        messaging
    ) {
        const _onWindowFocus = () => {
            () => env.invoke('Messaging/_handleGlobalWindowFocus', messaging);
        };
        Object.assign(messaging, { _onWindowFocus });
        env.services['bus_service'].on(
            'window_focus',
            null,
            messaging._onWindowFocus
        );
        await env.invoke(
            'Record/doAsync',
            messaging,
            () => env.invoke(
                'MessagingInitializer/start',
                messaging.$$$initializer(this)
            )
        );
        env.invoke(
            'MessagingNotificationHandler/start',
            messaging.$$$notificationHandler(this)
        );
        env.invoke('Record/update', messaging, {
            $$$isInitialized: true,
        });
    },
    /**
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Messaging} messaging
     */
    'Messaging/stop'(
        { env },
        messaging
    ) {
        env.services['bus_service'].off(
            'window_focus',
            null,
            messaging._onWindowFocus
        );
        messaging._onWindowFocus = () => {};
        env.invoke(
            'MessagingInitializer/stop',
            messaging.$$$initializer(this)
        );
        env.invoke(
            'MessagingNotificationHandler/stop',
            messaging.$$$notificationHandler(this)
        );
    },
    /**
     * @private
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Messaging} messaging
     */
    'Messaging/_handleGlobalWindowFocus'(
        { env },
        messaging
    ) {
        env.invoke('Record/update', messaging, {
            $$$outOfFocusUnreadMessageCounter: 0,
        });
        env.bus.trigger('set_title_part', {
            part: '_chat',
        });
    }
});

const model = defineModel({
    name: 'Messaging',
    fields: {
        $$$cannedResponses: one2many('CannedResponse'),
        $$$chatWindowManager: one2one('ChatWindowManager', {
            default: create(),
            inverse: '$$$messaging',
            isCausal: true,
            readonly: true,
        }),
        $$$commands: one2many('ChannelCommand'),
        $$$currentPartner: one2one('Partner'),
        $$$currentUser: one2one('User'),
        $$$device: one2one('Device', {
            default: create(),
            isCausal: true,
            readonly: true,
        }),
        $$$dialogManager: one2one('DialogManager', {
            default: create(),
            isCausal: true,
            readonly: true,
        }),
        $$$discuss: one2one('Discuss', {
            default: create(),
            inverse: '$$$messaging',
            isCausal: true,
            readonly: true,
        }),
        /**
         * Mailbox History.
         */
        $$$history: one2one('Thread'),
        /**
         * Mailbox Inbox.
         */
        $$$inbox: one2one('Thread'),
        $$$initializer: one2one('MessagingInitializer', {
            default: create(),
            inverse: '$$$messaging',
            isCausal: true,
            readonly: true,
        }),
        $$$isInitialized: attr({
            default: false,
        }),
        $$$locale: one2one('Locale', {
            default: create(),
            isCausal: true,
            readonly: true,
        }),
        $$$messagingMenu: one2one('MessagingMenu', {
            default: create(),
            inverse: '$$$messaging',
            isCausal: true,
            readonly: true,
        }),
        /**
         * Mailbox Moderation.
         */
        $$$moderation: one2one('Thread'),
        $$$notificationGroupManager: one2one('NotificationGroupManager', {
            default: create(),
            isCausal: true,
            readonly: true,
        }),
        $$$notificationHandler: one2one('MessagingNotificationHandler', {
            default: create(),
            inverse: '$$$messaging',
            isCausal: true,
            readonly: true,
        }),
        $$$outOfFocusUnreadMessageCounter: attr({
            default: 0,
        }),
        $$$partnerRoot: many2one('Partner'),
        $$$publicPartner: many2one('Partner'),
        /**
         * Mailbox Starred.
         */
        $$$starred: one2one('Thread'),
    },
});

return defineFeatureSlice(
    'mail/static/src/models/messaging/messaging.js',
    actions,
    model,
);

});
