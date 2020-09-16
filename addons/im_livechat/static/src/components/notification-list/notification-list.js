odoo.define('im_livechat/static/src/components/notification-list/notification-list.js', function (require) {
'use strict';

const NotificationList = require('mail/static/src/components/notification-list/notification-list.js');

NotificationList._allowedFilters.push('livechat');

});
