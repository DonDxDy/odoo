odoo.define('im_livechat/static/src/models/messaging-notification-handler/messaging-notification-handler.js', function (require) {
'use strict';

const {
    'Feature/defineActionExtensions': defineActionExtensions,
    'Feature/defineSlice': defineFeatureSlice,
} = require('mail/static/src/model/utils.js');

const actionExtensions = defineActionExtensions({
    /**
     * @override
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {function} param0.original
     */
    'MessagingNotificationHandler/_handleNotificationChannelTypingStatus'(
        { env, original },
        channelId,
        data
    ) {
        const {
            partner_id,
            partner_name,
        } = data;
        const channel = env.invoke('Thread/findFromId', {
            $$$id: channelId,
            $$$model: 'mail.channel',
        });
        if (!channel) {
            return;
        }
        let partnerId;
        let partnerName;
        if (partner_id === env.messaging.$$$publicPartner(this).$$$id(this)) {
            // Some shenanigans that this is a typing notification
            // from public partner.
            partnerId = channel.$$$correspondent(this).$$$id(this);
            partnerName = channel.$$$correspondent(this).$$$name(this);
        } else {
            partnerId = partner_id;
            partnerName = partner_name;
        }
        original(channelId, {
            ...data,
            partner_id: partnerId,
            partner_name: partnerName,
        });
    },
});

return defineFeatureSlice(
    'im_livechat/static/src/models/messaging-notification-handler/messaging-notification-handler.js',
    actionExtensions,
);

});
