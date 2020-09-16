odoo.define('mail/static/src/models/country/country.js', function (require) {
'use strict';

const {
    'Feature/defineModel': defineModel,
    'Feature/defineSlice': defineFeatureSlice,
    'Field/attr': attr,
    'Field/clear': clear,
} = require('mail/static/src/model/utils.js');

const model = defineModel({
    name: 'Country',
    fields: {
        $$$code: attr(),
        $$$flagUrl: attr({
            /**
             * @param {Object} param0
             * @param {Country} param0.record
             * @returns {string|undefined}
             */
            compute({ record }) {
                if (!record.$$$code(this)) {
                    return clear();
                }
                return `/base/static/img/country_flags/${
                    record.$$$code(this)
                }.png`;
            },
        }),
        $$$id: attr({
            id: true,
        }),
        $$$name: attr(),
    }
});

return defineFeatureSlice(
    'mail/static/src/models/country/country.js',
    model,
);

});
