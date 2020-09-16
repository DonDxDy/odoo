odoo.define('im_livechat/static/src/models/init.js', function (require) {
'use strict';

const {
    addFeature,
} = require('mail/static/src/model/core.js');

addFeature(
    'im_livechat',
    require('/im_livechat/static/src/models/partner/partner.js'),
);

});
