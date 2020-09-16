odoo.define('snailmail/static/src/models/message/message.js', function (require) {
'use strict';

const {
    'Feature/defineActions': defineActions,
    'Feature/defineSlice': defineFeatureSlice,
} = require('mail/static/src/model/utils.js');

const actions = defineActions({
    /**
     * Cancels the 'snailmail.letter' corresponding to this message.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Message} message
     * @returns {Deferred}
     */
    async 'Message/cancelLetter'(
        { env },
        message
    ) {
        // the result will come from longpolling: message_notification_update
        await env.invoke(
            'Record/doAsync',
            message,
            () => env.services.rpc({
                model: 'mail.message',
                method: 'cancel_letter',
                args: [[message.$$$id(this)]],
            })
        );
    },
    /**
     * Opens the action about 'snailmail.letter' format error.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Message} message
     */
    'Message/openFormatLetterAction'(
        { env },
        message
    ) {
        env.bus.trigger('do-action', {
            action: 'snailmail.snailmail_letter_format_error_action',
            options: {
                additional_context: {
                    message_id: message.$$$id(this),
                },
            },
        });
    },
    /**
     * Opens the action about 'snailmail.letter' missing fields.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Message} message
     */
    async 'Message/openMissingFieldsLetterAction'(
        { env },
        message
    ) {
        const letterIds = await env.invoke(
            'Record/doAsync',
            message,
            () => env.services.rpc({
                model: 'snailmail.letter',
                method: 'search',
                args: [[['message_id', '=', message.$$$id(this)]]],
            })
        );
        env.bus.trigger('do-action', {
            action: 'snailmail.snailmail_letter_missing_required_fields_action',
            options: {
                additional_context: {
                    default_letter_id: letterIds[0],
                },
            },
        });
    },
    /**
     * Retries to send the 'snailmail.letter' corresponding to this message.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Message} message
     */
    async 'Message/resendLetter'(
        { env },
        message
    ) {
        // the result will come from longpolling: message_notification_update
        await env.invoke(
            'Record/doAsync',
            message,
            () => env.services.rpc({
                model: 'mail.message',
                method: 'send_letter',
                args: [[message.$$$id(this)]],
            })
        );
    },
});

return defineFeatureSlice(
    'snailmail/static/src/models/message/message.js',
    actions,
);

});
