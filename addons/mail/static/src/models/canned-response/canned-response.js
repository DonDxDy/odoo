odoo.define('mail/static/src/models/canned-response/canned-response.js', function (require) {
'use strict';

const {
    'Feature/defineModel': defineModel,
    'Feature/defineSlice': defineFeatureSlice,
    'Field/attr': attr,
} = require('mail/static/src/model/utils.js');

const model = defineModel({
    name: 'CannedResponse',
    fields: {
        $$$id: attr({
            id: true,
        }),
        /**
         *  The keyword to use a specific canned response.
         */
        $$$source: attr(),
        /**
         * The canned response itself which will replace the keyword previously
         * entered.
         */
        $$$substitution: attr(),
    },
});

return defineFeatureSlice(
    'mail/static/src/models/canned-response/canned-response.js',
    model,
);

});
