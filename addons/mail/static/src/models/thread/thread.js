odoo.define('mail/static/src/models/thread/thread.js', function (require) {
'use strict';

const {
    'Feature/defineActions': defineActions,
    'Feature/defineModel': defineModel,
    'Feature/defineSlice': defineFeatureSlice,
    'Field/attr': attr,
    'Field/clear': clear,
    'Field/create': create,
    'Field/insert': insert,
    'Field/insertAndReplace': insertAndReplace,
    'Field/link': link,
    'Field/many2many': many2many,
    'Field/many2one': many2one,
    'Field/one2many': one2many,
    'Field/one2one': one2one,
    'Field/replace': replace,
    'Field/unlink': unlink,
    'Field/unlinkAll': unlinkAll,
} = require('mail/static/src/model/utils.js');
const throttle = require('mail/static/src/utils/throttle/throttle.js');
const Timer = require('mail/static/src/utils/timer/timer.js');
const {
    parseEmail,
} = require('mail.utils');

const actions = defineActions({
    /**
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Thread} thread
     * @param {string} [stringifiedDomain='[]']
     * @returns {ThreadCache}
     */
    'Thread/cache'(
        { env },
        thread,
        stringifiedDomain = '[]'
    ) {
        let cache = thread.$$$caches(this).find(cache =>
            cache.$$$stringifiedDomain(this) === stringifiedDomain
        );
        if (!cache) {
            cache = env.invoke('ThreadCache/create', {
                $$$stringifiedDomain: stringifiedDomain,
                $$$thread: link(thread),
            });
        }
        return cache;
    },
    /**
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Thread} [thread] the concerned thread
     */
    'Thread/computeLastCurrentPartnerMessageSeenByEveryone'(
        { env },
        thread = undefined
    ) {
        const threads = thread ? [thread] : env.invoke('Thread/all');
        threads.map(localThread => {
            env.invoke('Record/update', localThread, {
                $$$lastCurrentPartnerMessageSeenByEveryone:
                    env.invoke(
                        'Thread/_computeLastCurrentPartnerMessageSeenByEveryone',
                        localThread
                    ),
            });
        });
    },
    /**
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Object} data
     * @return {Object}
     */
    'Thread/convertData'({ env }, data) {
        const data2 = {
            $$$messagesAsServerChannel: [],
        };
        if ('model' in data) {
            data2.$$$model = data.model;
        }
        if ('channel_type' in data) {
            data2.$$$channelType = data.channel_type;
            data2.$$$model = 'mail.channel';
        }
        if ('create_uid' in data) {
            data2.$$$creator = insert({
                $$$id: data.create_uid,
            });
        }
        if ('custom_channel_name' in data) {
            data2.$$$customChannelName = data.custom_channel_name;
        }
        if ('group_based_subscription' in data) {
            data2.$$$isGroupBasedSubscription = data.group_based_subscription;
        }
        if ('id' in data) {
            data2.$$$id = data.id;
        }
        if ('is_minimized' in data && 'state' in data) {
            data2.$$$serverFoldState = data.is_minimized ? data.state : 'closed';
        }
        if ('is_moderator' in data) {
            data2.$$$isModerator = data.is_moderator;
        }
        if ('is_pinned' in data) {
            data2.$$$isServerPinned = data.is_pinned;
        }
        if ('last_message' in data && data.last_message) {
            data2.$$$messagesAsServerChannel.push(
                insert({
                    $$$id: data.last_message.id,
                })
            );
            data2.$$$serverLastMessageId = data.last_message.id;
        }
        if ('last_message_id' in data && data.last_message_id) {
            data2.$$$messagesAsServerChannel.push(
                insert({
                    $$$id: data.last_message_id,
                })
            );
            data2.$$$serverLastMessageId = data.last_message_id;
        }
        if ('mass_mailing' in data) {
            data2.$$$isMassMailing = data.mass_mailing;
        }
        if ('moderation' in data) {
            data2.$$$moderation = data.moderation;
        }
        if ('message_needaction_counter' in data) {
            data2.$$$messageNeedactionCounter = data.message_needaction_counter;
        }
        if ('message_unread_counter' in data) {
            data2.$$$serverMessageUnreadCounter = data.message_unread_counter;
        }
        if ('name' in data) {
            data2.$$$name = data.name;
        }
        if ('public' in data) {
            data2.$$$public = data.public;
        }
        if ('seen_message_id' in data) {
            data2.$$$lastSeenByCurrentPartnerMessageId = data.seen_message_id || 0;
        }
        if ('uuid' in data) {
            data2.$$$uuid = data.uuid;
        }

        // relations
        if ('members' in data) {
            if (!data.members) {
                data2.$$$members = unlinkAll();
            } else {
                data2.$$$members = insertAndReplace(
                    data.members.map(memberData =>
                        env.invoke('Partner/convertData', memberData)
                    )
                );
            }
        }
        if ('seen_partners_info' in data) {
            if (!data.seen_partners_info) {
                data2.$$$partnerSeenInfos = unlinkAll();
            } else {
                /*
                    * FIXME: not optimal to write on relation given the fact that the relation
                    * will be (re)computed based on given fields.
                    * (here channelId will compute partnerSeenInfo.thread))
                    * task-2336946
                    */
                data2.$$$partnerSeenInfos = insertAndReplace(
                    data.seen_partners_info.map(
                        ({ fetched_message_id, partner_id, seen_message_id }) => {
                            return {
                                $$$channelId: data2.id,
                                $$$lastFetchedMessage: fetched_message_id
                                    ? insert({ $$$id: fetched_message_id })
                                    : unlinkAll(),
                                $$$lastSeenMessage: seen_message_id
                                    ? insert({ $$$id: seen_message_id })
                                    : unlinkAll(),
                                $$$partnerId: partner_id,
                            };
                        }
                    ),
                );
                if (data.id) {
                    const messageIds = data.seen_partners_info.reduce(
                        (currentSet, { fetched_message_id, seen_message_id }) => {
                            if (fetched_message_id) {
                                currentSet.add(fetched_message_id);
                            }
                            if (seen_message_id) {
                                currentSet.add(seen_message_id);
                            }
                            return currentSet;
                        },
                        new Set()
                    );
                    if (messageIds.size > 0) {
                        /*
                            * FIXME: not optimal to write on relation given the fact that the relation
                            * will be (re)computed based on given fields.
                            * (here channelId will compute messageSeenIndicator.thread))
                            * task-2336946
                            */
                        data2.$$$messageSeenIndicators = insert(
                            [...messageIds].map(messageId => {
                                return {
                                    $$$channelId: data.id,
                                    $$$messageId: messageId,
                                };
                            })
                        );
                    }
                }
            }
        }

        return data2;
    },
    /**
     * Fetches suggested recipients.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Thread} thread
     */
    async 'Thread/fetchAndUpdateSuggestedRecipients'({ env }, thread) {
        if (thread.$$$isTemporary(this)) {
            return;
        }
        return env.invoke(
            'Thread/performRpcMailGetSuggestedRecipients',
            {
                model: thread.$$$model(this),
                res_ids: [thread.$$$id(this)],
            }
        );
    },
    /**
     * Fetch attachments linked to a record. Useful for populating the store
     * with these attachments, which are used by attachment box in the chatter.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Thread} thread
     */
    async 'Thread/fetchAttachments'({ env }, thread) {
        const attachmentsData = await env.invoke(
            'Record/doAsync',
            thread,
            () => env.services.rpc({
                model: 'ir.attachment',
                method: 'search_read',
                domain: [
                    ['res_id', '=', thread.$$$id(this)],
                    ['res_model', '=', thread.$$$model(this)],
                ],
                fields: ['id', 'name', 'mimetype'],
                orderBy: [{ name: 'id', asc: false }],
            }, { shadow: true })
        );
        env.invoke('Record/update', thread, {
            $$$originThreadAttachments: insertAndReplace(
                attachmentsData.map(data =>
                    env.invoke('Attachment/convertData', data)
                )
            ),
        });
        env.invoke('Record/update', thread, {
            $$$areAttachmentsLoaded: true,
        });
    },
    /**
     * Add current user to provided thread's followers.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Thread} thread
     */
    async 'Thread/follow'(
        { env },
        thread
    ) {
        await env.invoke(
            'Record/doAsync',
            thread,
            () => env.services.rpc({
                model: thread.$$$model(this),
                method: 'message_subscribe',
                args: [[thread.$$$id(this)]],
                kwargs: {
                    partner_ids: [env.messaging.$$$currentPartner(this).$$$id(this)],
                },
            })
        );
        env.invoke('Thread/refreshFollowers', thread);
        env.invoke('Thread/fetchAndUpdateSuggestedRecipients', thread);
    },
    /**
     * Load new messages on the main cache of this thread.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Thread} thread
     */
    'Thread/loadNewMessages'(
        { env },
        thread
    ) {
        env.invoke('ThreadCache/loadnewMessages',
            thread.$$$mainCache(this)
        );
    },
    /**
     * Load the previews of the specified threads. Basically, it fetches the
     * last messages, since they are used to display inline content of them.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Thread[]} threads
     */
    async 'Thread/loadPreviews'(
        { env },
        threads
    ) {
        const channelIds = threads.reduce((list, thread) => {
            if (thread.$$$model() === 'mail.channel') {
                return list.concat(thread.$$$id());
            }
            return list;
        }, []);
        if (channelIds.length === 0) {
            return;
        }
        const channelPreviews = await env.services.rpc({
            model: 'mail.channel',
            method: 'channel_fetch_preview',
            args: [channelIds],
        }, { shadow: true });
        env.invoke('Message/insert', channelPreviews.filter(p => p.last_message)
            .map(channelPreview =>
                env.invoke('Message/convertData', channelPreview.last_message)
            )
        );
    },
    /**
     * Mark the specified conversation as fetched.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Thread} thread
     */
    async 'Thread/markAsFetched'(
        { env },
        thread
    ) {
        await env.invoke(
            'Record/doAsync',
            thread,
            () => env.services.rpc({
                model: 'mail.channel',
                method: 'channel_fetched',
                args: [[thread.$$$id(this)]],
            }, { shadow: true })
        );
    },
    /**
     * Mark the specified conversation as read/seen.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Thread} thread
     * @param {Message} message the message to be considered as last seen
     */
    async 'Thread/markAsSeen'(
        { env },
        thread,
        message
    ) {
        if (thread.$$$model(this) !== 'mail.channel') {
            return;
        }
        if (
            thread.$$$pendingSeenMessageId(this) &&
            message.$$$id(this) <= thread.$$$pendingSeenMessageId(this)
        ) {
            return;
        }
        if (
            thread.$$$lastSeenByCurrentPartnerMessageId(this) &&
            message.$$$id(this) <= thread.$$$lastSeenByCurrentPartnerMessageId(this)
        ) {
            return;
        }
        env.invoke('Record/update', thread, {
            $$$pendingSeenMessageId: message.$$$id(this),
        });
        return env.invoke('Thread/performRpcChannelSeen', {
            ids: [thread.$$$id(this)],
            lastMessageId: message.$$$id(this),
        });
    },
    /**
     * Mark all needaction messages of this thread as read.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Thread} thread
     */
    async 'Thread/markNeedactionMessagesAsRead'(
        { env },
        thread
    ) {
        await env.invoke(
            'Record/doAsync',
            thread,
            () => env.invoke('Message/markMessagesAsRead',
                thread.$$$needactionMessages(this)
            )
        );
    },
    /**
     * Notifies the server of new fold state. Useful for initial,
     * cross-tab, and cross-device chat window state synchronization.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Thread} thread
     * @param {string} state
     */
    async 'Thread/notifyFoldStateToServer'(
        { env },
        thread,
        state
    ) {
        if (thread.$$$model(this) !== 'mail.channel') {
            // Server sync of fold state is only supported for channels.
            return;
        }
        if (!thread.$$$uuid(this)) {
            return;
        }
        return env.invoke('Thread/performRpcChannelFold',
            thread.$$$uuid(this),
            state
        );
    },
    /**
     * Notify server to leave the current channel. Useful for cross-tab
     * and cross-device chat window state synchronization.
     *
     * Only makes sense if isPendingPinned is set to the desired value.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Thread} thread
     */
    async 'Thread/notifyPinStateToServer'(
        { env },
        thread
    ) {
        if (thread.$$$isPendingPinned(this)) {
            await env.invoke('Thread/performRpcChannelPin', {
                pinned: true,
                uuid: thread.$$$uuid(this),
            });
        } else {
            env.invoke('Thread/performRpcExecuteCommand', {
                channelId: thread.$$$id(this),
                command: 'leave',
            });
        }
    },
    /**
     * Opens this thread either as form view, in discuss app, or as a chat
     * window. The thread will be opened in an "active" matter, which will
     * interrupt current user flow.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Thread} thread
     * @param {Object} [param2]
     * @param {boolean} [param2.expanded=false]
     */
    async 'Thread/open'(
        { env },
        thread,
        { expanded = false } = {}
    ) {
        const discuss = env.messaging.$$$discuss(this);
        // check if thread must be opened in form view
        if (!['mail.box', 'mail.channel'].includes(thread.$$$model(this))) {
            if (expanded || discuss.$$$isOpen(this)) {
                // Close chat window because having the same thread opened
                // both in chat window and as main document does not look
                // good.
                env.invoke('ChatWindowManager/closeThread',
                    env.messaging.$$$chatWindowManager(this),
                    thread,
                );
                return env.invoke('Messaging/openDocument', {
                    id: thread.$$$id(this),
                    model: thread.$$$model(this),
                });
            }
        }
        // check if thread must be opened in discuss
        const device = env.messaging.$$$device(this);
        if (
            (
                !device.$$$isMobile(this) &&
                (discuss.$$$isOpen(this) || expanded)
            ) ||
            thread.$$$model(this) === 'mail.box'
        ) {
            env.invoke('Discuss/openThread', discuss, thread);
        }
        // thread must be opened in chat window
        return env.invoke('ChatWindowManager/openThread',
            env.messaging.$$$chatWindowManager(this),
            thread,
            {
                makeActive: true,
            }
        );
    },
    /**
     * Opens the most appropriate view that is a profile for this thread.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Thread} thread
     */
    async 'Thread/openProfile'(
        { env },
        thread
    ) {
        env.invoke('Messaging/openDocument');
        return env.invoke('Messaging/openDocument', {
            id: thread.$$$id(this),
            model: thread.$$$model(this),
        });
    },
    /**
     * Performs the `channel_fold` RPC on `mail.channel`.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {string} uuid
     * @param {string} state
     */
    async 'Thread/performRpcChannelFold'(
        { env },
        uuid,
        state
    ) {
        return env.services.rpc({
            model: 'mail.channel',
            method: 'channel_fold',
            kwargs: {
                state,
                uuid,
            }
        }, { shadow: true });
    },
    /**
     * Performs the `channel_info` RPC on `mail.channel`.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Object} param1
     * @param {integer[]} param1.ids list of id of channels
     * @returns {Thread[]}
     */
    async 'Thread/performRpcChannelInfo'(
        { env },
        { ids }
    ) {
        const channelInfos = await env.services.rpc({
            model: 'mail.channel',
            method: 'channel_info',
            args: [ids],
        }, { shadow: true });
        const channels = env.invoke('Thread/insert',
            channelInfos.map(channelInfo =>
                env.invoke('Thread/convertData', channelInfo)
            )
        );
        // manually force recompute of counter
        env.invoke('Record/update',
            env.messaging.$$$messagingMenu()
        );
        return channels;
    },
    /**
     * Performs the `channel_seen` RPC on `mail.channel`.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Object} param1
     * @param {integer[]} param1.ids list of id of channels
     * @param {integer[]} param1.lastMessageId
     */
    async 'Thread/performRpcChannelSeen'(
        { env },
        {
            ids,
            lastMessageId,
        }
    ) {
        return env.services.rpc({
            model: 'mail.channel',
            method: 'channel_seen',
            args: [ids],
            kwargs: {
                last_message_id: lastMessageId,
            },
        }, { shadow: true });
    },
    /**
     * Performs the `channel_pin` RPC on `mail.channel`.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Object} param1
     * @param {boolean} [param1.pinned=false]
     * @param {string} param1.uuid
     */
    async 'Thread/performRpcChannelPin'(
        { env },
        {
            pinned = false,
            uuid,
        }
    ) {
        return env.services.rpc({
            model: 'mail.channel',
            method: 'channel_pin',
            kwargs: {
                uuid,
                pinned,
            },
        }, { shadow: true });
    },
    /**
     * Performs the `channel_create` RPC on `mail.channel`.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Object} param1
     * @param {string} param1.name
     * @param {string} [param1.privacy]
     * @returns {Thread} the created channel
     */
    async 'Thread/performRpcCreateChannel'(
        { env },
        {
            name,
            privacy,
        }
    ) {
        const device = env.messaging.$$$device();
        const data = await env.services.rpc({
            model: 'mail.channel',
            method: 'channel_create',
            args: [name, privacy],
            kwargs: {
                context: {
                    ...env.session.user_content,
                    // optimize the return value by avoiding useless queries
                    // in non-mobile devices
                    isMobile: device.$$$isMobile(),
                },
            },
        });
        return env.invoke('Thread/insert',
            env.invoke('Thread/convertData', data)
        );
    },
    /**
     * Performs the `channel_get` RPC on `mail.channel`.
     *
     * `openChat` is preferable in business code because it will avoid the
     * RPC if the chat already exists.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Object} param1
     * @param {integer[]} param1.partnerIds
     * @param {boolean} [param1.pinForCurrentPartner]
     * @returns {Thread|undefined} the created or existing chat
     */
    async 'Thread/performRpcCreateChat'(
        { env },
        {
            partnerIds,
            pinForCurrentPartner,
        }
    ) {
        const device = env.messaging.$$$device();
        // TODO FIX: potential duplicate chat task-2276490
        const data = await env.services.rpc({
            model: 'mail.channel',
            method: 'channel_get',
            kwargs: {
                context: {
                    ...env.session.user_content,
                    // optimize the return value by avoiding useless queries
                    // in non-mobile devices
                    isMobile: device.$$$isMobile(),
                },
                partners_to: partnerIds,
                pin: pinForCurrentPartner,
            },
        });
        if (!data) {
            return;
        }
        return env.invoke('Thread/insert',
            env.invoke('Thread/convertData', data)
        );
    },
    /**
     * Performs the `channel_join_and_get_info` RPC on `mail.channel`.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Object} param1
     * @param {integer} param1.channelId
     * @returns {Thread} the channel that was joined
     */
    async 'Thread/performRpcJoinChannel'(
        { env },
        { channelId }
    ) {
        const device = env.messaging.$$$device();
        const data = await env.services.rpc({
            model: 'mail.channel',
            method: 'channel_join_and_get_info',
            args: [[channelId]],
            kwargs: {
                context: {
                    ...env.session.user_content,
                    // optimize the return value by avoiding useless queries
                    // in non-mobile devices
                    isMobile: device.$$$isMobile(),
                },
            },
        });
        return env.invoke('Thread/insert',
            env.invoke('Thread/convertData', data)
        );
    },
    /**
     * Performs the `execute_command` RPC on `mail.channel`.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Object} param1
     * @param {integer} param1.channelId
     * @param {string} param1.command
     * @param {Object} [param1.postData={}]
     */
    async 'Thread/performRpcExecuteCommand'(
        { env },
        {
            channelId,
            command,
            postData = {},
        }
    ) {
        return env.services.rpc({
            model: 'mail.channel',
            method: 'execute_command',
            args: [[channelId]],
            kwargs: {
                command,
                ...postData,
            },
        });
    },
    /**
     * Performs RPC on the route `/mail/get_suggested_recipients`.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Object} param1
     * @param {string} param1.model
     * @param {integer[]} param1.res_ids
     */
    async 'Thread/performRpcMailGetSuggestedRecipients'(
        { env },
        {
            model,
            res_ids,
        }
    ) {
        const data = await env.services.rpc({
            route: '/mail/get_suggested_recipients',
            params: {
                model,
                res_ids,
            },
        }, { shadow: true });
        for (const id in data) {
            const recipientInfoList = data[id].map(recipientInfoData => {
                const [partner_id, emailInfo, reason] = recipientInfoData;
                const [name, email] = emailInfo && parseEmail(emailInfo);
                return {
                    $$$email: email,
                    $$$name: name,
                    $$$partner: partner_id
                        ? insert({
                            $$$id: partner_id,
                        })
                        : unlink(),
                    $$$reason: reason,
                };
            });
            env.invoke('Thread/insert', {
                $$$id: parseInt(id),
                $$$model: model,
                $$$suggestedRecipientInfoList: insertAndReplace(recipientInfoList),
            });
        }
    },
    /**
     * Performs the `message_post` RPC on given threadModel.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Object} param1
     * @param {Object} param1.postData
     * @param {integer} param1.threadId
     * @param {string} param1.threadModel
     * @return {integer} the posted message id
     */
    async 'Thread/performRpcMessagePost'(
        { env },
        {
            postData,
            threadId,
            threadModel,
        }
    ) {
        return env.services.rpc({
            model: threadModel,
            method: 'message_post',
            args: [threadId],
            kwargs: postData,
        });
    },
    /**
     * Pin this thread and notify server of the change.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Thread} thread
     */
    async 'Thread/pin'(
        { env },
        thread
    ) {
        env.invoke('Record/update', thread, {
            $$$isPendingPinned: true,
        });
        await env.invoke('Thread/notifyPinStateToServer', thread);
    },
    /**
     * Open a dialog to add channels as followers.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Thread} thread
     */
    'Thread/promptAddChannelFollower'(
        { env },
        thread
    ) {
        env.invoke('Thread/_promptAddFollower',
            thread,
            { mail_invite_follower_channel_only: true }
        );
    },
    /**
     * Open a dialog to add partners as followers.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Thread} thread
     */
    'Thread/promptAddPartnerFollower'(
        { env },
        thread
    ) {
        env.invoke('Thread/_promptAddFollower',
            thread,
            { mail_invite_follower_channel_only: false }
        );
    },
    /**
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Thread} thread
     */
    async 'Thread/refresh'(
        { env },
        thread
    ) {
        if (thread.$$$isTemporary(this)) {
            return;
        }
        env.invoke('Thread/loadNewMessages', thread);
        env.invoke('Record/update', thread, {
            $$$isLoadingAttachments: true,
        });
        await env.invoke(
            'Record/doAsync',
            thread,
            () => env.invoke('Thread/fetchAttachments', thread)
        );
        env.invoke('Record/update', thread, {
            $$$isLoadingAttachments: false,
        });
    },
    /**
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Thread} thread
     */
    async 'Thread/refreshActivities'(
        { env },
        thread
    ) {
        if (!thread.$$$hasActivities(this)) {
            return;
        }
        if (thread.$$$isTemporary(this)) {
            return;
        }
        // A bit "extreme", may be improved
        const [{ activity_ids: newActivityIds }] = await env.invoke(
            'Record/doAsync',
            thread,
            () => env.services.rpc({
                model: thread.$$$model(this),
                method: 'read',
                args: [
                    thread.$$$id(this),
                    ['activity_ids']
                ],
            }, { shadow: true })
        );
        const activitiesData = await env.invoke(
            'Record/doAsync',
            thread,
            () => env.services.rpc({
                model: 'mail.activity',
                method: 'activity_format',
                args: [newActivityIds]
            }, { shadow: true })
        );
        const activities = env.invoke('Activity/insert',
            activitiesData.map(
                activityData => env.invoke(
                    'Activity/convertData',
                    activityData
                )
            )
        );
        env.invoke('Record/update', thread, {
            $$$activities: replace(activities),
        });
    },
    /**
     * Refresh the typing status of the current partner.
     *
     * @param {Object} _
     * @param {Thread} thread
     */
    'Thread/refreshCurrentPartnerIsTyping'(
        _,
        thread
    ) {
        thread._currentPartnerInactiveTypingTimer.reset();
    },
    /**
     * Refresh followers information from server.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Thread} thread
     */
    async 'Thread/refreshFollowers'(
        { env },
        thread
    ) {
        if (thread.$$$isTemporary(this)) {
            env.invoke('Record/update', thread, {
                $$$followers: unlinkAll(),
            });
            return;
        }
        const { followers } = await env.invoke(
            'Record/doAsync',
            thread,
            () => env.services.rpc({
                route: '/mail/read_followers',
                params: {
                    res_id: thread.$$$id(this),
                    res_model: thread.$$$model(this),
                },
            }, { shadow: true })
        );
        env.invoke('Record/update', thread, {
            $$$areFollowersLoaded: true,
        });
        if (followers.length > 0) {
            env.invoke('Record/update', thread, {
                $$$followers: insertAndReplace(
                    followers.map(data =>
                        env.invoke('Follower/convertData', data)
                    )
                ),
            });
        } else {
            env.invoke('Record/update', thread, {
                $$$followers: unlinkAll(),
            });
        }
    },
    /**
     * Called to refresh a registered other member partner that is typing
     * something.
     *
     * @param {Object} _
     * @param {Thread} thread
     * @param {Partner} partner
     */
    'Thread/refreshOtherMemberTypingMember'(
        _,
        thread,
        partner
    ) {
        thread._otherMembersLongTypingTimers.get(partner).reset();
    },
    /**
     * Called when current partner is inserting some input in composer.
     * Useful to notify current partner is currently typing something in the
     * composer of this thread to all other members.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Thread} thread
     */
    async 'Thread/registerCurrentPartnerIsTyping'(
        { env },
        thread
    ) {
        // Handling of typing timers.
        thread._currentPartnerInactiveTypingTimer.start();
        thread._currentPartnerLongTypingTimer.start();
        // Manage typing member relation.
        const currentPartner = env.messaging.$$$currentPartner(this);
        const newOrderedTypingMemberLocalIds = thread.$$$orderedTypingMemberLocalIds(this)
            .filter(localId => localId !== currentPartner.localId);
        newOrderedTypingMemberLocalIds.push(currentPartner.localId);
        env.invoke('Record/update', thread, {
            $$$orderedTypingMemberLocalIds: newOrderedTypingMemberLocalIds,
            $$$typingMembers: link(currentPartner),
        });
        // Notify typing status to other members.
        await thread._throttleNotifyCurrentPartnerTypingStatus(
            { isTyping: true }
        );
    },
    /**
     * Called to register a new other member partner that is typing
     * something.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Thread} thread
     * @param {Partner} partner
     */
    'Thread/registerOtherMemberTypingMember'(
        { env },
        thread,
        partner
    ) {
        const timer = new Timer(
            env,
            () => env.invoke(
                'Record/doAsync',
                thread,
                () => env.invoke(
                    'Thread/_onOtherMemberLongTypingTimeout',
                    thread,
                    partner
                )
            ),
            60 * 1000
        );
        thread._otherMembersLongTypingTimers.set(partner, timer);
        timer.start();
        const newOrderedTypingMemberLocalIds = thread.$$$orderedTypingMemberLocalIds(this)
            .filter(localId => localId !== partner.localId);
        newOrderedTypingMemberLocalIds.push(partner.localId);
        env.invoke('Record/update', thread, {
            $$$orderedTypingMemberLocalIds: newOrderedTypingMemberLocalIds,
            $$$typingMembers: link(partner),
        });
    },
    /**
     * Rename the given thread with provided new name.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Thread} thread
     * @param {string} newName
     */
    async 'Thread/rename'(
        { env },
        thread,
        newName
    ) {
        if (thread.$$$channelType(this) === 'chat') {
            await env.invoke(
                'Record/doAsync',
                thread,
                () => env.services.rpc({
                    model: 'mail.channel',
                    method: 'channel_set_custom_name',
                    args: [thread.$$$id(this)],
                    kwargs: {
                        name: newName,
                    },
                })
            );
        }
        env.invoke('Record/update', thread, {
            $$$customChannelName: newName,
        });
    },
    /**
     * Unfollow current partner from this thread.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Thread} thread
     */
    async 'Thread/unfollow'(
        { env },
        thread
    ) {
        const currentPartnerFollower = thread.$$$followers(this).find(
            follower => (
                follower.$$$partner(this) ===
                env.messaging.$$$currentPartner(this)
            )
        );
        await env.invoke(
            'Record/doAsync',
            thread,
            () => env.invoke('Follower/remove', currentPartnerFollower)
        );
    },
    /**
     * Unpin this thread and notify server of the change.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Thread} thread
     */
    async 'Thread/unpin'(
        { env },
        thread
    ) {
        env.invoke('Record/update', thread, {
            $$$isPendingPinned: false,
        });
        await env.invoke('Thread/notifyPinStateToServer', thread);
    },
    /**
     * Called when current partner has explicitly stopped inserting some
     * input in composer. Useful to notify current partner has currently
     * stopped typing something in the composer of this thread to all other
     * members.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Thread} thread
     * @param {Object} [param2={}]
     * @param {boolean} [param2.immediateNotify=false] if set, is typing
     *   status of current partner is immediately notified and doesn't
     *   consume throttling at all.
     */
    async 'Thread/unregisterCurrentPartnerIsTyping'(
        { env },
        thread,
        { immediateNotify = false } = {}
    ) {
        // Handling of typing timers.
        thread._currentPartnerInactiveTypingTimer.clear();
        thread._currentPartnerLongTypingTimer.clear();
        // Manage typing member relation.
        const currentPartner = env.messaging.$$$currentPartner(this);
        const newOrderedTypingMemberLocalIds = thread.$$$orderedTypingMemberLocalIds(this)
            .filter(localId => localId !== currentPartner.localId);
        env.invoke('Record/update', thread, {
            $$$orderedTypingMemberLocalIds: newOrderedTypingMemberLocalIds,
            $$$typingMembers: unlink(currentPartner),
        });
        // Notify typing status to other members.
        if (immediateNotify) {
            thread._throttleNotifyCurrentPartnerTypingStatus.clear();
        }
        await env.invoke(
            'Record/doAsync',
            thread,
            () => thread._throttleNotifyCurrentPartnerTypingStatus(
                { isTyping: false }
            )
        );
    },
    /**
     * Called to unregister an other member partner that is no longer typing
     * something.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Thread} thread
     * @param {Partner} partner
     */
    'Thread/unregisterOtherMemberTypingMember'(
        { env },
        thread,
        partner
    ) {
        thread._otherMembersLongTypingTimers.get(partner).clear();
        thread._otherMembersLongTypingTimers.delete(partner);
        const newOrderedTypingMemberLocalIds = thread.$$$orderedTypingMemberLocalIds(this)
            .filter(localId => localId !== partner.localId);
        env.invoke('Record/update', thread, {
            $$$orderedTypingMemberLocalIds: newOrderedTypingMemberLocalIds,
            $$$typingMembers: unlink(partner),
        });
    },
    /**
     * Unsubscribe current user from provided channel.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Thread} thread
     */
    'Thread/unsubscribe'(
        { env },
        thread
    ) {
        env.invoke('ChatWindowManager/closeThread',
            env.messaging.$$$chatWindowManager(this),
            thread
        );
        env.invoke('Thread/unpin', thread);
    },
    /**
     * @private
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Thread} thread
     * @param {Object} param2
     * @param {boolean} param2.isTyping
     */
    async 'Thread/_notifyCurrentPartnerTypingStatus'(
        { env },
        thread,
        { isTyping }
    ) {
        if (
            thread._forceNotifyNextCurrentPartnerTypingStatus ||
            isTyping !== thread._currentPartnerLastNotifiedIsTyping
        ) {
            if (thread.$$$model(this) === 'mail.channel') {
                await env.invoke(
                    'Record/doAsync',
                    thread,
                    () => env.services.rpc({
                        model: 'mail.channel',
                        method: 'notify_typing',
                        args: [thread.$$$id(this)],
                        kwargs: { is_typing: isTyping },
                    }, { shadow: true })
                );
            }
            if (isTyping && thread._currentPartnerLongTypingTimer.isRunning) {
                thread._currentPartnerLongTypingTimer.reset();
            }
        }
        thread._forceNotifyNextCurrentPartnerTypingStatus = false;
        thread._currentPartnerLastNotifiedIsTyping = isTyping;
    },
    /**
     * @private
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Thread} thread
     */
    async 'Thread/_onCurrentPartnerInactiveTypingTimeout'(
        { env },
        thread
    ) {
        await env.invoke(
            'Record/doAsync',
            thread,
            () => env.invoke(
                'Thread/unregisterCurrentPartnerIsTyping',
                thread
            )
        );
    },
    /**
     * Called when current partner has been typing for a very long time.
     * Immediately notify other members that he/she is still typing.
     *
     * @private
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Thread} thread
     */
    async 'Thread/_onCurrentPartnerLongTypingTimeout'(
        { env },
        thread
    ) {
        thread._forceNotifyNextCurrentPartnerTypingStatus = true;
        thread._throttleNotifyCurrentPartnerTypingStatus.clear();
        await env.invoke(
            'Record/doAsync',
            thread,
            () => thread._throttleNotifyCurrentPartnerTypingStatus(
                { isTyping: true }
            )
        );
    },
    /**
     * @private
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Thread} thread
     * @param {Partner} partner
     */
    async 'Thread/_onOtherMemberLongTypingTimeout'(
        { env },
        thread,
        partner
    ) {
        if (!thread.$$$typingMembers(this).includes(partner)) {
            thread._otherMembersLongTypingTimers.delete(partner);
            return;
        }
        env.invoke(
            'Thread/unregisterOtherMemberTypingMember',
            thread,
            partner
        );
    },
    /**
     * @private
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Thread} thread
     * @param {Object} [param2={}]
     * @param {boolean} [param2.mail_invite_follower_channel_only=false]
     */
    'Thread/_promptAddFollower'(
        { env },
        thread,
        { mail_invite_follower_channel_only = false } = {}
    ) {
        const action = {
            type: 'ir.actions.act_window',
            res_model: 'mail.wizard.invite',
            view_mode: 'form',
            views: [[false, 'form']],
            name: env._t("Invite Follower"),
            target: 'new',
            context: {
                default_res_model: thread.$$$model(this),
                default_res_id: thread.$$$id(this),
                mail_invite_follower_channel_only,
            },
        };
        env.bus.trigger('do-action', {
            action,
            options: {
                on_close: async () => {
                    await env.invoke(
                        'Record/doAsync',
                        thread,
                        () => env.invoke('Thread/refreshFollowers', thread)
                    );
                    env.bus.trigger('Thread:promptAddFollower-closed');
                },
            },
        });
    },
});

const model = defineModel({
    name: 'Thread',
    fields: {
        /**
         * Determines the `Activity` that belong to `this`, assuming `this`
         * has activities (@see hasActivities).
         */
        $$$activities: one2many('Activity', {
            inverse: '$$$thread',
        }),
        /**
         * Serves as compute dependency.
         */
        $$$activitiesState: attr({
            related: '$$$activities.$$$state',
        }),
        $$$allAttachments: many2many('Attachment', {
            /**
             * @param {Object} param0
             * @param {Thread} param0.record
             * @returns {Attachment[]}
             */
            compute({ record }) {
                const allAttachments =
                    [
                        ...new Set(
                            record.$$$originThreadAttachments(this).concat(
                                record.$$$attachments(this)
                            )
                        )
                    ]
                    .sort((a1, a2) => {
                        // "uploading" before "uploaded" attachments.
                        if (!a1.$$$isTemporary(this) && a2.$$$isTemporary(this)) {
                            return 1;
                        }
                        if (a1.$$$isTemporary(this) && !a2.$$$isTemporary(this)) {
                            return -1;
                        }
                        // "most-recent" before "oldest" attachments.
                        return Math.abs(a2.$$$id(this)) - Math.abs(a1.$$$id(this));
                    });
                return replace(allAttachments);
            },
        }),
        $$$areAttachmentsLoaded: attr({
            default: false,
        }),
        /**
         * States whether followers have been loaded at least once for this
         * thread.
         */
        $$$areFollowersLoaded: attr({
            default: false,
        }),
        $$$attachments: many2many('Attachment', {
            inverse: '$$$threads',
        }),
        $$$caches: one2many('ThreadCache', {
            inverse: '$$$thread',
            isCausal: true,
        }),
        $$$channelType: attr(),
        /**
         * States the `ChatWindow` related to `this`. Serves as compute
         * dependency. It is computed from the inverse relation and it should
         * otherwise be considered read-only.
         */
        $$$chatWindow: one2one('ChatWindow', {
            inverse: '$$$thread',
        }),
        /**
         * Serves as compute dependency.
         */
        $$$chatWindowIsFolded: attr({
            related: '$$$chatWindow.$$$isFolded',
        }),
        $$$composer: one2one('Composer', {
            default: create(),
            inverse: '$$$thread',
            isCausal: true,
            readonly: true,
        }),
        $$$correspondent: many2one('Partner', {
            /**
             * @param {Object} param0
             * @param {web.env} param0.env
             * @param {Thread} param0.record
             * @returns {Partner}
             */
            compute({ env, record }) {
                if (record.$$$channelType(this) === 'channel') {
                    return unlink();
                }
                const correspondents = record.$$$members(this).filter(partner =>
                    partner !== env.messaging.$$$currentPartner(this)
                );
                if (correspondents.length === 1) {
                    // 2 members chat
                    return link(correspondents[0]);
                }
                if (record.$$$members(this).length === 1) {
                    // chat with oneself
                    return link(record.$$$members(this)[0]);
                }
                return unlink();
            },
            inverse: '$$$correspondentThreads',
        }),
        $$$correspondentNameOrDisplayName: attr({
            related: '$$$correspondent.$$$nameOrDisplayName',
        }),
        $$$counter: attr({
            default: 0,
        }),
        $$$creator: many2one('User'),
        $$$customChannelName: attr(),
        $$$displayName: attr({
            /**
             * @param {Object} param0
             * @param {Thread} param0.record
             * @returns {string}
             */
            compute({ record }) {
                if (
                    record.$$$channelType(this) === 'chat' &&
                    record.$$$correspondent(this)
                ) {
                    return (
                        record.$$$customChannelName(this) ||
                        record.$$$correspondent(this).$$$nameOrDisplayName(this)
                    );
                }
                return record.$$$name(this);
            },
        }),
        $$$followersPartner: many2many('Partner', {
            related: '$$$followers.$$$partner',
        }),
        $$$followers: one2many('Follower', {
            inverse: '$$$followedThread',
        }),
        /**
         * States the `Activity` that belongs to `this` and that are
         * planned in the future (due later than today).
         */
        $$$futureActivities: one2many('Activity', {
            /**
             * @param {Object} param0
             * @param {Thread} param0.record
             * @returns {Activity[]}
             */
            compute({ record }) {
                return replace(
                    record.$$$activities(this).filter(
                        activity => activity.$$$state(this) === 'planned'
                    )
                );
            },
        }),
        /**
         * States whether `this` has activities (`mail.activity.mixin` server side).
         */
        $$$hasActivities: attr({
            default: false,
        }),
        /**
         * Determine whether this thread has the seen indicators (V and VV)
         * enabled or not.
         */
        $$$hasSeenIndicators: attr({
            /**
             * @param {Object} param0
             * @param {Thread} param0.record
             * @returns {boolean}
             */
            compute({ record }) {
                if (record.$$$model(this) !== 'mail.channel') {
                    return false;
                }
                if (record.$$$isMassMailing(this)) {
                    return false;
                }
                return ['chat', 'livechat'].includes(record.$$$channelType(this));
            },
            default: false,
        }),
        $$$id: attr({
            id: true,
        }),
        /**
         * States whether this thread is a `mail.channel` qualified as chat.
         *
         * Useful to list chat channels, like in messaging menu with the filter
         * 'chat'.
         */
        $$$isChatChannel: attr({
            /**
             * @param {Object} param0
             * @param {Thread} param0.record
             * @returns {boolean}
             */
            compute({ record }) {
                return record.$$$channelType(this) === 'chat';
            },
            default: false,
        }),
        $$$isCurrentPartnerFollowing: attr({
            /**
             * @param {Object} param0
             * @param {web.env} param0.env
             * @param {Thread} param0.record
             * @returns {boolean}
             */
            compute({ env, record }) {
                return record.$$$followers(this).some(
                    follower => (
                        follower.$$$partner(this) &&
                        (
                            follower.$$$partner(this) ===
                            env.messaging.$$$currentPartner(this)
                        )
                    )
                );
            },
            default: false,
        }),
        $$$isGroupBasedSubscription: attr({
            default: false,
        }),
        /**
         * States whether `this` is currently loading attachments.
         */
        $$$isLoadingAttachments: attr({
            default: false,
        }),
        $$$isMassMailing: attr({
            default: false,
        }),
        $$$isModeratedByCurrentPartner: attr({
            /**
             * @param {Object} param0
             * @param {web.env} param0.env
             * @param {Thread} param0.record
             * @returns {boolean}
             */
            compute({ env, record }) {
                if (!record.$$$messaging(this)) {
                    return false;
                }
                if (!record.$$$messaging(this).$$$currentPartner(this)) {
                    return false;
                }
                return record.$$$moderators(this).includes(
                    env.messaging.$$$currentPartner(this)
                );
            },
        }),
        /**
         * Determine if there is a pending pin state change, which is a change
         * of pin state requested by the client but not yet confirmed by the
         * server.
         *
         * This field can be updated to immediately change the pin state on the
         * interface and to notify the server of the new state.
         */
        $$$isPendingPinned: attr(),
        /**
         * Boolean that determines whether this thread is pinned
         * in discuss and present in the messaging menu.
         */
        $$$isPinned: attr({
            /**
             * @param {Object} param0
             * @param {Thread} param0.record
             * @returns {boolean}
             */
            compute({ record }) {
                return (
                    record.$$$isPendingPinned(this) !== undefined
                        ? record.$$$isPendingPinned(this)
                        : record.$$$isServerPinned(this)
                );
            },
        }),
        /**
         * Determine the last pin state known by the server, which is the pin
         * state displayed after initialization or when the last pending
         * pin state change was confirmed by the server.
         *
         * This field should be considered read only in most situations. Only
         * the code handling pin state change from the server should typically
         * update it.
         */
        $$$isServerPinned: attr({
            default: false,
        }),
        $$$isTemporary: attr({
            default: false,
        }),
        $$$isModerator: attr({
            default: false,
        }),
        $$$lastCurrentPartnerMessageSeenByEveryone: many2one('Message', {
            /**
             * @param {Object} param0
             * @param {Thread} param0.record
             * @returns {Message}
             */
            compute({ record }) {
                const otherPartnerSeenInfos =
                    record.$$$partnerSeenInfos(this).filter(
                        partnerSeenInfo => (
                            partnerSeenInfo.$$$partner(this) !==
                            record.$$$messagingCurrentPartner(this)
                        )
                    );
                if (otherPartnerSeenInfos.length === 0) {
                    return unlinkAll();
                }

                const otherPartnersLastSeenMessageIds =
                    otherPartnerSeenInfos.map(
                        partnerSeenInfo => (
                            partnerSeenInfo.$$$lastSeenMessage(this)
                            ? partnerSeenInfo.$$$lastSeenMessage(this).$$$id(this)
                            : 0
                        )
                    );
                if (otherPartnersLastSeenMessageIds.length === 0) {
                    return unlinkAll();
                }
                const lastMessageSeenByAllId = Math.min(
                    ...otherPartnersLastSeenMessageIds
                );
                const currentPartnerOrderedSeenMessages =
                    record.$$$orderedNonTransientMessages(this).filter(
                        message => (
                            (
                                message.$$$author(this) ===
                                record.$$$messagingCurrentPartner(this)
                            ) &&
                            message.$$$id(this) <= lastMessageSeenByAllId
                        )
                    );

                if (
                    !currentPartnerOrderedSeenMessages ||
                    currentPartnerOrderedSeenMessages.length === 0
                ) {
                    return unlinkAll();
                }
                return link(currentPartnerOrderedSeenMessages.slice().pop());
            },
        }),
        /**
         * Last message of the thread, could be a transient one.
         */
        $$$lastMessage: many2one('Message', {
            /**
             * @param {Object} param0
             * @param {Thread} param0.record
             * @returns {Message|undefined}
             */
            compute({ record }) {
                const {
                    length: l,
                    [l - 1]: lastMessage,
                } = record.$$$orderedMessages(this);
                if (lastMessage) {
                    return link(lastMessage);
                }
                return unlink();
            },
        }),
        $$$lastNeedactionMessage: many2one('Message', {
            /**
             * @param {Object} param0
             * @param {Thread} param0.record
             * @returns {Message|undefined}
             */
            compute({ record }) {
                const orderedNeedactionMessages = record.$$$needactionMessages(this).sort(
                    (m1, m2) => m1.$$$id(this) < m2.$$$id(this) ? -1 : 1
                );
                const {
                    length: l,
                    [l - 1]: lastNeedactionMessage,
                } = orderedNeedactionMessages;
                if (lastNeedactionMessage) {
                    return link(lastNeedactionMessage);
                }
                return unlink();
            },
        }),
        /**
         * Last non-transient message.
         */
        $$$lastNonTransientMessage: many2one('Message', {
            /**
             * @param {Object} param0
             * @param {Thread} param0.record
             * @returns {Message|undefined}
             */
            compute({ record }) {
                const {
                    length: l,
                    [l - 1]: lastMessage,
                } = record.$$$orderedNonTransientMessages(this);
                if (lastMessage) {
                    return link(lastMessage);
                }
                return unlink();
            },
        }),
        /**
         * Last seen message id of the channel by current partner.
         *
         * If there is a pending seen message id change, it is immediately applied
         * on the interface to avoid a feeling of unresponsiveness. Otherwise the
         * last known message id of the server is used.
         *
         * Also, it needs to be kept as an id because it's considered like a "date" and could stay
         * even if corresponding message is deleted. It is basically used to know which
         * messages are before or after it.
         */
        $$$lastSeenByCurrentPartnerMessageId: attr({
            /**
             * Adjusts the last seen message received from the server to consider
             * the following messages also as read if they are either transient
             * messages or messages from the current partner.
             *
             * @param {Object} param0
             * @param {web.env} param0.env
             * @param {Thread} param0.record
             * @returns {integer}
             */
            compute({ env, record }) {
                const firstMessage = record.$$$orderedMessages(this)[0];
                if (
                    firstMessage &&
                    record.$$$lastSeenByCurrentPartnerMessageId(this) &&
                    record.$$$lastSeenByCurrentPartnerMessageId(this) < firstMessage.$$$id(this)
                ) {
                    // no deduction can be made if there is a gap
                    return record.$$$lastSeenByCurrentPartnerMessageId(this);
                }
                let lastSeenByCurrentPartnerMessageId = record.$$$lastSeenByCurrentPartnerMessageId(this);
                for (const message of record.$$$orderedMessages(this)) {
                    if (message.$$$id(this) <= record.$$$lastSeenByCurrentPartnerMessageId(this)) {
                        continue;
                    }
                    if (
                        message.author === env.messaging.$$$currentPartner(this) ||
                        message.$$$isTransient(this)
                    ) {
                        lastSeenByCurrentPartnerMessageId = message.$$$id(this);
                        continue;
                    }
                    return lastSeenByCurrentPartnerMessageId;
                }
                return lastSeenByCurrentPartnerMessageId;
            },
            default: 0,
        }),
        /**
         * Local value of message unread counter, that means it is based on initial server value and
         * updated with interface updates.
         */
        $$$localMessageUnreadCounter: attr({
            /**
             * @param {Object} param0
             * @param {Thread} param0.record
             * @returns {integer}
             */
            compute({ record }) {
                // By default trust the server up to the last message it used
                // because it's not possible to do better.
                let baseCounter = record.$$$serverMessageUnreadCounter(this);
                let countFromId = record.$$$serverLastMessageId(this);
                // But if the client knows the last seen message that the server
                // returned (and by assumption all the messages that come after),
                // the counter can be computed fully locally, ignoring potentially
                // obsolete values from the server.
                const firstMessage = record.$$$orderedMessages(this)[0];
                if (
                    firstMessage &&
                    record.$$$lastSeenByCurrentPartnerMessageId(this) &&
                    record.$$$lastSeenByCurrentPartnerMessageId(this) >= firstMessage.$$$id(this)
                ) {
                    baseCounter = 0;
                    countFromId = this.lastSeenByCurrentPartnerMessageId;
                }
                // Include all the messages that are known locally but the server
                // didn't take into account.
                return record.$$$orderedMessages(this).reduce((total, message) => {
                    if (message.$$$id(this) <= countFromId) {
                        return total;
                    }
                    return total + 1;
                }, baseCounter);
            },
        }),
        $$$mainCache: one2one('ThreadCache', {
            /**
             * @param {Object} param0
             * @param {web.env} param0.env
             * @param {Thread} param0.record
             * @returns {ThreadCache}
             */
            compute({ env, record }) {
                return link(
                    env.invoke('Thread/cache', record)
                );
            },
        }),
        $$$members: many2many('Partner', {
            inverse: '$$$memberThreads',
        }),
        /**
         * Determines the message before which the "new message" separator must
         * be positioned, if any.
         */
        $$$messageAfterNewMessageSeparator: many2one('Message', {
            /**
             * @param {Object} param0
             * @param {Thread} param0.record
             * @returns {Message|undefined}
             */
            compute({ record }) {
                if (record.$$$model(this) !== 'mail.channel') {
                    return unlink();
                }
                if (record.$$$localMessageUnreadCounter(this) === 0) {
                    return unlink();
                }
                const index = record.$$$orderedMessages(this).findIndex(message =>
                    message.$$$id(this) === record.$$$lastSeenByCurrentPartnerMessageId(this)
                );
                const message = record.$$$orderedMessages(this)[index + 1];
                if (!message) {
                    return unlink();
                }
                return link(message);
            },
        }),
        $$$messageNeedactionCounter: attr({
            default: 0,
        }),
        /**
         * All messages that this thread is linked to.
         * Note that this field is automatically computed by inverse
         * computed field.
         */
        $$$messages: many2many('Message', {
            inverse: '$$$threads',
        }),
        /**
         * All messages that are contained on this channel on the server.
         * Equivalent to the inverse of python field `channel_ids`.
         */
        $$$messagesAsServerChannel: many2many('Message', {
            inverse: '$$$serverChannels',
        }),
        $$$messageSeenIndicators: one2many('MessageSeenIndicator', {
            inverse: '$$$thread',
            isCausal: true,
            readonly: true,
        }),
        $$$messaging: many2one('Messaging', {
            /**
             * @param {Object} param0
             * @param {web.env} param0.env
             * @returns {Messaging}
             */
            compute({ env }) {
                return link(env.messaging);
            },
        }),
        $$$messagingCurrentPartner: many2one('Partner', {
            related: '$$$messaging.$$$currentPartner',
        }),
        $$$model: attr({
            id: true,
        }),
        $$$modelName: attr(),
        $$$moderation: attr({
            default: false,
        }),
        /**
         * Partners that are moderating this thread (only applies to channels).
         */
        $$$moderators: many2many('Partner', {
            inverse: '$$$moderatedChannels',
        }),
        $$$moduleIcon: attr(),
        $$$name: attr(),
        $$$needactionMessages: many2many('Message', {
            /**
             * @param {Object} param0
             * @param {Thread} param0.record
             * @returns {Message[]}
             */
            compute({ record }) {
                return replace(
                    record.$$$messages(this).filter(
                        message => message.$$$isNeedaction(this)
                    )
                );
            },
        }),
        /**
         * Not a real field, used to trigger `_onChangeFollowersPartner` when one of
         * the dependencies changes.
         */
        $$$onChangeFollowersPartner: attr({
            /**
             * Cleans followers of current thread. In particular, chats are supposed
             * to work with "members", not with "followers". This clean up is only
             * necessary to remove illegitimate followers in stable version, it can
             * be removed in master after proper migration to clean the database.
             *
             * @param {Object} param0
             * @param {web.env} param0.env
             * @param {Thread} param0.record
             */
            compute({ env, record }) {
                if (record.$$$channelType(this) !== 'chat') {
                    return;
                }
                for (const follower of record.$$$followers(this)) {
                    if (follower.$$$partner(this)) {
                        env.invoke('Follower/remove', follower);
                    }
                }
            },
            dependencies: [
                '$$$followersPartner',
            ],
        }),
        $$$onChangeLastSeenByCurrentPartnerMessageId: attr({
            /**
             * @param {Object} param0
             * @param {web.env} param0.env
             * @param {Thread} param0.record
             */
            compute({ env, record }) {
                env.messagingBus.trigger(
                    'o-thread-last-seen-by-current-partner-message-id-changed',
                    { thread: record }
                );
            },
            dependencies: [
                '$$$lastSeenByCurrentPartnerMessageId',
            ],
        }),
        /**
         * Not a real field, used to trigger `_onChangeThreadViews` when one of
         * the dependencies changes.
         */
        $$$onChangeThreadView: attr({
            /**
             * Fetches followers of chats when they are displayed for the first
             * time. This is necessary to clean the followers.
             * @see `$$$onChangeFollowersPartner` for more information.
             *
             * @param {Object} param0
             * @param {web.env} param0.env
             * @param {Thread} param0.record
             */
            compute({ env, record }) {
                if (record.$$$channelType(this) !== 'chat') {
                    return;
                }
                if (record.$$$threadViews(this).length === 0) {
                    return;
                }
                if (record.$$$areFollowersLoaded(this)) {
                    return;
                }
                env.invoke('Thread/refreshFollowers', record);
            },
            dependencies: [
                '$$$threadViews',
            ],
        }),
        /**
         * Not a real field, used to trigger `_onIsServerPinnedChanged` when one of
         * the dependencies changes.
         */
        $$$onIsServerPinnedChanged: attr({
            /**
             * Handles change of pinned state coming from the server. Useful to
             * clear pending state once server acknowledged the change.
             * @see isPendingPinned
             *
             * @param {Object} param0
             * @param {web.env} param0.env
             * @param {Thread} param0.record
             */
            compute({ env, record }) {
                if (
                    record.$$$isServerPinned(this) ===
                    record.$$$isPendingPinned(this)
                ) {
                    env.invoke('Record/update', record, {
                        $$$isPendingPinned: clear(),
                    });
                }
            },
            dependencies: [
                '$$$isServerPinned',
            ],
        }),
        /**
         * Not a real field, used to trigger `_onServerFoldStateChanged` when one of
         * the dependencies changes.
         */
        $$$onServerFoldStateChanged: attr({
            /**
             * Handles change of fold state coming from the server. Useful to
             * synchronize corresponding chat window.
             *
             * @param {Object} param0
             * @param {web.env} param0.env
             * @param {Thread} param0.record
             */
            compute({ env, record }) {
                if (!env.messaging.$$$chatWindowManager(this)) {
                    // avoid crash during destroy
                    return;
                }
                if (record.$$$serverFoldState(this) === 'closed') {
                    env.invoke('ChatWindowManager/closeThread',
                        env.messaging.$$$chatWindowManager(this),
                        record,
                        {
                            notifyServer: false,
                        }
                    );
                } else {
                    env.invoke('ChatWindowManager/openThread',
                        env.messaging.$$$chatWindowManager(this),
                        record,
                        {
                            isFolded: record.$$$serverFoldState(this) === 'folded',
                            notifyServer: false,
                        }
                    );
                }
            },
            dependencies: [
                'serverFoldState',
            ],
        }),
        /**
         * All messages ordered like they are displayed.
         */
        $$$orderedMessages: many2many('Message', {
            /**
             * @param {Object} param0
             * @param {Thread} param0.record
             * @returns {Message[]}
             */
            compute({ record }) {
                return replace(
                    record.$$$messages(this).sort(
                        (m1, m2) => (
                            m1.$$$id(this) < m2.$$$id(this)
                            ? -1
                            : 1
                        )
                    )
                );
            },
        }),
        /**
         * All messages ordered like they are displayed. This field does not
         * contain transient messages which are not "real" records.
         */
        $$$orderedNonTransientMessages: many2many('Message', {
            /**
             * @param {Object} param0
             * @param {Thread} param0.record
             * @returns {Message[]}
             */
            compute({ record }) {
                return replace(
                    record.$$$orderedMessages(this).filter(
                        m => !m.$$$isTransient(this)
                    )
                );
            },
        }),
        /**
         * Ordered typing members on this thread, excluding the current partner.
         */
        $$$orderedOtherTypingMembers: many2many('Partner', {
            /**
             * @param {Object} param0
             * @param {web.env} param0.env
             * @param {Thread} param0.record
             * @returns {Partner[]}
             */
            compute({ env, record }) {
                return replace(
                    record.$$$orderedTypingMembers(this).filter(
                        member => member !== env.messaging.$$$currentPartner(this)
                    ),
                );
            },
        }),
        /**
         * Ordered typing members on this thread. Lower index means this member
         * is currently typing for the longest time. This list includes current
         * partner as typer.
         */
        $$$orderedTypingMembers: many2many('Partner', {
            /**
             * @param {Object} param0
             * @param {web.env} param0.env
             * @param {Thread} param0.record
             * @returns {Partner[]}
             */
            compute({ env, record }) {
                return replace(
                    record.$$$orderedTypingMemberLocalIds(this)
                        .map(localId => env.invoke('Record/get', localId))
                        .filter(member => !!member),
                );
            },
        }),
        /**
         * Technical attribute to manage ordered list of typing members.
         */
        $$$orderedTypingMemberLocalIds: attr({
            default: [],
        }),
        $$$originThreadAttachments: one2many('Attachment', {
            inverse: '$$$originThread',
        }),
        /**
         * States the `Activity` that belongs to `this` and that are
         * overdue (due earlier than today).
         */
        $$$overdueActivities: one2many('Activity', {
            /**
             * @param {Object} param0
             * @param {Thread} param0.record
             * @returns {Activity[]}
             */
            compute({ record }) {
                return replace(
                    record.$$$activities(this).filter(
                        activity => activity.$$$state(this) === 'overdue'
                    )
                );
            },
        }),
        $$$partnerSeenInfos: one2many('ThreadPartnerSeenInfo', {
            inverse: '$$$thread',
            isCausal: true,
            readonly: true,
        }),
        /**
         * Determine if there is a pending seen message change, which is a change
         * of seen message requested by the client but not yet confirmed by the
         * server.
         */
        $$$pendingSeenMessageId: attr(),
        $$$public: attr(),
        /**
         * Determine the last fold state known by the server, which is the fold
         * state displayed after initialization or when the last pending
         * fold state change was confirmed by the server.
         *
         * This field should be considered read only in most situations. Only
         * the code handling fold state change from the server should typically
         * update it.
         */
        $$$serverFoldState: attr({
            default: 'closed',
        }),
        /**
         * Last message id considered by the server.
         *
         * Useful to compute localMessageUnreadCounter field.
         *
         * @see $$$localMessageUnreadCounter
         */
        $$$serverLastMessageId: attr({
            default: 0,
        }),
        /**
         * Message unread counter coming from server.
         *
         * Value of this field is unreliable, due to dynamic nature of
         * messaging. So likely outdated/unsync with server. Should use
         * localMessageUnreadCounter instead, which smartly guess the actual
         * message unread counter at all time.
         *
         * @see $$$localMessageUnreadCounter
         */
        $$$serverMessageUnreadCounter: attr({
            default: 0,
        }),
        /**
         * Determines the `SuggestedRecipientInfo` concerning `this`.
         */
        $$$suggestedRecipientInfoList: one2many('SuggestedRecipientInfo', {
            inverse: '$$$thread',
        }),
        $$$threadViews: one2many('ThreadView', {
            inverse: '$$$thread',
        }),
        /**
         * States the `Activity` that belongs to `this` and that are due
         * specifically today.
         */
        $$$todayActivities: one2many('Activity', {
            /**
             * @param {Object} param0
             * @param {Thread} param0.record
             * @returns {Activity[]}
             */
            compute({ record }) {
                return replace(
                    record.$$$activities(this).filter(
                        activity => activity.$$$state(this) === 'today'
                    )
                );
            },
        }),
        /**
         * Members that are currently typing something in the composer of this
         * thread, including current partner.
         */
        $$$typingMembers: many2many('Partner'),
        /**
         * Text that represents the status on this thread about typing members.
         */
        $$$typingStatusText: attr({
            /**
             * @param {Object} param0
             * @param {web.env} param0.env
             * @param {Thread} param0.record
             * @returns {string}
             */
            compute({ env, record }) {
                if (record.$$$orderedOtherTypingMembers(this).length === 0) {
                    return record.constructor.fields.get('$$$typingStatusText').default;
                }
                if (record.$$$orderedOtherTypingMembers(this).length === 1) {
                    return _.str.sprintf(
                        env._t("%s is typing..."),
                        record.$$$orderedOtherTypingMembers(this)[0].$$$nameOrDisplayName(this)
                    );
                }
                if (record.$$$orderedOtherTypingMembers(this).length === 2) {
                    return _.str.sprintf(
                        env._t("%s and %s are typing..."),
                        record.$$$orderedOtherTypingMembers(this)[0].$$$nameOrDisplayName(this),
                        record.$$$orderedOtherTypingMembers(this)[1].$$$nameOrDisplayName(this)
                    );
                }
                return _.str.sprintf(
                    env._t("%s, %s and more are typing..."),
                    record.$$$orderedOtherTypingMembers(this)[0].$$$nameOrDisplayName(this),
                    record.$$$orderedOtherTypingMembers(this)[1].$$$nameOrDisplayName(this)
                );
            },
            default: "",
        }),
        $$$uuid: attr(),
    },
    lifecycles: {
        /**
         * @param {Object} param0
         * @param {web.env} param0.env
         * @param {Thread} param0.record
         */
        onCreate({ env, record }) {
            /**
             * Timer of current partner that was currently typing something, but
             * there is no change on the input for 5 seconds. This is used
             * in order to automatically notify other members that current
             * partner has stopped typing something, due to making no changes
             * on the composer for some time.
             */
            record._currentPartnerInactiveTypingTimer = new Timer(
                env,
                () => env.invoke(
                    'Record/doAsync',
                    record,
                    () => env.invoke(
                        'Thread/_onCurrentPartnerInactiveTypingTimeout',
                        record
                    )
                ),
                5 * 1000
            );
            /**
             * Last 'is_typing' status of current partner that has been notified
             * to other members. Useful to prevent spamming typing notifications
             * to other members if it hasn't changed. An exception is the
             * current partner long typing scenario where current partner has
             * to re-send the same typing notification from time to time, so
             * that other members do not assume he/she is no longer typing
             * something from not receiving any typing notifications for a
             * very long time.
             *
             * Supported values: true/false/undefined.
             * undefined makes only sense initially and during current partner
             * long typing timeout flow.
             */
            record._currentPartnerLastNotifiedIsTyping = undefined;
            /**
             * Timer of current partner that is typing a very long text. When
             * the other members do not receive any typing notification for a
             * long time, they must assume that the related partner is no longer
             * typing something (e.g. they have closed the browser tab).
             * This is a timer to let other members know that current partner
             * is still typing something, so that they should not assume he/she
             * has stopped typing something.
             */
            record._currentPartnerLongTypingTimer = new Timer(
                env,
                () => env.invoke(
                    'Record/doAsync',
                    record,
                    () => env.invoke(
                        'Thread/_onCurrentPartnerLongTypingTimeout',
                        record
                    )
                ),
                50 * 1000
            );
            /**
             * Determines whether the next request to notify current partner
             * typing status should always result to making RPC, regardless of
             * whether last notified current partner typing status is the same.
             * Most of the time we do not want to notify if value hasn't
             * changed, exception being the long typing scenario of current
             * partner.
             */
            record._forceNotifyNextCurrentPartnerTypingStatus = false;
            /**
             * Registry of timers of partners currently typing in the thread,
             * excluding current partner. This is useful in order to
             * automatically unregister typing members when not receive any
             * typing notification after a long time. Timers are internally
             * indexed by partner records as key. The current partner is
             * ignored in this registry of timers.
             *
             * @see registerOtherMemberTypingMember
             * @see unregisterOtherMemberTypingMember
             */
            record._otherMembersLongTypingTimers = new Map();

            /**
             * Clearable and cancellable throttled version of the
             * `_notifyCurrentPartnerTypingStatus` method.
             * This is useful when the current partner posts a message and
             * types something else afterwards: it must notify immediately that
             * he/she is typing something, instead of waiting for the throttle
             * internal timer.
             *
             * @see _notifyCurrentPartnerTypingStatus
             */
            record._throttleNotifyCurrentPartnerTypingStatus = throttle(
                env,
                ({ isTyping }) => env.invoke(
                    'Record/doAsync',
                    () => env.invoke(
                        'Thread/_notifyCurrentPartnerTypingStatus',
                        record,
                        { isTyping }
                    )
                ),
                2.5 * 1000
            );
        },
        /**
         * @param {Object} param0
         * @param {web.env} param0.env
         * @param {Thread} param0.record
         */
        onDelete({ env, record }) {
            record._currentPartnerInactiveTypingTimer.clear();
            record._currentPartnerLongTypingTimer.clear();
            record._throttleNotifyCurrentPartnerTypingStatus.clear();
            for (const timer of record._otherMembersLongTypingTimers.values()) {
                timer.clear();
            }
            if (record.$$$isTemporary(this)) {
                for (const message of record.$$$messages(this)) {
                    env.invoke('Record/delete', message);
                }
            }
        },
    },
});

return defineFeatureSlice(
    'mail/static/src/models/thread/thread.js',
    actions,
    model,
);

});
