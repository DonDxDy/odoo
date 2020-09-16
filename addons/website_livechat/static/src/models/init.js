odoo.define('website_livechat/static/src/models/init.js', function (require) {
'use strict';

const {
    addFeature,
} = require('mail/static/src/model/core.js');

addFeature(
    'website_livechat',
    require('/website_livechat/static/src/models/messaging-notification-handler/messaging-notification-handler.js'),
    require('/website_livechat/static/src/models/thread/thread.js'),
    require('/website_livechat/static/src/models/visitor/visitor.js'),
);

});
