odoo.define('hr/static/src/models/init.js', function (require) {
'use strict';

const {
    addFeature,
} = require('mail/static/src/model/core.js');

addFeature(
    'hr',
    require('/hr/static/src/models/employee/employee.js'),
    require('/hr/static/src/models/messaging/messaging.js'),
    require('/hr/static/src/models/partner/partner.js'),
    require('/hr/static/src/models/user/user.js'),
);

});
