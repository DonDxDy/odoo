odoo.define('mail/static/src/components/notification-list/notification-list.js', function (require) {
'use strict';

const useStore = require('mail/static/src/component-hooks/use-store/use-store.js');
const usingModels = require('mail/static/src/component-mixins/using-models/using-models.js');

const { Component, QWeb } = owl;

class NotificationList extends usingModels(Component) {

    /**
     * @override
     */
    constructor(...args) {
        super(...args);
        this.storeProps = useStore((...args) => this._useStoreSelector(...args), {
            compareDepth: {
                // list + notification object created in useStore
                notifications: 2,
            },
        });
    }

    mounted() {
        this._loadPreviews();
    }

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * @returns {Object[]}
     */
    get notifications() {
        const { notifications } = this.storeProps;
        return notifications;
    }

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * Load previews of given thread. Basically consists of fetching all missing
     * last messages of each thread.
     *
     * @private
     */
    async _loadPreviews() {
        const threads = this.notifications
            .filter(
                notification => (
                    notification.thread &&
                    this.env.invoke('Record/get', notification.localId)
                )
            )
            .map(notification => notification.thread);
        this.env.invoke('Thread/loadPreviews', threads);
    }

    /**
     * @private
     * @param {Object} props
     */
    _useStoreSelector(props) {
        const threads = this._useStoreSelectorThreads(props);
        let threadNeedactionNotifications = [];
        if (props.filter === 'all') {
            // threads with needactions
            threadNeedactionNotifications = this.env.invoke('Thread/all',
                    t => (
                        t.$$$model(this) !== 'mail.box' &&
                        t.$$$needactionMessages(this).length > 0
                    )
                )
                .sort(
                    (t1, t2) => {
                        if (
                            t1.$$$needactionMessages(this).length > 0 &&
                            t2.$$$needactionMessages(this).length === 0
                        ) {
                            return -1;
                        }
                        if (
                            t1.$$$needactionMessages(this).length === 0 &&
                            t2.$$$needactionMessages(this).length > 0
                        ) {
                            return 1;
                        }
                        if (
                            t1.$$$lastNeedactionMessage(this) &&
                            t2.$$$lastNeedactionMessage(this)
                        ) {
                            return (
                                t1.$$$lastNeedactionMessage(this).$$$date(this).isBefore(
                                    t2.$$$lastNeedactionMessage(this).$$$date(this)
                                )
                                ? 1
                                : -1
                            );
                        }
                        if (t1.$$$lastNeedactionMessage(this)) {
                            return -1;
                        }
                        if (t2.$$$lastNeedactionMessage(this)) {
                            return 1;
                        }
                        return t1.$$$id(this) < t2.$$$id(this) ? -1 : 1;
                    }
                )
                .map(
                    thread => {
                        return {
                            thread,
                            type: 'thread_needaction',
                            uniqueId: thread.localId + '_needaction',
                        };
                    }
                );
        }
        // thread notifications
        const threadNotifications = threads
            .sort(
                (t1, t2) => {
                    if (
                        t1.$$$localMessageUnreadCounter(this) > 0 &&
                        t2.$$$localMessageUnreadCounter(this) === 0
                    ) {
                        return -1;
                    }
                    if (
                        t1.$$$localMessageUnreadCounter(this) === 0 &&
                        t2.$$$localMessageUnreadCounter(this) > 0
                    ) {
                        return 1;
                    }
                    if (
                        t1.$$$lastMessage(this) &&
                        t2.$$$lastMessage(this)
                    ) {
                        return (
                            t1.$$$lastMessage(this).$$$date(this).isBefore(
                                t2.$$$lastMessage(this).$$$date(this)
                            )
                            ? 1
                            : -1
                        );
                    }
                    if (t1.$$$lastMessage(this)) {
                        return -1;
                    }
                    if (t2.$$$lastMessage(this)) {
                        return 1;
                    }
                    return t1.$$$id(this) < t2.$$$id(this) ? -1 : 1;
                }
            )
            .map(
                thread => {
                    return {
                        thread,
                        type: 'thread',
                        uniqueId: thread.localId,
                    };
                }
            );
        let notifications = threadNeedactionNotifications.concat(threadNotifications);
        if (props.filter === 'all') {
            const notificationGroups =
                this.env.messaging.$$$notificationGroupManager(this).$$$groups(this);
            notifications = Object.values(notificationGroups)
                .sort(
                    (group1, group2) => (
                        group1.$$$date(this).isAfter(
                            group2.$$$date(this)
                        )
                        ? -1
                        : 1
                    )
                ).map(
                    notificationGroup => {
                        return {
                            notificationGroup,
                            uniqueId: notificationGroup.localId,
                        };
                    }
                ).concat(notifications);
        }
        // native notification request
        if (
            props.filter === 'all' &&
            this.env.invoke('Messaging/isNotificationPermissionDefault')
        ) {
            notifications.unshift({
                type: 'odoobotRequest',
                uniqueId: 'odoobotRequest',
            });
        }
        return {
            isDeviceMobile: this.env.messaging.$$$device(this).$$$isMobile(this),
            notifications,
        };
    }

    /**
     * @private
     * @param {Object} props
     * @throws {Error} in case `props.filter` is not supported
     * @returns {Thread[]}
     */
    _useStoreSelectorThreads(props) {
        if (props.filter === 'mailbox') {
            return this.env.invoke('Thread/all',
                    thread => (
                        thread.$$$isPinned(this) &&
                        thread.$$$model(this) === 'mail.box'
                    )
                )
                .sort(
                    (mailbox1, mailbox2) => {
                        if (mailbox1 === this.env.messaging.$$$inbox(this)) {
                            return -1;
                        }
                        if (mailbox2 === this.env.messaging.$$$inbox(this)) {
                            return 1;
                        }
                        if (mailbox1 === this.env.messaging.$$$starred(this)) {
                            return -1;
                        }
                        if (mailbox2 === this.env.messaging.$$$starred(this)) {
                            return 1;
                        }
                        const mailbox1Name = mailbox1.$$$displayName(this);
                        const mailbox2Name = mailbox2.$$$displayName(this);
                        mailbox1Name < mailbox2Name ? -1 : 1;
                    }
                );
        } else if (props.filter === 'channel') {
            return this.env.invoke('Thread/all',
                    thread => (
                        thread.$$$channelType(this) === 'channel' &&
                        thread.$$$isPinned(this) &&
                        thread.$$$model(this) === 'mail.channel'
                    )
                )
                .sort(
                    (c1, c2) => (
                        c1.$$$displayName(this) < c2.$$$displayName(this)
                        ? -1
                        : 1
                    )
                );
        } else if (props.filter === 'chat') {
            return this.env.invoke('Thread/all',
                    thread => (
                        thread.$$$isChatChannel(this) &&
                        thread.$$$isPinned(this) &&
                        thread.$$$model(this) === 'mail.channel'
                    )
                )
                .sort(
                    (c1, c2) => (
                        c1.$$$displayName(this) < c2.$$$displayName(this)
                        ? -1
                        : 1
                    )
                );
        } else if (props.filter === 'all') {
            // "All" filter is for channels and chats
            return this.env.invoke('Thread/all',
                    thread => (
                        thread.$$$isPinned(this) &&
                        thread.$$$model(this) === 'mail.channel'
                    )
                )
                .sort(
                    (c1, c2) => (
                        c1.$$$displayName(this) < c2.$$$displayName(this)
                        ? -1
                        : 1
                    )
                );
        } else {
            throw new Error(`Unsupported filter ${props.filter}`);
        }
    }

}

Object.assign(NotificationList, {
    _allowedFilters: ['all', 'mailbox', 'channel', 'chat'],
    defaultProps: {
        filter: 'all',
    },
    props: {
        filter: {
            type: String,
            validate: prop => NotificationList._allowedFilters.includes(prop),
        },
    },
    template: 'mail.NotificationList',
});

QWeb.registerComponent('NotificationList', NotificationList);

return NotificationList;

});
