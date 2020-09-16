odoo.define('mail/static/src/models/message/message.js', function (require) {
'use strict';

const emojis = require('mail.emojis');
const {
    'Feature/defineActions': defineActions,
    'Feature/defineModel': defineModel,
    'Feature/defineSlice': defineFeatureSlice,
    'Field/attr': attr,
    'Field/clear': clear,
    'Field/insert': insert,
    'Field/insertAndReplace': insertAndReplace,
    'Field/link': link,
    'Field/many2many': many2many,
    'Field/many2one': many2one,
    'Field/one2many': one2many,
    'Field/replace': replace,
    'Field/unlink': unlink,
    'Field/unlinkAll': unlinkAll,
} = require('mail/static/src/model/utils.js');
const {
    addLink,
    htmlToTextContentInline,
    parseAndTransform,
    timeFromNow,
} = require('mail.utils');

const {
    str_to_datetime,
} = require('web.time');

const actions = defineActions({
    /**
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Thread} thread
     * @param {string} threadStringifiedDomain
     */
    'Message/checkAll'(
        { env },
        thread,
        threadStringifiedDomain
    ) {
        const threadCache = env.invoke(
            'Thread/cache',
            thread,
            threadStringifiedDomain
        );
        env.invoke('Record/update', threadCache, {
            $$$checkedMessages: link(threadCache.$$$messages()),
        });
    },
    /**
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Object} data
     * @return {Object}
     */
    'Message/convertData'(
        { env },
        data
    ) {
        const data2 = {};
        if ('attachment_ids' in data) {
            if (!data.attachment_ids) {
                data2.$$$attachments = unlinkAll();
            } else {
                data2.$$$attachments = insertAndReplace(
                    data.attachment_ids.map(attachmentData =>
                        env.invoke('Attachment/convertData', attachmentData)
                    )
                );
            }
        }
        if ('author_id' in data) {
            if (!data.author_id) {
                data2.$$$author = unlinkAll();
            } else if (data.author_id[0] !== 0) {
                // partner id 0 is a hack of message_format to refer to an
                // author non-related to a partner. display_name equals
                // email_from, so this is omitted due to being redundant.
                data2.$$$author = insert({
                    $$$displayName: data.author_id[1],
                    $$$id: data.author_id[0],
                });
            }
        }
        if ('body' in data) {
            data2.$$$body = data.body;
        }
        if ('channel_ids' in data && data.channel_ids) {
            const channels = data.channel_ids
                .map(channelId =>
                    env.invoke('Thread/findFromId', {
                        $$$id: channelId,
                        $$$model: 'mail.channel',
                    })
                ).filter(channel => !!channel);
            data2.$$$serverChannels = replace(channels);
        }
        if ('date' in data && data.date) {
            data2.$$$date = moment(str_to_datetime(data.date));
        }
        if ('email_from' in data) {
            data2.$$$emailFrom = data.email_from;
        }
        if ('history_partner_ids' in data) {
            data2.$$$isHistory = data.history_partner_ids.includes(
                env.messaging.$$$currentPartner().$$$id()
            );
        }
        if ('id' in data) {
            data2.$$$id = data.id;
        }
        if ('is_discussion' in data) {
            data2.$$$isDiscussion = data.is_discussion;
        }
        if ('is_note' in data) {
            data2.$$$isNote = data.is_note;
        }
        if ('is_notification' in data) {
            data2.$$$isNotification = data.is_notification;
        }
        if ('message_type' in data) {
            data2.$$$type = data.message_type;
        }
        if ('model' in data && 'res_id' in data && data.model && data.res_id) {
            const originThreadData = {
                $$$id: data.res_id,
                $$$model: data.model,
            };
            if ('record_name' in data && data.record_name) {
                originThreadData.$$$name = data.record_name;
            }
            if ('res_model_name' in data && data.res_model_name) {
                originThreadData.$$$modelName = data.res_model_name;
            }
            if ('module_icon' in data) {
                originThreadData.$$$moduleIcon = data.module_icon;
            }
            data2.$$$originThread = insert(originThreadData);
        }
        if ('moderation_status' in data) {
            data2.$$$moderationStatus = data.moderation_status;
        }
        if ('needaction_partner_ids' in data) {
            data2.$$$isNeedaction = data.needaction_partner_ids.includes(
                env.messaging.$$$currentPartner().$$$id()
            );
        }
        if ('notifications' in data) {
            data2.$$$notifications = insert(
                data.notifications.map(notificationData =>
                    env.invoke('Notification/convertData', notificationData)
                )
            );
        }
        if ('starred_partner_ids' in data) {
            data2.$$$isStarred = data.starred_partner_ids.includes(
                env.messaging.$$$currentPartner().$$$id()
            );
        }
        if ('subject' in data) {
            data2.$$$subject = data.subject;
        }
        if ('subtype_description' in data) {
            data2.$$$subtypeDescription = data.subtype_description;
        }
        if ('subtype_id' in data) {
            data2.$$$subtypeId = data.subtype_id;
        }
        if ('tracking_value_ids' in data) {
            data2.$$$trackingValues = data.tracking_value_ids;
        }

        return data2;
    },
    /**
     * @param {Object} _
     * @param {Message} message
     * @param {Thread} thread
     * @param {string} threadStringifiedDomain
     * @returns {boolean}
     */
    'Message/isChecked'(
        _,
        message,
        thread,
        threadStringifiedDomain
    ) {
        const relatedCheckedThreadCache = message.$$$checkedThreadCaches(this).find(
            threadCache => (
                threadCache.$$$thread(this) === thread &&
                threadCache.$$$stringifiedDomain(this) === threadStringifiedDomain
            )
        );
        return !!relatedCheckedThreadCache;
    },
    /**
     * Mark all messages of current user with given domain as read.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Array[]} domain
     */
    async 'Message/markAllAsRead'(
        { env },
        domain
    ) {
        await env.services.rpc({
            model: 'mail.message',
            method: 'mark_all_as_read',
            kwargs: { domain },
        });
    },
    /**
     * Mark this message as read, so that it no longer appears in current
     * partner Inbox.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Message} message
     */
    async 'Message/markAsRead'(
        { env },
        message
    ) {
        await env.invoke(
            'Record/doAsync',
            message,
            () => env.services.rpc({
                model: 'mail.message',
                method: 'set_message_done',
                args: [[message.$$$id(this)]]
            })
        );
    },
    /**
     * Mark provided messages as read. Messages that have been marked as
     * read are acknowledged by server with response as longpolling
     * notification of following format:
     *
     * [[dbname, 'res.partner', partnerId], { type: 'mark_as_read' }]
     *
     * @see messagingNotificationHandler:_handleNotificationPartnerMarkAsRead()
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Message[]} messages
     */
    async 'Message/markMessagesAsRead'(
        { env },
        messages
    ) {
        await env.services.rpc({
            model: 'mail.message',
            method: 'set_message_done',
            args: [messages.map(message => message.$$$id(this))]
        });
    },
    /**
     * Applies the moderation `decision` on the provided messages.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Message[]} messages
     * @param {string} decision: 'accept', 'allow', ban', 'discard', or 'reject'
     * @param {Object|undefined} [kwargs] optional data to pass on
     *  message moderation. This is provided when rejecting the messages
     *  for which title and comment give reason(s) for reject.
     * @param {string} [kwargs.title]
     * @param {string} [kwargs.comment]
     */
    async 'Message/moderateMessages'(
        { env },
        messages,
        decision,
        kwargs
    ) {
        const messageIds = messages.map(message => message.$$$id());
        await env.services.rpc({
            model: 'mail.message',
            method: 'moderate',
            args: [messageIds, decision],
            kwargs: kwargs,
        });
    },
    /**
     * Opens the view that allows to resend the message in case of failure.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Message} message
     */
    'Message/openResendAction'({ env }, message) {
        env.bus.trigger('do-action', {
            action: 'mail.mail_resend_message_action',
            options: {
                additional_context: {
                    mail_message_to_resend: message.$$$id(this),
                },
            },
        });
    },
    /**
     * Performs the `message_fetch` RPC on `mail.message`.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Array[]} domain
     * @param {integer} [limit]
     * @param {integer[]} [moderated_channel_ids]
     * @param {Object} [context]
     * @returns {Message[]}
     */
    async 'Message/performRpcMessageFetch'(
        { env },
        domain,
        limit,
        moderated_channel_ids,
        context
    ) {
        const messagesData = await env.services.rpc({
            model: 'mail.message',
            method: 'message_fetch',
            kwargs: {
                context,
                domain,
                limit,
                moderated_channel_ids,
            },
        }, { shadow: true });
        const messages = env.invoke('Message/insert', messagesData.map(
            messageData => env.invoke('Message/convertData', messageData)
        ));
        // compute seen indicators (if applicable)
        for (const message of messages) {
            for (const thread of message.$$$threads()) {
                if (
                    thread.$$$model() !== 'mail.channel' ||
                    thread.$$$channelType() === 'channel'
                ) {
                    // disabled on non-channel threads and
                    // on `channel` channels for performance reasons
                    continue;
                }
                env.invoke('MessageSeenIndicator/insert', {
                    $$$channelId: thread.$$$id(this),
                    $$$messageId: message.$$$id(this),
                });
            }
        }
        return messages;
    },
    /**
      * Refreshes the value of `dateFromNow` field to the "current now".
      *
      * @param {Object} param0
      * @param {web.env} param0.env
      * @param {Message} message
      */
    'Message/refreshDateFromNow'(
        { env },
        message
    ) {
        env.invoke('Record/update', message, {
            $$$dateFromNow: env.invoke(
                'Message/_computeDateFromNow',
                message
            ),
        });
    },
    /**
     * Action to initiate reply to current message in Discuss Inbox. Assumes
     * that Discuss and Inbox are already opened.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Message} message
     */
    'Message/replyTo'(
        { env },
        message
    ) {
        env.messaging.$$$discuss(this).replyToMessage(message);
    },
    /**
     * Toggle check state of this message in the context of the provided
     * thread and its stringifiedDomain.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Message} message
     * @param {Thread} thread
     * @param {string} threadStringifiedDomain
     */
    'Message/toggleCheck'(
        { env },
        message,
        thread,
        threadStringifiedDomain
    ) {
        const threadCache = env.invoke('Thread/cache', thread, threadStringifiedDomain);
        if (threadCache.$$$checkedMessages(this).includes(message)) {
            env.invoke('Record/update', threadCache, {
                $$$checkedMessages: unlink(message),
            });
        } else {
            env.invoke('Record/update', threadCache, {
                $$$checkedMessages: link(message),
            });
        }
    },
    /**
     * Toggle the starred status of the provided message.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Message} message
     */
    async 'Message/toggleStar'(
        { env },
        message
    ) {
        await env.invoke(
            'Record/doAsync',
            message,
            () => env.services.rpc({
                model: 'mail.message',
                method: 'toggle_message_starred',
                args: [[message.$$$id(this)]]
            })
        );
    },
    /**
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Thread} thread
     * @param {string} threadStringifiedDomain
     */
    'Message/uncheckAll'(
        { env },
        thread,
        threadStringifiedDomain
    ) {
        const threadCache = env.invoke('Thread/cache', thread, threadStringifiedDomain);
        env.invoke('Record/update', threadCache, {
            $$$checkedMessages: unlink(threadCache.$$$messages()),
        });
    },
    /**
     * Unstar all starred messages of current user.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     */
    async 'Message/unstarAll'({ env }) {
        await env.services.rpc({
            model: 'mail.message',
            method: 'unstar_all',
        });
    },
});

const model = defineModel({
    name: 'Message',
    fields: {
        $$$attachments: many2many('Attachment', {
            inverse: '$$$messages',
        }),
        $$$author: many2one('Partner', {
            inverse: '$$$messagesAsAuthor',
        }),
        /**
         * This value is meant to be returned by the server
         * (and has been sanitized before stored into db).
         * Do not use this value in a 't-raw' if the message has been created
         * directly from user input and not from server data as it's not escaped.
         */
        $$$body: attr({
            default: "",
        }),
        $$$checkedThreadCaches: many2many('ThreadCache', {
            inverse: '$$$checkedMessages',
        }),
        $$$date: attr({
            default: moment(),
        }),
        /**
         * States the time elapsed since date up to now.
         */
        $$$dateFromNow: attr({
            /**
             * @param {Object} param0
             * @param {Message} param0.record
             * @returns {string}
             */
            compute({ record }) {
                if (!record.$$$date(this)) {
                    return clear();
                }
                return timeFromNow(record.$$$date(this));
            }
        }),
        $$$emailFrom: attr(),
        $$$failureNotifications: one2many('Notification', {
            /**
             * @param {Object} param0
             * @param {Message} param0.record
             * @returns {Notification[]}
             */
            compute({ record }) {
                return replace(
                    record.$$$notifications(this).filter(notification =>
                        ['exception', 'bounce'].includes(
                            notification.$$$status(this)
                        )
                    )
                );
            },
        }),
        $$$hasCheckbox: attr({
            /**
             * @param {Object} param0
             * @param {Message} param0.record
             * @returns {boolean}
             */
            compute({ record }) {
                return record.$$$isModeratedByCurrentPartner(this);
            },
            default: false,
        }),
        $$$id: attr({
            id: true,
        }),
        $$$isCurrentPartnerAuthor: attr({
            /**
             * @param {Object} param0
             * @param {Message} param0.record
             * @returns {boolean}
             */
            compute({ record }) {
                return !!(
                    record.$$$author(this) &&
                    record.$$$messagingCurrentPartner(this) &&
                    record.$$$messagingCurrentPartner(this) === record.$$$author(this)
                );
            },
            default: false,
        }),
        /**
         * States whether `body` and `subtype_description` contain similar
         * values.
         *
         * This is necessary to avoid displaying both of them together when they
         * contain duplicate information. This will especially happen with
         * messages that are posted automatically at the creation of a record
         * (messages that serve as tracking messages). They do have hard-coded
         * "record created" body while being assigned a subtype with a
         * description that states the same information.
         *
         * Fixing newer messages is possible by not assigning them a duplicate
         * body content, but the check here is still necessary to handle
         * existing messages.
         *
         * Limitations:
         * - A translated subtype description might not match a non-translatable
         *   body created by a user with a different language.
         * - Their content might be mostly but not exactly the same.
         */
        $$$isBodyEqualSubtypeDescription: attr({
            /**
             * @param {Object} param0
             * @param {Message} param0.record
             * @returns {boolean}
             */
            compute({ record }) {
                if (
                    !record.$$$body(this) ||
                    !record.$$$subtypeDescription(this)
                ) {
                    return false;
                }
                const inlineBody = htmlToTextContentInline(record.$$$body(this));
                return (
                    inlineBody.toLowerCase() ===
                    record.$$$subtypeDescription(this).toLowerCase()
                );
            },
            default: false,
        }),
        /**
         * Determine whether the message has to be considered empty or not.
         *
         * An empty message has no text, no attachment and no tracking value.
         */
        $$$isEmpty: attr({
            /**
             * @param {Object} param0
             * @param {Message} param0.record
             */
            compute({ record }) {
                return (
                    (
                        !record.$$$body(this) ||
                        htmlToTextContentInline(record.$$$body(this)) === ''
                    ) &&
                    record.$$$attachments(this).length === 0 &&
                    record.$$$trackingValues(this).length === 0 &&
                    !record.$$$subtypeDescription(this)
                );
            },
        }),
        $$$isModeratedByCurrentPartner: attr({
            /**
             * @param {Object} param0
             * @param {Message} param0.record
             * @returns {boolean}
             */
            compute({ record }) {
                return (
                    record.$$$moderationStatus(this) === 'pending_moderation' &&
                    record.$$$originThread(this) &&
                    record.$$$originThread(this).$$$isModeratedByCurrentPartner(this)
                );
            },
            default: false,
        }),
        $$$isTemporary: attr({
            default: false,
        }),
        $$$isTransient: attr({
            default: false,
        }),
        $$$isDiscussion: attr({
            default: false,
        }),
        /**
         * Determine whether the message was a needaction. Useful to make it
         * present in history mailbox.
         */
        $$$isHistory: attr({
            default: false,
        }),
        /**
         * Determine whether the message is needaction. Useful to make it
         * present in inbox mailbox and messaging menu.
         */
        $$$isNeedaction: attr({
            default: false,
        }),
        $$$isNote: attr({
            default: false,
        }),
        $$$isNotification: attr({
            default: false,
        }),
        /**
         * Determine whether the message is starred. Useful to make it present
         * in starred mailbox.
         */
        $$$isStarred: attr({
            default: false,
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
        $$$messagingHistory: many2one('Thread', {
            related: '$$$messaging.$$$history',
        }),
        $$$messagingInbox: many2one('Thread', {
            related: '$$$messaging.$$$inbox',
        }),
        $$$messagingModeration: many2one('Thread', {
            related: '$$$messaging.$$$moderation',
        }),
        $$$messagingStarred: many2one('Thread', {
            related: '$$$messaging.$$$starred',
        }),
        $$$moderationStatus: attr(),
        $$$notifications: one2many('Notification', {
            inverse: '$$$message',
            isCausal: true,
        }),
        $$$notificationsStatus: attr({
            default: [],
            related: '$$$notifications.$$$status',
        }),
        /**
         * Origin thread of this message (if any).
         */
        $$$originThread: many2one('Thread'),
        $$$originThreadIsModeratedByCurrentPartner: attr({
            default: false,
            related: '$$$originThread.$$$isModeratedByCurrentPartner',
        }),
        /**
         * This value is meant to be based on field body which is
         * returned by the server (and has been sanitized before stored into db).
         * Do not use this value in a 't-raw' if the message has been created
         * directly from user input and not from server data as it's not escaped.
         */
        $$$prettyBody: attr({
            /**
             * @param {Object} param0
             * @param {Message} param0.record
             * @returns {string}
             */
            compute({ record }) {
                let prettyBody;
                for (const emoji of emojis) {
                    const { unicode } = emoji;
                    const regexp = new RegExp(
                        `(?:^|\\s|<[a-z]*>)(${unicode})(?=\\s|$|</[a-z]*>)`,
                        "g"
                    );
                    const originalBody = record.$$$body(this);
                    prettyBody = record.$$$body(this).replace(
                        regexp,
                        ` <span class="o_mail_emoji">${unicode}</span> `
                    );
                    // Idiot-proof limit. If the user had the amazing idea of
                    // copy-pasting thousands of emojis, the image rendering can lead
                    // to memory overflow errors on some browsers (e.g. Chrome). Set an
                    // arbitrary limit to 200 from which we simply don't replace them
                    // (anyway, they are already replaced by the unicode counterpart).
                    if (_.str.count(prettyBody, 'o_mail_emoji') > 200) {
                        prettyBody = originalBody;
                    }
                }
                // add anchor tags to urls
                return parseAndTransform(prettyBody, addLink);
            },
        }),
        /**
         * All channels containing this message on the server.
         * Equivalent of python field `channel_ids`.
         */
        $$$serverChannels: many2many('Thread', {
            inverse: '$$$messagesAsServerChannel',
        }),
        $$$subject: attr(),
        $$$subtypeDescription: attr(),
        $$$subtypeId: attr(),
        /**
         * All threads that this message is linked to. This field is read-only.
         */
        $$$threads: many2many('Thread', {
            /**
             * @param {Object} param0
             * @param {web.env} param0.env
             * @param {Message} param0.record
             * @returns {Thread[]}
             */
            compute({ env, record }) {
                const threads = [...record.$$$serverChannels(this)];
                if (record.$$$isHistory(this)) {
                    threads.push(env.messaging.$$$history(this));
                }
                if (record.$$$isNeedaction(this)) {
                    threads.push(env.messaging.$$$inbox(this));
                }
                if (record.$$$isStarred(this)) {
                    threads.push(env.messaging.$$$starred(this));
                }
                if (
                    env.messaging.$$$moderation(this) &&
                    record.$$$isModeratedByCurrentPartner(this)
                ) {
                    threads.push(env.messaging.$$$moderation(this));
                }
                if (record.$$$originThread(this)) {
                    threads.push(record.$$$originThread(this));
                }
                return replace(threads);
            },
            inverse: '$$$messages',
        }),
        $$$trackingValues: attr({
            default: [],
        }),
        $$$type: attr(),
    },
});

return defineFeatureSlice(
    'mail/static/src/models/message/message.js',
    actions,
    model,
);

});
