odoo.define('mail/static/src/models/follower/follower.js', function (require) {
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
    'Field/unlink': unlink,
    'Field/unlinkAll': unlinkAll,
} = require('mail/static/src/model/utils.js');

const actions = defineActions({
    /**
     * Close subtypes dialog
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Follower} follower
     */
    'Follower/closeSubtypes'(
        { env },
        follower
    ) {
        env.invoke('Record/delete', follower._subtypesListDialog);
        follower._subtypesListDialog = undefined;
    },
    /**
     * @param {Object} _
     * @param {Object} data
     * @returns {Object}
     */
    'Follower/convertData'(
        _,
        data
    ) {
        const data2 = {};
        if ('channel_id' in data) {
            if (!data.channel_id) {
                data2.$$$channel = unlinkAll();
            } else {
                const channelData = {
                    $$$id: data.channel_id,
                    $$$model: 'mail.channel',
                    $$$name: data.name,
                };
                data2.$$$channel = insert(channelData);
            }
        }
        if ('id' in data) {
            data2.$$$id = data.id;
        }
        if ('is_active' in data) {
            data2.$$$isActive = data.is_active;
        }
        if ('is_editable' in data) {
            data2.$$$isEditable = data.is_editable;
        }
        if ('partner_id' in data) {
            if (!data.partner_id) {
                data2.$$$partner = unlinkAll();
            } else {
                const partnerData = {
                    $$$email: data.email,
                    $$$id: data.partner_id,
                    $$$name: data.name,
                };
                data2.$$$partner = insert(partnerData);
            }
        }
        return data2;
    },
    /**
     * Opens the most appropriate view that is a profile for this follower.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Follower} follower
     */
    async 'Follower/openProfile'(
        { env },
        follower
    ) {
        if (follower.$$$partner(this)) {
            return env.invoke('Partner/openProfile', follower.$$$partner(this));
        }
        return env.invoke('Thread/openProfile', follower.$$$channel(this));
    },
    /**
     * Remove this follower from its related thread.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Follower} follower
     */
    async 'Follower/remove'(
        { env },
        follower
    ) {
        const partner_ids = [];
        const channel_ids = [];
        if (follower.$$$partner(this)) {
            partner_ids.push(follower.$$$partner(this).$$$id(this));
        } else {
            channel_ids.push(follower.$$$channel(this).$$$id(this));
        }
        await env.invoke(
            'Record/doAsync',
            follower,
            () => env.services.rpc({
                model: follower.$$$followedThread(this).$$$model(this),
                method: 'message_unsubscribe',
                args: [
                    [follower.$$$followedThread(this).$$$id(this)],
                    partner_ids,
                    channel_ids
                ],
            })
        );
        const followedThread = follower.$$$followedThread(this);
        env.invoke('Record/delete', follower);
        env.invoke('Thread/fetchAndUpdateSuggestedRecipients', followedThread);
    },
    /**
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Follower} follower
     * @param {FollowerSubtype} subtype
     */
    'Follower/selectSubtype'(
        { env },
        follower,
        subtype
    ) {
        if (!follower.$$$selectedSubtypes(this).includes(subtype)) {
            env.invoke('Record/update', follower, {
                $$$selectedSubtypes: link(subtype),
            });
        }
    },
    /**
     * Show (editable) list of subtypes of this follower.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Follower} follower
     */
    async 'Follower/showSubtypes'(
        { env },
        follower
    ) {
        const subtypesData = await env.invoke(
            'Record/doAsync',
            follower,
            () => env.services.rpc({
                route: '/mail/read_subscription_data',
                params: {
                    follower_id: follower.$$$id(this),
                },
            })
        );
        env.invoke('Record/update', follower, {
            $$$subtypes: unlinkAll(),
        });
        for (const data of subtypesData) {
            const subtype = env.invoke('FollowerSubtype/insert',
                env.invoke('FollowerSubtype/convertData', data)
            );
            env.invoke('Record/update', follower, {
                $$$subtypes: link(subtype),
            });
            if (data.followed) {
                env.invoke('Record/update', follower, {
                    $$$selectedSubtypes: link(subtype),
                });
            } else {
                env.invoke('Record/update', follower, {
                    $$$selectedSubtypes: unlink(subtype),
                });
            }
        }
        follower._subtypesListDialog = env.invoke('DialogManager/open',
            env.messaging.$$$dialogManager(this),
            'FollowerSubtypeList',
            {
                $$$follower: link(this),
            }
        );
    },
    /**
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Follower} follower
     * @param {FollowerSubtype} subtype
     */
    'Follower/unselectSubtype'(
        { env },
        follower,
        subtype
    ) {
        if (follower.$$$selectedSubtypes(this).includes(subtype)) {
            env.invoke('Record/update', follower, {
                $$$selectedSubtypes: unlink(subtype),
            });
        }
    },
    /**
     * Update server-side subscription of subtypes of this follower.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Follower} follower
     */
    async 'Follower/updateSubtypes'(
        { env },
        follower
    ) {
        if (follower.$$$selectedSubtypes(this).length === 0) {
            env.invoke('Follower/remove', follower);
        } else {
            const kwargs = {
                subtype_ids: follower.$$$selectedSubtypes(this).map(
                    subtype => subtype.$$$id(this)
                ),
            };
            if (follower.$$$partner(this)) {
                kwargs.partner_ids = [follower.$$$partner(this).$$$id(this)];
            } else {
                kwargs.channel_ids = [follower.$$$channel(this).$$$id(this)];
            }
            await env.invoke(
                'Record/doAsync',
                follower,
                () => env.services.rpc({
                    model: follower.$$$followedThread(this).$$$model(this),
                    method: 'message_subscribe',
                    args: [[follower.$$$followedThread(this).$$$id(this)]],
                    kwargs,
                })
            );
        }
        env.invoke('Follower/closeSubtypes', follower);
    },
});

const model = defineModel({
    name: 'Follower',
    fields: {
        $$$channel: many2one('Thread'),
        $$$channelId: attr({
            related: '$$$channel.$$$id',
        }),
        $$$channelModel: attr({
            related: '$$$channel.$$$model',
        }),
        $$$channelName: attr({
            related: '$$$channel.$$$name',
        }),
        $$$followedThread: many2one('Thread', {
            inverse: '$$$followers',
        }),
        $$$id: attr({
            id: true,
        }),
        $$$isActive: attr({
            default: true,
        }),
        $$$isEditable: attr({
            default: false,
        }),
        $$$name: attr({
            /**
             * @param {Object} param0
             * @param {Follower} param0.record
             * @returns {string}
             */
            compute({ record }) {
                if (record.$$$channel(this)) {
                    return record.$$$channel(this).$$$name(this);
                }
                if (record.$$$partner(this)) {
                    return record.$$$partner(this).$$$name(this);
                }
                return '';
            },
        }),
        $$$partner: many2one('Partner'),
        $$$partnerId: attr({
            related: '$$$partner.$$$id',
        }),
        $$$partnerModel: attr({
            related: '$$$partner.$$$model',
        }),
        $$$partnerName: attr({
            related: '$$$partner.$$$name',
        }),
        $$$resId: attr({
            /**
             * @param {Object} param0
             * @param {Follower} param0.record
             * @returns {integer}
             */
            compute({ record }) {
                if (record.$$$partner(this)) {
                    return record.$$$partner(this).$$$id(this);
                }
                if (record.$$$channel(this)) {
                    return record.$$$channel(this).$$$id(this);
                }
                return 0;
            },
            default: 0,
        }),
        $$$resModel: attr({
            /**
             * @param {Object} param0
             * @param {Follower} param0.record
             * @returns {string}
             */
            compute({ record }) {
                if (record.$$$partner(this)) {
                    return record.$$$partner(this).$$$model(this);
                }
                if (record.$$$channel(this)) {
                    return record.$$$channel(this).$$$model(this);
                }
                return '';
            },
            default: '',
        }),
        $$$selectedSubtypes: many2many('FollowerSubtype'),
        $$$subtypes: many2many('FollowerSubtype'),
    },
});

return defineFeatureSlice(
    'mail/static/src/models/follower/follower.js',
    actions,
    model,
);

});
