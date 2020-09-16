odoo.define('mail/static/src/models/locale/locale.js', function (require) {
'use strict';

const {
    'Feature/defineModel': defineModel,
    'Feature/defineSlice': defineFeatureSlice,
    'Field/attr': attr,
} = require('mail/static/src/model/utils.js');

const model = defineModel({
    name: 'Locale',
    fields: {
        $$$textDirection: attr({
            /**
             * @param {Object} param0
             * @param {web.env} param0.env
             * @returns {string}
             */
            compute({ env }) {
                return env._t.database.parameters.direction;
            },
        }),
    },
});

return defineFeatureSlice(
    'mail/static/src/models/locale/locale.js',
    model,
);

});
