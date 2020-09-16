odoo.define('sms/static/src/models/message/message.js', function (require) {
'use strict';

const {
    'Feature/defineActionExtensions': defineActionExtensions,
    'Feature/defineSlice': defineFeatureSlice,
} = require('mail/static/src/model/utils.js');

const actionExtensions = defineActionExtensions({
    /**
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {function} param0.original
     * @param {Message} message
     */
    'Message/openResendAction'(
        { env, original },
        message
    ) {
        if (message.$$$type(this) === 'sms') {
            env.bus.trigger('do-action', {
                action: 'sms.sms_resend_action',
                options: {
                    additional_context: {
                        default_mail_message_id: message.$$$id(this),
                    },
                },
            });
        } else {
            original(...arguments);
        }
    },
});

return defineFeatureSlice(
    'sms/static/src/models/message/message.js',
    actionExtensions,
);

});
