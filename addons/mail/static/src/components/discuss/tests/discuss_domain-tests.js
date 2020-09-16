odoo.define('mail/static/src/components/discuss/tests/discuss_domain-tests.js', function (require) {
'use strict';

const {
    afterEach,
    afterNextRender,
    beforeEach,
    start,
} = require('mail/static/src/utils/test-utils.js');

QUnit.module('mail', {}, function () {
QUnit.module('components', {}, function () {
QUnit.module('discuss', {}, function () {
QUnit.module('discuss_domain-tests.js', {
    beforeEach() {
        beforeEach(this);

        this.start = async params => {
            const env = await start({
                ...params,
                autoOpenDiscuss: true,
                data: this.data,
                hasDiscuss: true,
            });
            this.env = env;
            return env;
        };
    },
    afterEach() {
        afterEach(this);
    },
});

QUnit.test('discuss should filter messages based on given domain', async function (assert) {
    assert.expect(2);

    this.data['mail.message'].records.push(
        {
            body: "test",
            needaction: true,
            needaction_partner_ids: [this.data.currentPartnerId],
        }, {
            body: "not empty",
            needaction: true,
            needaction_partner_ids: [this.data.currentPartnerId],
        }
    );
    const env = await this.start();
    assert.containsN(
        document.body,
        '.o-Message',
        2,
        "should have 2 messages in Inbox initially"
    );

    await this.afterEvent({
        eventName: 'o-thread-view-hint-processed',
        func: () => {
            // simulate control panel search
            env.invoke('Record/update', env.messaging.$$$discuss(), {
                $$$stringifiedDomain: JSON.stringify([['body', 'ilike', 'test']]),
            });
        },
        message: "should wait until search filter is applied",
        predicate: ({ hint, threadViewer }) => {
            return (
                hint.type === 'messages-loaded' &&
                hint.data.fetchedMessages.length === 1 &&
                threadViewer.$$$thread().$$$model() === 'mail.box' &&
                threadViewer.$$$thread().$$$id() === 'inbox'
            );
        },
    });
    assert.containsOnce(
        document.body,
        '.o-Message',
        "should only have the 1 message containing 'test' remaining after doing a search"
    );
});

QUnit.test('discuss should keep filter domain on changing thread', async function (assert) {
    assert.expect(3);

    this.data['mail.channel'].records.push(
        { id: 20 }
    );
    this.data['mail.message'].records.push(
        {
            body: "test",
            channel_ids: [20],
        }, {
            body: "not empty",
            channel_ids: [20],
        }
    );
    const env = await this.start();
    const channel = env.invoke('Thread/findFromId', {
        $$$id: 20,
        $$$model: 'mail.channel',
    });
    assert.containsNone(
        document.body,
        '.o-Message',
        "should have no message in Inbox initially"
    );

    await this.afterEvent({
        eventName: 'o-thread-view-hint-processed',
        func: () => {
            // simulate control panel search
            env.invoke('Record/update', env.messaging.$$$discuss(), {
                $$$stringifiedDomain: JSON.stringify([['body', 'ilike', 'test']]),
            });
        },
        message: "should wait until search filter is applied",
        predicate: ({ hint, threadViewer }) => {
            return (
                hint.type === 'messages-loaded' &&
                threadViewer.$$$thread().$$$model() === 'mail.box' &&
                threadViewer.$$$thread().$$$id() === 'inbox'
            );
        },
    });
    assert.containsNone(
        document.body,
        '.o-Message',
        "should have still no message in Inbox after doing a search"
    );

    await this.afterEvent({
        eventName: 'o-thread-view-hint-processed',
        func: () => {
            document.querySelector(`.o-DiscussSidebar-item[data-thread-local-id="${
                channel.localId
            }"]`).click();
        },
        message: "should wait until channel 20 is loaded after clicking on it",
        predicate: ({ hint, threadViewer }) => {
            return (
                hint.type === 'messages-loaded' &&
                threadViewer.$$$thread().$$$model() === 'mail.channel' &&
                threadViewer.$$$thread().$$$id() === 20
            );
        },
    });
    assert.containsOnce(
        document.body,
        '.o-Message',
        "should only have the 1 message containing 'test' in channel 20 (due to the domain still applied on changing thread)"
    );
});

QUnit.test('discuss should refresh filtered thread on receiving new message', async function (assert) {
    assert.expect(2);

    this.data['mail.channel'].records.push(
        { id: 20 }
    );
    const env = await this.start();
    const channel = env.invoke('Thread/findFromId', {
        $$$id: 20,
        $$$model: 'mail.channel',
    });
    await this.afterEvent({
        eventName: 'o-thread-view-hint-processed',
        func: () => {
            document.querySelector(`.o-DiscussSidebar-item[data-thread-local-id="${
                channel.localId
            }"]`).click();
        },
        message: "should wait until channel 20 is loaded after clicking on it",
        predicate: ({ hint, threadViewer }) => {
            return (
                hint.type === 'messages-loaded' &&
                threadViewer.$$$thread().$$$model() === 'mail.channel' &&
                threadViewer.$$$thread().$$$id() === 20
            );
        },
    });
    await this.afterEvent({
        eventName: 'o-thread-view-hint-processed',
        func: () => {
            // simulate control panel search
            env.invoke('Record/update', env.messaging.$$$discuss(), {
                $$$stringifiedDomain: JSON.stringify([['body', 'ilike', 'test']]),
            });
        },
        message: "should wait until search filter is applied",
        predicate: ({ hint, threadViewer }) => {
            return (
                hint.type === 'messages-loaded' &&
                threadViewer.$$$thread().$$$model() === 'mail.channel' &&
                threadViewer.$$$thread().$$$id() === 20
            );
        },
    });
    assert.containsNone(
        document.body,
        '.o-Message',
        "should have initially no message in channel 20 matching the search 'test'"
    );

    // simulate receiving a message
    await this.afterEvent({
        eventName: 'o-thread-view-hint-processed',
        func: () => env.services.rpc({
            route: '/mail/chat_post',
            params: {
                message_content: "test",
                uuid: channel.uuid,
            },
        }),
        message: "should wait until channel 20 refreshed its filtered message list",
        predicate: data => {
            return (
                data.threadViewer.$$$thread().$$$model() === 'mail.channel' &&
                data.threadViewer.$$$thread().$$$id() === 20 &&
                data.hint.type === 'messages-loaded'
            );
        },
    });
    assert.containsOnce(
        document.body,
        '.o-Message',
        "should only have the 1 message containing 'test' in channel 20 after just receiving it"
    );
});

QUnit.test('discuss should refresh filtered thread on changing thread', async function (assert) {
    assert.expect(4);

    this.data['mail.channel'].records.push(
        { id: 20 },
        { id: 21 }
    );
    const env = await this.start();
    const channel20 = env.invoke('Thread/findFromId', {
        $$$id: 20,
        $$$model: 'mail.channel',
    });
    const channel21 = env.invoke('Thread/findFromId', {
        $$$id: 21,
        $$$model: 'mail.channel',
    });
    await this.afterEvent({
        eventName: 'o-thread-view-hint-processed',
        func: () => {
            document.querySelector(`.o-DiscussSidebar-item[data-thread-local-id="${
                channel20.localId
            }"]`).click();
        },
        message: "should wait until channel 20 is loaded after clicking on it",
        predicate: ({ hint, threadViewer }) => {
            return (
                hint.type === 'messages-loaded' &&
                threadViewer.$$$thread().$$$model() === 'mail.channel' &&
                threadViewer.$$$thread().$$$id() === 20
            );
        },
    });
    await this.afterEvent({
        eventName: 'o-thread-view-hint-processed',
        func: () => {
            // simulate control panel search
            env.invoke('Record/update', env.messaging.$$$discuss(), {
                $$$stringifiedDomain: JSON.stringify([['body', 'ilike', 'test']]),
            });
        },
        message: "should wait until search filter is applied",
        predicate: ({ hint, threadViewer }) => {
            return (
                hint.type === 'messages-loaded' &&
                threadViewer.$$$thread().$$$model() === 'mail.channel' &&
                threadViewer.$$$thread().$$$id() === 20
            );
        },
    });
    assert.containsNone(
        document.body,
        '.o-Message',
        "should have initially no message in channel 20 matching the search 'test'"
    );

    await this.afterEvent({
        eventName: 'o-thread-view-hint-processed',
        func: () => {
            document.querySelector(`.o-DiscussSidebar-item[data-thread-local-id="${
                channel21.localId
            }"]`).click();
        },
        message: "should wait until channel 21 is loaded after clicking on it",
        predicate: ({ hint, threadViewer }) => {
            return (
                hint.type === 'messages-loaded' &&
                threadViewer.$$$thread().$$$model() === 'mail.channel' &&
                threadViewer.$$$thread().$$$id() === 21
            );
        },
    });
    assert.containsNone(
        document.body,
        '.o-Message',
        "should have no message in channel 21 matching the search 'test'"
    );
    // simulate receiving a message on channel 20 while channel 21 is displayed
    await env.services.rpc({
        route: '/mail/chat_post',
        params: {
            message_content: "test",
            uuid: channel20.uuid,
        },
    });
    assert.containsNone(
        document.body,
        '.o-Message',
        "should still have no message in channel 21 matching the search 'test' after receiving a message on channel 20"
    );

    await this.afterEvent({
        eventName: 'o-thread-view-hint-processed',
        func: () => {
            document.querySelector(`.o-DiscussSidebar-item[data-thread-local-id="${
                channel20.localId
            }"]`).click();
        },
        message: "should wait until channel 20 is loaded with the new message after clicking on it",
        predicate: ({ hint, threadViewer }) => {
            return (
                hint.type === 'messages-loaded' &&
                threadViewer.$$$thread().$$$model() === 'mail.channel' &&
                threadViewer.$$$thread().$$$id() === 20 &&
                threadViewer.$$$threadCache().$$$fetchedMessages().length === 1
            );
        },
    });
    assert.containsOnce(
        document.body,
        '.o-Message',
        "should now have the 1 message containing 'test' in channel 20 when displaying it, after having received the message while the channel was not visible"
    );
});

QUnit.test('select all and unselect all buttons should work on filtered thread', async function (assert) {
    assert.expect(4);

    this.data['mail.channel'].records.push(
        {
            id: 20,
            is_moderator: true,
            moderation: true,
            name: "general",
        }
    );
    this.data['mail.message'].records.push(
        {
            body: "<p>test</p>",
            model: 'mail.channel',
            moderation_status: 'pending_moderation',
            res_id: 20,
        }
    );
    const env = await this.start();
    await this.afterEvent({
        eventName: 'o-thread-view-hint-processed',
        func: () => {
            document.querySelector(`.o-DiscussSidebar_item[data-thread-local-id="${
                env.messaging.$$$moderation().localId
            }"]`).click();
        },
        message: "should wait until moderation box is loaded after clicking on it",
        predicate: ({ hint, threadViewer }) => {
            return (
                hint.type === 'messages-loaded' &&
                threadViewer.$$$thread().$$$model() === 'mail.box' &&
                threadViewer.$$$thread().$$$id() === 'moderation'
            );
        },
    });
    await this.afterEvent({
        eventName: 'o-thread-view-hint-processed',
        func: () => {
            // simulate control panel search
            env.invoke('Record/update', env.messaging.$$$discuss(), {
                $$$stringifiedDomain: JSON.stringify([['body', 'ilike', 'test']]),
            });
        },
        message: "should wait until search filter is applied",
        predicate: ({ hint, threadViewer }) => {
            return (
                hint.type === 'messages-loaded' &&
                threadViewer.$$$thread().$$$model() === 'mail.box' &&
                threadViewer.$$$thread().$$$id() === 'moderation'
            );
        },
    });
    assert.containsOnce(
        document.body,
        '.o-Message',
        "should only have the 1 message containing 'test' in moderation box"
    );
    assert.notOk(
        document.querySelector('.o-Message-checkbox').checked,
        "the moderation checkbox should not be checked initially"
    );

    await afterNextRender(() =>
        document.querySelector('.o-widget-Discuss-controlPanelButtonSelectAll').click()
    );
    assert.ok(
        document.querySelector('.o-Message-checkbox').checked,
        "the moderation checkbox should be checked after clicking on 'select all'"
    );

    await afterNextRender(() =>
        document.querySelector('.o-widget-Discuss-controlPanelButtonUnselectAll').click()
    );
    assert.notOk(
        document.querySelector('.o-Message-checkbox').checked,
        "the moderation checkbox should be unchecked after clicking on 'unselect all'"
    );
});

});
});
});

});
