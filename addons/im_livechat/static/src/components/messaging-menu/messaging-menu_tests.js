odoo.define('im_livechat/static/src/components/messaging-menu/messaging-menu_tests.js', function (require) {
'use strict';

const {
    afterEach,
    afterNextRender,
    beforeEach,
    start,
} = require('mail/static/src/utils/test-utils.js');

QUnit.module('im_livechat', {}, function () {
QUnit.module('components', {}, function () {
QUnit.module('messaging-menu', {}, function () {
QUnit.module('messaging-menu_tests.js', {
    beforeEach() {
        beforeEach(this);

        this.start = async params => {
            let env = await start({
                ...params,
                data: this.data,
                hasMessagingMenu: true,
            });
            this.env = env;
            return env;
        };
    },
    afterEach() {
        afterEach(this);
    },
});

QUnit.test('livechats should be in "chat" filter', async function (assert) {
    assert.expect(7);

    this.data['mail.channel'].records.push(
        {
            anonymous_name: "Visitor 11",
            channel_type: 'livechat',
            id: 11,
            livechat_operator_id: this.data.currentPartnerId,
            members: [this.data.currentPartnerId, this.data.publicPartnerId],
        }
    );
    const env = await this.start();
    assert.containsOnce(
        document.body,
        '.o-MessagingMenu',
        "should have messaging menu"
    );

    await afterNextRender(() =>
        document.querySelector('.o-MessagingMenu-toggler').click()
    );
    assert.containsOnce(
        document.body,
        '.o-MessagingMenu-tabButton[data-tab-id="all"]',
        "should have a tab/filter 'all' in messaging menu"
    );
    assert.containsOnce(
        document.body,
        '.o-MessagingMenu_tabButton[data-tab-id="chat"]',
        "should have a tab/filter 'chat' in messaging menu"
    );
    assert.hasClass(
        document.querySelector('.o-MessagingMenu-tabButton[data-tab-id="all"]'),
        'o-isActive',
        "tab/filter 'all' of messaging menu should be active initially"
    );
    assert.containsOnce(
        document.body,
        `.o-ThreadPreview[data-thread-local-id="${
            env.invoke('Thread/findFromId', {
                $$$id: 11,
                $$$model: 'mail.channel',
            }).localId
        }"]`,
        "livechat should be listed in 'all' tab/filter of messaging menu"
    );

    await afterNextRender(() =>
        document.querySelector('.o-MessagingMenu-tabButton[data-tab-id="chat"]').click()
    );
    assert.hasClass(
        document.querySelector('.o-MessagingMenu-tabButton[data-tab-id="chat"]'),
        'o-isActive',
        "tab/filter 'chat' of messaging menu should become active after click"
    );
    assert.containsOnce(
        document.body,
        `.o-ThreadPreview[data-thread-local-id="${
            env.invoke('Thread/findFromId', {
                $$$id: 11,
                $$$model: 'mail.channel',
            }).localId
        }"]`,
        "livechat should be listed in 'chat' tab/filter of messaging menu"
    );
});

});
});
});

});
