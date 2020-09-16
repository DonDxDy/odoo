odoo.define('hr_holidays/static/src/models/partner/partner.js', function (require) {
'use strict';

const {
    'Feature/defineActionExtensions': defineActionExtensions,
    'Feature/defineModelExtension': defineModelExtension,
    'Feature/defineSlice': defineFeatureSlice,
    'Field/attr': attr,
} = require('mail/static/src/model/utils.js');

const {
    str_to_datetime,
} = require('web.time');

const actionExtensions = defineActionExtensions({
    /**
     * @param {Object} param0
     * @param {function} param0.original
     * @param {Object} data
     */
    'Partner/convertData'({ original }, data) {
        const data2 = original(data);
        if ('out_of_office_date_end' in data && data.date) {
            data2.$$$out_of_office_date_end = new Date(str_to_datetime(data.out_of_office_date_end));
        }
        return data2;
    },
});

const modelExtension = defineModelExtension({
    name: 'Partner',
    fields: {
        $$$out_of_office_date_end: attr({
            default() {
                return new Date();
            },
        }),
    },
});

return defineFeatureSlice(
    'hr_holidays/static/src/models/partner/partner.js',
    actionExtensions,
    modelExtension,
);

});
