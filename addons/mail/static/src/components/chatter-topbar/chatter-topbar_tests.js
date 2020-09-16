odoo.define('mail/static/src/components/chatter-topbar/chatter-topbar_tests.js', function (require) {
'use strict';

const ChatterTopBar = require('mail/static/src/components/chatter-topbar/chatter-topbar.js');
const {
    afterEach,
    afterNextRender,
    beforeEach,
    createRootComponent,
    start,
} = require('mail/static/src/utils/test-utils.js');

const { makeTestPromise } = require('web.test_utils');

QUnit.module('mail', {}, function () {
QUnit.module('components', {}, function () {
QUnit.module('chatter-topbar', {}, function () {
QUnit.module('chatter-topbar_tests.js', {
    beforeEach() {
        beforeEach(this);

        this.createChatterTopbarComponent = async (chatter, otherProps) => {
            await createRootComponent(this, ChatterTopBar, {
                props: {
                    chatter,
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

QUnit.test('base rendering', async function (assert) {
    assert.expect(8);

    this.data['res.partner'].records.push(
        { id: 100 }
    );
    const env = await this.start();
    const chatter = env.invoke('Chatter/create', {
        $$$threadId: 100,
        $$$threadModel: 'res.partner',
    });
    await this.createChatterTopbarComponent(chatter);
    assert.containsOnce(
        document.body,
        '.o-ChatterTopbar',
        "should have a chatter topbar"
    );
    assert.containsOnce(
        document.body,
        '.o-ChatterTopbar-buttonSendMessage',
        "should have a send message button in chatter menu"
    );
    assert.containsOnce(
        document.body,
        '.o-ChatterTopbar-buttonLogNote',
        "should have a log note button in chatter menu"
    );
    assert.containsOnce(
        document.body,
        '.o-ChatterTopbar-buttonScheduleActivity',
        "should have a schedule activity button in chatter menu"
    );
    assert.containsOnce(
        document.body,
        '.o-ChatterTopbar-buttonAttachments',
        "should have an attachments button in chatter menu"
    );
    assert.containsNone(
        document.body,
        '.o-ChatterTopbar-buttonAttachmentsCountLoader',
        "attachments button should not have a loader"
    );
    assert.containsOnce(
        document.body,
        '.o-ChatterTopbar-buttonAttachmentsCount',
        "attachments button should have a counter"
    );
    assert.containsOnce(
        document.body,
        '.o-ChatterTopbar-followerListMenu',
        "should have a follower menu"
    );
});

QUnit.test('base disabled rendering', async function (assert) {
    assert.expect(8);

    const env = await this.start();
    const chatter = env.invoke('Chatter/create', {
        $$$threadModel: 'res.partner',
    });
    await this.createChatterTopbarComponent(chatter);
    assert.containsOnce(
        document.body,
        '.o-ChatterTopbar',
        "should have a chatter topbar"
    );
    assert.ok(
        document.querySelector('.o-ChatterTopbar-buttonSendMessage').disabled,
        "send message button should be disabled"
    );
    assert.ok(
        document.querySelector('.o-ChatterTopbar-buttonLogNote').disabled,
        "log note button should be disabled"
    );
    assert.ok(
        document.querySelector('.o-ChatterTopbar-buttonScheduleActivity').disabled,
        "schedule activity should be disabled"
    );
    assert.ok(
        document.querySelector('.o-ChatterTopbar-buttonAttachments').disabled,
        "attachments button should be disabled"
    );
    assert.containsNone(
        document.body,
        '.o-ChatterTopbar-buttonAttachmentsCountLoader',
        "attachments button should not have a loader"
    );
    assert.containsOnce(
        document.body,
        '.o-ChatterTopbar-buttonAttachmentsCount',
        "attachments button should have a counter"
    );
    assert.strictEqual(
        document.querySelector('.o-ChatterTopbar-buttonAttachmentsCount').textContent,
        '0',
        "attachments button counter should be 0"
    );
});

QUnit.test('attachment loading is delayed', async function (assert) {
    assert.expect(4);

    this.data['res.partner'].records.push(
        { id: 100 }
    );
    const env = await this.start({
        hasTimeControl: true,
        loadingBaseDelayDuration: 100,
        async mockRPC(route) {
            if (route.includes('ir.attachment/search_read')) {
                await makeTestPromise(); // simulate long loading
            }
            return this._super(...arguments);
        }
    });
    const chatter = env.invoke('Chatter/create', {
        $$$threadId: 100,
        $$$threadModel: 'res.partner',
    });
    await this.createChatterTopbarComponent(chatter);
    assert.containsOnce(
        document.body,
        '.o-ChatterTopbar',
        "should have a chatter topbar"
    );
    assert.containsOnce(
        document.body,
        '.o-ChatterTopbar-buttonAttachments',
        "should have an attachments button in chatter menu"
    );
    assert.containsNone(
        document.body,
        '.o-ChatterTopbar-buttonAttachmentsCountLoader',
        "attachments button should not have a loader yet"
    );

    await afterNextRender(async () => env.testUtils.advanceTime(100));
    assert.containsOnce(
        document.body,
        '.o-ChatterTopbar-buttonAttachmentsCountLoader',
        "attachments button should now have a loader"
    );
});

QUnit.test('attachment counter while loading attachments', async function (assert) {
    assert.expect(4);

    this.data['res.partner'].records.push(
        { id: 100 }
    );
    const env = await this.start({
        async mockRPC(route) {
            if (route.includes('ir.attachment/search_read')) {
                await makeTestPromise(); // simulate long loading
            }
            return this._super(...arguments);
        }
    });
    const chatter = env.invoke('Chatter/create', {
        $$$threadId: 100,
        $$$threadModel: 'res.partner',
    });
    await this.createChatterTopbarComponent(chatter);
    assert.containsOnce(
        document.body,
        '.o-ChatterTopbar',
        "should have a chatter topbar"
    );
    assert.containsOnce(
        document.body,
        '.o-ChatterTopbar-buttonAttachments',
        "should have an attachments button in chatter menu"
    );
    assert.containsOnce(
        document.body,
        '.o-ChatterTopbar-buttonAttachmentsCountLoader',
        "attachments button should have a loader"
    );
    assert.containsNone(
        document.body,
        '.o-ChatterTopbar-buttonAttachmentsCount',
        "attachments button should not have a counter"
    );
});

QUnit.test('attachment counter transition when attachments become loaded)', async function (assert) {
    assert.expect(7);

    this.data['res.partner'].records.push(
        { id: 100 }
    );
    const attachmentPromise = makeTestPromise();
    const env = await this.start({
        async mockRPC(route) {
            const _super = this._super.bind(this, ...arguments); // limitation of class.js
            if (route.includes('ir.attachment/search_read')) {
                await attachmentPromise;
            }
            return _super();
        },
    });
    const chatter = env.invoke('Chatter/create', {
        $$$threadId: 100,
        $$$threadModel: 'res.partner',
    });
    await this.createChatterTopbarComponent(chatter);
    assert.containsOnce(
        document.body,
        '.o-ChatterTopbar',
        "should have a chatter topbar"
    );
    assert.containsOnce(
        document.body,
        '.o-ChatterTopbar-buttonAttachments',
        "should have an attachments button in chatter menu"
    );
    assert.containsOnce(
        document.body,
        '.o-ChatterTopbar-buttonAttachmentsCountLoader',
        "attachments button should have a loader"
    );
    assert.containsNone(
        document.body,
        '.o-ChatterTopbar-buttonAttachmentsCount',
        "attachments button should not have a counter"
    );

    await afterNextRender(() => attachmentPromise.resolve());
    assert.containsOnce(
        document.body,
        '.o-ChatterTopbar-buttonAttachments',
        "should have an attachments button in chatter menu"
    );
    assert.containsNone(
        document.body,
        '.o-ChatterTopbar-buttonAttachmentsCountLoader',
        "attachments button should not have a loader"
    );
    assert.containsOnce(
        document.body,
        '.o-ChatterTopbar-buttonAttachmentsCount',
        "attachments button should have a counter"
    );
});

QUnit.test('attachment counter without attachments', async function (assert) {
    assert.expect(4);

    this.data['res.partner'].records.push(
        { id: 100 }
    );
    const env = await this.start();
    const chatter = env.invoke('Chatter/create', {
        $$$threadId: 100,
        $$$threadModel: 'res.partner',
    });
    await this.createChatterTopbarComponent(chatter);
    assert.containsOnce(
        document.body,
        '.o-ChatterTopbar',
        "should have a chatter topbar"
    );
    assert.containsOnce(
        document.body,
        '.o-ChatterTopbar-buttonAttachments',
        "should have an attachments button in chatter menu"
    );
    assert.containsOnce(
        document.body,
        '.o-ChatterTopbar-buttonAttachmentsCount',
        "attachments button should have a counter"
    );
    assert.strictEqual(
        document.querySelector('.o-ChatterTopbar-buttonAttachmentsCount').textContent,
        '0',
        'attachment counter should contain "0"'
    );
});

QUnit.test('attachment counter with attachments', async function (assert) {
    assert.expect(4);

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
    await this.createChatterTopbarComponent(chatter);
    assert.containsOnce(
        document.body,
        '.o-ChatterTopbar',
        "should have a chatter topbar"
    );
    assert.containsOnce(
        document.body,
        '.o-ChatterTopbar-buttonAttachments',
        "should have an attachments button in chatter menu"
    );
    assert.containsOnce(
        document.body,
        '.o-ChatterTopbar-buttonAttachmentsCount',
        "attachments button should have a counter"
    );
    assert.strictEqual(
        document.querySelector('.o-ChatterTopbar-buttonAttachmentsCount').textContent,
        '2',
        'attachment counter should contain "2"'
    );
});

QUnit.test('composer state conserved when clicking on another topbar button', async function (assert) {
    assert.expect(8);

    this.data['res.partner'].records.push(
        { id: 100 }
    );
    const env = await this.start();
    const chatter = env.invoke('Chatter/create', {
        $$$threadId: 100,
        $$$threadModel: 'res.partner',
    });
    await this.createChatterTopbarComponent(chatter);
    assert.containsOnce(
        document.body,
        '.o-ChatterTopbar',
        "should have a chatter topbar"
    );
    assert.containsOnce(
        document.body,
        '.o-ChatterTopbar-buttonSendMessage',
        "should have a send message button in chatter menu"
    );
    assert.containsOnce(
        document.body,
        '.o-ChatterTopbar-buttonLogNote',
        "should have a log note button in chatter menu"
    );
    assert.containsOnce(
        document.body,
        '.o-ChatterTopbar-buttonAttachments',
        "should have an attachments button in chatter menu"
    );

    await afterNextRender(() => {
        document.querySelector('.o-ChatterTopbar-buttonLogNote').click();
    });
    assert.containsOnce(
        document.body,
        '.o-ChatterTopbar-buttonLogNote.o-isActive',
        "log button should now be active"
    );
    assert.containsNone(
        document.body,
        '.o-ChatterTopbar-buttonSendMessage.o-isActive',
        "send message button should not be active"
    );

    await afterNextRender(() => {
        document.querySelector('.o-ChatterTopbar-buttonAttachments').click();
    });
    assert.containsOnce(
        document.body,
        '.o-ChatterTopbar-buttonLogNote.o-isActive',
        "log button should still be active"
    );
    assert.containsNone(
        document.body,
        '.o-ChatterTopbar-buttonSendMessage.o-isActive',
        "send message button should still be not active"
    );
});

QUnit.test('rendering with multiple partner followers', async function (assert) {
    assert.expect(7);

    const env = await this.start();
    this.data['mail.followers'].records.push(
        {
            // simulate real return from RPC
            // (the presence of the key and the falsy value need to be handled correctly)
            channel_id: false,
            id: 1,
            name: "Jean Michang",
            partner_id: 12,
            res_id: 100,
            res_model: 'res.partner',
        }, {
            // simulate real return from RPC
            // (the presence of the key and the falsy value need to be handled correctly)
            channel_id: false,
            id: 2,
            name: "Eden Hazard",
            partner_id: 11,
            res_id: 100,
            res_model: 'res.partner',
        },
    );
    this.data['res.partner'].records.push(
        {
            id: 100,
            message_follower_ids: [1, 2],
        }
    );
    const chatter = env.invoke('Chatter/create', {
        $$$followerIds: [1, 2],
        $$$threadId: 100,
        $$$threadModel: 'res.partner',
    });
    await this.createChatterTopbarComponent(chatter);
    assert.containsOnce(
        document.body,
        '.o-FollowerListMenu',
        "should have followers menu component"
    );
    assert.containsOnce(
        document.body,
        '.o-FollowerListMenu-buttonFollowers',
        "should have followers button"
    );

    await afterNextRender(() => {
        document.querySelector('.o-FollowerListMenu-buttonFollowers').click();
    });
    assert.containsOnce(
        document.body,
        '.o-FollowerListMenu-dropdown',
        "followers dropdown should be opened"
    );
    assert.containsN(
        document.body,
        '.o-Follower',
        2,
        "exactly two followers should be listed"
    );
    assert.containsN(
        document.body,
        '.o-Follower-name',
        2,
        "exactly two follower names should be listed"
    );
    assert.strictEqual(
        document.querySelectorAll('.o-Follower-name')[0].textContent.trim(),
        "Jean Michang",
        "first follower is 'Jean Michang'"
    );
    assert.strictEqual(
        document.querySelectorAll('.o-Follower-name')[1].textContent.trim(),
        "Eden Hazard",
        "second follower is 'Eden Hazard'"
    );
});

QUnit.test('rendering with multiple channel followers', async function (assert) {
    assert.expect(7);

    this.data['mail.followers'].records.push(
        {
            channel_id: 11,
            id: 1,
            name: "channel numero 5",
            // simulate real return from RPC
            // (the presence of the key and the falsy value need to be handled correctly)
            partner_id: false,
            res_id: 100,
            res_model: 'res.partner',
        }, {
            channel_id: 12,
            id: 2,
            name: "channel armstrong",
            // simulate real return from RPC
            // (the presence of the key and the falsy value need to be handled correctly)
            partner_id: false,
            res_id: 100,
            res_model: 'res.partner',
        },
    );
    this.data['res.partner'].records.push(
        {
            id: 100,
            message_follower_ids: [1, 2],
        }
    );
    const env = await this.start();
    const chatter = env.invoke('Chatter/create', {
        $$$followerIds: [1, 2],
        $$$threadId: 100,
        $$$threadModel: 'res.partner',
    });
    await this.createChatterTopbarComponent(chatter);
    assert.containsOnce(
        document.body,
        '.o-FollowerListMenu',
        "should have followers menu component"
    );
    assert.containsOnce(
        document.body,
        '.o-FollowerListMenu-buttonFollowers',
        "should have followers button"
    );

    await afterNextRender(() => {
        document.querySelector('.o-FollowerListMenu-buttonFollowers').click();
    });
    assert.containsOnce(
        document.body,
        '.o-FollowerListMenu-dropdown',
        "followers dropdown should be opened"
    );
    assert.containsN(
        document.body,
        '.o-Follower',
        2,
        "exactly two followers should be listed"
    );
    assert.containsN(
        document.body,
        '.o-Follower-name',
        2,
        "exactly two follower names should be listed"
    );
    assert.strictEqual(
        document.querySelectorAll('.o-Follower-name')[0].textContent.trim(),
        "channel numero 5",
        "first follower is 'channel numero 5'"
    );
    assert.strictEqual(
        document.querySelectorAll('.o-Follower-name')[1].textContent.trim(),
        "channel armstrong",
        "second follower is 'channel armstrong'"
    );
});

QUnit.test('log note/send message switching', async function (assert) {
    assert.expect(8);

    this.data['res.partner'].records.push(
        { id: 100 }
    );
    const env = await this.start();
    const chatter = env.invoke('Chatter/create', {
        $$$threadId: 100,
        $$$threadModel: 'res.partner',
    });
    await this.createChatterTopbarComponent(chatter);
    assert.containsOnce(
        document.body,
        '.o-ChatterTopbar-buttonSendMessage',
        "should have a 'Send Message' button"
    );
    assert.doesNotHaveClass(
        document.querySelector('.o-ChatterTopbar-buttonSendMessage'),
        'o-isActive',
        "'Send Message' button should not be active"
    );
    assert.containsOnce(
        document.body,
        '.o-ChatterTopbar-buttonLogNote',
        "should have a 'Log Note' button"
    );
    assert.doesNotHaveClass(
        document.querySelector('.o-ChatterTopbar-buttonLogNote'),
        'o-isActive',
        "'Log Note' button should not be active"
    );

    await afterNextRender(() =>
        document.querySelector('.o-ChatterTopbar-buttonSendMessage').click()
    );
    assert.hasClass(
        document.querySelector('.o-ChatterTopbar-buttonSendMessage'),
        'o-isActive',
        "'Send Message' button should be active"
    );
    assert.doesNotHaveClass(
        document.querySelector('.o-ChatterTopbar-buttonLogNote'),
        'o-isActive',
        "'Log Note' button should not be active"
    );

    await afterNextRender(() =>
        document.querySelector('.o-ChatterTopbar-buttonLogNote').click()
    );
    assert.doesNotHaveClass(
        document.querySelector('.o-ChatterTopbar-buttonSendMessage'),
        'o-isActive',
        "'Send Message' button should not be active"
    );
    assert.hasClass(
        document.querySelector('.o-ChatterTopbar-buttonLogNote'),
        'o-isActive',
        "'Log Note' button should be active"
    );
});

QUnit.test('log note toggling', async function (assert) {
    assert.expect(4);

    this.data['res.partner'].records.push(
        { id: 100 }
    );
    const env = await this.start();
    const chatter = env.invoke('Chatter/create', {
        $$$threadId: 100,
        $$$threadModel: 'res.partner',
    });
    await this.createChatterTopbarComponent(chatter);
    assert.containsOnce(
        document.body,
        '.o-ChatterTopbar-buttonLogNote',
        "should have a 'Log Note' button"
    );
    assert.doesNotHaveClass(
        document.querySelector('.o-ChatterTopbar-buttonLogNote'),
        'o-isActive',
        "'Log Note' button should not be active"
    );

    await afterNextRender(() =>
        document.querySelector('.o-ChatterTopbar-buttonLogNote').click()
    );
    assert.hasClass(
        document.querySelector('.o-ChatterTopbar-buttonLogNote'),
        'o-isActive',
        "'Log Note' button should be active"
    );

    await afterNextRender(() =>
        document.querySelector('.o-ChatterTopbar-buttonLogNote').click()
    );
    assert.doesNotHaveClass(
        document.querySelector('.o-ChatterTopbar-buttonLogNote'),
        'o-isActive',
        "'Log Note' button should not be active"
    );
});

QUnit.test('send message toggling', async function (assert) {
    assert.expect(4);

    this.data['res.partner'].records.push(
        { id: 100 }
    );
    const env = await this.start();
    const chatter = env.invoke('Chatter/create', {
        $$$threadId: 100,
        $$$threadModel: 'res.partner',
    });
    await this.createChatterTopbarComponent(chatter);
    assert.containsOnce(
        document.body,
        '.o-ChatterTopbar-buttonSendMessage',
        "should have a 'Send Message' button"
    );
    assert.doesNotHaveClass(
        document.querySelector('.o-ChatterTopbar-buttonSendMessage'),
        'o-isActive',
        "'Send Message' button should not be active"
    );

    await afterNextRender(() =>
        document.querySelector('.o-ChatterTopbar-buttonSendMessage').click()
    );
    assert.hasClass(
        document.querySelector('.o-ChatterTopbar-buttonSendMessage'),
        'o-isActive',
        "'Send Message' button should be active"
    );

    await afterNextRender(() =>
        document.querySelector('.o-ChatterTopbar-buttonSendMessage').click()
    );
    assert.doesNotHaveClass(
        document.querySelector('.o-ChatterTopbar-buttonSendMessage'),
        'o-isActive',
        "'Send Message' button should not be active"
    );
});

});
});
});

});
