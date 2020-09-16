odoo.define('hr_holidays/static/src/models/init.js', function (require) {
'use strict';

const {
    addFeature,
} = require('mail/static/src/model/core.js');

addFeature(
    'hr_holidays',
    require('/hr_holidays/static/src/models/partner/partner.js'),
);

});
