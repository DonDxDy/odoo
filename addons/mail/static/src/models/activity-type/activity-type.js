odoo.define('mail/static/src/models/activity-type/activity-type.js', function (require) {
'use strict';

const {
    'Feature/defineModel': defineModel,
    'Feature/defineSlice': defineFeatureSlice,
    'Field/attr': attr,
    'Field/one2many': one2many,
} = require('mail/static/src/model/utils.js');

const model = defineModel({
    name: 'ActivityType',
    fields: {
        $$$activities: one2many('Activity', {
            inverse: '$$$type',
        }),
        $$$displayName: attr(),
        $$$id: attr({
            id: true,
        }),
    },
});

return defineFeatureSlice(
    'mail/static/src/models/activity-type/activity-type.js',
    model,
);

});
