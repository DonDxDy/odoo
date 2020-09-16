odoo.define('mail/static/src/models/follower-subtype/follower-subtype.js', function (require) {
'use strict';

const {
    'Feature/defineActions': defineActions,
    'Feature/defineModel': defineModel,
    'Feature/defineSlice': defineFeatureSlice,
    'Field/attr': attr,
} = require('mail/static/src/model/utils.js');

const actions = defineActions({
    /**
     * @param {Object} _
     * @param {Object} data
     * @returns {Object}
     */
    'FollowerSubtype/convertData'(
        _,
        data
    ) {
        const data2 = {};
        if ('default' in data) {
            data2.$$$isDefault = data.default;
        }
        if ('id' in data) {
            data2.$$$id = data.id;
        }
        if ('internal' in data) {
            data2.$$$isInternal = data.internal;
        }
        if ('name' in data) {
            data2.$$$name = data.name;
        }
        if ('parent_model' in data) {
            data2.$$$parentModel = data.parent_model;
        }
        if ('res_model' in data) {
            data2.$$$resModel = data.res_model;
        }
        if ('sequence' in data) {
            data2.$$$sequence = data.sequence;
        }
        return data2;
    },
});

const model = defineModel({
    name: 'FollowerSubtype',
    fields: {
        $$$id: attr({
            id: true,
        }),
        $$$isDefault: attr({
            default: false,
        }),
        $$$isInternal: attr({
            default: false,
        }),
        $$$name: attr(),
        // AKU FIXME: use relation instead
        $$$parentModel: attr(),
        // AKU FIXME: use relation instead
        $$$resModel: attr(),
        $$$sequence: attr(),
    },
});

return defineFeatureSlice({
    filename: 'mail/static/src/models/follower-subtype/follower-subtype.js',
    actions,
    model,
});

});
