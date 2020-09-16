odoo.define('mail/static/src/components/thread-preview/thread-preview_tests.js', function (require) {
'use strict';

const ThreadPreview = require('mail/static/src/components/thread-preview/thread-preview.js');
const {
    afterEach,
    afterNextRender,
    beforeEach,
    createRootComponent,
    start,
} = require('mail/static/src/utils/test-utils.js');

QUnit.module('mail', {}, function () {
QUnit.module('components', {}, function () {
QUnit.module('thread-preview', {}, function () {
QUnit.module('thread-preview_tests.js', {
    beforeEach() {
        beforeEach(this);

        this.createThreadPreviewComponent = async props => {
            await createRootComponent(this, ThreadPreview, {
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

QUnit.test('mark as read', async function (assert) {
    assert.expect(8);
    this.data['mail.channel'].records.push(
        {
            id: 11,
            message_unread_counter: 1,
        }
    );
    this.data['mail.message'].records.push(
        {
            channel_ids: [11],
            id: 100,
            model: 'mail.channel',
            res_id: 11,
        }
    );
    const env = await this.start({
        hasChatWindow: true,
        async mockRPC(route, args) {
            if (route.includes('channel_seen')) {
                assert.step('channel_seen');
            }
            return this._super(...arguments);
        },
    });
    const thread = env.invoke('Thread/findFromId', {
        $$$id: 11,
        $$$model: 'mail.channel',
    });
    await this.createThreadPreviewComponent({ thread });
    assert.containsOnce(
        document.body,
        '.o-ThreadPreview-markAsRead',
        "should have the mark as read button"
    );
    assert.containsOnce(
        document.body,
        '.o-ThreadPreview-counter',
        "should have an unread counter"
    );

    await afterNextRender(() =>
        document.querySelector('.o-ThreadPreview-markAsRead').click()
    );
    assert.verifySteps(
        ['channel_seen'],
        "should have marked the thread as seen"
    );
    assert.hasClass(
        document.querySelector('.o-ThreadPreview'),
        'o-isMuted',
        "should be muted once marked as read"
    );
    assert.containsNone(
        document.body,
        '.o-ThreadPreview-markAsRead',
        "should no longer have the mark as read button"
    );
    assert.containsNone(
        document.body,
        '.o-ThreadPreview-counter',
        "should no longer have an unread counter"
    );
    assert.containsNone(
        document.body,
        '.o-ChatWindow',
        "should not have opened the thread"
    );
});

});
});
});

});
