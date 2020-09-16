odoo.define('mail/static/src/models/notification/notification.js', function (require) {
'use strict';

const {
    'Feature/defineActions': defineActions,
    'Feature/defineModel': defineModel,
    'Feature/defineSlice': defineFeatureSlice,
    'Field/attr': attr,
    'Field/insert': insert,
    'Field/many2one': many2one,
    'Field/unlinkAll': unlinkAll,
} = require('mail/static/src/model/utils.js');

const actions = defineActions({
    /**
     * @param {Object} _
     * @param {Object} data
     * @return {Object}
     */
    'Notification/convertData'(
        _,
        data
    ) {
        const data2 = {};
        if ('failure_type' in data) {
            data2.$$$failureType = data.failure_type;
        }
        if ('id' in data) {
            data2.$$$id = data.id;
        }
        if ('notification_status' in data) {
            data2.$$$status = data.notification_status;
        }
        if ('notification_type' in data) {
            data2.$$$type = data.notification_type;
        }
        if ('res_partner_id' in data) {
            if (!data.res_partner_id) {
                data2.$$$partner = unlinkAll();
            } else {
                data2.$$$partner = insert({
                    $$$displayName: data.res_partner_id[1],
                    $$$id: data.res_partner_id[0],
                });
            }
        }
        return data2;
    },
});

const model = defineModel({
    name: 'Notification',
    fields: {
        $$$failureType: attr(),
        $$$id: attr({
            id: true,
        }),
        $$$message: many2one('Message', {
            inverse: '$$$notifications',
        }),
        $$$partner: many2one('Partner'),
        $$$status: attr(),
        $$$type: attr(),
    },
});

return defineFeatureSlice(
    'mail/static/src/models/notification/notification.js',
    actions,
    model,
);

});
