odoo.define('website_livechat/static/src/models/thread/thread.js', function (require) {
'use strict';

const {
    'Feature/defineActionExtensions': defineActionExtensions,
    'Feature/defineModelExtension': defineModelExtension,
    'Feature/defineSlice': defineFeatureSlice,
    'Field/insert': insert,
    'Field/many2one': many2one,
    'Field/unlink': unlink,
} = require('mail/static/src/model/utils.js');

const actionExtensions = defineActionExtensions({
    /**
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {function} param0.original
     * @param {Object} data
     */
    'Thread/convertData'(
        { env, original },
        data
    ) {
        const data2 = original(data);
        if ('visitor' in data) {
            if (data.visitor) {
                data2.$$$visitor = insert(
                    env.invoke('Visitor/convertData', data.visitor)
                );
            } else {
                data2.$$$visitor = unlink();
            }
        }
        return data2;
    },
});

const modelExtension = defineModelExtension({
    name: 'Thread',
    fields: {
        /**
         * Visitor connected to the livechat.
         */
        $$$visitor: many2one('Visitor', {
            inverse: '$$$threads',
        }),
    },
});

return defineFeatureSlice(
    'website_livechat/static/src/models/thread/thread.js',
    actionExtensions,
    modelExtension,
);

});
