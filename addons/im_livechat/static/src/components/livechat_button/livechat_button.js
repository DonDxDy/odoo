odoo.define('im_livechat/static/src/components/livechat_button/livechat_button.js', function (require) {
'use strict';

const { Component } = owl;
const { xml } = owl.tags;

class LivechatButton extends Component {
    static template = xml`
        <div class="o_LivechatButton">
            BIG BUTTON HERE
        </div>`;
}

// Object.assign(LivechatButton, {
//     props: {},
//     template: 'im_livechat.LivechatButton',
// });

return LivechatButton;

});
