odoo.define('mail_bot/static/src/models/init.js', function (require) {
'use strict';

const {
    addFeature,
} = require('mail/static/src/model/core.js');

addFeature(
    'mail_bot',
    require('/mail/static/src/models/messaging-initializer/messaging-initializer.js'),
);

});
