odoo.define('im_livechat/static/src/components/thread-textual-typing-status/thread-textual-typing-status_tests.js', function (require) {
'use strict';

const ThreadTextualTypingStatus = require('mail/static/src/components/thread-textual-typing-status/thread-textual-typing-status.js');
const {
    afterEach,
    afterNextRender,
    beforeEach,
    createRootComponent,
    start,
} = require('mail/static/src/utils/test-utils.js');

QUnit.module('im_livechat', {}, function () {
QUnit.module('components', {}, function () {
QUnit.module('thread-textual-typing-status', {}, function () {
QUnit.module('thread-textual-typing-status_tests.js', {
    beforeEach() {
        beforeEach(this);

        this.createThreadTextualTypingStatusComponent = async thread => {
            await createRootComponent(this, ThreadTextualTypingStatus, {
                props: { thread },
                target: this.widget.el,
            });
        };

        this.start = async params => {
            const env = await start({
                ...params,
                data: this.data,
            });
            this.env = env;
            return env;
        };
    },
    afterEach() {
        afterEach(this);
    },
});

QUnit.test('receive visitor typing status "is typing"', async function (assert) {
    assert.expect(2);

    this.data['mail.channel'].records.push(
        {
            anonymous_name: "Visitor 20",
            channel_type: 'livechat',
            id: 20,
            livechat_operator_id: this.data.currentPartnerId,
            members: [this.data.currentPartnerId, this.data.publicPartnerId],
        }
    );
    const env = await this.start();
    const thread = env.invoke('Thread/findFromId', {
        $$$id: 20,
        $$$model: 'mail.channel',
    });
    await this.createThreadTextualTypingStatusComponent(thread);
    assert.strictEqual(
        document.querySelector('.o-ThreadTextualTypingStatus').textContent,
        "",
        "Should display no one is currently typing"
    );

    // simulate receive typing notification from livechat visitor "is typing"
    await afterNextRender(() => {
        const typingData = {
            info: 'typing_status',
            is_typing: true,
            partner_id: env.messaging.$$$publicPartner().$$$id(),
            partner_name: env.messaging.$$$publicPartner().$$$name(),
        };
        const notification = [[false, 'mail.channel', 20], typingData];
        this.widget.call('bus_service', 'trigger', 'notification', [notification]);
    });
    assert.strictEqual(
        document.querySelector('.o-ThreadTextualTypingStatus').textContent,
        "Visitor 20 is typing...",
        "Should display that visitor is typing"
    );
});

});
});
});

});
