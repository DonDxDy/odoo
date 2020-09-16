odoo.define('mail/static/src/models/user/user.js', function (require) {
'use strict';

const {
    'Feature/defineActions': defineActions,
    'Feature/defineModel': defineModel,
    'Feature/defineSlice': defineFeatureSlice,
    'Field/attr': attr,
    'Field/insert': insert,
    'Field/one2one': one2one,
    'Field/unlink': unlink,
} = require('mail/static/src/model/utils.js');

const actions = defineActions({
    /**
     * @param {Object} _
     * @param {Object} data
     * @returns {Object}
     */
    'User/convertData'(
        _,
        data
    ) {
        const data2 = {};
        if ('id' in data) {
            data2.$$$id = data.id;
        }
        if ('partner_id' in data) {
            if (!data.partner_id) {
                data2.$$$partner = unlink();
            } else {
                const partnerNameGet = data['partner_id'];
                const partnerData = {
                    $$$displayName: partnerNameGet[1],
                    $$$id: partnerNameGet[0],
                };
                data2.$$$partner = insert(partnerData);
            }
        }
        return data2;
    },
    /**
     * Fetches the partner of this user.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {User} user
     */
    async 'User/fetchPartner'(
        { env },
        user
    ) {
        return env.invoke('User/performRpcRead', {
            ids: [user.$$$id(this)],
            fields: ['partner_id'],
            context: { active_test: false },
        });
    },
    /**
     * Gets the chat between this user and the current user.
     *
     * If a chat is not appropriate, a notification is displayed instead.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {User} user
     * @returns {Thread|undefined}
     */
    async 'User/getChat'(
        { env },
        user
    ) {
        if (!user.$$$partner(this)) {
            await env.invoke(
                'Record/doAsync',
                user,
                () => env.invoke('User/fetchPartner', user)
            );
        }
        if (!user.$$$partner(this)) {
            // This user has been deleted from the server or never existed:
            // - Validity of id is not verified at insert.
            // - There is no bus notification in case of user delete from
            //   another tab or by another user.
            env.services['notification'].notify({
                message: env._t("You can only chat with existing users."),
                type: 'warning',
            });
            return;
        }
        // in other cases a chat would be valid, find it or try to create it
        let chat = env.invoke('Thread/find', thread =>
            thread.$$$channelType(this) === 'chat' &&
            thread.$$$correspondent(this) === user.$$$partner(this) &&
            thread.$$$model(this) === 'mail.channel' &&
            thread.$$$public(this) === 'private'
        );
        if (!chat ||!chat.$$$isPinned(this)) {
            // if chat is not pinned then it has to be pinned client-side
            // and server-side, which is a side effect of following rpc
            chat = await env.invoke(
                'Record/doAsync',
                user,
                () => env.invoke('Thread/performRpcCreateChat', {
                    partnerIds: [user.$$$partner(this).$$$id(this)],
                })
            );
        }
        if (!chat) {
            env.services['notification'].notify({
                message: env._t("An unexpected error occurred during the creation of the chat."),
                type: 'warning',
            });
            return;
        }
        return chat;
    },
    /**
     * Opens a chat between this user and the current user and returns it.
     *
     * If a chat is not appropriate, a notification is displayed instead.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {User} user
     * @param {Object} [options] forwarded to @see `Thread/open`
     * @returns {Thread|undefined}
     */
    async 'User/openChat'({ env }, user, options) {
        const chat = await env.invoke(
            'Record/doAsync',
            user,
            () => env.invoke('Userser/getChat', user)
        );
        if (!chat) {
            return;
        }
        await env.invoke(
            'Record/doAsync',
            user,
            () => env.invoke('Thread/open', chat, options)
        );
        return chat;
    },
    /**
     * Opens the most appropriate view that is a profile for this user.
     * Because user is a rather technical model to allow login, it's the
     * partner profile that contains the most useful information.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {User} user
     */
    async 'User/openProfile'(
        { env },
        user
    ) {
        if (!user.$$$partner(this)) {
            await env.invoke(
                'Record/doAsync',
                user,
                () => env.invoke('User/fetchPartner', user)
            );
        }
        if (!user.$$$partner(this)) {
            // This user has been deleted from the server or never existed:
            // - Validity of id is not verified at insert.
            // - There is no bus notification in case of user delete from
            //   another tab or by another user.
            env.services['notification'].notify({
                message: env._t("You can only open the profile of existing users."),
                type: 'warning',
            });
            return;
        }
        return env.invoke('Partner/openProfile', user.$$$partner(this));
    },
    /**
     * Performs the `read` RPC on `res.users`.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Object} param1
     * @param {Object} param1.context
     * @param {string[]} param1.fields
     * @param {integer[]} param1.ids
     */
    async 'User/performRpcRead'(
        { env },
        {
            context,
            fields,
            ids,
        }
    ) {
        const usersData = await env.services.rpc({
            model: 'res.users',
            method: 'read',
            args: [ids],
            kwargs: {
                context,
                fields,
            },
        }, { shadow: true });
        return env.invoke('User/insert', usersData.map(userData =>
            env.invoke('User/convertData', userData)
        ));
    },
});

const model = defineModel({
    name: 'User',
    fields: {
        $$$id: attr({
            id: true,
        }),
        $$$displayName: attr({
            /**
             * @param {Object} param0
             * @param {User} param0.record
             * @returns {string|undefined}
             */
            compute({ record }) {
                return (
                    record.$$$displayName(this) ||
                    (
                        record.$$$partner(this) &&
                        record.$$$partner(this).$$$displayName(this)
                    )
                );
            },
        }),
        $$$model: attr({
            default: 'res.user',
        }),
        $$$nameOrDisplayName: attr({
            /**
             * @param {Object} param0
             * @param {User} param0.record
             * @returns {string|undefined}
             */
            compute({ record }) {
                return (
                    (
                        record.$$$partner(this) &&
                        record.$$$partner(this).$$$nameOrDisplayName(this)
                    ) ||
                    record.$$$displayName(this)
                );
            },
        }),
        $$$partner: one2one('Partner', {
            inverse: '$$$user',
        }),
        /**
         * Serves as compute dependency.
         */
        $$$partnerDisplayName: attr({
            related: '$$$partner.$$$displayName',
        }),
        /**
         * Serves as compute dependency.
         */
        $$$partnerNameOrDisplayName: attr({
            related: '$$$partner.$$$nameOrDisplayName',
        }),
    },
    lifecycles: {
        onDelete({ env, record }) {
            if (env.messaging) {
                if (record === env.messaging.$$$currentUser(this)) {
                    env.invoke('Record/update', env.messaging, {
                        $$$currentUser: unlink(),
                    });
                }
            }
        },
    }
});

return defineFeatureSlice(
    'mail/static/src/models/user/user.js',
    actions,
    model,
);

});
