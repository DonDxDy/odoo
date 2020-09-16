odoo.define('snailmail/static/src/components/message/message_tests.js', function (require) {
'use strict';

const Message = require('mail/static/src/components/message/message.js');
const {
    'Field/create': create,
    'Field/insert': insert,
    'Field/link': link,
} = require('mail/static/src/model/utils.js');
const {
    afterEach,
    afterNextRender,
    beforeEach,
    createRootComponent,
    start,
} = require('mail/static/src/utils/test-utils.js');

const Bus = require('web.Bus');

QUnit.module('snailmail', {}, function () {
QUnit.module('components', {}, function () {
QUnit.module('message', {}, function () {
QUnit.module('message_tests.js', {
    beforeEach() {
        beforeEach(this);

        this.createMessageComponent = async (message, otherProps) => {
            const props = {
                message,
                ...otherProps,
            };
            await createRootComponent(this, Message, {
                props,
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

QUnit.test('Sent', async function (assert) {
    assert.expect(8);

    const env = await this.start();
    const threadViewer = env.invoke('ThreadViewer/create', {
        $$$hasThreadView: true,
        $$$thread: create({
            $$$id: 11,
            $$$model: 'mail.channel',
        }),
    });
    const message = env.invoke('Message/create', {
        $$$id: 10,
        $$$notifications: insert({
            $$$id: 11,
            $$$status: 'sent',
            $$$type: 'snail',
        }),
        $$$originThread: link(
            threadViewer.$$$thread()
        ),
        $$$type: 'snailmail',
    });
    await this.createMessageComponent(message, {
        threadView: threadViewer.$$$threadView()
    });
    assert.containsOnce(
        document.body,
        '.o-Message',
        "should display a message component"
    );
    assert.containsOnce(
        document.body,
        '.o-Message-notificationIconClickable',
        "should display the notification icon container"
    );
    assert.containsOnce(
        document.body,
        '.o-Message-notificationIcon',
        "should display the notification icon"
    );
    assert.hasClass(
        document.querySelector('.o-Message-notificationIcon'),
        'fa-paper-plane',
        "icon should represent snailmail"
    );

    await afterNextRender(() =>
        document.querySelector('.o-Message-notificationIconClickable').click()
    );
    assert.containsOnce(
        document.body,
        '.o-SnailmailNotificationPopover',
        "notification popover should be open"
    );
    assert.containsOnce(
        document.body,
        '.o-SnailmailNotificationPopover-icon',
        "popover should have one icon"
    );
    assert.hasClass(
        document.querySelector('.o-SnailmailNotificationPopover-icon'),
        'fa-check',
        "popover should have the sent icon"
    );
    assert.strictEqual(
        document.querySelector('.o-SnailmailNotificationPopover').textContent.trim(),
        "Sent",
        "popover should have the sent text"
    );
});

QUnit.test('Canceled', async function (assert) {
    assert.expect(8);

    const env = await this.start();
    const threadViewer = env.invoke('ThreadViewer/create', {
        $$$hasThreadView: true,
        $$$thread: create({
            $$$id: 11,
            $$$model: 'mail.channel',
        }),
    });
    const message = env.invoke('Message/create', {
        $$$id: 10,
        $$$notifications: insert({
            $$$id: 11,
            $$$status: 'canceled',
            $$$type: 'snail',
        }),
        $$$originThread: link(
            threadViewer.$$$thread()
        ),
        $$$type: 'snailmail',
    });
    await this.createMessageComponent(message, {
        threadView: threadViewer.$$$threadView()
    });
    assert.containsOnce(
        document.body,
        '.o-Message',
        "should display a message component"
    );
    assert.containsOnce(
        document.body,
        '.o-Message-notificationIconClickable',
        "should display the notification icon container"
    );
    assert.containsOnce(
        document.body,
        '.o-Message-notificationIcon',
        "should display the notification icon"
    );
    assert.hasClass(
        document.querySelector('.o-Message-notificationIcon'),
        'fa-paper-plane',
        "icon should represent snailmail"
    );

    await afterNextRender(() =>
        document.querySelector('.o-Message-notificationIconClickable').click()
    );
    assert.containsOnce(
        document.body,
        '.o-SnailmailNotificationPopover',
        "notification popover should be open"
    );
    assert.containsOnce(
        document.body,
        '.o-SnailmailNotificationPopover-icon',
        "popover should have one icon"
    );
    assert.hasClass(
        document.querySelector('.o-SnailmailNotificationPopover-icon'),
        'fa-trash-o',
        "popover should have the canceled icon"
    );
    assert.strictEqual(
        document.querySelector('.o-SnailmailNotificationPopover').textContent.trim(),
        "Canceled",
        "popover should have the canceled text"
    );
});

QUnit.test('Pending', async function (assert) {
    assert.expect(8);

    const env = await this.start();
    const threadViewer = env.invoke('ThreadViewer/create', {
        $$$hasThreadView: true,
        $$$thread: create({
            $$$id: 11,
            $$$model: 'mail.channel',
        }),
    });
    const message = env.invoke('Message/create', {
        $$$id: 10,
        $$$notifications: insert({
            $$$id: 11,
            $$$status: 'ready',
            $$$type: 'snail',
        }),
        $$$originThread: link(
            threadViewer.$$$thread()
        ),
        $$$type: 'snailmail',
    });
    await this.createMessageComponent(message, {
        threadView: threadViewer.$$$threadView()
    });
    assert.containsOnce(
        document.body,
        '.o-Message',
        "should display a message component"
    );
    assert.containsOnce(
        document.body,
        '.o-Message-notificationIconClickable',
        "should display the notification icon container"
    );
    assert.containsOnce(
        document.body,
        '.o-Message-notificationIcon',
        "should display the notification icon"
    );
    assert.hasClass(
        document.querySelector('.o-Message-notificationIcon'),
        'fa-paper-plane',
        "icon should represent snailmail"
    );

    await afterNextRender(() =>
        document.querySelector('.o-Message-notificationIconClickable').click()
    );
    assert.containsOnce(
        document.body,
        '.o-SnailmailNotificationPopover',
        "notification popover should be open"
    );
    assert.containsOnce(
        document.body,
        '.o-SnailmailNotificationPopover-icon',
        "popover should have one icon"
    );
    assert.hasClass(
        document.querySelector('.o-SnailmailNotificationPopover-icon'),
        'fa-clock-o',
        "popover should have the pending icon"
    );
    assert.strictEqual(
        document.querySelector('.o-SnailmailNotificationPopover').textContent.trim(),
        "Awaiting Dispatch",
        "popover should have the pending text"
    );
});

QUnit.test('No Price Available', async function (assert) {
    assert.expect(10);

    const env = await this.start({
        async mockRPC(route, args) {
            if (
                args.method === 'cancel_letter' &&
                args.model === 'mail.message' &&
                args.args[0][0] === 10
            ) {
                assert.step(args.method);
            }
            return this._super(...arguments);
        },
    });
    const threadViewer = env.invoke('ThreadViewer/create', {
        $$$hasThreadView: true,
        $$$thread: create({
            $$$id: 11,
            $$$model: 'mail.channel',
        }),
    });
    const message = env.invoke('Message/create', {
        $$$id: 10,
        $$$notifications: insert({
            $$$failureType: 'sn_price',
            $$$id: 11,
            $$$status: 'exception',
            $$$type: 'snail',
        }),
        $$$originThread: link(
            threadViewer.$$$thread()
        ),
        $$$type: 'snailmail',
    });
    await this.createMessageComponent(message, {
        threadView: threadViewer.$$$threadView()
    });
    assert.containsOnce(
        document.body,
        '.o-Message',
        "should display a message component"
    );
    assert.containsOnce(
        document.body,
        '.o-Message-notificationIconClickable',
        "should display the notification icon container"
    );
    assert.containsOnce(
        document.body,
        '.o-Message-notificationIcon',
        "should display the notification icon"
    );
    assert.hasClass(
        document.querySelector('.o-Message-notificationIcon'),
        'fa-paper-plane',
        "icon should represent snailmail"
    );

    await afterNextRender(() =>
        document.querySelector('.o-Message-notificationIconClickable').click()
    );
    assert.containsOnce(
        document.body,
        '.o-SnailmailErrorDialog',
        "error dialog should be open"
    );
    assert.containsOnce(
        document.body,
        '.o-SnailmailErrorDialog-contentPrice',
        "error dialog should have the 'no price' content"
    );
    assert.containsOnce(
        document.body,
        '.o-SnailmailErrorDialog-cancelLetterButton',
        "dialog should have a 'Cancel letter' button"
    );

    await afterNextRender(() =>
        document.querySelector('.o-SnailmailErrorDialog-cancelLetterButton').click()
    );
    assert.containsNone(
        document.body,
        '.o-SnailmailErrorDialog',
        "dialog should be closed after click on 'Cancel letter'"
    );
    assert.verifySteps(
        ['cancel_letter'],
        "should have made a RPC call to 'cancel_letter'"
    );
});

QUnit.test('Credit Error', async function (assert) {
    assert.expect(11);

    const env = await this.start({
        async mockRPC(route, args) {
            if (
                args.method === 'send_letter' &&
                args.model === 'mail.message' &&
                args.args[0][0] === 10
            ) {
                assert.step(args.method);
            }
            return this._super(...arguments);
        },
    });
    const threadViewer = env.invoke('ThreadViewer/create', {
        $$$hasThreadView: true,
        $$$thread: create({
            $$$id: 11,
            $$$model: 'mail.channel',
        }),
    });
    const message = env.invoke('Message/create', {
        $$$id: 10,
        $$$notifications: insert({
            $$$failureType: 'sn_credit',
            $$$id: 11,
            $$$status: 'exception',
            $$$type: 'snail',
        }),
        $$$originThread: link(
            threadViewer.$$$thread()
        ),
        $$$type: 'snailmail',
    });
    await this.createMessageComponent(message, {
        threadView: threadViewer.$$$threadView()
    });
    assert.containsOnce(
        document.body,
        '.o-Message',
        "should display a message component"
    );
    assert.containsOnce(
        document.body,
        '.o-Message-notificationIconClickable',
        "should display the notification icon container"
    );
    assert.containsOnce(
        document.body,
        '.o-Message-notificationIcon',
        "should display the notification icon"
    );
    assert.hasClass(
        document.querySelector('.o-Message-notificationIcon'),
        'fa-paper-plane',
        "icon should represent snailmail"
    );

    await afterNextRender(() =>
        document.querySelector('.o-Message-notificationIconClickable').click()
    );
    assert.containsOnce(
        document.body,
        '.o-SnailmailErrorDialog',
        "error dialog should be open"
    );
    assert.containsOnce(
        document.body,
        '.o-SnailmailErrorDialog-contentCredit',
        "error dialog should have the 'credit' content"
    );
    assert.containsOnce(
        document.body,
        '.o-SnailmailErrorDialog-resendLetterButton',
        "dialog should have a 'Re-send letter' button"
    );
    assert.containsOnce(
        document.body,
        '.o-SnailmailErrorDialog-cancelLetterButton',
        "dialog should have a 'Cancel letter' button"
    );

    await afterNextRender(() =>
        document.querySelector('.o-SnailmailErrorDialog-resendLetterButton').click()
    );
    assert.containsNone(
        document.body,
        '.o-SnailmailErrorDialog',
        "dialog should be closed after click on 'Re-send letter'"
    );
    assert.verifySteps(
        ['send_letter'],
        "should have made a RPC call to 'send_letter'"
    );
});

QUnit.test('Trial Error', async function (assert) {
    assert.expect(11);

    const env = await this.start({
        async mockRPC(route, args) {
            if (
                args.method === 'send_letter' &&
                args.model === 'mail.message' &&
                args.args[0][0] === 10
            ) {
                assert.step(args.method);
            }
            return this._super(...arguments);
        },
    });
    const threadViewer = env.invoke('ThreadViewer/create', {
        $$$hasThreadView: true,
        $$$thread: create({
            $$$id: 11,
            $$$model: 'mail.channel',
        }),
    });
    const message = env.invoke('Message/create', {
        $$$id: 10,
        $$$notifications: insert({
            $$$failureType: 'sn_trial',
            $$$id: 11,
            $$$status: 'exception',
            $$$type: 'snail',
        }),
        $$$originThread: link(
            threadViewer.$$$thread()
        ),
        $$$type: 'snailmail',
    });
    await this.createMessageComponent(message, {
        threadView: threadViewer.$$$threadView()
    });
    assert.containsOnce(
        document.body,
        '.o-Message',
        "should display a message component"
    );
    assert.containsOnce(
        document.body,
        '.o-Message-notificationIconClickable',
        "should display the notification icon container"
    );
    assert.containsOnce(
        document.body,
        '.o-Message-notificationIcon',
        "should display the notification icon"
    );
    assert.hasClass(
        document.querySelector('.o-Message-notificationIcon'),
        'fa-paper-plane',
        "icon should represent snailmail"
    );

    await afterNextRender(() =>
        document.querySelector('.o-Message-notificationIconClickable').click()
    );
    assert.containsOnce(
        document.body,
        '.o-SnailmailErrorDialog',
        "error dialog should be open"
    );
    assert.containsOnce(
        document.body,
        '.o-SnailmailErrorDialog-contentTrial',
        "error dialog should have the 'trial' content"
    );
    assert.containsOnce(
        document.body,
        '.o-SnailmailErrorDialog-resendLetterButton',
        "dialog should have a 'Re-send letter' button"
    );
    assert.containsOnce(
        document.body,
        '.o-SnailmailErrorDialog-cancelLetterButton',
        "dialog should have a 'Cancel letter' button"
    );

    await afterNextRender(() =>
        document.querySelector('.o-SnailmailErrorDialog-resendLetterButton').click()
    );
    assert.containsNone(
        document.body,
        '.o-SnailmailErrorDialog',
        "dialog should be closed after click on 'Re-send letter'"
    );
    assert.verifySteps(
        ['send_letter'],
        "should have made a RPC call to 'send_letter'"
    );
});

QUnit.test('Format Error', async function (assert) {
    assert.expect(8);

    const bus = new Bus();
    bus.on('do-action', null, payload => {
        assert.step('do_action');
        assert.strictEqual(
            payload.action,
            'snailmail.snailmail_letter_format_error_action',
            "action should be the one for format error"
        );
        assert.strictEqual(
            payload.options.additional_context.message_id,
            10,
            "action should have correct message id"
        );
    });
    const env = await this.start({
        env: { bus },
    });
    const threadViewer = env.invoke('ThreadViewer/create', {
        $$$hasThreadView: true,
        $$$thread: create({
            $$$id: 11,
            $$$model: 'mail.channel',
        }),
    });
    const message = env.invoke('Message/create', {
        $$$id: 10,
        $$$notifications: insert({
            $$$failureType: 'sn_format',
            $$$id: 11,
            $$$status: 'exception',
            $$$type: 'snail',
        }),
        $$$originThread: link(
            threadViewer.$$$thread()
        ),
        $$$type: 'snailmail',
    });
    await this.createMessageComponent(message, {
        threadView: threadViewer.$$$threadView()
    });
    assert.containsOnce(
        document.body,
        '.o-Message',
        "should display a message component"
    );
    assert.containsOnce(
        document.body,
        '.o-Message_notificationIconClickable',
        "should display the notification icon container"
    );
    assert.containsOnce(
        document.body,
        '.o-Message_notificationIcon',
        "should display the notification icon"
    );
    assert.hasClass(
        document.querySelector('.o-Message-notificationIcon'),
        'fa-paper-plane',
        "icon should represent snailmail"
    );

    await afterNextRender(() =>
        document.querySelector('.o-Message-notificationIconClickable').click()
    );
    assert.verifySteps(
        ['do_action'],
        "should do an action to display the format error dialog"
    );
});

QUnit.test('Missing Required Fields', async function (assert) {
    assert.expect(8);

    this.data['mail.message'].records.push(
        {
            id: 10, // random unique id, useful to link letter and notification
            message_type: 'snailmail',
            res_id: 20, // non 0 id, necessary to fetch failure at init
            model: 'res.partner', // not mail.compose.message, necessary to fetch failure at init
        }
    );
    this.data['mail.notification'].records.push(
        {
            failure_type: 'sn_fields',
            mail_message_id: 10,
            notification_status: 'exception',
            notification_type: 'snail',
        }
    );
    this.data['snailmail.letter'].records.push(
        {
            id: 22, // random unique id, will be asserted in the test
            message_id: 10, // id of related message
        }
    );
    const bus = new Bus();
    bus.on('do-action', null, payload => {
        assert.step('do_action');
        assert.strictEqual(
            payload.action,
            'snailmail.snailmail_letter_missing_required_fields_action',
            "action should be the one for missing fields"
        );
        assert.strictEqual(
            payload.options.additional_context.default_letter_id,
            22,
            "action should have correct letter id"
        );
    });
    const env = await this.start({
        env: { bus },
    });
    const threadViewer = env.invoke('ThreadViewer/create', {
        $$$hasThreadView: true,
        $$$thread: insert({
            $$$id: 20,
            $$$model: 'res.partner',
        }),
    });
    const message = env.invoke('Message/findFromId', { $$$id: 10 });
    await this.createMessageComponent(message, {
        threadView: threadViewer.$$$threadView(),
    });
    assert.containsOnce(
        document.body,
        '.o-Message',
        "should display a message component"
    );
    assert.containsOnce(
        document.body,
        '.o-Message-notificationIconClickable',
        "should display the notification icon container"
    );
    assert.containsOnce(
        document.body,
        '.o-Message-notificationIcon',
        "should display the notification icon"
    );
    assert.hasClass(
        document.querySelector('.o-Message-notificationIcon'),
        'fa-paper-plane',
        "icon should represent snailmail"
    );

    await afterNextRender(() =>
        document.querySelector('.o-Message-notificationIconClickable').click()
    );
    assert.verifySteps(
        ['do_action'],
        "an action should be done to display the missing fields dialog"
    );
});

});
});
});

});
