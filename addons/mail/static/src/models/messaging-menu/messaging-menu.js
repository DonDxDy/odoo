odoo.define('mail/static/src/models/messaging-menu/messaging-menu.js', function (require) {
'use strict';

const {
    'Feature/defineActions': defineActions,
    'Feature/defineModel': defineModel,
    'Feature/defineSlice': defineFeatureSlice,
    'Field/attr': attr,
    'Field/one2one': one2one,
} = require('mail/static/src/model/utils.js');

const actions = defineActions({
    /**
     * Close the messaging menu. Should reset its internal state.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {MessagingMenu} messagingMenu
     */
    'MessagingMenu/close'(
        { env },
        messagingMenu
    ) {
        env.invoke('Record/update', messagingMenu, {
            $$$activeTabId: 'all',
            $$$isMobileNewMessageToggled: false,
            $$$isOpen: false,
        });
    },
    /**
     * Toggle the visibility of the messaging menu "new message" input in
     * mobile.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {MessagingMenu} messagingMenu
     */
    'MessagingMenu/toggleMobileNewMessage'(
        { env },
        messagingMenu
    ) {
        env.invoke('Record/update', messagingMenu, {
            $$$isMobileNewMessageToggled:
                !messagingMenu.$$$isMobileNewMessageToggled(this),
        });
    },
    /**
     * Toggle whether the messaging menu is open or not.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {MessagingMenu} messagingMenu
     */
    'MessagingMenu/toggleOpen'(
        { env },
        messagingMenu
    ) {
        env.invoke('Record/update', messagingMenu, {
            $$$isOpen: !messagingMenu.$$$isOpen(this),
        });
    },
});

const model = defineModel({
    name: 'MessagingMenu',
    fields: {
        /**
         * Tab selected in the messaging menu.
         * Either 'all', 'chat' or 'channel'.
         */
        $$$activeTabId: attr({
            default: 'all',
        }),
        $$$counter: attr({
            default: 0,
        }),
        /**
         * Dummy field to automatically load messages of inbox when messaging
         * menu is open.
         *
         * Useful because needaction notifications require fetching inbox
         * messages to work.
         */
        $$$inboxMessagesAutoloader: attr({
            /**
             * @param {Object} param0
             * @param {web.env} param0.env
             * @param {MessagingMenu} param0.record
             */
            compute({ env, record }) {
                if (!record.$$$isOpen(this)) {
                    return;
                }
                const inbox = env.messaging.$$$inbox(this);
                if (!inbox || !inbox.$$$mainCache(this)) {
                    return;
                }
                // populate some needaction messages on threads.
                env.invoke('Record/update',
                    inbox.$$$mainCache(this),
                    {
                        $$$isCacheRefreshRequested: true,
                    }
                );
            },
        }),
        /**
         * Determine whether the mobile new message input is visible or not.
         */
        $$$isMobileNewMessageToggled: attr({
            default: false,
        }),
        /**
         * Determine whether the messaging menu dropdown is open or not.
         */
        $$$isOpen: attr({
            default: false,
        }),
        $$$messaging: one2one('Messaging', {
            inverse: '$$$messagingMenu',
        }),
        $$$messagingInbox: one2one('Thread', {
            related: '$$$messaging.$$$inbox',
        }),
        $$$messagingInboxMainCache: one2one('ThreadCache', {
            related: '$$$messagingInbox.$$$mainCache',
        }),
    },
});

return defineFeatureSlice(
    'mail/static/src/models/messaging-menu/messaging-menu.js',
    actions,
    model,
);

// function factory(dependencies) {

//     class MessagingMenu extends dependencies['mail.model'] {

//         /**
//          * @private
//          * @returns {integer}
//          */
//         _updateCounter() {
//             if (!this.env.messaging) {
//                 return 0;
//             }
//             const inboxMailbox = this.env.messaging.$$$inbox(this);
//             const unreadChannels = this.env.invoke('Thread/all', thread =>
//                 thread.$$$localMessageUnreadCounter(this) > 0 &&
//                 thread.$$$model(this) === 'mail.channel' &&
//                 thread.$$$isPinned(this)
//             );
//             let counter = unreadChannels.length;
//             if (inboxMailbox) {
//                 counter += inboxMailbox.$$$counter(this);
//             }
//             if (this.$$$messaging(this).$$$notificationGroupManager(this)) {
//                 counter += this.$$$messaging(this).$$$notificationGroupManager(this).$$$groups(this).reduce(
//                     (total, group) => total + group.$$$notifications(this).length,
//                     0
//                 );
//             }
//             if (this.env.invoke('Messaging/isNotificationPermissionDefault') {
//                 counter++;
//             }
//             return counter;
//         }

//         /**
//          * @override
//          */
//         _updateAfter(previous) {
//             // AKU TODO
//             // const counter = this._updateCounter();
//             // if (this.$$$counter(this) !== counter) {
//             //     this.update({
//             //         $$$counter: counter,
//             //     });
//             // }
//         }

//     }
// }

});
