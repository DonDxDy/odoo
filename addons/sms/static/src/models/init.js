odoo.define('sms/static/src/models/init.js', function (require) {
'use strict';

const {
    addFeature,
} = require('mail/static/src/model/core.js');

addFeature(
    'sms',
    require('/sms/static/src/models/message/message.js'),
    require('/sms/static/src/models/notification-group/notification-group.js'),
);

});
