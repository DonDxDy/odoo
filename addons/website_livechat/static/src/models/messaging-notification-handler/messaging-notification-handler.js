odoo.define('website_livechat/static/src/models/messaging-notification-handler/messaging-notification-handler.js', function (require) {
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
     * @param {Object} data
     */
    'MessagingNotificationHandler/_handleNotificationPartner'(
        { env, original },
        data
    ) {
        const { info } = data;
        if (info === 'send_chat_request') {
            env.invoke(
                'MessagingNotificationHandler/_handleNotificationPartnerChannel',
                data
            );
            const channel = env.invoke('Thread/findFromId', {
                $$$id: data.id,
                $$$model: 'mail.channel',
            });
            env.invoke('ChatWindowManager/openThread',
                env.messaging.$$$chatWindowManager(this),
                channel,
                {
                    makeActive: true,
                }
            );
            return;
        }
        return original(data);
    },
});

return defineFeatureSlice(
    'website_livechat/static/src/models/messaging-notification-handler/messaging-notification-handler.js',
    actionExtensions,
);

});
