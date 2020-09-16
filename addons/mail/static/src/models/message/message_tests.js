odoo.define('mail/static/src/models/message/message_tests.js', function (require) {
'use strict';

const {
    'Field/insert': insert,
    'Field/insertAndReplace': insertAndReplace,
    'Field/link': link,
} = require('mail/static/src/model/utils.js');
const {
    afterEach,
    beforeEach,
    start,
} = require('mail/static/src/utils/test-utils.js');

const { str_to_datetime } = require('web.time');

QUnit.module('mail', {}, function () {
QUnit.module('models', {}, function () {
QUnit.module('message', {}, function () {
QUnit.module('message_tests.js', {
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

QUnit.test('create', async function (assert) {
    assert.expect(31);

    const env = await this.start();
    assert.notOk(
        env.invoke('Partner/findFromId', { $$$id: 5 })
    );
    assert.notOk(
        env.invoke('Thread/findFromId', {
            $$$id: 100,
            $$$model: 'mail.channel',
        })
    );
    assert.notOk(
        env.invoke('Attachment/findFromId', { $$$id: 750 })
    );
    assert.notOk(
        env.invoke('Message/findFromId', { $$$id: 4000 })
    );

    const thread = env.invoke('Thread/create', {
        $$$id: 100,
        $$$model: 'mail.channel',
        $$$name: "General",
    });
    const message = env.invoke('Message/create', {
        $$$attachments: insertAndReplace({
            $$$filename: "test.txt",
            $$$id: 750,
            $$$mimetype: 'text/plain',
            $$$name: "test.txt",
        }),
        $$$author: insert({
            $$$displayName: "Demo",
            $$$id: 5,
        }),
        $$$body: "<p>Test</p>",
        $$$date: moment(str_to_datetime("2019-05-05 10:00:00")),
        $$$id: 4000,
        $$$isNeedaction: true,
        $$$isStarred: true,
        $$$originThread: link(thread),
    });

    assert.ok(
        env.invoke('Partner/findFromId', { $$$id: 5 })
    );
    assert.ok(
        env.invoke('Thread/findFromId', {
            $$$id: 100,
            $$$model: 'mail.channel',
        })
    );
    assert.ok(
        env.invoke('Attachment/findFromId', { $$$id: 750 })
    );
    assert.ok(
        env.invoke('Message/findFromId', { $$$id: 4000 })
    );
    assert.ok(message);
    assert.strictEqual(
        env.invoke('Message/findFromId', { $$$id: 4000 }),
        message
    );
    assert.strictEqual(
        message.$$$body(), "<p>Test</p>"
    );
    assert.ok(
        message.$$$date() instanceof moment
    );
    assert.strictEqual(
        moment(message.$$$date()).utc().format('YYYY-MM-DD hh:mm:ss'),
        "2019-05-05 10:00:00"
    );
    assert.strictEqual(
        message.$$$id(),
        4000
    );
    assert.strictEqual(
        message.$$$originThread(),
        env.invoke('Thread/findFromId', {
            $$$id: 100,
            $$$model: 'mail.channel',
        })
    );
    assert.ok(
        message.$$$threads().includes(
            env.invoke('Thread/findFromId', {
                $$$id: 100,
                $$$model: 'mail.channel',
            })
        )
    );
    // from partnerId being in needaction_partner_ids
    assert.ok(
        message.$$$threads().includes(
            env.messaging.$$$inbox()
        )
    );
    // from partnerId being in starred_partner_ids
    assert.ok(
        message.$$$threads().includes(
            env.messaging.$$$starred()
        )
    );
    const attachment = env.invoke('Attachment/findFromId', { $$$id: 750 });
    assert.ok(attachment);
    assert.strictEqual(attachment.$$$filename(), "test.txt");
    assert.strictEqual(attachment.$$$id(), 750);
    assert.notOk(attachment.$$$isTemporary());
    assert.strictEqual(attachment.$$$mimetype(), 'text/plain');
    assert.strictEqual(attachment.$$$name(), "test.txt");
    const channel = env.invoke('Thread/findFromId', {
        $$$id: 100,
        $$$model: 'mail.channel',
    });
    assert.ok(channel);
    assert.strictEqual(channel.$$$model(), 'mail.channel');
    assert.strictEqual(channel.$$$id(), 100);
    assert.strictEqual(channel.$$$name(), "General");
    const partner = env.invoke('Partner/findFromId', { $$$id: 5 });
    assert.ok(partner);
    assert.strictEqual(partner.$$$displayName(), "Demo");
    assert.strictEqual(partner.$$$id(), 5);
});

});
});
});

});
