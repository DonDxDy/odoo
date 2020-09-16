odoo.define('sms/static/src/components/message/message_tests.js', function (require) {
'use strict';

const Message = require('mail/static/src/components/message/message.js');
const { makeDeferred } = require('mail/static/src/utils/deferred/deferred.js');
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

QUnit.module('sms', {}, function () {
QUnit.module('components', {}, function () {
QUnit.module('message', {}, function () {
QUnit.module('message_tests.js', {
    beforeEach() {
        beforeEach(this);

        this.createMessageComponent = async (message, otherProps) => {
            await createRootComponent(this, Message, {
                props: {
                    message,
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

QUnit.test('Notification Sent', async function (assert) {
    assert.expect(9);

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
            $$$partner: insert({
                $$$id: 12,
                $$$name: "Someone",
            }),
            $$$status: 'sent',
            $$$type: 'sms',
        }),
        $$$originThread: link(
            threadViewer.$$$thread()
        ),
        $$$type: 'sms',
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
        'fa-mobile',
        "icon should represent sms"
    );

    await afterNextRender(() =>
        document.querySelector('.o-Message-notificationIconClickable').click()
    );
    assert.containsOnce(
        document.body,
        '.o-NotificationPopover',
        "notification popover should be open"
    );
    assert.containsOnce(
        document.body,
        '.o-NotificationPopover-notificationIcon',
        "popover should have one icon"
    );
    assert.hasClass(
        document.querySelector('.o-NotificationPopover-notificationIcon'),
        'fa-check',
        "popover should have the sent icon"
    );
    assert.containsOnce(
        document.body,
        '.o-NotificationPopover-notificationPartnerName',
        "popover should have the partner name"
    );
    assert.strictEqual(
        document.querySelector('.o-NotificationPopover-notificationPartnerName').textContent.trim(),
        "Someone",
        "partner name should be correct"
    );
});

QUnit.test('Notification Error', async function (assert) {
    assert.expect(8);

    const openResendActionDef = makeDeferred();
    const bus = new Bus();
    bus.on('do-action', null, payload => {
        assert.step('do_action');
        assert.strictEqual(
            payload.action,
            'sms.sms_resend_action',
            "action should be the one to resend sms"
        );
        assert.strictEqual(
            payload.options.additional_context.default_mail_message_id,
            10,
            "action should have correct message id"
        );
        openResendActionDef.resolve();
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
            $$$id: 11,
            $$$status: 'exception',
            $$$type: 'sms',
        }),
        $$$originThread: link(
            threadViewer.$$$thread()
        ),
        $$$type: 'sms',
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
        'fa-mobile',
        "icon should represent sms"
    );

    document.querySelector('.o-Message-notificationIconClickable').click();
    await openResendActionDef;
    assert.verifySteps(
        ['do_action'],
        "should do an action to display the resend sms dialog"
    );
});

});
});
});

});
