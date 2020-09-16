odoo.define('mail/static/src/models/discuss/discuss.js', function (require) {
'use strict';

const {
    'Feature/defineActions': defineActions,
    'Feature/defineModel': defineModel,
    'Feature/defineSlice': defineFeatureSlice,
    'Field/attr': attr,
    'Field/clear': clear,
    'Field/create': create,
    'Field/link': link,
    'Field/many2one': many2one,
    'Field/one2many': one2many,
    'Field/one2one': one2one,
    'Field/replace': replace,
    'Field/unlink': unlink,
    'Field/unlinkAll': unlinkAll,
} = require('mail/static/src/model/utils.js');

const actions = defineActions({
    /**
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Discuss} discuss
     * @param {Thread} thread
     */
    'Discuss/cancelThreadRenaming'(
        { env },
        discuss,
        thread
    ) {
        env.invoke('Record/update', discuss, {
            $$$renamingThreads: unlink(thread),
        });
    },
    /**
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Discuss} discuss
     */
    'Discuss/clearIsAddingItem'(
        { env },
        discuss
    ) {
        env.invoke('Record/update', discuss, {
            $$$addingChannelValue: "",
            $$$isAddingChannel: false,
            $$$isAddingChat: false,
        });
    },
    /**
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Discuss} discuss
     */
    'Discuss/clearReplyingToMessage'(
        { env },
        discuss
    ) {
        env.invoke('Record/update', discuss, {
            $$$replyingToMessage: unlinkAll(),
        });
    },
    /**
     * Close the discuss app. Should reset its internal state.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Discuss} discuss
     */
    'Discuss/close'(
        { env },
        discuss
    ) {
        env.invoke('Record/update', discuss, {
            $$$isOpen: false,
        });
    },
    /**
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Discuss} discuss
     */
    'Discuss/focus'({ env }, discuss) {
        env.invoke('Record/update', discuss, {
            $$$isDoFocus: true,
        });
    },
    /**
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Discuss} discuss
     * @param {Event} ev
     * @param {Object} ui
     * @param {Object} ui.item
     * @param {integer} ui.item.id
     */
    async 'Discuss/handleAddChannelAutocompleteSelect'(
        { env },
        discuss,
        ev,
        ui
    ) {
        const name = discuss.$$$addingChannelValue(this);
        env.invoke('Discuss/clearIsAddingItem', discuss);
        if (ui.item.special) {
            const channel = await env.invoke(
                'Record/doAsync',
                discuss,
                () => env.invoke('Thread/performRpcCreateChannel', {
                    name,
                    privacy: ui.item.special,
                })
            );
            env.invoke('Thread/open', channel);
        } else {
            const channel = await env.invoke(
                'Record/doAsync',
                discuss,
                () => env.invoke('Thread/performRpcJoinChannel', {
                    channelId: ui.item.id,
                })
            );
            env.invoke('Thread/open', channel);
        }
    },
    /**
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Discuss} discuss
     * @param {Object} req
     * @param {string} req.term
     * @param {function} res
     */
    async 'Discuss/handleAddChannelAutocompleteSource'(
        { env },
        discuss,
        req,
        res
    ) {
        const value = req.term;
        const escapedValue = owl.utils.escape(value);
        env.invoke('Record/update', discuss, {
            $$$addingChannelValue: value,
        });
        const domain = [
            ['channel_type', '=', 'channel'],
            ['name', 'ilike', value],
        ];
        const fields = ['channel_type', 'name', 'public', 'uuid'];
        const result = await env.invoke(
            'Record/doAsync',
            discuss,
            () => env.services.rpc({
                model: "mail.channel",
                method: "search_read",
                kwargs: {
                    domain,
                    fields,
                },
            })
        );
        const items = result.map(data => {
            let escapedName = owl.utils.escape(data.name);
            return {
                ...data,
                label: escapedName,
                value: escapedName
            };
        });
        // XDU FIXME could use a component but be careful with owl's
        // renderToString https://github.com/odoo/owl/issues/708
        items.push({
            label: _.str.sprintf(
                `<strong>${env._t('Create %s')}</strong>`,
                `<em><span class="fa fa-hashtag"/>${escapedValue}</em>`,
            ),
            escapedValue,
            special: 'public'
        }, {
            label: _.str.sprintf(
                `<strong>${env._t('Create %s')}</strong>`,
                `<em><span class="fa fa-lock"/>${escapedValue}</em>`,
            ),
            escapedValue,
            special: 'private'
        });
        res(items);
    },
    /**
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Discuss} discuss
     * @param {Event} ev
     * @param {Object} ui
     * @param {Object} ui.item
     * @param {integer} ui.item.id
     */
    'Discuss/handleAddChatAutocompleteSelect'(
        { env },
        discuss,
        ev,
        ui
    ) {
        env.invoke('Messaging/openChat', {
            partnerId: ui.item.id,
        });
        env.invoke('Discuss/clearIsAddingItem', discuss);
    },
    /**
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Discuss} discuss
     * @param {Object} req
     * @param {string} req.term
     * @param {function} res
     */
    'Discuss/handleAddChatAutocompleteSource'(
        { env },
        discuss,
        req,
        res
    ) {
        const value = owl.utils.escape(req.term);
        env.invoke('Partner/imSearch', {
            callback: partners => {
                const suggestions = partners.map(partner => {
                    return {
                        id: partner.$$$id(this),
                        value: partner.$$$nameOrDisplayName(this),
                        label: partner.$$$nameOrDisplayName(this),
                    };
                });
                res(_.sortBy(suggestions, 'label'));
            },
            keyword: value,
            limit: 10,
        });
    },
    /**
     * Open thread from init active id. `initActiveId` is used to refer to
     * a thread that we may not have full data yet, such as when messaging
     * is not yet initialized.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Discuss} discuss
     */
    'Discuss/openInitThread'(
        { env },
        discuss
    ) {
        const [model, id] = typeof discuss.$$$initActiveId(this) === 'number'
            ? ['mail.channel', discuss.$$$initActiveId(this)]
            : discuss.$$$initActiveId(this).split('_');
        const thread = env.invoke('Thread/findFromId', {
            $$$id: model !== 'mail.box' ? Number(id) : id,
            $$$model: model,
        });
        if (!thread) {
            return;
        }
        env.invoke('Thread/open', thread);
        if (
            env.messaging.$$$device(this).$$$isMobile(this) &&
            thread.$$$channelType(this)
        ) {
            env.invoke('Record/update', discuss, {
                $$$activeMobileNavbarTabId: thread.$$$channelType(this),
            });
        }
    },
    /**
     * Opens the given thread in Discuss, and opens Discuss if necessary.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Discuss} discuss
     * @param {Thread} thread
     */
    async 'Discuss/openThread'(
        { env },
        discuss,
        thread
    ) {
        env.invoke('Record/update', discuss, {
            $$$thread: link(thread),
        });
        env.invoke('Discuss/focus', discuss);
        if (!discuss.$$$isOpen(this)) {
            env.bus.trigger('do-action', {
                action: 'mail.action_discuss',
                options: {
                    active_id: env.invoke('Discuss/threadToActiveId',
                        discuss,
                        discuss.$$$thread(this)
                    ),
                    clear_breadcrumbs: false,
                    on_reverse_breadcrumb: () =>
                        env.invoke('Discuss/close', discuss),
                },
            });
        }
    },
    /**
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Discuss} discuss
     * @param {Thread} thread
     * @param {string} newName
     */
    async 'Discuss/renameThread'(
        { env },
        discuss,
        thread,
        newName
    ) {
        await env.invoke(
            'Record/doAsync',
            discuss,
            () => env.invoke('Thread/rename', thread, newName)
        );
        env.invoke('Record/update', discuss, {
            $$$renamingThreads: unlink(thread),
        });
    },
    /**
     * Action to initiate reply to given message in Inbox. Assumes that
     * Discuss and Inbox are already opened.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Discuss} discuss
     * @param {Message} message
     */
    'Discuss/replyToMessage'(
        { env },
        discuss,
        message
    ) {
        env.invoke('Record/update', discuss, {
            $$$replyingToMessage: link(message),
        });
        // avoid to reply to a note by a message and vice-versa.
        // subject to change later by allowing subtype choice.
        env.invoke('Record/update',
            discuss.$$$replyingToMessageOriginThreadComposer(this),
            {
                $$$isLog: (
                    !message.$$$isDiscussion(this) &&
                    !message.$$$isNotification(this)
                ),
            }
        );
        env.invoke('Discuss/focus', discuss);
    },
    /**
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Discuss} discuss
     * @param {Thread} thread
     */
    'Discuss/setThreadRenaming'(
        { env },
        discuss,
        thread
    ) {
        env.invoke('Record/update', discuss, {
            $$$renamingThreads: link(thread),
        });
    },
    /**
     * @param {Object} _
     * @param {Discuss} discuss
     * @param {Thread} thread
     * @returns {string}
     */
    'Discuss/threadToActiveId'(
        _,
        discuss,
        thread
    ) {
        return `${thread.$$$model(this)}_${thread.$$$id(this)}`;
    },
});

const model = defineModel({
    name: 'Discuss',
    fields: {
        $$$activeId: attr({
            /**
             * @param {Object} param0
             * @param {web.env} param0.env
             * @param {Discuss} param0.record
             * @returns {string|undefined}
             */
            compute({ env, record }) {
                if (!record.$$$thread(this)) {
                    return clear();
                }
                return env.invoke('Discuss/threadToActiveId',
                    record,
                    record.$$$thread(this)
                );
            },
        }),
        /**
         * Active mobile navbar tab, either 'mailbox', 'chat', or 'channel'.
         */
        $$$activeMobileNavbarTabId: attr({
            default: 'mailbox',
        }),
        /**
         * Value that is used to create a channel from the sidebar.
         */
        $$$addingChannelValue: attr({
            /**
             * @param {Object} param0
             * @param {Discuss} param0.record
             * @returns {string}
             */
            compute({ record }) {
                if (!record.$$$isOpen(this)) {
                    return "";
                }
                return record.$$$addingChannelValue(this);
            },
            default: "",
        }),
        /**
         * Serves as compute dependency.
         */
        $$$device: one2one('Device', {
            related: '$$$messaging.$$$device',
        }),
        /**
         * Serves as compute dependency.
         */
        $$$deviceIsMobile: attr({
            related: '$$$device.$$$isMobile',
        }),
        /**
         * Determine if the moderation discard dialog is displayed.
         */
        $$$hasModerationDiscardDialog: attr({
            default: false,
        }),
        /**
         * Determine if the moderation reject dialog is displayed.
         */
        $$$hasModerationRejectDialog: attr({
            default: false,
        }),
        /**
         * Determines whether `this.thread` should be displayed.
         */
        $$$hasThreadView: attr({
            /**
             * @param {Object} param0
             * @param {web.env} param0.env
             * @param {Discuss} param0.record
             * @returns {boolean}
             */
            compute({ env, record }) {
                if (!record.$$$thread(this) || !record.$$$isOpen(this)) {
                    return false;
                }
                if (
                    env.messaging.$$$device(this).$$$isMobile(this) &&
                    (
                        record.$$$activeMobileNavbarTabId(this) !== 'mailbox' ||
                        record.$$$thread(this).$$$model(this) !== 'mail.box'
                    )
                ) {
                    return false;
                }
                return true;
            },
        }),
        /**
         * Formatted init thread on opening discuss for the first time,
         * when no active thread is defined. Useful to set a thread to
         * open without knowing its local id in advance.
         * Support two formats:
         *    {string} <threadModel>_<threadId>
         *    {int} <channelId> with default model of 'mail.channel'
         */
        $$$initActiveId: attr({
            default: 'mail.box_inbox',
        }),
        /**
         * Determine whether current user is currently adding a channel from
         * the sidebar.
         */
        $$$isAddingChannel: attr({
            /**
             * @param {Object} param0
             * @param {Discuss} param0.record
             * @returns {boolean}
             */
            compute({ record }) {
                if (!record.$$$isOpen(this)) {
                    return false;
                }
                return record.$$$isAddingChannel(this);
            },
            default: false,
        }),
        /**
         * Determine whether current user is currently adding a chat from
         * the sidebar.
         */
        $$$isAddingChat: attr({
            /**
             * @param {Object} param0
             * @param {Discuss} param0.record
             * @returns {boolean}
             */
            compute({ record }) {
                if (!record.$$$isOpen(this)) {
                    return false;
                }
                return record.$$$isAddingChat(this);
            },
            default: false,
        }),
        /**
         * Determine whether this discuss should be focused at next render.
         */
        $$$isDoFocus: attr({
            default: false,
        }),
        /**
         * Whether the discuss app is open or not. Useful to determine
         * whether the discuss or chat window logic should be applied.
         */
        $$$isOpen: attr({
            default: false,
        }),
        $$$isReplyingToMessage: attr({
            /**
             * @param {Object} param0
             * @param {Discuss} param0.record
             * @returns {boolean}
             */
            compute({ record }) {
                return !!record.$$$replyingToMessage(this);
            },
            default: false,
        }),
        $$$isThreadPinned: attr({
            related: '$$$thread.$$$isPinned',
        }),
        /**
         * The menu_id of discuss app, received on mail/init_messaging and
         * used to open discuss from elsewhere.
         */
        $$$menuId: attr({
            default: null,
        }),
        $$$messaging: one2one('Messaging', {
            inverse: '$$$discuss',
        }),
        $$$messagingInbox: many2one('Thread', {
            related: '$$$messaging.$$$inbox',
        }),
        $$$renamingThreads: one2many('Thread'),
        /**
         * The message that is currently selected as being replied to in Inbox.
         * There is only one reply composer shown at a time, which depends on
         * this selected message.
         */
        $$$replyingToMessage: many2one('Message', {
            /**
             * Ensures the reply feature is disabled if discuss is not open.
             *
             * @param {Object} param0
             * @param {Discuss} param0.record
             * @returns {Message|undefined}
             */
            compute({ record }) {
                if (!record.$$$isOpen(this)) {
                    return unlinkAll();
                }
                return [];
            },
        }),
        /**
         * The thread concerned by the reply feature in Inbox. It depends on the
         * message set to be replied, and should be considered read-only.
         */
        $$$replyingToMessageOriginThread: many2one('Thread', {
            related: '$$$replyingToMessage.$$$originThread',
        }),
        /**
         * The composer to display for the reply feature in Inbox. It depends
         * on the message set to be replied.
         */
        $$$replyingToMessageOriginThreadComposer: one2one('Composer', {
            inverse: '$$$discussAsReplying',
            related: '$$$replyingToMessageOriginThread.$$$composer',
        }),
        /**
         * Quick search input value in the discuss sidebar (desktop). Useful
         * to filter channels and chats based on this input content.
         */
        $$$sidebarQuickSearchValue: attr({
            default: "",
        }),
        /**
         * Determines the domain to apply when fetching messages for `this.thread`.
         * This value should only be written by the control panel.
         */
        $$$stringifiedDomain: attr({
            default: '[]',
        }),
        /**
         * Determines the `Thread` that should be displayed by `this`.
         */
        $$$thread: many2one('Thread', {
            /**
             * Only pinned threads are allowed in discuss.
             *
             * @param {Object} param0
             * @param {web.env} param0.env
             * @param {Discuss} param0.record
             * @returns {Thread|undefined}
             */
            compute({ env, record }) {
                let thread = record.$$$thread(this);
                if (
                    env.messaging &&
                    env.messaging.$$$inbox(this) &&
                    env.messaging.$$$device(this).$$$isMobile(this) &&
                    record.$$$activeMobileNavbarTabId(this) === 'mailbox' &&
                    record.$$$initActiveId(this) !== 'mail.box_inbox' &&
                    !thread
                ) {
                    // After loading Discuss from an arbitrary tab other then 'mailbox',
                    // switching to 'mailbox' requires to also set its inner-tab ;
                    // by default the 'inbox'.
                    return replace(env.messaging.$$$inbox(this));
                }
                if (!thread || !thread.$$$isPinned(this)) {
                    return unlink();
                }
                return [];
            },
        }),
        $$$threadId: attr({
            related: '$$$thread.$$$id',
        }),
        $$$threadModel: attr({
            related: '$$$thread.$$$model',
        }),
        /**
         * States the `ThreadView` displaying `this.thread`.
         */
        $$$threadView: one2one('ThreadView', {
            related: '$$$threadViewer.$$$threadView',
        }),
        /**
         * Determines the `ThreadViewer` managing the display of `this.thread`.
         */
        $$$threadViewer: one2one('ThreadViewer', {
            default: create(),
            inverse: '$$$discuss',
            isCausal: true,
            readonly: true,
        }),
    },
});

return defineFeatureSlice(
    'mail/static/src/models/discuss/discuss.js',
    actions,
    model,
);

});
