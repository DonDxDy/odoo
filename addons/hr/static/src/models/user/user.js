odoo.define('hr/static/src/models/user/user.js', function (require) {
'use strict';

const {
    'Feature/defineModelExtension': defineModelExtension,
    'Feature/defineSlice': defineFeatureSlice,
    'Field/one2one': one2one,
} = require('mail/static/src/model/utils.js');

const modelExtension = defineModelExtension({
    name: 'User',
    fields: {
        /**
         * Employee related to this user.
         */
        $$$employee: one2one('Employee', {
            inverse: '$$$user',
        }),
    },
});

return defineFeatureSlice(
    'hr/static/src/models/user/user.js',
    modelExtension,
);

});
