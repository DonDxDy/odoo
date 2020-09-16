odoo.define('mail/static/src/components/message/message_tests.js', function (require) {
'use strict';

const Message = require('mail/static/src/components/message/message.js');
const { makeDeferred } = require('mail/static/src/utils/deferred/deferred.js');
const {
    'Field/create': create,
    'Field/insert': insert,
    'Field/insertAndReplace': insertAndReplace,
    'Field/link': link,
} = require('mail/static/src/model/utils.js');
const {
    afterEach,
    afterNextRender,
    beforeEach,
    createRootComponent,
    nextAnimationFrame,
    start,
} = require('mail/static/src/utils/test-utils.js');

const Bus = require('web.Bus');

QUnit.module('mail', {}, function () {
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

QUnit.test('basic rendering', async function (assert) {
    assert.expect(12);

    const env = await this.start();
    const message = env.invoke('Message/create', {
        $$$author: insert({
            $$$displayName: "Demo User",
            $$$id: 7,
        }),
        $$$body: "<p>Test</p>",
        $$$id: 100,
    });
    await this.createMessageComponent(message);
    assert.containsOnce(
        document.body,
        '.o-Message',
        "should display a message component"
    );
    const messageEl = document.querySelector('.o-Message');
    assert.strictEqual(
        messageEl.dataset.messageLocalId,
        env.invoke('Message/findFromId', { $$$id: 100 }).localId,
        "message component should be linked to message store model"
    );
    assert.containsOnce(
        messageEl,
        '.o-Message-sidebar',
        "message should have a sidebar"
    );
    assert.containsOnce(
        messageEl,
        `
            .o-Message-sidebar
            .o-Message-authorAvatar
        `,
        "message should have author avatar in the sidebar"
    );
    assert.strictEqual(
        messageEl.querySelector(':scope .o-Message-authorAvatar').tagName,
        'IMG',
        "message author avatar should be an image"
    );
    assert.strictEqual(
        messageEl.querySelector(':scope .o-Message-authorAvatar').dataset.src,
        '/web/image/res.partner/7/image_128',
        "message author avatar should GET image of the related partner"
    );
    assert.containsOnce(
        messageEl,
        '.o-Message-authorName',
        "message should display author name"
    );
    assert.strictEqual(
        messageEl.querySelector(':scope .o-Message-authorName').textContent,
        "Demo User",
        "message should display correct author name"
    );
    assert.containsOnce(
        messageEl,
        '.o-Message-date',
        "message should display date"
    );
    assert.containsOnce(
        messageEl,
        '.o-Message-commands',
        "message should display list of commands"
    );
    assert.containsOnce(
        messageEl,
        '.o-Message-content',
        "message should display the content"
    );
    assert.strictEqual(
        messageEl.querySelector(':scope .o-Message-content').innerHTML,
        "<p>Test</p>",
        "message should display the correct content"
    );
});

QUnit.test('moderation: as author, moderated channel with pending moderation message', async function (assert) {
    assert.expect(1);

    const env = await this.start();
    const thread = env.invoke('Thread/create', {
        $$$id: 20,
        $$$model: 'mail.channel',
    });
    const message = env.invoke('Message/create', {
        $$$author: insert({
            $$$displayName: "Admin",
            $$$id: 1,
        }),
        $$$body: "<p>Test</p>",
        $$$id: 100,
        $$$moderationStatus: 'pending_moderation',
        $$$originThread: link(thread),
    });
    await this.createMessageComponent(message);
    assert.containsOnce(
        document.body,
        '.o-Message-moderationPending.o-author',
        "should have the message pending moderation"
    );
});

QUnit.test('moderation: as moderator, moderated channel with pending moderation message', async function (assert) {
    assert.expect(9);

    const env = await this.start();
    const thread = env.invoke('Thread/create', {
        $$$id: 20,
        $$$model: 'mail.channel',
        $$$moderators: link(
            env.messaging.$$$currentPartner()
        ),
    });
    const message = env.invoke('Message/create', {
        $$$author: insert({
            $$$displayName: "Demo User",
            $$$id: 7,
        }),
        $$$body: "<p>Test</p>",
        $$$id: 100,
        $$$moderationStatus: 'pending_moderation',
        $$$originThread: link(thread),
    });
    await this.createMessageComponent(message);
    const messageEl = document.querySelector('.o-Message');
    assert.ok(
        messageEl,
        "should display a message"
    );
    assert.containsOnce(
        messageEl,
        '.o-Message-moderationSubHeader',
        "should have the message pending moderation"
    );
    assert.containsNone(
        messageEl,
        '.o-Message-checkbox',
        "should not have the moderation checkbox by default"
    );
    assert.containsN(
        messageEl,
        '.o-Message-moderationAction',
        5,
        "there should be 5 contextual moderation decisions next to the message"
    );
    assert.containsOnce(
        messageEl,
        '.o-Message-moderationAction.o-accept',
        "there should be a contextual moderation decision to accept the message"
    );
    assert.containsOnce(
        messageEl,
        '.o-Message-moderationAction.o-reject',
        "there should be a contextual moderation decision to reject the message"
    );
    assert.containsOnce(
        messageEl,
        '.o-Message-moderationAction.o-discard',
        "there should be a contextual moderation decision to discard the message"
    );
    assert.containsOnce(
        messageEl,
        '.o-Message-moderationAction.o-allow',
        "there should be a contextual moderation decision to allow the user of the message)"
    );
    assert.containsOnce(
        messageEl,
        '.o-Message-moderationAction.o-ban',
        "there should be a contextual moderation decision to ban the user of the message"
    );
    // The actions are tested as part of discuss tests.
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
            $$$type: 'email',
        }),
        $$$originThread: link(
            threadViewer.$$$thread()
        ),
        $$$type: 'email',
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
        'fa-envelope-o',
        "icon should represent email success"
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
            'mail.mail_resend_message_action',
            "action should be the one to resend email"
        );
        assert.strictEqual(
            payload.options.additional_context.mail_message_to_resend,
            10,
            "action should have correct message id"
        );
        openResendActionDef.resolve();
    });
    const env = await this.start(
        { env: { bus },
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
            $$$type: 'email',
        }),
        $$$originThread: link(
            threadViewer.$$$thread()
        ),
        $$$type: 'email',
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
        'fa-envelope',
        "icon should represent email error"
    );

    document.querySelector('.o-Message-notificationIconClickable').click();
    await openResendActionDef;
    assert.verifySteps(
        ['do_action'],
        "should do an action to display the resend email dialog"
    );
});

QUnit.test("'channel_fetch' notification received is correctly handled", async function (assert) {
    assert.expect(3);

    const env = await this.start();
    const currentPartner = env.invoke('Partner/insert', {
        $$$displayName: "Demo User",
        $$$id: env.messaging.$$$currentPartner().$$$id(),
    });
    const thread = env.invoke('Thread/create', {
        $$$channelType: 'chat',
        $$$id: 11,
        $$$members: [
            link(currentPartner),
            insert({
                $$$displayName: "Recipient",
                $$$id: 11,
            }),
        ],
        $$$model: 'mail.channel',
    });
    const threadViewer = env.invoke('ThreadViewer/create', {
        $$$hasThreadView: true,
        $$$thread: link(thread),
    });
    const message = env.invoke('Message/create', {
        $$$author: link(currentPartner),
        $$$body: "<p>Test</p>",
        $$$id: 100,
        $$$originThread: link(thread),
    });
    await this.createMessageComponent(message, {
        threadView: threadViewer.$$$threadView(),
    });
    assert.containsOnce(
        document.body,
        '.o-Message',
        "should display a message component"
    );
    assert.containsNone(
        document.body,
        '.o-MessageSeenIndicator-icon',
        "message component should not have any check (V) as message is not yet received"
    );

    // Simulate received channel fetched notification
    const notifications = [
        [
            ['myDB', 'mail.channel', 11],
            {
                info: 'channel_fetched',
                last_message_id: 100,
                partner_id: 11,
            }
        ],
    ];
    await afterNextRender(() =>
        this.widget.call('bus_service', 'trigger', 'notification', notifications)
    );
    assert.containsOnce(
        document.body,
        '.o-MessageSeenIndicator-icon',
        "message seen indicator component should only contain one check (V) as message is just received"
    );
});

QUnit.test("'channel_seen' notification received is correctly handled", async function (assert) {
    assert.expect(3);

    const env = await this.start();
    const currentPartner = env.invoke('Partner/insert', {
        $$$displayName: "Demo User",
        $$$id: env.messaging.$$$currentPartner().$$$id(),
    });
    const thread = env.invoke('Thread/create', {
        $$$channelType: 'chat',
        $$$id: 11,
        $$$members: [
            link(currentPartner),
            insert({
                $$$displayName: "Recipient",
                $$$id: 11,
            }),
        ],
        $$$model: 'mail.channel',
    });
    const threadViewer = env.invoke('ThreadViewer/create', {
        $$$hasThreadView: true,
        $$$thread: link(thread),
    });
    const message = env.invoke('Message/create', {
        $$$author: link(currentPartner),
        $$$body: "<p>Test</p>",
        $$$id: 100,
        $$$originThread: link(thread),
    });
    await this.createMessageComponent(message, {
        threadView: threadViewer.$$$threadView(),
    });
    assert.containsOnce(
        document.body,
        '.o-Message',
        "should display a message component"
    );
    assert.containsNone(
        document.body,
        '.o-MessageSeenIndicator-icon',
        "message component should not have any check (V) as message is not yet received"
    );

    // Simulate received channel seen notification
    const notifications = [
        [
            ['myDB', 'mail.channel', 11],
            {
                info: 'channel_seen',
                last_message_id: 100,
                partner_id: 11,
            }
        ],
    ];
    await afterNextRender(() =>
        this.widget.call('bus_service', 'trigger', 'notification', notifications)
    );
    assert.containsN(
        document.body,
        '.o-MessageSeenIndicator-icon',
        2,
        "message seen indicator component should contain two checks (V) as message is seen"
    );
});

QUnit.test("'channel_fetch' notification then 'channel_seen' received  are correctly handled", async function (assert) {
    assert.expect(4);

    const env = await this.start();
    const currentPartner = env.invoke('Partner/insert', {
        $$$displayName: "Demo User",
        $$$id: env.messaging.$$$currentPartner().$$$id(),
    });
    const thread = env.invoke('Thread/create', {
        $$$channelType: 'chat',
        $$$id: 11,
        $$$members: [
            link(currentPartner),
            insert({
                $$$displayName: "Recipient",
                $$$id: 11,
            }),
        ],
        $$$model: 'mail.channel',
    });
    const threadViewer = env.invoke('ThreadViewer/create', {
        $$$hasThreadView: true,
        $$$thread: link(thread),
    });
    const message = env.invoke('Message/create', {
        $$$author: link(currentPartner),
        $$$body: "<p>Test</p>",
        $$$id: 100,
        $$$originThread: link(thread),
    });
    await this.createMessageComponent(message, {
        threadView: threadViewer.$$$threadView(),
    });
    assert.containsOnce(
        document.body,
        '.o-Message',
        "should display a message component"
    );
    assert.containsNone(
        document.body,
        '.o-MessageSeenIndicator-icon',
        "message component should not have any check (V) as message is not yet received"
    );

    // Simulate received channel fetched notification
    let notifications = [
        [
            ['myDB', 'mail.channel', 11],
            {
                info: 'channel_fetched',
                last_message_id: 100,
                partner_id: 11,
            }
        ],
    ];
    await afterNextRender(() =>
        this.widget.call('bus_service', 'trigger', 'notification', notifications)
    );
    assert.containsOnce(
        document.body,
        '.o-MessageSeenIndicator-icon',
        "message seen indicator component should only contain one check (V) as message is just received"
    );

    // Simulate received channel seen notification
    notifications = [
        [
            ['myDB', 'mail.channel', 11],
            {
                info: 'channel_seen',
                last_message_id: 100,
                partner_id: 11,
            }
        ],
    ];
    await afterNextRender(() =>
        this.widget.call('bus_service', 'trigger', 'notification', notifications)
    );
    assert.containsN(
        document.body,
        '.o-MessageSeenIndicator-icon',
        2,
        "message seen indicator component should contain two checks (V) as message is now seen"
    );
});

QUnit.test('do not show messaging seen indicator if not authored by me', async function (assert) {
    assert.expect(2);

    const env = await this.start();
    const author = env.invoke('Partner/create', {
        $$$displayName: "Demo User",
        $$$id: 100,
    });
    const thread = env.invoke('Thread/create', {
        $$$channelType: 'chat',
        $$$id: 11,
        $$$partnerSeenInfos: create([
            {
                $$$channelId: 11,
                $$$lastFetchedMessage: insert({
                    $$$id: 100,
                }),
                $$$partnerId: env.messaging.$$$currentPartner().$$$id(),
            },
            {
                $$$channelId: 11,
                $$$lastFetchedMessage: insert({
                    $$$id: 100,
                }),
                $$$partnerId: author.$$$id(),
            },
        ]),
        $$$model: 'mail.channel',
    });
    const threadViewer = env.invoke('ThreadViewer/create', {
        $$$hasThreadView: true,
        $$$thread: link(thread),
    });
    const message = env.invoke('Message/insert', {
        $$$author: link(author),
        $$$body: "<p>Test</p>",
        $$$id: 100,
        $$$originThread: link(thread),
    });
    await this.createMessageComponent(message, {
        threadView: threadViewer.$$$threadView(),
    });
    assert.containsOnce(
        document.body,
        '.o-Message',
        "should display a message component"
    );
    assert.containsNone(
        document.body,
        '.o-Message-seenIndicator',
        "message component should not have any message seen indicator"
    );
});

QUnit.test('do not show messaging seen indicator if before last seen by all message', async function (assert) {
    assert.expect(3);

    const env = await this.start();
    const currentPartner = env.invoke('Partner/insert', {
        $$$displayName: "Demo User",
        $$$id: env.messaging.$$$currentPartner().$$$id(),
    });
    const thread = env.invoke('Thread/create', {
        $$$channelType: 'chat',
        $$$id: 11,
        $$$messageSeenIndicators: insert({
            $$$channelId: 11,
            $$$messageId: 99,
        }),
        $$$model: 'mail.channel',
    });
    const threadViewer = env.invoke('ThreadViewer/create', {
        $$$hasThreadView: true,
        $$$thread: link(thread),
    });
    const lastSeenMessage = env.invoke('Message/create', {
        $$$author: link(currentPartner),
        $$$body: "<p>You already saw me</p>",
        $$$id: 100,
        $$$originThread: link(thread),
    });
    const message = env.invoke('Message/insert', {
        $$$author: link(currentPartner),
        $$$body: "<p>Test</p>",
        $$$id: 99,
        $$$originThread: link(thread),
    });
    env.invoke('ThreadPartnerSeenInfo/insert', [
        {
            $$$channelId: 11,
            $$$lastSeenMessage: link(lastSeenMessage),
            $$$partnerId: env.messaging.$$$currentPartner().$$$id(),
        },
        {
            $$$channelId: 11,
            $$$lastSeenMessage: link(lastSeenMessage),
            $$$partnerId: 100,
        }
    ]);
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
        '.o-Message-seenIndicator',
        "message component should have a message seen indicator"
    );
    assert.containsNone(
        document.body,
        '.o-MessageSeenIndicator-icon',
        "message component should not have any check (V)"
    );
});

QUnit.test('only show messaging seen indicator if authored by me, after last seen by all message', async function (assert) {
    assert.expect(3);

    const env = await this.start();
    const currentPartner = env.invoke('Partner/insert', {
        $$$displayName: "Demo User",
        $$$id: env.messaging.$$$currentPartner().$$$id(),
    });
    const thread = env.invoke('Thread/create', {
        $$$channelType: 'chat',
        $$$id: 11,
        $$$partnerSeenInfos: create([
            {
                $$$channelId: 11,
                $$$lastSeenMessage: insert({
                    $$$id: 100,
                }),
                $$$partnerId: env.messaging.$$$currentPartner().$$$id(),
            },
            {
                $$$channelId: 11,
                $$$lastFetchedMessage: insert({
                    $$$id: 100,
                }),
                $$$lastSeenMessage: insert({
                    $$$id: 99,
                }),
                $$$partnerId: 100,
            },
        ]),
        $$$messageSeenIndicators: insert({
            $$$channelId: 11,
            $$$messageId: 100,
        }),
        $$$model: 'mail.channel',
    });
    const threadViewer = env.invoke('ThreadViewer/create', {
        $$$hasThreadView: true,
        $$$thread: link(thread),
    });
    const message = env.invoke('Message/insert', {
        $$$author: link(currentPartner),
        $$$body: "<p>Test</p>",
        $$$id: 100,
        $$$originThread: link(thread),
    });
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
        '.o-Message-seenIndicator',
        "message component should have a message seen indicator"
    );
    assert.containsOnce(
        document.body,
        '.o-MessageSeenIndicator-icon',
        "message component should have one check (V) because the message was fetched by everyone but no other member than author has seen the message"
    );
});

QUnit.test('allow attachment delete on authored message', async function (assert) {
    assert.expect(5);

    const env = await this.start();
    const message = env.invoke('Message/create', {
        $$$attachments: insertAndReplace({
            $$$filename: "BLAH.jpg",
            $$$id: 10,
            $$$name: "BLAH",
        }),
        $$$author: link(env.messaging.$$$currentPartner()),
        $$$body: "<p>Test</p>",
        $$$id: 100,
    });
    await this.createMessageComponent(message);
    assert.containsOnce(
        document.body,
        '.o-Attachment',
        "should have an attachment",
    );
    assert.containsOnce(
        document.body,
        '.o-Attachment-asideItemUnlink',
        "should have delete attachment button"
    );

    await afterNextRender(() =>
        document.querySelector('.o-Attachment-asideItemUnlink').click()
    );
    assert.containsOnce(
        document.body,
        '.o-AttachmentDeleteConfirmDialog',
        "An attachment delete confirmation dialog should have been opened"
    );
    assert.strictEqual(
        document.querySelector('.o-AttachmentDeleteConfirmDialog-mainText').textContent,
        `Do you really want to delete "BLAH"?`,
        "Confirmation dialog should contain the attachment delete confirmation text"
    );

    await afterNextRender(() =>
        document.querySelector('.o-AttachmentDeleteConfirmDialog-confirmButton').click()
    );
    assert.containsNone(
        document.body,
        '.o-Attachment',
        "should no longer have an attachment",
    );
});

QUnit.test('prevent attachment delete on non-authored message', async function (assert) {
    assert.expect(2);

    const env = await this.start();
    const message = env.invoke('Message/create', {
        $$$attachments: insertAndReplace({
            $$$filename: "BLAH.jpg",
            $$$id: 10,
            $$$name: "BLAH",
        }),
        $$$author: insert({
            $$$displayName: "Guy",
            $$$id: 11,
        }),
        $$$body: "<p>Test</p>",
        $$$id: 100,
    });
    await this.createMessageComponent(message);
    assert.containsOnce(
        document.body,
        '.o-Attachment',
        "should have an attachment",
    );
    assert.containsNone(
        document.body,
        '.o-Attachment-asideItemUnlink',
        "delete attachment button should not be printed"
    );
});

QUnit.test('subtype description should be displayed if it is different than body', async function (assert) {
    assert.expect(2);

    const env = await this.start();
    const message = env.invoke('Message/create', {
        $$$body: "<p>Hello</p>",
        $$$id: 100,
        $$$subtypeDescription: "Bonjour",
    });
    await this.createMessageComponent(message);
    assert.containsOnce(
        document.body,
        '.o-Message-content',
        "message should have content"
    );
    assert.strictEqual(
        document.querySelector('.o-Message-content').textContent,
        "HelloBonjour",
        "message content should display both body and subtype description when they are different"
    );
});

QUnit.test('subtype description should not be displayed if it is similar to body', async function (assert) {
    assert.expect(2);

    const env = await this.start();
    const message = env.invoke('Message/create', {
        $$$body: "<p>Hello</p>",
        $$$id: 100,
        $$$subtypeDescription: "hello",
    });
    await this.createMessageComponent(message);
    assert.containsOnce(
        document.body,
        '.o-Message-content',
        "message should have content"
    );
    assert.strictEqual(
        document.querySelector('.o-Message-content').textContent,
        "Hello",
        "message content should display only body when subtype description is similar"
    );
});

QUnit.test('data-oe-id & data-oe-model link redirection on click', async function (assert) {
    assert.expect(7);

    const bus = new Bus();
    bus.on('do-action', null, payload => {
        assert.strictEqual(
            payload.action.type,
            'ir.actions.act_window',
            "action should open view"
        );
        assert.strictEqual(
            payload.action.res_model,
            'some.model',
            "action should open view on 'some.model' model"
        );
        assert.strictEqual(
            payload.action.res_id,
            250,
            "action should open view on 250"
        );
        assert.step('do-action:openFormView_some.model_250');
    });
    const env = await this.start({
        env: { bus },
    });
    const message = env.invoke('Message/create', {
        $$$body: `<p><a href="#" data-oe-id="250" data-oe-model="some.model">some.model_250</a></p>`,
        $$$id: 100,
    });
    await this.createMessageComponent(message);
    assert.containsOnce(
        document.body,
        '.o-Message-content',
        "message should have content"
    );
    assert.containsOnce(
        document.body,
        `
            .o-Message-content
            a
        `,
        "message content should have a link"
    );

    document.querySelector(`
        .o-Message-content
        a
    `).click();
    assert.verifySteps(
        ['do-action:openFormView_some.model_250'],
        "should have open form view on related record after click on link"
    );
});

QUnit.test('chat with author should be opened after clicking on his avatar', async function (assert) {
    assert.expect(4);

    this.data['res.partner'].records.push(
        { id: 10 }
    );
    this.data['res.users'].records.push(
        { partner_id: 10 }
    );
    const env = await this.start({
        hasChatWindow: true,
    });
    const message = env.invoke('Message/create', {
        $$$author: insert({
            $$$id: 10,
        }),
        $$$id: 10,
    });
    await this.createMessageComponent(message);
    assert.containsOnce(
        document.body,
        '.o-Message-authorAvatar',
        "message should have the author avatar"
    );
    assert.hasClass(
        document.querySelector('.o-Message-authorAvatar'),
        'o_redirect',
        "author avatar should have the redirect style"
    );

    await afterNextRender(() =>
        document.querySelector('.o-Message-authorAvatar').click()
    );
    assert.containsOnce(
        document.body,
        '.o-ChatWindow-thread',
        "chat window with thread should be opened after clicking on author avatar"
    );
    assert.strictEqual(
        document.querySelector('.o-ChatWindow-thread').dataset.correspondentId,
        message.$$$author().$$$id().toString(),
        "chat with author should be opened after clicking on his avatar"
    );
});

QUnit.test('chat with author should be opened after clicking on his im status icon', async function (assert) {
    assert.expect(4);

    this.data['res.partner'].records.push(
        { id: 10 }
    );
    this.data['res.users'].records.push(
        { partner_id: 10 }
    );
    const env = await this.start({
        hasChatWindow: true,
    });
    const message = env.invoke('Message/create', {
        $$$author: insert({
            $$$id: 10,
            $$$im_status: 'online',
        }),
        $$$id: 10,
    });
    await this.createMessageComponent(message);
    assert.containsOnce(
        document.body,
        '.o-Message-partnerImStatusIcon',
        "message should have the author im status icon"
    );
    assert.hasClass(
        document.querySelector('.o-Message-partnerImStatusIcon'),
        'o-hasOpenChat',
        "author im status icon should have the open chat style"
    );

    await afterNextRender(() =>
        document.querySelector('.o-Message-partnerImStatusIcon').click()
    );
    assert.containsOnce(
        document.body,
        '.o-ChatWindow-thread',
        "chat window with thread should be opened after clicking on author im status icon"
    );
    assert.strictEqual(
        document.querySelector('.o-ChatWindow-thread').dataset.correspondentId,
        message.$$$author().$$$id().toString(),
        "chat with author should be opened after clicking on his im status icon"
    );
});

QUnit.test('open chat with author on avatar click should be disabled when currently chatting with the author', async function (assert) {
    assert.expect(3);

    this.data['mail.channel'].records.push(
        {
            channel_type: 'chat',
            members: [this.data.currentPartnerId, 10],
            public: 'private',
        }
    );
    this.data['res.partner'].records.push(
        { id: 10 }
    );
    this.data['res.users'].records.push(
        { partner_id: 10 }
    );
    const env = await this.start({
        hasChatWindow: true,
    });
    const correspondent = env.invoke('Partner/insert', {
        $$$id: 10,
    });
    const message = env.invoke('Message/create', {
        $$$author: link(correspondent),
        $$$id: 10,
    });
    const thread = await env.invoke('Partner/getChat', correspondent);
    const threadViewer = env.invoke('ThreadViewer/create', {
        $$$hasThreadView: true,
        $$$thread: link(thread),
    });
    await this.createMessageComponent(message, {
        threadView: threadViewer.$$$threadView(),
    });
    assert.containsOnce(
        document.body,
        '.o-Message-authorAvatar',
        "message should have the author avatar"
    );
    assert.doesNotHaveClass(
        document.querySelector('.o-Message-authorAvatar'),
        'o_redirect',
        "author avatar should not have the redirect style"
    );

    document.querySelector('.o-Message-authorAvatar').click();
    await nextAnimationFrame();
    assert.containsNone(
        document.body,
        '.o-ChatWindow',
        "should have no thread opened after clicking on author avatar when currently chatting with the author"
    );
});

QUnit.test('basic rendering of tracking value (float type)', async function (assert) {
    assert.expect(8);

    const env = await this.start();
    const message = env.invoke('Message/create', {
        $$$id: 11,
        $$$trackingValues: [{
            changed_field: "Total",
            field_type: "float",
            id: 6,
            new_value: 45.67,
            old_value: 12.3,
        }],
    });
    await this.createMessageComponent(message);
    assert.containsOnce(
        document.body,
        '.o-Message-trackingValue',
        "should display a tracking value"
    );
    assert.containsOnce(
        document.body,
        '.o-Message-trackingValueFieldName',
        "should display the name of the tracked field"
    );
    assert.strictEqual(
        document.querySelector('.o-Message-trackingValueFieldName').textContent,
        "Total:",
        "should display the correct tracked field name (Total)",
    );
    assert.containsOnce(
        document.body,
        '.o-Message-trackingValueOldValue',
        "should display the old value"
    );
    assert.strictEqual(
        document.querySelector('.o-Message-trackingValueOldValue').textContent,
        "12.3",
        "should display the correct old value (12.3)",
    );
    assert.containsOnce(
        document.body,
        '.o-Message-trackingValueSeparator',
        "should display the separator"
    );
    assert.containsOnce(
        document.body,
        '.o-Message-trackingValueNewValue',
        "should display the new value"
    );
    assert.strictEqual(
        document.querySelector('.o-Message-trackingValueNewValue').textContent,
        "45.67",
        "should display the correct new value (45.67)",
    );
});

QUnit.test('rendering of tracked field with change of value from non-0 to 0', async function (assert) {
    assert.expect(1);

    const env = await this.start();
    const message = env.invoke('Message/create', {
        $$$id: 11,
        $$$trackingValues: [{
            changed_field: "Total",
            field_type: "float",
            id: 6,
            new_value: 0,
            old_value: 1,
        }],
    });
    await this.createMessageComponent(message);
    assert.strictEqual(
        document.querySelector('.o-Message-trackingValue').textContent,
        "Total:10",
        "should display the correct content of tracked field with change of value from non-0 to 0 (Total: 1 -> 0)"
    );
});

QUnit.test('rendering of tracked field with change of value from 0 to non-0', async function (assert) {
    assert.expect(1);

    const env = await this.start();
    const message = env.invoke('Message/create', {
        $$$id: 11,
        $$$trackingValues: [{
            changed_field: "Total",
            field_type: "float",
            id: 6,
            new_value: 1,
            old_value: 0,
        }],
    });
    await this.createMessageComponent(message);
    assert.strictEqual(
        document.querySelector('.o-Message-trackingValue').textContent,
        "Total:01",
        "should display the correct content of tracked field with change of value from 0 to non-0 (Total: 0 -> 1)"
    );
});

QUnit.test('rendering of tracked field with change of value from true to false', async function (assert) {
    assert.expect(1);

    const env = await this.start();
    const message = env.invoke('Message/create', {
        $$$id: 11,
        $$$trackingValues: [{
            changed_field: "Is Ready",
            field_type: "boolean",
            id: 6,
            new_value: false,
            old_value: true,
        }],
    });
    await this.createMessageComponent(message);
    assert.strictEqual(
        document.querySelector('.o-Message-trackingValue').textContent,
        "Is Ready:truefalse",
        "should display the correct content of tracked field with change of value from true to false (Is Ready: true -> false)"
    );
});

QUnit.test('rendering of tracked field with change of value from false to true', async function (assert) {
    assert.expect(1);

    const env = await this.start();
    const message = env.invoke('Message/create', {
        $$$id: 11,
        $$$trackingValues: [{
            changed_field: "Is Ready",
            field_type: "boolean",
            id: 6,
            new_value: true,
            old_value: false,
        }],
    });
    await this.createMessageComponent(message);
    assert.strictEqual(
        document.querySelector('.o-Message-trackingValue').textContent,
        "Is Ready:falsetrue",
        "should display the correct content of tracked field with change of value from false to true (Is Ready: false -> true)"
    );
});

QUnit.test('rendering of tracked field with change of value from string to empty', async function (assert) {
    assert.expect(1);

    const env = await this.start();
    const message = env.invoke('Message/create', {
        $$$id: 11,
        $$$trackingValues: [{
            changed_field: "Name",
            field_type: "char",
            id: 6,
            new_value: "",
            old_value: "Marc",
        }],
    });
    await this.createMessageComponent(message);
    assert.strictEqual(
        document.querySelector('.o-Message-trackingValue').textContent,
        "Name:Marc",
        "should display the correct content of tracked field with change of value from string to empty (Total: Marc ->)"
    );
});

QUnit.test('rendering of tracked field with change of value from empty to string', async function (assert) {
    assert.expect(1);

    const env = await this.start();
    const message = env.invoke('Message/create', {
        $$$id: 11,
        $$$trackingValues: [{
            changed_field: "Name",
            field_type: "char",
            id: 6,
            new_value: "Marc",
            old_value: "",
        }],
    });
    await this.createMessageComponent(message);
    assert.strictEqual(
        document.querySelector('.o-Message-trackingValue').textContent,
        "Name:Marc",
        "should display the correct content of tracked field with change of value from empty to string (Total: -> Marc)"
    );
});

});
});
});

});
