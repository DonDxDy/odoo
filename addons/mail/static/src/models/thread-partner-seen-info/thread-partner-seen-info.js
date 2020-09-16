odoo.define('mail/static/src/models/thread-partner-seen-info/thread-partner-seen-info.js', function (require) {
'use strict';

const {
    'Feature/defineModel': defineModel,
    'Feature/defineSlice': defineFeatureSlice,
    'Field/attr': attr,
    'Field/insert': insert,
    'Field/many2one': many2one,
} = require('mail/static/src/model/utils.js');

const model = defineModel({
    name: 'ThreadPartnerSeenInfo',
    fields: {
        /**
         * The id of channel this seen info is related to.
         *
         * Should write on this field to set relation between the channel and
         * this seen info, not on `thread`.
         *
         * Reason for not setting the relation directly is the necessity to
         * uniquely identify a seen info based on channel and partner from data.
         * Relational data are list of commands, which is problematic to deduce
         * identifying records.
         *
         * TODO: task-2322536 (normalize relational data) & task-2323665
         * (required fields) should improve and let us just use the relational
         * fields.
         */
        $$$channelId: attr({
            id: true,
        }),
        $$$lastFetchedMessage: many2one('Message'),
        $$$lastSeenMessage: many2one('Message'),
        /**
         * Partner that this seen info is related to.
         *
         * Should not write on this field to update relation, and instead
         * should write on @see partnerId field.
         */
        $$$partner: many2one('Partner', {
            /**
             * @param {Object} param0
             * @param {ThreadPartnerSeenInfo} param0.record
             * @returns {Partner|undefined}
             */
            compute({ record }) {
                return insert({
                    $$$id: record.$$$partnerId(this),
                });
            },
        }),
        /**
         * The id of partner this seen info is related to.
         *
         * Should write on this field to set relation between the partner and
         * this seen info, not on `partner`.
         *
         * Reason for not setting the relation directly is the necessity to
         * uniquely identify a seen info based on channel and partner from data.
         * Relational data are list of commands, which is problematic to deduce
         * identifying records.
         *
         * TODO: task-2322536 (normalize relational data) & task-2323665
         * (required fields) should improve and let us just use the relational
         * fields.
         */
        $$$partnerId: attr({
            id: true,
        }),
        /**
         * Thread (channel) that this seen info is related to.
         *
         * Should not write on this field to update relation, and instead
         * should write on @see channelId field.
         */
        $$$thread: many2one('Thread', {
            /**
             * @param {Object} param0
             * @param {ThreadPartnerSeenInfo} param0.record
             * @returns {Thread|undefined}
             */
            compute({ record }) {
                return insert({
                    $$$id: record.$$$channelId(this),
                    $$$model: 'mail.channel',
                });
            },
            inverse: '$$$partnerSeenInfos',
        }),
    },
});

return defineFeatureSlice(
    'mail/static/src/models/thread-partner-seen-info/thread-partner-seen-info.js',
    model,
);

});
