odoo.define('im_livechat/static/src/components/livechat_button/livechat_button.js', function (require) {
'use strict';

const { Component } = owl;
const { xml } = owl.tags;
const { useState } = owl.hooks;

class LivechatButton extends Component {
    static components = {
        ChatWindow: require('mail/static/src/components/chat_window/chat_window.js'),
    };

    static props = ['server_url', 'options'];
    livechatSession = {};
    state = useState({
        ChatWindowModel: {}
    });

    static template = xml`
<div>
     <div class="o_LivechatButton">
        BIG BUTTON HERE
     </div>
    <ChatWindow chatWindowLocalId="state.ChatWindowModel.localId" />
    <input type="text" name="composer"/>
    <button t-on-click="submit">Send</button>
</div>
`;
    constructor(parent, props) {
        super(parent, props);
        props.options = Object.assign({
            input_placeholder: this.env._t("Ask something ..."),
            default_username: this.env._t("Visitor"),
            button_text: this.env._t("Chat with one of our collaborators"),
            default_message: this.env._t("How may I help you?"),
        }, props.options);
        this.init();
    }

    async init() {

        // load_qweb: function (mods) {
        //     var self = this;
        //     var lock = this.qweb_mutex.exec(function () {
        //         var cacheId = self.cache_hashes && self.cache_hashes.qweb;
        //         var route  = '/web/webclient/qweb/' + (cacheId ? cacheId : Date.now()) + '?mods=' + mods;
        //         return $.get(route).then(function (doc) {
        //             if (!doc) { return; }
        //             const owlTemplates = [];
        //             for (let child of doc.querySelectorAll("templates > [owl]")) {
        //                 child.removeAttribute('owl');
        //                 owlTemplates.push(child.outerHTML);
        //                 child.remove();
        //             }
        //             qweb.add_template(doc);
        //             self.owlTemplates = `<templates> ${owlTemplates.join('\n')} </templates>`;
        //         });
        //     });
        //     return lock;
        // }

        const templates = await this.env.services.rpc({
            route: '/im_livechat/load_templates'
        });
        console.log(templates);
        const owlTemplates = [];
        for (let template of templates) {
            console.log(template);
            template = template.querySelectorAll("templates > [owl]");
            this.env.qweb.add_template(template);
            owlTemplates.push(template.outerHTML);
        }
        this.env.session.owlTemplates = `<templates> ${owlTemplates.join('\n')} </templates>`;

        await new Promise(resolve => setTimeout(resolve));

        console.log(this.env);
        this.state.ChatWindowModel = this.env.models['mail.chat_window'].create();

        const init = await this.env.services.rpc({
            route: '/im_livechat/init',
            params: { channel_id: this.props.options.channel_id },
        });

        this.livechatSession = await this.env.services.rpc({
            route: '/im_livechat/get_session',
            params: {
                channel_id: this.props.options.channel_id,
                anonymous_name: this.props.options.default_username,
                previous_operator_id: null,
            }
        });

        this.env.services.bus_service.addChannel(this.livechatSession.uuid);
        this.env.services.bus_service.onNotification(null, notifs => this._handleNotifications(notifs));
        this.env.services.bus_service.startPolling();
    }

    async submit() {
        const response = await this.env.services.rpc({
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
