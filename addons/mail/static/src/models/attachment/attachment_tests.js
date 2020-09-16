odoo.define('mail/static/src/models/attachment/attachment_tests.js', function (require) {
'use strict';

const {
    afterEach,
    beforeEach,
    start,
} = require('mail/static/src/utils/test-utils.js');

QUnit.module('mail', {}, function () {
QUnit.module('models', {}, function () {
QUnit.module('attachment', {}, function () {
QUnit.module('attachment_tests.js', {
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

QUnit.test('create (txt)', async function (assert) {
    assert.expect(9);

    const env = await this.start();
    assert.notOk(env.invoke('Attachment/findFromId', { $$$id: 750 }));

    const attachment = env.invoke('Attachment/create', {
        $$$filename: "test.txt",
        $$$id: 750,
        $$$mimetype: 'text/plain',
        $$$name: "test.txt",
    });
    assert.ok(attachment);
    assert.ok(env.invoke('Attachment/findFromId', { $$$id: 750 }));
    assert.strictEqual(env.invoke('Attachment/findFromId', { $$$id: 750 }), attachment);
    assert.strictEqual(attachment.$$$filename(), "test.txt");
    assert.strictEqual(attachment.$$$id(), 750);
    assert.notOk(attachment.$$$isTemporary());
    assert.strictEqual(attachment.$$$mimetype(), 'text/plain');
    assert.strictEqual(attachment.$$$name(), "test.txt");
});

QUnit.test('displayName', async function (assert) {
    assert.expect(5);

    const env = await this.start();
    assert.notOk(env.invoke('Attachment/findFromId', { $$$id: 750 }));

    const attachment = env.invoke('Attachment/create', {
        $$$filename: "test.txt",
        $$$id: 750,
        $$$mimetype: 'text/plain',
        $$$name: "test.txt",
    });
    assert.ok(attachment);
    assert.ok(env.invoke('Attachment/findFromId', { $$$id: 750 }));
    assert.strictEqual(attachment, env.invoke('Attachment/findFromId', { $$$id: 750 }));
    assert.strictEqual(attachment.$$$displayName(), "test.txt");
});

QUnit.test('extension', async function (assert) {
    assert.expect(5);

    const env = await this.start();
    assert.notOk(env.invoke('Attachment/findFromId', { $$$id: 750 }));

    const attachment = env.invoke('Attachment/create', {
        $$$filename: "test.txt",
        $$$id: 750,
        $$$mimetype: 'text/plain',
        $$$name: "test.txt",
    });
    assert.ok(attachment);
    assert.ok(env.invoke('Attachment/findFromId', { $$$id: 750 }));
    assert.strictEqual(attachment, env.invoke('Attachment/findFromId', { $$$id: 750 }));
    assert.strictEqual(attachment.$$$extension(), 'txt');
});

QUnit.test('fileType', async function (assert) {
    assert.expect(5);

    const env = await this.start();
    assert.notOk(env.invoke('Attachment/findFromId', { $$$id: 750 }));

    const attachment = env.invoke('Attachment/create', {
        $$$filename: "test.txt",
        $$$id: 750,
        $$$mimetype: 'text/plain',
        $$$name: "test.txt",
    });
    assert.ok(attachment);
    assert.ok(env.invoke('Attachment/findFromId', { $$$id: 750 }));
    assert.strictEqual(
        attachment,
        env.invoke('Attachment/findFromId', { $$$id: 750 })
    );
    assert.strictEqual(attachment.$$$fileType(), 'text');
});

QUnit.test('isTextFile', async function (assert) {
    assert.expect(5);

    const env = await this.start();
    assert.notOk(env.invoke('Attachment/findFromId', { $$$id: 750 }));

    const attachment = env.invoke('Attachment/create', {
        $$$filename: "test.txt",
        $$$id: 750,
        $$$mimetype: 'text/plain',
        $$$name: "test.txt",
    });
    assert.ok(attachment);
    assert.ok(env.invoke('Attachment/findFromId', { $$$id: 750 }));
    assert.strictEqual(attachment, env.invoke('Attachment/findFromId', { $$$id: 750 }));
    assert.ok(attachment.$$$isTextFile());
});

QUnit.test('isViewable', async function (assert) {
    assert.expect(5);

    const env = await this.start();
    assert.notOk(env.invoke('Attachment/findFromId', { $$$id: 750 }));

    const attachment = env.invoke('Attachment/create', {
        $$$filename: "test.txt",
        $$$id: 750,
        $$$mimetype: 'text/plain',
        $$$name: "test.txt",
    });
    assert.ok(attachment);
    assert.ok(env.invoke('Attachment/findFromId', { $$$id: 750 }));
    assert.strictEqual(attachment, env.invoke('Attachment/findFromId', { $$$id: 750 }));
    assert.ok(attachment.$$$isViewable());
});

});
});
});

});
