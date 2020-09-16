odoo.define('mail/static/src/models/partner/partner.js', function (require) {
'use strict';

const {
    'Feature/defineActions': defineActions,
    'Feature/defineModel': defineModel,
    'Feature/defineSlice': defineFeatureSlice,
    'Field/attr': attr,
    'Field/insert': insert,
    'Field/link': link,
    'Field/many2many': many2many,
    'Field/many2one': many2one,
    'Field/one2many': one2many,
    'Field/one2one': one2one,
    'Field/unlinkAll': unlinkAll,
} = require('mail/static/src/model/utils.js');

const {
    unaccent,
} = require('web.utils');

const actions = defineActions({
    /**
     * Checks whether this partner has a related user and links them if
     * applicable.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Partner} partner
     */
    async 'Partner/checkIsUser'(
        { env },
        partner
    ) {
        const userIds = await env.invoke(
            'Record/doAsync',
            partner,
            () => env.services.rpc({
                model: 'res.users',
                method: 'search',
                args: [[['partner_id', '=', partner.$$$id(this)]]],
                kwargs: {
                    context: { active_test: false },
                },
            }, { shadow: true })
        );
        env.invoke('Record/update', partner, {
            $$$hasCheckedUser: true,
        });
        if (userIds.length > 0) {
            env.invoke('Record/update', partner, {
                $$$user: insert({
                    $$$id: userIds[0],
                }),
            });
        }
    },
    /**
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Object} data
     * @return {Object}
     */
    'Partner/convertData'(
        { env },
        data
    ) {
        const data2 = {};
        if ('active' in data) {
            data2.$$$active = data.active;
        }
        if ('country' in data) {
            if (!data.country) {
                data2.$$$country = unlinkAll();
            } else {
                data2.$$$country = insert({
                    $$$id: data.country[0],
                    $$$name: data.country[1],
                });
            }
        }
        if ('display_name' in data) {
            data2.$$$displayName = data.display_name;
        }
        if ('email' in data) {
            data2.$$$email = data.email;
        }
        if ('id' in data) {
            data2.$$$id = data.id;
        }
        if ('im_status' in data) {
            data2.$$$im_status = data.im_status;
        }
        if ('name' in data) {
            data2.$$$name = data.name;
        }
        // relation
        if ('user_id' in data) {
            if (!data.user_id) {
                data2.$$$user = unlinkAll();
            } else {
                let user = {};
                if (Array.isArray(data.user_id)) {
                    user = {
                        $$$displayName: data.user_id[1],
                        $$$id: data.user_id[0],
                    };
                } else {
                    user = {
                        $$$id: data.user_id,
                    };
                }
                data2.$$$user = insert(user);
            }
        }
        return data2;
    },
    /**
     * Gets the chat between the user of this partner and the current user.
     *
     * If a chat is not appropriate, a notification is displayed instead.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Partner} partner
     * @returns {Thread|undefined}
     */
    async 'Partner/getChat'(
        { env },
        partner
    ) {
        if (
            !partner.$$$user(this) &&
            !partner.$$$hasCheckedUser(this)
        ) {
            await env.invoke(
                'Record/doAsync',
                partner,
                () => env.invoke('Partner/checkIsUser', partner)
            );
        }
        // prevent chatting with non-users
        if (!partner.$$$user(this)) {
            env.services['notification'].notify({
                message: env._t("You can only chat with partners that have a dedicated user."),
                type: 'info',
            });
            return;
        }
        return env.invoke('User/getChat', partner.$$$user(this));
    },
    /**
     * Search for partners matching `keyword`.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Object} param1
     * @param {function} param1.callback
     * @param {string} param1.keyword
     * @param {integer} [param1.limit=10]
     */
    async 'Partner/imSearch'(
        { env },
        {
            callback,
            keyword,
            limit = 10,
        }
    ) {
        // prefetched partners
        let partners = [];
        const searchRegexp = new RegExp(
            _.str.escapeRegExp(unaccent(keyword)),
            'i'
        );
        const currentPartner = env.messaging.$$$currentPartner();
        for (const partner of env.invoke('Partner/all', partner => partner.$$$active())) {
            if (partners.length < limit) {
                if (
                    partner !== currentPartner &&
                    searchRegexp.test(partner.$$$name(this)) &&
                    partner.$$$user(this)
                ) {
                    partners.push(partner);
                }
            }
        }
        if (!partners.length) {
            const partnersData = await env.services.rpc(
                {
                    model: 'res.partner',
                    method: 'im_search',
                    args: [keyword, limit]
                },
                { shadow: true }
            );
            const newPartners = env.invoke('Partner/insert', partnersData.map(
                partnerData => env.invoke('Partner/convertData', partnerData)
            ));
            partners.push(...newPartners);
        }
        callback(partners);
    },
    /**
     * Opens a chat between the user of this partner and the current user
     * and returns it.
     *
     * If a chat is not appropriate, a notification is displayed instead.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Partner} partner
     * @param {Object} [options] forwarded to @see `Thread/open`
     * @returns {Thread|undefined}
     */
    async 'Partner/openChat'(
        { env },
        partner,
        options
    ) {
        const chat = await env.invoke(
            'Record/doAsync',
            partner,
            () => env.invoke('Partner/getChat', partner)
        );
        if (!chat) {
            return;
        }
        await env.invoke(
            'Record/doAsync',
            partner,
            () => env.invoke('Thread/open', chat, options)
        );
        return chat;
    },
    /**
     * Opens the most appropriate view that is a profile for this partner.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Partner} partner
     */
    async 'Partner/openProfile'(
        { env },
        partner
    ) {
        return env.invoke('Messaging/openDocument', {
            id: partner.$$$id(this),
            model: 'res.partner',
        });
    },
    /**
     * @param {Object} param0
     * @param {web.env} param0.env
     */
    async 'Partner/startLoopFetchImStatus'({ env }) {
        await env.invoke('Partner/_fetchImStatus');
        env.invoke('Partner/_loopFetchImStatus');
    },
    /**
     * @private
     * @param {Object} param0
     * @param {web.env} param0.env
     */
    async 'Partner/_fetchImStatus'(
        { env }
    ) {
        const partnerIds = [];
        for (const partner of env.invoke('Partner/all')) {
            if (
                partner.$$$im_status() !== 'im_partner' &&
                partner.$$$id(this) > 0
            ) {
                partnerIds.push(partner.$$$id());
            }
        }
        if (partnerIds.length === 0) {
            return;
        }
        const dataList = await env.services.rpc({
            route: '/longpolling/im_status',
            params: {
                partner_ids: partnerIds,
            },
        }, { shadow: true });
        env.invoke('Partner/insert',
            dataList.map(
                data => {
                    return {
                        $$$id: data.id,
                        $$$im_status: data.im_status,
                    };
                }
            )
        );
    },
    /**
     * @private
     * @param {Object} param0
     * @param {web.env} param0.env
     */
    'Partner/_loopFetchImStatus'(
        { env }
    ) {
        setTimeout(async () => {
            await env.invoke('Partner/_fetchImStatus');
            env.invoke('Partner/_loopFetchImStatus');
        }, 50 * 1000);
    },
});

const model = defineModel({
    name: 'Partner',
    fields: {
        $$$active: attr({
            default: true,
        }),
        $$$avatarUrl: attr({
            /**
             * @param {Object} param0
             * @param {web.env} param0.env
             * @param {Partner} param0.record
             * @returns {string}
             */
            compute({ env, record }) {
                if (record === env.messaging.$$$partnerRoot(this)) {
                    return '/mail/static/src/img/odoobot.png';
                }
                return `/web/image/res.partner/${record.$$$id(this)}/image_128`;
            },
        }),
        $$$correspondentThreads: one2many('Thread', {
            inverse: '$$$correspondent',
        }),
        $$$country: many2one('Country'),
        $$$displayName: attr({
            /**
             * @param {Object} param0
             * @param {Partner} param0.record
             * @returns {string|undefined}
             */
            compute({ record }) {
                return (
                    record.$$$displayName(this) ||
                    (
                        record.$$$user(this) &&
                        record.$$$user(this).$$$displayName(this)
                    )
                );
            },
            default: "",
        }),
        $$$email: attr(),
        $$$failureNotifications: one2many('Notification', {
            related: '$$$messagesAsAuthor.$$$failureNotifications',
        }),
        /**
         * Whether an attempt was already made to fetch the user corresponding
         * to this partner. This prevents doing the same RPC multiple times.
         */
        $$$hasCheckedUser: attr({
            default: false,
        }),
        $$$id: attr({
            id: true,
        }),
        $$$im_status: attr(),
        $$$memberThreads: many2many('Thread', {
            inverse: '$$$members',
        }),
        $$$messagesAsAuthor: one2many('Message', {
            inverse: '$$$author',
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
        $$$messagingPartnerRoot: many2one('Partner', {
            related: '$$$messaging.$$$partnerRoot',
        }),
        $$$model: attr({
            default: 'res.partner',
        }),
        /**
         * Channels that are moderated by this partner.
         */
        $$$moderatedChannels: many2many('Thread', {
            inverse: '$$$moderators',
        }),
        $$$name: attr(),
        $$$nameOrDisplayName: attr({
            /**
             * @param {Object} param0
             * @param {Partner} param0.record
             * @returns {string|undefined}
             */
            compute({ record }) {
                return (
                    record.$$$name(this) ||
                    record.$$$displayName(this)
                );
            },
        }),
        $$$user: one2one('User', {
            inverse: '$$$partner',
        }),
        /**
         * Serves as compute dependency.
         */
        $$$userDisplayName: attr({
            related: '$$$user.$$$displayName',
        }),
    },
});

return defineFeatureSlice(
    'mail/static/src/models/partner/partner.js',
    actions,
    model,
);

});
