odoo.define('mail/static/src/models/suggested-recipient-info/suggested-recipient-info.js', function (require) {
'use strict';

const {
    'Feature/defineModel': defineModel,
    'Feature/defineSlice': defineFeatureSlice,
    'Field/attr': attr,
    'Field/many2one': many2one,
} = require('mail/static/src/model/utils.js');

const model = defineModel({
    name: 'SuggestedRecipientInfo',
    fields: {
        /**
         * Determines the email of `this`. It serves as visual clue when
         * displaying `this`, and also serves as default partner email when
         * creating a new partner from `this`.
         */
        $$$email: attr({
            /**
             * @param {Object} param0
             * @param {SuggestedRecipientInfo} param0.record
             * @returns {string}
             */
            compute({ record }) {
                return (
                    (
                        record.$$$partner(this) &&
                        record.$$$partner(this).$$$email(this)
                    ) ||
                    record.$$$email(this)
                );
            }
        }),
        /**
         * Determines whether `this` will be added to recipients when posting a
         * new message on `this.thread`.
         */
        $$$isSelected: attr({
            /**
             * Prevents selecting a recipient that does not have a partner.
             *
             * @param {Object} param0
             * @param {SuggestedRecipientInfo} param0.record
             * @returns {boolean}
             */
            compute({ record }) {
                return record.$$$partner(this)
                    ? record.$$$isSelected(this)
                    : false;
            },
            default: true,
        }),
        /**
         * Determines the name of `this`. It serves as visual clue when
         * displaying `this`, and also serves as default partner name when
         * creating a new partner from `this`.
         */
        $$$name: attr({
            /**
             * @param {Object} param0
             * @param {SuggestedRecipientInfo} param0.record
             * @returns {string}
             */
            compute({ record }) {
                return (
                    (
                        record.$$$partner(this) &&
                        record.$$$partner(this).$$$nameOrDisplayName(this)
                    ) ||
                    record.$$$name(this)
                );
            },
        }),
        /**
         * Determines the optional `Partner` associated to `this`.
         */
        $$$partner: many2one('Partner'),
        /**
         * Serves as compute dependency.
         */
        $$$partnerEmail: attr({
            related: '$$$partner.$$$email'
        }),
        /**
         * Serves as compute dependency.
         */
        $$$partnerNameOrDisplayName: attr({
            related: '$$$partner.$$$nameOrDisplayName'
        }),
        /**
         * Determines why `this` is a suggestion for `this.thread`. It serves as
         * visual clue when displaying `this`.
         */
        $$$reason: attr(),
        /**
         * Determines the `Thread` concerned by `this.`
         */
        $$$thread: many2one('Thread', {
            inverse: '$$$suggestedRecipientInfoList',
        }),
    },
});

return defineFeatureSlice(
    'mail/static/src/models/suggested-recipient-info/suggested-recipient-info.js',
    model,
);

});
