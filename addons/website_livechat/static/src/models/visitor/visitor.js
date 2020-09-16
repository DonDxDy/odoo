odoo.define('website_livechat/static/src/models/visitor/visitor.js', function (require) {
'use strict';

const {
    'Feature/defineActions': defineActions,
    'Feature/defineModel': defineModel,
    'Feature/defineSlice': defineFeatureSlice,
    'Field/attr': attr,
    'Field/insert': insert,
    'Field/link': link,
    'Field/many2one': many2one,
    'Field/one2many': one2many,
    'Field/unlink': unlink,
} = require('mail/static/src/model/utils.js');

const actions = defineActions({
    /**
     * @param {Object} _
     * @param {Object} data
     */
    'Visitor/convertData'(
        _,
        data
    ) {
        const data2 = {};
        if ('country_id' in data) {
            if (data.country_id) {
                data2.$$$country = insert({
                    $$$id: data.country_id,
                    $$$code: data.country_code,
                });
            } else {
                data2.$$$country = unlink();
            }
        }
        if ('history' in data) {
            data2.$$$history = data.history;
        }
        if ('is_connected' in data) {
            data2.$$$isConnected = data.is_connected;
        }
        if ('lang_name' in data) {
            data2.$$$langName = data.lang_name;
        }
        if ('display_name' in data) {
            data2.$$$displayName = data.display_name;
        }
        if ('partner_id' in data) {
            if (data.partner_id) {
                data2.$$$partner = insert({
                    $$$id: data.partner_id,
                });
            } else {
                data2.$$$partner = unlink();
            }
        }
        if ('website_name' in data) {
            data2.$$$websiteName = data.website_name;
        }
        return data2;
    },
});

const model = defineModel({
    name: 'Visitor',
    fields: {
        /**
         * Url to the avatar of the visitor.
         */
        $$$avatarUrl: attr({
            /**
             * @param {Object} param0
             * @param {Visitor} param0.record
             * @returns {string}
             */
            compute({ record }) {
                if (!record.$$$partner(this)) {
                    return '/mail/static/src/img/smiley/avatar.jpg';
                }
                return record.$$$partner(this).$$$avatarUrl(this);
            },
        }),
        /**
         * Country of the visitor.
         */
        $$$country: many2one('Country', {
            /**
             * @param {Object} param0
             * @param {Visitor} param0.record
             * @returns {Country}
             */
            compute({ record }) {
                if (
                    record.$$$partner(this) &&
                    record.$$$partner(this).$$$country(this)
                ) {
                    return link(
                        record.$$$partner(this).$$$country(this)
                    );
                }
                if (record.$$$country(this)) {
                    return link(
                        record.$$$country(this)
                    );
                }
                return unlink();
            },
        }),
        /**
         * Display name of the visitor.
         */
        $$$displayName: attr(),
        /**
         * Browsing history of the visitor as a string.
         */
        $$$history: attr(),
        /**
         * Determine whether the visitor is connected or not.
         */
        $$$isConnected: attr(),
        /**
         * Name of the language of the visitor. (Ex: "English")
         */
        $$$langName: attr(),
        $$$nameOrDisplayName: attr({
            /**
             * @param {Object} param0
             * @param {Visitor} param0.record
             * @returns {string}
             */
            compute({ record }) {
                if (record.$$$partner(this)) {
                    return record.$$$partner(this).$$$nameOrDisplayName(this);
                }
                return record.$$$displayName(this);
            },
        }),
        /**
         * Partner linked to this visitor, if any.
         */
        $$$partner: many2one('Partner'),
        $$$partnerAvatarUrl: attr({
            related: '$$$partner.$$$avatarUrl',
        }),
        $$$partnerCountry: many2one('Country',{
            related: '$$$partner.$$$country',
        }),
        $$$partnerNameOrDisplayName: attr({
            related: '$$$partner.$$$nameOrDisplayName',
        }),
        /**
         * Threads with this visitor as member
         */
        $$$threads: one2many('Thread', {
            inverse: '$$$visitor',
        }),
        /**
         * Name of the website on which the visitor is connected. (Ex: "Website 1")
         */
        $$$websiteName: attr(),
    },
});

return defineFeatureSlice(
    'website_livechat/static/src/models/visitor/visitor.js',
    actions,
    model,
);

});
