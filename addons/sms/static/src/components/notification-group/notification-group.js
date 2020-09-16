odoo.define('sms/static/src/components/notification-group/notification-group.js', function (require) {
'use strict';

const NotificationGroup = require('mail/static/src/components/notification-group/notification-group.js');

const { patch } = require('web.utils');

patch(
    NotificationGroup,
    'sms/static/src/components/notification-group/notification-group.js',
    {

        //--------------------------------------------------------------------------
        // Public
        //--------------------------------------------------------------------------

        /**
         * @override
         */
        image() {
            if (this.group.$$$type(this) === 'sms') {
                return '/sms/static/img/sms_failure.svg';
            }
            return this._super(...arguments);
        },
    }
);

});
