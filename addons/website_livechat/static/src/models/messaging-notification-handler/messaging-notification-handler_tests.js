odoo.define('website_livechat/static/src/models/messaging-notification-handler/messaging-notification-handler_tests.js', function (require) {
'use strict';

const {
    afterEach,
    afterNextRender,
    beforeEach,
    start,
} = require('mail/static/src/utils/test-utils.js');

const FormView = require('web.FormView');
const {
    mock: {
        intercept,
    },
} = require('web.test_utils');

QUnit.module('website_livechat', {}, function () {
QUnit.module('models', {}, function () {
QUnit.module('messaging-notification-handler', {}, function () {
QUnit.module('messaging-notification-handler_tests.js', {
    beforeEach() {
        beforeEach(this);

        this.start = async params => {
            const env = await start({
                data: this.data,
                ...params,
            });
            this.env = env;
            return env;
        };
    },
    afterEach() {
        afterEach(this);
    },
});

QUnit.test('should open chat window on send chat request to website visitor', async function (assert) {
    assert.expect(3);

    this.data['website.visitor'].records.push({
        display_name: "Visitor #11",
        id: 11,
    });
    const env = await this.start({
        data: this.data,
        hasChatWindow: true,
        hasView: true,
        // View params
        View: FormView,
        model: 'website.visitor',
        arch: `
            <form>
                <header>
                    <button name="action_send_chat_request" string="Send chat request" class="btn btn-primary" type="button"/>
                </header>
                <field name="name"/>
            </form>
        `,
        res_id: 11,
    });
    intercept(this.widget, 'execute_action', payload => {
        env.services.rpc({
            route: '/web/dataset/call_button',
            params: {
                args: [payload.data.env.resIDs],
                kwargs: { context: payload.data.env.context },
                method: payload.data.action_data.name,
                model: payload.data.env.model,
            }
        });
    });

    await afterNextRender(() =>
        document.querySelector('button[name="action_send_chat_request"]').click()
    );
    assert.containsOnce(
        document.body,
        '.o-ChatWindow',
        "should have a chat window open after sending chat request to website visitor"
    );
    assert.hasClass(
        document.querySelector('.o-ChatWindow'),
        'o-isFocused',
        "chat window of livechat should be focused on open"
    );
    assert.strictEqual(
        document.querySelector('.o-ChatWindowHeader-name').textContent,
        "Visitor #11",
        "chat window of livechat should have name of visitor in the name"
    );
});

});
});
});

});
