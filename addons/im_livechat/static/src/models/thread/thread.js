odoo.define('im_livechat/static/src/models/thread/thread.js', function (require) {
'use strict';

const {
    'Feature/defineActionExtensions': defineActionExtensions,
    'Feature/defineModelExtension': defineModelExtension,
    'Feature/defineSlice': defineFeatureSlice,
    'Field/insert': insert,
    'Field/link': link,
    'Field/unlink': unlink,
} = require('mail/static/src/model/utils.js');

const actionExtensions = defineActionExtensions({
    /**
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {function} param0.original
     * @param {Object} data
     */
    'Thread/convertData'(
        { env, original },
        data
    ) {
        const data2 = original(data);
        if ('livechat_visitor' in data && data.livechat_visitor) {
            if (!data2.$$$members) {
                data2.$$$members = [];
            }
            // `livechat_visitor` without `id` is the anonymous visitor.
            if (!data.livechat_visitor.id) {
                /**
                 * Create partner derived from public partner and replace the
                 * public partner.
                 *
                 * Indeed the anonymous visitor is registered as a member of the
                 * channel as the public partner in the database to avoid
                 * polluting the contact list with many temporary partners.
                 *
                 * But the issue with public partner is that it is the same
                 * record for every livechat, whereas every correspondent should
                 * actually have its own visitor name, typing status, etc.
                 *
                 * Due to JS being temporary by nature there is no such notion
                 * of polluting the database, it is therefore acceptable and
                 * easier to handle one temporary partner per channel.
                 */
                data2.$$$members.push(
                    unlink(
                        env.messaging.$$$publicPartner()
                    )
                );
                const partner = env.invoke('Partner/create', {
                    ...env.invoke('Partner/convertData', data.livechat_visitor),
                    $$$id: env.invoke('Partner/getNextPublicId'),
                });
                data2.$$$members.push(link(partner));
                data2.$$$correspondent = link(partner);
            } else {
                const partnerData = env.invoke(
                    'Partner/convertData',
                    data.livechat_visitor
                );
                data2.$$$members.push(insert(partnerData));
                data2.$$$correspondent = insert(partnerData);
            }
        }
        return data2;
    },
});

const modelExtension = defineModelExtension({
    name: 'Thread',
    fields: {
        $$$correspondent: {
            /**
             * @param {Object} param0
             * @param {function} param0.original
             * @param {Thread} param0.record
             * @returns {Partner}
             */
            extendedCompute({ original, record }) {
                if (record.$$$channelType(this) === 'livechat') {
                    // livechat correspondent never change: always the public member.
                    return [];
                }
                return original(record);
            },
        },
        $$$displayName: {
            /**
             * @param {Object} param0
             * @param {function} param0.original
             * @param {Thread} param0.record
             * @returns {string}
             */
            extendedCompute({ original, record }) {
                if (
                    record.$$$channelType(this) === 'livechat' &&
                    record.$$$correspondent(this)
                ) {
                    if (record.$$$correspondent(this).$$$country(this)) {
                        return `${
                            record.$$$correspondent(this).$$$nameOrDisplayName(this)
                        } (${
                            record.$$$correspondent(this).$$$country(this).$$$name(this)
                        })`;
                    }
                    return record.$$$correspondent(this).$$$nameOrDisplayName(this);
                }
                return original(record);
            },
        },
        $$$isChatChannel: {
            /**
             * @param {Object} param0
             * @param {function} param0.original
             * @param {Thread} param0.record
             * @returns {boolean}
             */
            extendedCompute({ original, record }) {
                return (
                    record.$$$channelType(this) === 'livechat' ||
                    original(record)
                );
            },
        },
    },
});

return defineFeatureSlice(
    'im_livechat/static/src/models/thread/thread.js',
    actionExtensions,
    modelExtension,
);

});
