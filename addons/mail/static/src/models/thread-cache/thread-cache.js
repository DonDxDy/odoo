odoo.define('mail/static/src/models/thread-cache/thread-cache.js', function (require) {
'use strict';

const {
    'Feature/defineActions': defineActions,
    'Feature/defineModel': defineModel,
    'Feature/defineSlice': defineFeatureSlice,
    'Field/attr': attr,
    'Field/link': link,
    'Field/many2many': many2many,
    'Field/many2one': many2one,
    'Field/one2many': one2many,
    'Field/replace': replace,
    'Field/unlink': unlink,
    'Field/unlinkAll': unlinkAll,
} = require('mail/static/src/model/utils.js');

const actions = defineActions({
    /**
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {ThreadCache} threadCache
     * @returns {Message[]|undefined}
     */
    async 'ThreadCache/loadMoreMessages'(
        { env },
        threadCache
    ) {
        if (
            threadCache.$$$isAllHistoryLoaded(this) ||
            threadCache.$$$isLoading(this)
        ) {
            return;
        }
        if (!threadCache.$$$isLoaded(this)) {
            env.invoke('Record/update', threadCache, {
                $$$isCacheRefreshRequested: true,
            });
            return;
        }
        env.invoke('Record/update', threadCache, {
            $$$isLoadingMore: true,
        });
        const messageIds = threadCache.$$$fetchedMessages(this).map(
            message => message.$$$id(this)
        );
        const limit = 30;
        const fetchedMessages = await env.invoke(
            'Record/doAsync',
            threadCache,
            () => env.invoke('ThreadCache/_loadMessages', {
                extraDomain: [['id', '<', Math.min(...messageIds)]],
                limit,
            })
        );
        env.invoke('Record/update', threadCache, {
            $$$isLoadingMore: false,
        });
        if (fetchedMessages.length < limit) {
            env.invoke('Record/update', threadCache, {
                $$$isAllHistoryLoaded: true,
            });
        }
        for (const threadView of threadCache.$$$threadViews(this)) {
            env.invoke(
                'ThreadView/addComponentHint',
                threadView,
                'more-messages-loaded',
                { fetchedMessages }
            );
        }
        return fetchedMessages;
    },
    /**
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {ThreadCache} threadCache
     * @returns {Message[]|undefined}
     */
    async 'ThreadCache/loadNewMessages'(
        { env },
        threadCache
    ) {
        if (threadCache.$$$isLoading(this)) {
            return;
        }
        if (!threadCache.$$$isLoaded(this)) {
            env.invoke('Record/update', threadCache, {
                $$$isCacheRefreshRequested: true,
            });
            return;
        }
        const messageIds = threadCache.$$$fetchedMessages(this).map(
            message => message.$$$id(this)
        );
        const fetchedMessages = env.invoke('ThreadCache/_loadMessages', {
            extraDomain: [['id', '>', Math.max(...messageIds)]],
            limit: false,
        });
        for (const threadView of threadCache.$$$threadViews(this)) {
            env.invoke('ThreadView/addComponentHint',
                threadView,
                'new-messages-loaded',
                { fetchedMessages }
            );
        }
        return fetchedMessages;
    },
    /**
     * @private
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {ThreadCache} threadCache
     * @param {Array} domain
     * @returns {Array}
     */
    'ThreadCache/_extendMessageDomain'(
        { env },
        threadCache,
        domain
    ) {
        const thread = threadCache.$$$thread(this);
        if (thread.$$$model(this) === 'mail.channel') {
            return domain.concat([['channel_ids', 'in', [thread.$$$id(this)]]]);
        } else if (thread === env.messaging.$$$inbox(this)) {
            return domain.concat([['needaction', '=', true]]);
        } else if (thread === env.messaging.$$$starred(this)) {
            return domain.concat([
                [
                    'starred_partner_ids',
                    'in',
                    [env.messaging.$$$currentPartner(this).$$$id(this)]
                ],
            ]);
        } else if (thread === env.messaging.$$$history(this)) {
            return domain.concat([['needaction', '=', false]]);
        } else if (thread === env.messaging.$$$moderation(this)) {
            return domain.concat([['moderation_status', '=', 'pending_moderation']]);
        } else {
            // Avoid to load user_notification as these messages are not
            // meant to be shown on chatters.
            return domain.concat([
                ['message_type', '!=', 'user_notification'],
                ['model', '=', thread.$$$model(this)],
                ['res_id', '=', thread.$$$id(this)],
            ]);
        }
    },
    /**
     * @private
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {ThreadCache} threadCache
     * @param {Object} [param2={}]
     * @param {Array[]} [param2.extraDomain]
     * @param {integer} [param2.limit=30]
     * @returns {Message[]}
     */
    async 'ThreadCache/_loadMessages'(
        { env },
        threadCache,
        {
            extraDomain,
            limit = 30,
        } = {}
    ) {
        env.invoke('Record/update', threadCache, {
            $$$isLoading: true,
        });
        const searchDomain = JSON.parse(threadCache.$$$stringifiedDomain(this));
        let domain = searchDomain.length ? searchDomain : [];
        domain = env.invoke('ThreadCache/_extendMessageDomain', threadCache, domain);
        if (extraDomain) {
            domain = extraDomain.concat(domain);
        }
        const context = env.session.user_context;
        const moderated_channel_ids = threadCache.$$$thread(this).$$$moderation(this)
            ? [threadCache.$$$thread(this).$$$id(this)]
            : undefined;
        const messages = await env.invoke(
            'Record/doAsync',
            threadCache,
            () => env.invoke('Message/performRpcMessageFetch',
                domain,
                limit,
                moderated_channel_ids,
                context,
            )
        );
        env.invoke('Record/update', threadCache, {
            $$$fetchedMessages: link(messages),
            $$$isLoaded: true,
            $$$isLoading: false,
        });
        if (!extraDomain && messages.length < limit) {
            env.invoke('Record/update', threadCache, {
                $$$isAllHistoryLoaded: true,
            });
        }
        env.messagingBus.trigger('o-thread-cache-loaded-messages', {
            fetchedMessages: messages,
            threadCache,
        });
        return messages;
    },
});

const model = defineModel({
    name: 'ThreadCache',
    fields: {
        $$$checkedMessages: many2many('Message', {
            /**
             * @param {Object} param0
             * @param {ThreadCache} param0.record
             * @returns {Message[]}
             */
            compute({ record }) {
                const messagesWithoutCheckbox = record.$$$checkedMessages(this).filter(
                    message => !message.$$$hasCheckbox(this)
                );
                return unlink(messagesWithoutCheckbox);
            },
            inverse: '$$$checkedThreadCaches',
        }),
        /**
         * List of messages that have been fetched by this cache.
         *
         * This DOES NOT necessarily includes all messages linked to this thread
         * cache (@see messages field for that): it just contains list
         * of successive messages that have been explicitly fetched by this
         * cache. For all non-main caches, this corresponds to all messages.
         * For the main cache, however, messages received from longpolling
         * should be displayed on main cache but they have not been explicitly
         * fetched by cache, so they ARE NOT in this list (at least, not until a
         * fetch on this thread cache contains this message).
         *
         * The distinction between messages and fetched messages is important
         * to manage "holes" in message list, while still allowing to display
         * new messages on main cache of thread in real-time.
         */
        $$$fetchedMessages: many2many('Message', {
            // adjust with messages unlinked from thread
            /**
             * @param {Object} param0
             * @param {ThreadCache} param0.record
             * @returns {Message[]}
             */
            compute({ record }) {
                if (!record.$$$thread(this)) {
                    return unlinkAll();
                }
                const toUnlinkMessages = [];
                for (const message of record.$$$fetchedMessages(this)) {
                    if (!record.$$$thread(this).$$$messages(this).includes(message)) {
                        toUnlinkMessages.push(message);
                    }
                }
                return unlink(toUnlinkMessages);
            },
        }),
        /**
         * Determines whether `this` should load initial messages. This field is
         * computed and should be considered read-only.
         * @see `isCacheRefreshRequested` to request manual refresh of messages.
         */
        $$$hasToLoadMessages: attr({
            /**
             * @param {Object} param0
             * @param {web.env} param0.env
             * @param {ThreadCache} param0.record
             * @returns {boolean}
             */
            compute({ env, record }) {
                if (!record.$$$thread(this)) {
                    // happens during destroy or compute executed in wrong order
                    return false;
                }
                const wasCacheRefreshRequested = record.$$$isCacheRefreshRequested(this);
                // mark hint as processed
                env.invoke('Record/update', record, {
                    $$$isCacheRefreshRequested: false,
                });
                if (record.$$$thread(this).$$$isTemporary(this)) {
                    // temporary threads don't exist on the server
                    return false;
                }
                if (!wasCacheRefreshRequested && record.$$$threadViews(this).length === 0) {
                    // don't load message that won't be used
                    return false;
                }
                if (record.$$$isLoading(this)) {
                    // avoid duplicate RPC
                    return false;
                }
                if (
                    !wasCacheRefreshRequested &&
                    record.$$$isLoaded(this)
                ) {
                    // avoid duplicate RPC
                    return false;
                }
                const isMainCache = record.$$$thread(this).$$$mainCache(this) === record;
                if (
                    isMainCache &&
                    record.$$$isLoaded(this)
                ) {
                    // Ignore request on the main cache if it is already loaded or
                    // loading. Indeed the main cache is automatically sync with
                    // server updates already, so there is never a need to refresh
                    // it past the first time.
                    return false;
                }
                return true;
            },
        }),
        $$$isAllHistoryLoaded: attr({
            default: false,
        }),
        $$$isLoaded: attr({
            default: false,
        }),
        $$$isLoading: attr({
            default: false,
        }),
        $$$isLoadingMore: attr({
            default: false,
        }),
        /**
         * Determines whether `this` should consider refreshing its messages.
         * This field is a hint that may or may not lead to an actual refresh.
         * @see `hasToLoadMessages`
         */
        $$$isCacheRefreshRequested: attr({
            default: false,
        }),
        /**
         * Last message that has been fetched by this thread cache.
         *
         * This DOES NOT necessarily mean the last message linked to this thread
         * cache (@see lastMessage field for that). @see fetchedMessages field
         * for a deeper explanation about "fetched" messages.
         */
        $$$lastFetchedMessage: many2one('Message', {
            /**
             * @param {Object} param0
             * @param {ThreadCache} param0.record
             * @returns {Message|undefined}
             */
            compute({ record }) {
                const {
                    length: l,
                    [l - 1]: lastFetchedMessage,
                } = record.$$$orderedFetchedMessages(this);
                if (!lastFetchedMessage) {
                    return unlink();
                }
                return link(lastFetchedMessage);
            },
        }),
        $$$lastMessage: many2one('Message', {
            /**
             * @param {Object} param0
             * @param {ThreadCache} param0.record
             * @returns {Message|undefined}
             */
            compute({ record }) {
                const {
                    length: l,
                    [l - 1]: lastMessage,
                } = record.$$$orderedMessages(this);
                if (!lastMessage) {
                    return unlink();
                }
                return link(lastMessage);
            },
        }),
        $$$messagesCheckboxes: attr({
            related: '$$$messages.$$$hasCheckbox',
        }),
        /**
         * List of messages linked to this cache.
         */
        $$$messages: many2many('Message', {
            /**
             * @param {Object} param0
             * @param {ThreadCache} param0.record
             * @returns {Message[]}
             */
            compute({ record }) {
                if (!record.$$$thread(this)) {
                    return unlinkAll();
                }
                let messages = record.$$$fetchedMessages(this);
                if (record.$$$stringifiedDomain(this) !== '[]') {
                    return replace(messages);
                }
                // main cache: adjust with newer messages
                let newerMessages;
                if (!record.$$$lastFetchedMessage(this)) {
                    newerMessages = record.$$$thread(this).$$$messages(this);
                } else {
                    newerMessages = record.$$$thread(this).$$$messages(this).filter(message =>
                        message.$$$id(this) > record.$$$lastFetchedMessage(this).$$$id(this)
                    );
                }
                messages = messages.concat(newerMessages);
                return replace(messages);
            }
        }),
        /**
         * IsEmpty trait of all messages.
         * Serves as compute dependency.
         */
        $$$messagesAreEmpty: attr({
            related: '$$$messages.$$$isEmpty'
        }),
        /**
         * List of non empty messages linked to this cache.
         */
        $$$nonEmptyMessages: many2many('Message', {
            /**
             * @param {Object} param0
             * @param {web.env} param0.env
             * @param {ThreadCache} param0.record
             * @returns {Message[]}
             */
            compute({ record }) {
                return replace(
                    record.$$$messages(this).filter(
                        message => !message.$$$isEmpty(this)
                    )
                );
            },
        }),
        /**
         * Loads initial messages from `this`.
         * This is not a "real" field, its compute function is used to trigger
         * the load of messages at the right time.
         */
        $$$onHasToLoadMessagesChanged: attr({
            /**
             * Loads this thread cache, by fetching the most recent messages in this
             * conversation.
             *
             * @param {Object} param0
             * @param {web.env} param0.env
             * @param {ThreadCache} param0.record
             */
            compute({ env, record }) {
                if (!record.$$$hasToLoadMessages(this)) {
                    return;
                }
                env.invoke('ThreadCache/_loadMessages', record).then(fetchedMessages => {
                    for (const threadView of record.$$$threadViews(this)) {
                        env.invoke('ThreadView/addComponentHint',
                            threadView,
                            'messages-loaded',
                            { fetchedMessages }
                        );
                    }
                });
            },
            dependencies: [
                'hasToLoadMessages',
            ],
        }),
        /**
         * Not a real field, used to trigger `_onMessagesChanged` when one of
         * the dependencies changes.
         */
        $$$onMessagesChanged: attr({
            /**
             * Handles change of messages on this thread cache. This is useful to
             * refresh non-main caches that are currently displayed when the main
             * cache receives updates. This is necessary because only the main cache
             * is aware of changes in real time.
             *
             * @param {Object} param0
             * @param {web.env} param0.env
             * @param {ThreadCache} param0.record
             */
            compute({ env, record }) {
                if (!record.$$$thread(this)) {
                    return;
                }
                if (record.$$$thread(this).$$$mainCache(this) !== record) {
                    return;
                }
                for (const threadView of record.$$$thread(this).$$$threadViews(this)) {
                    if (threadView.$$$threadCache(this)) {
                        env.invoke('Record/update',
                            threadView.$$$threadCache(this),
                            {
                                $$$isCacheRefreshRequested: true,
                            }
                        );
                    }
                }
            },
            dependencies: [
                'messages',
                'thread',
                'threadMainCache',
            ],
        }),
        /**
         * Ordered list of messages that have been fetched by this cache.
         *
         * This DOES NOT necessarily includes all messages linked to this thread
         * cache (@see orderedMessages field for that). @see fetchedMessages
         * field for deeper explanation about "fetched" messages.
         */
        $$$orderedFetchedMessages: many2many('Message', {
            /**
             * @param {Object} param0
             * @param {ThreadCache} param0.record
             * @returns {Message[]}
             */
            compute({ record }) {
                return replace(
                    record.$$$fetchedMessages(this).sort((m1, m2) =>
                        m1.$$$id(this) < m2.$$$id(this) ? -1 : 1
                    )
                );
            },
        }),
        /**
         * Ordered list of messages linked to this cache.
         */
        $$$orderedMessages: many2many('Message', {
            /**
             * @param {Object} param0
             * @param {ThreadCache} param0.record
             * @returns {Message[]}
             */
            compute({ record }) {
                return replace(
                    record.$$$messages(this).sort(
                        (m1, m2) => m1.$$$id(this) < m2.$$$id(this) ? -1 : 1
                    )
                );
            },
        }),
        $$$stringifiedDomain: attr({
            default: '[]',
            id: true,
        }),
        $$$thread: many2one('Thread', {
            inverse: '$$$caches',
            id: true,
        }),
        /**
         * Serves as compute dependency.
         */
        $$$threadIsTemporary: attr({
            related: '$$$thread.$$$isTemporary',
        }),
        /**
         * Serves as compute dependency.
         */
        $$$threadMainCache: many2one('ThreadCache', {
            related: '$$$thread.$$$mainCache',
        }),
        $$$threadMessages: many2many('Message', {
            related: '$$$thread.$$$messages',
        }),
        /**
         * States the 'ThreadView' that are currently displaying `this`.
         */
        $$$threadViews: one2many('ThreadView', {
            inverse: '$$$threadCache',
        }),
        $$$uncheckedMessages: many2many('Message', {
            /**
             * @param {Object} param0
             * @param {ThreadCache} param0.record
             * @returns {Message[]}
             */
            compute({ record }) {
                return replace(
                    record.$$$messages(this).filter(
                        message => (
                            message.$$$hasCheckbox(this) &&
                            !record.$$$checkedMessages(this).includes(message)
                        )
                    )
                );
            }
        }),
    },
});

return defineFeatureSlice(
    'mail/static/src/models/thread-cache/thread-cache.js',
    actions,
    model,
);

});
