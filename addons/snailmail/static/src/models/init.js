odoo.define('snailmail/static/src/models/init.js', function (require) {
'use strict';

const {
    addFeature,
} = require('mail/static/src/model/core.js');

addFeature(
    'snailmail',
    require('/snailmail/static/src/models/message/message.js'),
    require('/snailmail/static/src/models/messaging/messaging.js'),
    require('/snailmail/static/src/models/notification-group/notification-group.js'),
);

});
