odoo.define('snailmail/static/src/components/notification-group/notification-group.js', function (require) {
'use strict';

const NotificationGroup = require('mail/static/src/components/notification-group/notification-group.js');

const { patch } = require('web.utils');

patch(
    NotificationGroup,
    'snailmail/static/src/components/notification-group/notification-group.js',
    {

        //--------------------------------------------------------------------------
        // Public
        //--------------------------------------------------------------------------

        /**
         * @override
         */
        image() {
            if (this.group.$$$type(this) === 'snail') {
            return '/snailmail/static/img/snailmail_failure.png';
            }
            return this._super(...arguments);
        },
    }
);

});
