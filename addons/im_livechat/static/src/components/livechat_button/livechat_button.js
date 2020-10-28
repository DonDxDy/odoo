odoo.define('im_livechat/static/src/components/livechat_button/livechat_button.js', function (require) {
'use strict';

const { Component } = owl;
const { xml } = owl.tags;
const env = require('web.commonEnv');

class LivechatButton extends Component {
    static props = ['server_url', 'options'];
    livechatSession = {};

    static template = xml`
<div>
        <div class="o_LivechatButton" t-on-click="init">
            BIG BUTTON HERE
        </div>
<input type="text" name="composer"/>
<button t-on-click="submit">Send</button>
</div>
`;
    constructor(parent, props) {
        super(parent, props);
        props.options = Object.assign({
            input_placeholder: env._t("Ask something ..."),
            default_username: env._t("Visitor"),
            button_text: env._t("Chat with one of our collaborators"),
            default_message: env._t("How may I help you?"),
        }, props.options);
    }

    async init() {
        const init = await env.services.rpc({
            route: '/im_livechat/init',
            params: { channel_id: this.props.options.channel_id },
        });

        this.livechatSession = await env.services.rpc({
            route: '/im_livechat/get_session',
            params: {
                channel_id: this.props.options.channel_id,
                anonymous_name: this.props.options.default_username,
                previous_operator_id: null,
            }
        });

        env.services.bus_service.addChannel(this.livechatSession.uuid);
        env.services.bus_service.onNotification(null, notifs => this._handleNotifications(notifs));
        env.services.bus_service.startPolling();
    }

    async submit() {
        const response = await env.services.rpc({
            route: '/mail/chat_post',
            params: { uuid: this.livechatSession.uuid, message_content: 'prout' },
        });
    }

    _handleNotifications(notifs) {
        console.log(notifs);
    }
}

return LivechatButton;

});
