odoo.define('im_livechat/static/src/models/messaging-initializer/messaging-initializer.js', function (require) {
'use strict';

const {
    'Feature/defineActionExtensions': defineActionExtensions,
    'Feature/defineSlice': defineFeatureSlice,
} = require('mail/static/src/model/utils.js');
const {
    executeGracefully,
} = require('mail/static/src/utils/utils.js');

const actionExtensions = defineActionExtensions({
    /**
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {function} param0.original
     * @param {MessagingInitializer} messagingInitializer
     * @param {Object[]} [param2.channel_livechat=[]]
     */
    async 'MessagingInitializer/_initChannels'(
        { env, original },
        messagingInitializer,
        initMessagingData
    ) {
        await env.invoke(
            'Record/doAsync',
            messagingInitializer,
            () => original(initMessagingData)
        );
        const {
            channel_livechat = [],
        } = initMessagingData;
        return executeGracefully(
            channel_livechat.map(data =>
                () => {
                    const channel = env.invoke('Thread/insert',
                        env.invoke('Thread/convertData', data),
                    );
                    // flux specific: channels received at init have to be
                    // considered pinned. task-2284357
                    if (!channel.$$$isPinned(this)) {
                        env.invoke('Thread/pin', channel);
                    }
                }
            )
        );
    },
});

return defineFeatureSlice(
    'im_livechat/static/src/models/messaging-initializer/messaging-initializer.js',
    actionExtensions,
);

});
