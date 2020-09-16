odoo.define('mail/static/src/components/thread-icon/thread-icon_tests.js', function (require) {
'use strict';

const ThreadIcon = require('mail/static/src/components/thread-icon/thread-icon.js');
const {
    afterEach,
    afterNextRender,
    beforeEach,
    createRootComponent,
    start,
} = require('mail/static/src/utils/test-utils.js');

QUnit.module('mail', {}, function () {
QUnit.module('components', {}, function () {
QUnit.module('thread-icon', {}, function () {
QUnit.module('thread-icon_tests.js', {
    beforeEach() {
        beforeEach(this);

        this.createThreadIcon = async thread => {
            await createRootComponent(this, ThreadIcon, {
                props: { thread },
                target: this.widget.el
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

QUnit.test('chat: correspondent is typing', async function (assert) {
    assert.expect(5);

    this.data['mail.channel'].records.push(
        {
            channel_type: 'chat',
            id: 20,
            members: [this.data.currentPartnerId, 17],
        }
    );
    this.data['res.partner'].records.push(
        {
            id: 17,
            im_status: 'online',
            name: "Demo",
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
        '.o-ThreadIcon-online',
        "should have thread icon with partner im status icon 'online'"
    );

    // simulate receive typing notification from demo "is typing"
    await afterNextRender(() => {
        const typingData = {
            info: 'typing_status',
            is_typing: true,
            partner_id: 17,
            partner_name: "Demo",
        };
        const notification = [[false, 'mail.channel', 20], typingData];
        this.widget.call('bus_service', 'trigger', 'notification', [notification]);
    });
    assert.containsOnce(
        document.body,
        '.o-ThreadIcon-typing',
        "should have thread icon with partner currently typing"
    );
    assert.strictEqual(
        document.querySelector('.o-ThreadIcon-typing').title,
        "Demo is typing...",
        "title of icon should tell demo is currently typing"
    );

    // simulate receive typing notification from demo "no longer is typing"
    await afterNextRender(() => {
        const typingData = {
            info: 'typing_status',
            is_typing: false,
            partner_id: 17,
            partner_name: "Demo",
        };
        const notification = [[false, 'mail.channel', 20], typingData];
        this.widget.call('bus_service', 'trigger', 'notification', [notification]);
    });
    assert.containsOnce(
        document.body,
        '.o-ThreadIcon-online',
        "should have thread icon with partner im status icon 'online' (no longer typing)"
    );
});

});
});
});

});
