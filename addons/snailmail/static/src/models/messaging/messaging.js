odoo.define('snailmail/static/src/models/messaging/messaging.js', function (require) {
'use strict';

const {
    'Feature/defineActions': defineActions,
    'Feature/defineModelExtension': defineModelExtension,
    'Feature/defineSlice': defineFeatureSlice,
    'Field/attr': attr,
} = require('mail/static/src/model/utils.js');

const actions = defineActions({
    /**
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Messaging} messaging
     */
    async 'Messaging/fetchSnailmailCreditsUrl'(
        { env },
        messaging
    ) {
        const snailmailCreditsUrl = await env.invoke(
            'Record/doAsync',
            messaging,
            () => env.services.rpc({
                model: 'iap.account',
                method: 'get_credits_url',
                args: ['snailmail'],
            })
        );
        env.invoke('Record/update', messaging, {
            $$$snailmailCreditsUrl: snailmailCreditsUrl,
        });
    },
    /**
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Mssaging} messaging
     */
    async 'Messaging/fetchSnailmailCreditsUrlTrial'(
        { env },
        messaging
    ) {
        const snailmailCreditsUrlTrial = await env.invoke(
            'Record/doAsync',
            messaging,
            () => env.services.rpc({
                model: 'iap.account',
                method: 'get_credits_url',
                args: ['snailmail', '', 0, true],
            })
        );
        env.invoke('Record/update', messaging, {
            $$$snailmailCreditsUrl: snailmailCreditsUrlTrial,
        });
    },
});

const modelExtension = defineModelExtension({
    name: 'Messaging',
    fields: {
        $$$snailmailCreditsUrl: attr(),
        $$$snailmailCreditsUrlTrial: attr(),
    }
});

return defineFeatureSlice(
    'snailmail/static/src/models/messaging/messaging.js',
    actions,
    modelExtension,
);

});
