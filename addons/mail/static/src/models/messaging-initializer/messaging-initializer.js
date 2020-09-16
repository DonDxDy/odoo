odoo.define('mail/static/src/models/messaging-initializer/messaging-initializer.js', function (require) {
'use strict';

const {
    'Feature/defineActions': defineActions,
    'Feature/defineModel': defineModel,
    'Feature/defineSlice': defineFeatureSlice,
    'Field/create': create,
    'Field/insert': insert,
    'Field/link': link,
    'Field/one2one': one2one,
} = require('mail/static/src/model/utils.js');
const {
    executeGracefully,
} = require('mail/static/src/utils/utils.js');

const actions = defineActions({
    /**
     * Fetch messaging data initially to populate the store specifically for
     * the current user. This includes pinned channels for instance.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {MessagingInitializer} messagingInitializer
     */
    async 'MessagingInitializer/start'(
        { env },
        messagingInitializer
    ) {
        env.invoke('Record/update',
            messagingInitializer.$$$messaging(this),
            {
                $$$history: create({
                    $$$id: 'history',
                    $$$isServerPinned: true,
                    $$$model: 'mail.box',
                    $$$name: env._t("History"),
                }),
                $$$inbox: create({
                    $$$id: 'inbox',
                    $$$isServerPinned: true,
                    $$$model: 'mail.box',
                    $$$name: env._t("Inbox"),
                }),
                $$$moderation: create({
                    $$$id: 'moderation',
                    $$$model: 'mail.box',
                    $$$name: env._t("Moderation"),
                }),
                $$$starred: create({
                    $$$id: 'starred',
                    $$$isServerPinned: true,
                    $$$model: 'mail.box',
                    $$$name: env._t("Starred"),
                }),
            }
        );
        const device = messagingInitializer.$$$messaging(this).$$$device(this);
        env.invoke('Device/start', device);
        env.invoke(
            'ChatWindowManager/start',
            messagingInitializer.$$$messaging(this).$$$chatWindowManager(this)
        );
        const context = {
            isMobile: device.$$$isMobile(this),
            ...env.session.user_context,
        };
        const discuss = messagingInitializer.$$$messaging(this).$$$discuss(this);
        const data = await env.invoke(
            'Record/doAsync',
            messagingInitializer,
            () => env.services.rpc({
                route: '/mail/init_messaging',
                params: { context },
            }, { shadow: true })
        );
        await env.invoke(
            'Record/doAsync',
            messagingInitializer,
            () => env.invoke(
                'MessagingInitializer/_init',
                messagingInitializer,
                data
            )
        );
        if (discuss.$$$isOpen(this)) {
            env.invoke('Discuss/openInitThread', discuss);
        }
        if (env.autofetchPartnerImStatus) {
            env.invoke('Partner/startLoopFetchImStatus');
        }
    },
    /**
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {*} messagingInitializer
     */
    'MessagingInitializer/stop'(
        { env },
        messagingInitializer
    ) {
        env.invoke(
            'Device/stop',
            messagingInitializer.$$$messaging(this).$$$device(this)
        );
    },
    /**
     * @private
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {MessagingInitializer} messagingInitializer
     * @param {Object} param2
     * @param {Object} param2.channel_slots
     * @param {Array} [param2.commands=[]]
     * @param {Object} param2.current_partner
     * @param {integer} param2.current_user_id
     * @param {Object} [param2.mail_failures={}]
     * @param {Object[]} [param2.mention_partner_suggestions=[]]
     * @param {Object[]} [param2.moderation_channel_ids=[]]
     * @param {integer} [param2.moderation_counter=0]
     * @param {integer} [param2.needaction_inbox_counter=0]
     * @param {Object} param2.partner_root
     * @param {Object} param2.public_partner
     * @param {Object[]} [param2.shortcodes=[]]
     * @param {integer} [param2.starred_counter=0]
     */
    async 'MessagingInitializer/_init'(
        { env },
        messagingInitializer,
        {
            channel_slots,
            commands = [],
            current_partner,
            current_user_id,
            mail_failures = {},
            mention_partner_suggestions = [],
            menu_id,
            moderation_channel_ids = [],
            moderation_counter = 0,
            needaction_inbox_counter = 0,
            partner_root,
            public_partner,
            shortcodes = [],
            starred_counter = 0
        }
    ) {
        const discuss = messagingInitializer.$$$messaging(this).$$$discuss(this);
        // partners first because the rest of the code relies on them
        env.invoke(
            'MessagingInitializer/_initPartners',
            messagingInitializer,
            {
                current_partner,
                current_user_id,
                moderation_channel_ids,
                partner_root,
                public_partner,
            }
        );
        // mailboxes after partners and before other initializers that might
        // manipulate threads or messages
        env.invoke(
            'MessagingInitializer/_initMailboxes',
            messagingInitializer,
            {
                moderation_channel_ids,
                moderation_counter,
                needaction_inbox_counter,
                starred_counter,
            }
        );
        // various suggestions in no particular order
        env.invoke(
            'MessagingInitializer/_initCannedResponses',
            messagingInitializer,
            shortcodes
        );
        env.invoke(
            'MessagingInitializer/_initCommands',
            messagingInitializer,
            commands
        );
        env.invoke(
            'MessagingInitializer/_initMentionPartnerSuggestions',
            messagingInitializer,
            mention_partner_suggestions
        );
        // channels when the rest of messaging is ready
        await env.invoke(
            'Record/doAsync',
            messagingInitializer,
            () => env.invoke(
                'MessagingInitializer/_initChannels',
                messagingInitializer,
                channel_slots
            )
        );
        // failures after channels
        env.invoke(
            'MessagingInitializer/_initMailFailures',
            messagingInitializer,
            mail_failures
        );
        env.invoke('Record/update', discuss, {
            $$$menuId: menu_id,
        });
    },
    /**
     * @private
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {MessagingInitializer} messagingInitializer
     * @param {Object[]} cannedResponsesData
     */
    'MessagingInitializer/_initCannedResponses'(
        { env },
        messagingInitializer,
        cannedResponsesData
    ) {
        env.invoke('Record/update',
            messagingInitializer.$$$messaging(this),
            {
                $$$cannedResponses: insert(
                    cannedResponsesData.map(data => {
                        return {
                            $$$id: data.id,
                            $$$source: data.source,
                            $$$substitution: data.substitution,
                        };
                    })
                ),
            }
        );
    },
    /**
     * @private
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {MessagingInitializer} messagingInitializer
     * @param {Object} [param2={}]
     * @param {Object[]} [param2.channel_channel=[]]
     * @param {Object[]} [param2.channel_direct_message=[]]
     * @param {Object[]} [param2.channel_private_group=[]]
     */
    async 'MessagingInitializer/_initChannels'(
        { env },
        messagingInitializer,
        {
            channel_channel = [],
            channel_direct_message = [],
            channel_private_group = [],
        } = {}
    ) {
        const channelsData = channel_channel.concat(channel_direct_message, channel_private_group);

        return executeGracefully(
            channelsData.map(channelData =>
                () => {
                    const convertedData = env.invoke('Thread/convertData', channelData);
                    if (!convertedData.$$$members) {
                        // channel_info does not return all members of channel for
                        // performance reasons, but code is expecting to know at
                        // least if the current partner is member of it.
                        // (e.g. to know when to display "invited" notification)
                        // Current partner can always be assumed to be a member of
                        // channels received at init.
                        convertedData.$$$members = link(
                            env.messaging.$$$currentPartner(this)
                        );
                    }
                    const channel = env.invoke('Thread/insert', {
                        $$$model: 'mail.channel',
                        ...convertedData,
                    });
                    // flux specific: channels received at init have to be
                    // considered pinned. task-2284357
                    if (!channel.$$$isPinned(this)) {
                        env.invoke('Thread/pin', channel);
                    }
                }
            )
        );
    },
    /**
     * @private
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {MessagingInitializer} messagingInitializer
     * @param {Object[]} commandsData
     */
    'MessagingInitializer/_initCommands'(
        { env },
        messagingInitializer,
        commandsData
    ) {
        env.invoke('Record/update',
            messagingInitializer.$$$messaging(this),
            {
                $$$commands: insert(
                    commandsData.map(data => {
                        return {
                            $$$channelTypes: data.channel_types,
                            $$$help: data.help,
                            $$$name: data.name,
                        };
                    })
                ),
            }
        );
    },
    /**
     * @private
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {MessagingInitializer} messagingInitializer
     * @param {Object} param2
     * @param {Object[]} [param2.moderation_channel_ids=[]]
     * @param {integer} param2.moderation_counter
     * @param {integer} param2.needaction_inbox_counter
     * @param {integer} param2.starred_counter
     */
    'MessagingInitializer/_initMailboxes'(
        { env },
        messagingInitializer,
        {
            moderation_channel_ids,
            moderation_counter,
            needaction_inbox_counter,
            starred_counter,
        }
    ) {
        env.invoke('Record/update',
            env.messaging.$$$inbox(this),
            {
                $$$counter: needaction_inbox_counter,
            }
        );
        env.invoke('Record/update',
            env.messaging.$$$starred(this),
            {
                $$$counter: starred_counter,
            }
        );
        if (moderation_channel_ids.length > 0) {
            env.invoke('Record/update',
                messagingInitializer.$$$messaging(this).$$$moderation(this),
                {
                    $$$counter: moderation_counter,
                    $$$isServerPinned: true,
                }
            );
        }
    },
    /**
     * @private
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {MessagingInitializer} messagingInitializer
     * @param {Object} mailFailuresData
     */
    async 'MessagingInitializer/_initMailFailures'(
        { env },
        messagingInitializer,
        mailFailuresData
    ) {
        await executeGracefully(
            mailFailuresData.map(() => {
                const message = env.invoke(
                    'Message/insert',
                    messageData => env.invoke('Message/convertData', messageData)
                );
                // implicit: failures are sent by the server at initialization
                // only if the current partner is author of the message
                if (
                    !message.$$$author(this) &&
                    messagingInitializer.$$$messaging(this).$$$currentPartner(this)
                ) {
                    env.invoke('Record/update', message, {
                        $$$author: link(
                            messagingInitializer.$$$messaging(this).$$$currentPartner(this)
                        ),
                    });
                }
            })
        );
        env.invoke('NotificationGroupManager/computeGroups',
            messagingInitializer.$$$messaging(this).$$$notificationGroupManager(this)
        );
        // manually force recompute of counter (after computing the groups)
        env.invoke('Record/update',
            messagingInitializer.$$$messaging(this).$$$messagingMenu(this)
        );
    },
    /**
     * @private
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {MessagingInitializer} messagingInitializer
     * @param {Object[]} mentionPartnerSuggestionsData
     */
    async 'MessagingInitializer/_initMentionPartnerSuggestions'(
        { env },
        messagingInitializer,
        mentionPartnerSuggestionsData
    ) {
        return executeGracefully(
            mentionPartnerSuggestionsData.map(suggestions =>
                () => {
                    return executeGracefully(
                        suggestions.map(suggestion =>
                            () => {
                                const { email, id, name } = suggestion;
                                env.invoke('Partner/insert', {
                                    $$$email: email,
                                    $$$id: id,
                                    $$$name: name,
                                });
                            }
                        )
                    );
                }
            )
        );
    },
    /**
     * @private
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {MessagingInitializer} messagingInitializer
     * @param {Object} current_partner
     * @param {integer} current_user_id
     * @param {integer[]} moderation_channel_ids
     * @param {Object} partner_root
     * @param {Object} public_partner
     */
    'MessagingInitializer/_initPartners'(
        { env },
        messagingInitializer,
        {
            current_partner,
            current_user_id: currentUserId,
            moderation_channel_ids = [],
            partner_root,
            public_partner,
        }
    ) {
        env.invoke('Record/update',
            messagingInitializer.$$$messaging(this),
            {
                $$$currentPartner: insert({
                    ...env.invoke('Partner/convertData', current_partner),
                    $$$moderatedChannels: insert(
                        moderation_channel_ids.map(
                            id => {
                                return {
                                    $$$id: id,
                                    $$$model: 'mail.channel',
                                };
                            }
                        ),
                    ),
                    $$$user: insert({
                        $$$id: currentUserId,
                    }),
                }),
                $$$currentUser: insert({
                    $$$id: currentUserId,
                }),
                $$$partnerRoot: insert(
                    env.invoke('Partner/convertData', partner_root)
                ),
                $$$publicPartner: insert(
                    env.invoke('Partner/convertData', public_partner)
                ),
            }
        );
    },
});

const model = defineModel({
    name: 'MessagingInitializer',
    fields: {
        $$$messaging: one2one('Messaging', {
            inverse: '$$$initializer',
        }),
    },
});

return defineFeatureSlice(
    'mail/static/src/models/messaging-initializer/messaging-initializer.js',
    actions,
    model,
);

});
