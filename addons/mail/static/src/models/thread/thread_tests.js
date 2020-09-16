odoo.define('mail/static/src/models/thread/thread_tests.js', function (require) {
'use strict';

const {
    'Field/insert': insert,
} = require('mail/static/src/model/utils.js');
const {
    afterEach,
    beforeEach,
    start,
} = require('mail/static/src/utils/test-utils.js');

QUnit.module('mail', {}, function () {
QUnit.module('models', {}, function () {
QUnit.module('thread', {}, function () {
QUnit.module('thread_tests.js', {
    beforeEach() {
        beforeEach(this);

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

QUnit.test('inbox & starred mailboxes', async function (assert) {
    assert.expect(10);

    const env = await this.start();
    const mailboxInbox = env.messaging.$$$inbox();
    const mailboxStarred = env.messaging.$$$starred();
    assert.ok(mailboxInbox, "should have mailbox inbox");
    assert.ok(mailboxStarred, "should have mailbox starred");
    assert.strictEqual(mailboxInbox.$$$model(), 'mail.box');
    assert.strictEqual(mailboxInbox.$$$counter(), 0);
    assert.strictEqual(mailboxInbox.$$$id(), 'inbox');
    assert.strictEqual(mailboxInbox.$$$name(), "Inbox"); // language-dependent
    assert.strictEqual(mailboxStarred.$$$model(), 'mail.box');
    assert.strictEqual(mailboxStarred.$$$counter(), 0);
    assert.strictEqual(mailboxStarred.$$$id(), 'starred');
    assert.strictEqual(mailboxStarred.$$$name(), "Starred"); // language-dependent
});

QUnit.test('create (channel)', async function (assert) {
    assert.expect(23);

    const env = await this.start();
    assert.notOk(
        env.invoke('Partner/findFromId', { $$$id: 9 })
    );
    assert.notOk(
        env.invoke('Partner/findFromId', { $$$id: 10 })
    );
    assert.notOk(
        env.invoke('Thread/findFromId', {
            $$$id: 100,
            $$$model: 'mail.channel',
        })
    );

    const thread = env.invoke('Thread/create', {
        $$$channelType: 'channel',
        $$$id: 100,
        $$$members: insert([{
            $$$email: "john@example.com",
            $$$id: 9,
            $$$name: "John",
        }, {
            $$$email: "fred@example.com",
            $$$id: 10,
            $$$name: "Fred",
        }]),
        $$$messageNeedactionCounter: 6,
        $$$model: 'mail.channel',
        $$$name: "General",
        $$$public: 'public',
        $$$serverMessageUnreadCounter: 5,
    });
    assert.ok(thread);
    assert.ok(
        env.invoke('Partner/findFromId', { $$$id: 9 })
    );
    assert.ok(
        env.invoke('Partner/findFromId', { $$$id: 10 })
    );
    assert.ok(
        env.invoke('Thread/findFromId', {
            $$$id: 100,
            $$$model: 'mail.channel',
        })
    );
    const partner9 = env.invoke('Partner/findFromId', { $$$id: 9 });
    const partner10 = env.invoke('Partner/findFromId', { $$$id: 10 });
    assert.strictEqual(
        thread,
        env.invoke('Thread/findFromId', {
            $$$id: 100,
            $$$model: 'mail.channel',
        })
    );
    assert.strictEqual(thread.$$$model(), 'mail.channel');
    assert.strictEqual(thread.$$$channelType(), 'channel');
    assert.strictEqual(thread.$$$id(), 100);
    assert.ok(thread.$$$members().includes(partner9));
    assert.ok(thread.$$$members().includes(partner10));
    assert.strictEqual(thread.$$$messageNeedactionCounter(), 6);
    assert.strictEqual(thread.$$$name(), "General");
    assert.strictEqual(thread.$$$public(), 'public');
    assert.strictEqual(thread.$$$serverMessageUnreadCounter(), 5);
    assert.strictEqual(partner9.$$$email(), "john@example.com");
    assert.strictEqual(partner9.$$$id(), 9);
    assert.strictEqual(partner9.$$$name(), "John");
    assert.strictEqual(partner10.$$$email(), "fred@example.com");
    assert.strictEqual(partner10.$$$id(), 10);
    assert.strictEqual(partner10.$$$name(), "Fred");
});

QUnit.test('create (chat)', async function (assert) {
    assert.expect(15);

    const env = await this.start();
    assert.notOk(
        env.invoke('Partner/findFromId', { $$$id: 5 })
    );
    assert.notOk(
        env.invoke('Thread/findFromId', {
            $$$id: 200,
            $$$model: 'mail.channel',
        })
    );

    const channel = env.invoke('Thread/create', {
        $$$channelType: 'chat',
        $$$id: 200,
        $$$members: insert({
            $$$email: "demo@example.com",
            $$$id: 5,
            $$$im_status: 'online',
            $$$name: "Demo",
        }),
        $$$model: 'mail.channel',
    });
    assert.ok(channel);
    assert.ok(
        env.invoke('Thread/findFromId', {
            $$$id: 200,
            $$$model: 'mail.channel',
        })
    );
    assert.ok(
        env.invoke('Partner/findFromId', { $$$id: 5 })
    );
    const partner = env.invoke('Partner/findFromId', { $$$id: 5 });
    assert.strictEqual(
        channel,
        env.invoke('Thread/findFromId', {
            $$$id: 200,
            $$$model: 'mail.channel',
        })
    );
    assert.strictEqual(channel.$$$model(), 'mail.channel');
    assert.strictEqual(channel.$$$channelType(), 'chat');
    assert.strictEqual(channel.$$$id(), 200);
    assert.ok(channel.$$$correspondent());
    assert.strictEqual(partner, channel.$$$correspondent());
    assert.strictEqual(partner.$$$email(), "demo@example.com");
    assert.strictEqual(partner.$$$id(), 5);
    assert.strictEqual(partner.$$$im_status(), 'online');
    assert.strictEqual(partner.$$$name(), "Demo");
});

});
});
});

});
