odoo.define('mail/static/src/models/follower-subtype-list/follower-subtype-list.js', function (require) {
'use strict';

const {
    'Feature/defineModel': defineModel,
    'Feature/defineSlice': defineFeatureSlice,
    'Field/many2one': many2one,
} = require('mail/static/src/model/utils.js');

const model = defineModel({
    name: 'FollowerSubtypeList',
    fields: {
        $$$follower: many2one('Follower'),
    }
});

return defineFeatureSlice(
    'mail/static/src/models/follower-subtype-list/follower-subtype-list.js',
    model,
);

});
