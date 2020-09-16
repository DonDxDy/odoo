odoo.define('im_livechat/static/src/components/thread-icon/thread-icon_tests.js', function (require) {
'use strict';

const ThreadIcon = require('mail/static/src/components/thread-icon/thread-icon.js');
const {
    afterEach,
    afterNextRender,
    beforeEach,
    createRootComponent,
    start,
} = require('mail/static/src/utils/test-utils.js');

QUnit.module('im_livechat', {}, function () {
QUnit.module('components', {}, function () {
QUnit.module('thread-icon', {}, function () {
QUnit.module('thread-icon_tests.js', {
    beforeEach() {
        beforeEach(this);

        this.createThreadIcon = async thread => {
            await createRootComponent(this, ThreadIcon, {
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

QUnit.test('livechat: public website visitor is typing', async function (assert) {
    assert.expect(4);

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
    await this.createThreadIcon(thread);
    assert.containsOnce(
        document.body,
        '.o-ThreadIcon',
        "should have thread icon"
    );
    assert.containsOnce(
        document.body,
        '.o-ThreadIcon .fa.fa-comments',
        "should have default livechat icon"
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
    assert.containsOnce(
        document.body,
        '.o-ThreadIcon-typing',
        "should have thread icon with visitor currently typing"
    );
    assert.strictEqual(
        document.querySelector('.o-ThreadIcon-typing').title,
        "Visitor 20 is typing...",
        "title of icon should tell visitor is currently typing"
    );
});

});
});
});

});
