odoo.define('mail/static/src/components/chatter/chatter_tests', function (require) {
'use strict';

const Chatter = require('mail/static/src/components/chatter/chatter.js');
const Composer = require('mail/static/src/components/composer/composer.js');
const {
    afterEach,
    afterNextRender,
    beforeEach,
    createRootComponent,
    nextAnimationFrame,
    start,
} = require('mail/static/src/utils/test-utils.js');

QUnit.module('mail', {}, function () {
QUnit.module('components', {}, function () {
QUnit.module('chatter', {}, function () {
QUnit.module('chatter_tests.js', {
    beforeEach() {
        beforeEach(this);

        this.createChatterComponent = async ({ chatter }, otherProps) => {
            await createRootComponent(this, Chatter, {
                props: {
                    chatter,
                    ...otherProps,
                },
                target: this.widget.el,
            });
        };

        this.createComposerComponent = async (composer, otherProps) => {
            await createRootComponent(this, Composer, {
                props: {
                    composer,
                    ...otherProps,
                },
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

QUnit.test('base rendering when chatter has no attachment', async function (assert) {
    assert.expect(6);

    for (let i = 0; i < 60; i++) {
        this.data['mail.message'].records.push(
            {
                body: "not empty",
                model: 'res.partner',
                res_id: 100,
            }
        );
    }
    this.data['res.partner'].records.push(
        { id: 100 }
    );
    const env = await this.start();
    const chatter = env.invoke('Chatter/create', {
        $$$threadId: 100,
        $$$threadModel: 'res.partner',
    });
    await this.createChatterComponent({ chatter });
    assert.containsOnce(
        document.body,
        '.o-Chatter',
        "should have a chatter"
    );
    assert.containsOnce(
        document.body,
        '.o-ChatterTopbar',
        "should have a chatter topbar"
    );
    assert.containsNone(
        document.body,
        '.o-Chatter-attachmentBox',
        "should not have an attachment box in the chatter"
    );
    assert.containsOnce(
        document.body,
        '.o-Chatter-thread',
        "should have a thread in the chatter"
    );
    assert.strictEqual(
        document.querySelector('.o-Chatter-thread').dataset.threadLocalId,
        env.invoke('Thread/findFromId', {
            $$$id: 100,
            $$$model: 'res.partner',
        }).localId,
        "thread should have the right thread local id"
    );
    assert.containsN(
        document.body,
        '.o-Message',
        30,
        "the first 30 messages of thread should be loaded"
    );
});

QUnit.test('base rendering when chatter has no record', async function (assert) {
    assert.expect(8);

    const env = await this.start();
    const chatter = env.invoke('Chatter/create', {
        $$$threadModel: 'res.partner',
    });
    await this.createChatterComponent({ chatter });
    assert.containsOnce(
        document.body,
        '.o-Chatter',
        "should have a chatter"
    );
    assert.containsOnce(
        document.body,
        '.o-ChatterTopbar',
        "should have a chatter topbar"
    );
    assert.containsNone(
        document.body,
        '.o-Chatter-attachmentBox',
        "should not have an attachment box in the chatter"
    );
    assert.containsOnce(
        document.body,
        '.o-Chatter-thread',
        "should have a thread in the chatter"
    );
    assert.ok(
        chatter.$$$thread().$$$isTemporary(),
        "thread should have a temporary thread linked to chatter"
    );
    assert.containsOnce(
        document.body,
        '.o-Message',
        "should have a message"
    );
    assert.strictEqual(
        document.querySelector('.o-Message-content').textContent,
        "Creating a new record...",
        "should have the 'Creating a new record ...' message"
    );
    assert.containsNone(
        document.body,
        '.o-MessageList-loadMore',
        "should not have the 'load more' button"
    );
});

QUnit.test('base rendering when chatter has attachments', async function (assert) {
    assert.expect(3);

    this.data['ir.attachment'].records.push(
        {
            mimetype: 'text/plain',
            name: 'Blah.txt',
            res_id: 100,
            res_model: 'res.partner',
        },
        {
            mimetype: 'text/plain',
            name: 'Blu.txt',
            res_id: 100,
            res_model: 'res.partner',
        }
    );
    this.data['res.partner'].records.push(
        { id: 100 }
    );
    const env = await this.start();
    const chatter = env.invoke('Chatter/create', {
        $$$threadId: 100,
        $$$threadModel: 'res.partner',
    });
    await this.createChatterComponent({ chatter });
    assert.containsOnce(
        document.body,
        '.o-Chatter',
        "should have a chatter"
    );
    assert.containsOnce(
        document.body,
        '.o-ChatterTopbar',
        "should have a chatter topbar"
    );
    assert.containsNone(
        document.body,
        '.o-Chatter-attachmentBox',
        "should not have an attachment box in the chatter"
    );
});

QUnit.test('show attachment box', async function (assert) {
    assert.expect(6);

    this.data['ir.attachment'].records.push(
        {
            mimetype: 'text/plain',
            name: 'Blah.txt',
            res_id: 100,
            res_model: 'res.partner',
        },
        {
            mimetype: 'text/plain',
            name: 'Blu.txt',
            res_id: 100,
            res_model: 'res.partner',
        }
    );
    this.data['res.partner'].records.push(
        { id: 100 }
    );
    const env = await this.start();
    const chatter = env.invoke('Chatter/create', {
        $$$threadId: 100,
        $$$threadModel: 'res.partner',
    });
    await this.createChatterComponent({ chatter });
    assert.containsOnce(
        document.body,
        '.o-Chatter',
        "should have a chatter"
    );
    assert.containsOnce(
        document.body,
        '.o-ChatterTopbar',
        "should have a chatter topbar"
    );
    assert.containsOnce(
        document.body,
        '.o-ChatterTopbar-buttonAttachments',
        "should have an attachments button in chatter topbar"
    );
    assert.containsOnce(
        document.body,
        '.o-ChatterTopbar-buttonAttachmentsCount',
        "attachments button should have a counter"
    );
    assert.containsNone(
        document.body,
        '.o-Chatter-attachmentBox',
        "should not have an attachment box in the chatter"
    );

    await afterNextRender(() =>
        document.querySelector('.o-ChatterTopbar-buttonAttachments').click()
    );
    assert.containsOnce(
        document.body,
        '.o-Chatter-attachmentBox',
        "should have an attachment box in the chatter"
    );
});

QUnit.test('composer show/hide on log note/send message [REQUIRE FOCUS]', async function (assert) {
    assert.expect(10);

    this.data['res.partner'].records.push(
        { id: 100 }
    );
    const env = await this.start();
    const chatter = env.invoke('Chatter/create', {
        $$$threadId: 100,
        $$$threadModel: 'res.partner',
    });
    await this.createChatterComponent({ chatter });
    assert.containsOnce(
        document.body,
        '.o-ChatterTopbar-buttonSendMessage',
        "should have a send message button"
    );
    assert.containsOnce(
        document.body,
        '.o-ChatterTopbar-buttonLogNote',
        "should have a log note button"
    );
    assert.containsNone(
        document.body,
        '.o-Chatter-composer',
        "should not have a composer"
    );

    await afterNextRender(() =>
        document.querySelector('.o-ChatterTopbar-buttonSendMessage').click()
    );
    assert.containsOnce(
        document.body,
        '.o-Chatter-composer',
        "should have a composer"
    );
    assert.hasClass(
        document.querySelector('.o-Chatter-composer'),
        'o-isFocused',
        "composer 'send message' in chatter should have focus just after being displayed"
    );

    await afterNextRender(() =>
        document.querySelector('.o-ChatterTopbar-buttonLogNote').click()
    );
    assert.containsOnce(
        document.body,
        '.o-Chatter-composer',
        "should still have a composer"
    );
    assert.hasClass(
        document.querySelector('.o-Chatter-composer'),
        'o-isFocused',
        "composer 'log note' in chatter should have focus just after being displayed"
    );

    await afterNextRender(() =>
        document.querySelector('.o-ChatterTopbar-buttonLogNote').click()
    );
    assert.containsNone(
        document.body,
        '.o-Chatter-composer',
        "should have no composer anymore"
    );

    await afterNextRender(() =>
        document.querySelector('.o-ChatterTopbar-buttonSendMessage').click()
    );
    assert.containsOnce(
        document.body,
        '.o-Chatter-composer',
        "should have a composer"
    );

    await afterNextRender(() =>
        document.querySelector('.o-ChatterTopbar-buttonSendMessage').click()
    );
    assert.containsNone(
        document.body,
        '.o-Chatter-composer',
        "should have no composer anymore"
    );
});

QUnit.test('should not display user notification messages in chatter', async function (assert) {
    assert.expect(1);

    this.data['mail.message'].records.push(
        {
            id: 102,
            message_type: 'user_notification',
            model: 'res.partner',
            res_id: 100,
        }
    );
    this.data['res.partner'].records.push(
        { id: 100 }
    );
    const env = await this.start();
    const chatter = env.invoke('Chatter/create', {
        $$$threadId: 100,
        $$$threadModel: 'res.partner',
    });
    await this.createChatterComponent({ chatter });
    assert.containsNone(
        document.body,
        '.o-Message',
        "should display no messages"
    );
});

QUnit.test('post message with "CTRL-Enter" keyboard shortcut', async function (assert) {
    assert.expect(2);

    this.data['res.partner'].records.push(
        { id: 100 }
    );
    const env = await this.start();
    const chatter = env.invoke('Chatter/create', {
        $$$threadId: 100,
        $$$threadModel: 'res.partner',
    });
    await this.createChatterComponent({ chatter });
    assert.containsNone(
        document.body,
        '.o-Message',
        "should not have any message initially in chatter"
    );

    await afterNextRender(() =>
        document.querySelector('.o-ChatterTopbar-buttonSendMessage').click()
    );
    await afterNextRender(() => {
        document.querySelector('.o-ComposerTextInput-textarea').focus();
        document.execCommand('insertText', false, "Test");
    });
    await afterNextRender(() => {
        const kevt = new window.KeyboardEvent('keydown', { ctrlKey: true, key: "Enter" });
        document.querySelector('.o-ComposerTextInput-textarea').dispatchEvent(kevt);
    });
    assert.containsOnce(
        document.body,
        '.o-Message',
        "should now have single message in chatter after posting message from pressing 'CTRL-Enter' in text input of composer"
    );
});

QUnit.test('post message with "META-Enter" keyboard shortcut', async function (assert) {
    assert.expect(2);

    this.data['res.partner'].records.push(
        { id: 100 }
    );
    const env = await this.start();
    const chatter = env.invoke('Chatter/create', {
        $$$threadId: 100,
        $$$threadModel: 'res.partner',
    });
    await this.createChatterComponent({ chatter });
    assert.containsNone(
        document.body,
        '.o-Message',
        "should not have any message initially in chatter"
    );

    await afterNextRender(() =>
        document.querySelector('.o-ChatterTopbar-buttonSendMessage').click()
    );
    await afterNextRender(() => {
        document.querySelector('.o-ComposerTextInput-textarea').focus();
        document.execCommand('insertText', false, "Test");
    });
    await afterNextRender(() => {
        const kevt = new window.KeyboardEvent('keydown', { key: "Enter", metaKey: true });
        document.querySelector('.o-ComposerTextInput-textarea').dispatchEvent(kevt);
    });
    assert.containsOnce(
        document.body,
        '.o-Message',
        "should now have single message in channel after posting message from pressing 'META-Enter' in text input of composer"
    );
});

QUnit.test('do not post message with "Enter" keyboard shortcut', async function (assert) {
    // Note that test doesn't assert Enter makes a newline, because this
    // default browser cannot be simulated with just dispatching
    // programmatically crafted events...
    assert.expect(2);

    this.data['res.partner'].records.push(
        { id: 100 }
    );
    const env = await this.start();
    const chatter = env.invoke('Chatter/create', {
        $$$threadId: 100,
        $$$threadModel: 'res.partner',
    });
    await this.createChatterComponent({ chatter });
    assert.containsNone(
        document.body,
        '.o-Message',
        "should not have any message initially in chatter"
    );

    await afterNextRender(() =>
        document.querySelector('.o-ChatterTopbar-buttonSendMessage').click()
    );
    await afterNextRender(() => {
        document.querySelector('.o-ComposerTextInput-textarea').focus();
        document.execCommand('insertText', false, "Test");
    });
    const kevt = new window.KeyboardEvent('keydown', { key: "Enter" });
    document.querySelector('.o-ComposerTextInput-textarea').dispatchEvent(kevt);
    await nextAnimationFrame();
    assert.containsNone(
        document.body,
        '.o-Message',
        "should still not have any message in mailing channel after pressing 'Enter' in text input of composer"
    );
});

});
});
});

});
