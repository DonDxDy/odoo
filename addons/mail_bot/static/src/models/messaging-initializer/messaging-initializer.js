odoo.define('mail_bot/static/src/models/messaging-initializer/messaging-initializer.js', function (require) {
'use strict';

const {
    'Feature/defineActionExtensions': defineActionExtensions,
    'Feature/defineActions': defineActions,
    'Feature/defineSlice': defineFeatureSlice,
} = require('mail/static/src/model/utils.js');

const actionExtensions = defineActionExtensions({
    /**
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {function} param0.original
     */
    async 'MessagingInitializer/start'(
        { env, original },
        messagingInitializer
    ) {
        await env.invoke(
            'Record/doAsync',
            messagingInitializer,
            () => original(...arguments)
        );
        if ('odoobot_initialized' in env.session && !env.session.odoobot_initialized) {
            env.invoke('MessagingInitializer/_initializeOdooBot',
                messagingInitializer
            );
        }
    },
});

const actions = defineActions({
    /**
     * @private
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {MessagingInitializer} messagingInitializer
     */
    async 'MessagingInitializer/_initializeOdooBot'(
        { env },
        messagingInitializer
    ) {
        const data = await env.invoke(
            'Record/doAsync',
            messagingInitializer,
            () => env.services.rpc({
                model: 'mail.channel',
                method: 'init_odoobot',
            })
        );
        if (!data) {
            return;
        }
        env.session.odoobot_initialized = true;
    },
});

return defineFeatureSlice(
    'mail_bot/static/src/models/messaging-initializer/messaging-initializer.js',
    actionExtensions,
    actions,
);

});
