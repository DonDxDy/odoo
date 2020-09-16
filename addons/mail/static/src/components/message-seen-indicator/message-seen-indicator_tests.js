odoo.define('mail/static/src/components/message-seen-indicator/message-seen-indicator_tests', function (require) {
'use strict';

const MessageSendIndicator = require('mail/static/src/components/message-seen-indicator/message-seen-indicator.js');
const {
    'Field/create': create,
    'Field/insert': insert,
    'Field/link': link,
} = require('mail/static/src/model/utils.js');
const {
    afterEach,
    beforeEach,
    createRootComponent,
    start,
} = require('mail/static/src/utils/test-utils.js');

QUnit.module('mail', {}, function () {
QUnit.module('components', {}, function () {
QUnit.module('message-seen-indicator', {}, function () {
QUnit.module('message-seen-indicator_tests.js', {
    beforeEach() {
        beforeEach(this);

        this.createMessageSeenIndicatorComponent = async ({ message, thread }, otherProps) => {
            await createRootComponent(this, MessageSendIndicator, {
                props: {
                    message,
                    thread,
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

QUnit.test('rendering when just one has received the message', async function (assert) {
    assert.expect(3);

    const env = await this.start();
    const thread = env.invoke('Thread/create', {
        $$$id: 1000,
        $$$model: 'mail.channel',
        $$$partnerSeenInfos: create([
            {
                $$$channelId: 1000,
                $$$lastFetchedMessage: insert({
                    $$$id: 100,
                }),
                $$$partnerId: 10,
            },
            {
                $$$channelId: 1000,
                $$$partnerId: 100,
            },
        ]),
        $$$messageSeenIndicators: insert({
            $$$channelId: 1000,
            $$$messageId: 100,
        }),
    });
    const message = env.invoke('Message/insert', {
        $$$author: insert({
            $$$displayName: "Demo User",
            $$$id: env.messaging.$$$currentPartner().$$$id(),
        }),
        $$$body: "<p>Test</p>",
        $$$id: 100,
        $$$originThread: link(thread),
    });
    await this.createMessageSeenIndicatorComponent({ message, thread });
    assert.containsOnce(
        document.body,
        '.o-MessageSeenIndicator',
        "should display a message seen indicator component"
    );
    assert.doesNotHaveClass(
        document.querySelector('.o-MessageSeenIndicator'),
        'o-isAllSeen',
        "indicator component should not be considered as all seen"
    );
    assert.containsOnce(
        document.body,
        '.o-MessageSeenIndicator-icon',
        "should display only one seen indicator icon"
    );
});

QUnit.test('rendering when everyone have received the message', async function (assert) {
    assert.expect(3);

    const env = await this.start();
    const thread = env.invoke('Thread/create', {
        $$$id: 1000,
        $$$model: 'mail.channel',
        $$$partnerSeenInfos: create([
            {
                $$$channelId: 1000,
                $$$lastFetchedMessage: insert({
                    $$$id: 100,
                }),
                $$$partnerId: 10,
            },
            {
                $$$channelId: 1000,
                $$$lastFetchedMessage: insert({
                    $$$id: 99,
                }),
                $$$partnerId: 100,
            },
        ]),
        $$$messageSeenIndicators: insert({
            $$$channelId: 1000,
            $$$messageId: 100,
        }),
    });
    const message = env.invoke('Message/insert', {
        $$$author: insert({
            $$$displayName: "Demo User",
            $$$id: env.messaging.$$$currentPartner().$$$id(),
        }),
        $$$body: "<p>Test</p>",
        $$$id: 100,
        $$$originThread: link(thread),
    });
    await this.createMessageSeenIndicatorComponent({ message, thread });
    assert.containsOnce(
        document.body,
        '.o-MessageSeenIndicator',
        "should display a message seen indicator component"
    );
    assert.doesNotHaveClass(
        document.querySelector('.o-MessageSeenIndicator'),
        'o-isAllSeen',
        "indicator component should not be considered as all seen"
    );
    assert.containsOnce(
        document.body,
        '.o-MessageSeenIndicator-icon',
        "should display only one seen indicator icon"
    );
});

QUnit.test('rendering when just one has seen the message', async function (assert) {
    assert.expect(3);

    const env = await this.start();
    const thread = env.invoke('Thread/create', {
        $$$id: 1000,
        $$$model: 'mail.channel',
        $$$partnerSeenInfos: create([
            {
                $$$channelId: 1000,
                $$$lastFetchedMessage: insert({
                    $$$id: 100,
                }),
                $$$lastSeenMessage: insert({
                    $$$id: 100,
                }),
                $$$partnerId: 10,
            },
            {
                $$$channelId: 1000,
                $$$lastFetchedMessage: insert({
                    $$$id: 99,
                }),
                $$$partnerId: 100,
            },
        ]),
        $$$messageSeenIndicators: insert({
            $$$channelId: 1000,
            $$$messageId: 100,
        }),
    });
    const message = env.invoke('Message/insert', {
        $$$author: insert({
            $$$displayName: "Demo User",
            $$$id: env.messaging.$$$currentPartner(this).$$$id(this),
        }),
        $$$body: "<p>Test</p>",
        $$$id: 100,
        $$$originThread: link(thread),
    });
    await this.createMessageSeenIndicatorComponent({ message, thread });
    assert.containsOnce(
        document.body,
        '.o-MessageSeenIndicator',
        "should display a message seen indicator component"
    );
    assert.doesNotHaveClass(
        document.querySelector('.o-MessageSeenIndicator'),
        'o-isAllSeen',
        "indicator component should not be considered as all seen"
    );
    assert.containsN(
        document.body,
        '.o-MessageSeenIndicator-icon',
        2,
        "should display two seen indicator icon"
    );
});

QUnit.test('rendering when just one has seen & received the message', async function (assert) {
    assert.expect(3);

    const env = await this.start();
    const thread = env.invoke('Thread/create', {
        $$$id: 1000,
        $$$model: 'mail.channel',
        $$$partnerSeenInfos: create([
            {
                $$$channelId: 1000,
                $$$lastFetchedMessage: insert({
                    $$$id: 100,
                }),
                $$$lastSeenMessage: insert({
                    $$$id: 100,
                }),
                $$$partnerId: 10,
            },
            {
                $$$channelId: 1000,
                $$$partnerId: 100,
            },
        ]),
        $$$messageSeenIndicators: insert({
            $$$channelId: 1000,
            $$$messageId: 100,
        }),
    });
    const message = env.invoke('Message/insert', {
        $$$author: insert({
            $$$displayName: "Demo User",
            $$$id: env.messaging.$$$currentPartner(this).$$$id(this),
        }),
        $$$body: "<p>Test</p>",
        $$$id: 100,
        $$$originThread: link(thread),
    });
    await this.createMessageSeenIndicatorComponent({ message, thread });
    assert.containsOnce(
        document.body,
        '.o-MessageSeenIndicator',
        "should display a message seen indicator component"
    );
    assert.doesNotHaveClass(
        document.querySelector('.o-MessageSeenIndicator'),
        'o-isAllSeen',
        "indicator component should not be considered as all seen"
    );
    assert.containsN(
        document.body,
        '.o-MessageSeenIndicator-icon',
        2,
        "should display two seen indicator icon"
    );
});

QUnit.test('rendering when just everyone has seen the message', async function (assert) {
    assert.expect(3);

    const env = await this.start();
    const thread = env.invoke('Thread/create', {
        $$$id: 1000,
        $$$model: 'mail.channel',
        $$$partnerSeenInfos: create([
            {
                $$$channelId: 1000,
                $$$lastFetchedMessage: insert({
                    $$$id: 100,
                }),
                $$$lastSeenMessage: insert({
                    $$$id: 100,
                }),
                $$$partnerId: 10,
            },
            {
                $$$channelId: 1000,
                $$$lastFetchedMessage: insert({
                    $$$id: 100,
                }),
                $$$lastSeenMessage: insert({
                    $$$id: 100,
                }),
                $$$partnerId: 100,
            },
        ]),
        $$$messageSeenIndicators: insert({
            $$$channelId: 1000,
            $$$messageId: 100,
        }),
    });
    const message = env.invoke('Message/insert', {
        $$$author: insert({
            $$$displayName: "Demo User",
            $$$id: env.messaging.$$$currentPartner(this).$$$id(this),
        }),
        $$$body: "<p>Test</p>",
        $$$id: 100,
        $$$originThread: link(thread),
    });
    await this.createMessageSeenIndicatorComponent({ message, thread });
    assert.containsOnce(
        document.body,
        '.o-MessageSeenIndicator',
        "should display a message seen indicator component"
    );
    assert.hasClass(
        document.querySelector('.o-MessageSeenIndicator'),
        'o-isAllSeen',
        "indicator component should not considered as all seen"
    );
    assert.containsN(
        document.body,
        '.o-MessageSeenIndicator-icon',
        2,
        "should display two seen indicator icon"
    );
});

});
});
});

});
