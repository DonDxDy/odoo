odoo.define('mail/static/src/components/discuss-mobile-mailbox-selection/discuss-mobile-mailbox-selection_tests.js', function (require) {
'use strict';

const {
    afterEach,
    afterNextRender,
    beforeEach,
    start,
} = require('mail/static/src/utils/test-utils.js');

QUnit.module('mail', {}, function () {
QUnit.module('components', {}, function () {
QUnit.module('discuss-mobile-mailbox-selection', {}, function () {
QUnit.module('discuss-mobile-mailbox-selection_tests.js', {
    beforeEach() {
        beforeEach(this);

        this.start = async params => {
            const env = await start({
                autoOpenDiscuss: true,
                data: this.data,
                env: {
                    browser: {
                        innerHeight: 640,
                        innerWidth: 360,
                    },
                    device: {
                        isMobile: true,
                    },
                },
                hasDiscuss: true,
                ...params,
            });
            this.env = env;
            return env;
        };
    },
    afterEach() {
        afterEach(this);
    },
});

QUnit.test('select another mailbox', async function (assert) {
    assert.expect(7);

    const env = await this.start();
    assert.containsOnce(
        document.body,
        '.o-Discuss',
        "should display discuss initially"
    );
    assert.hasClass(
        document.querySelector('.o-Discuss'),
        'o-isMobile',
        "discuss should be opened in mobile mode"
    );
    assert.containsOnce(
        document.body,
        '.o-Discuss-thread',
        "discuss should display a thread initially"
    );
    assert.strictEqual(
        document.querySelector('.o-Discuss-thread').dataset.threadLocalId,
        env.messaging.$$$inbox().localId,
        "inbox mailbox should be opened initially"
    );
    assert.containsOnce(
        document.body,
        `.o-DiscussMobileMailboxSelection-button[
            data-mailbox-local-id="${env.messaging.$$$starred().localId}"
        ]`,
        "should have a button to open starred mailbox"
    );

    await afterNextRender(() =>
        document.querySelector(`.o-DiscussMobileMailboxSelection-button[
            data-mailbox-local-id="${env.messaging.$$$starred().localId}"]
        `).click()
    );
    assert.containsOnce(
        document.body,
        '.o-Discuss-thread',
        "discuss should still have a thread after clicking on starred mailbox"
    );
    assert.strictEqual(
        document.querySelector('.o-Discuss-thread').dataset.threadLocalId,
        env.messaging.$$$starred().localId,
        "starred mailbox should be opened after clicking on it"
    );
});

QUnit.test('auto-select "Inbox" when discuss had channel as active thread', async function (assert) {
    assert.expect(3);

    this.data['mail.channel'].records.push(
        { id: 20 }
    );
    const env = await this.start({
        discuss: {
            context: {
                active_id: 20,
            },
        }
    });
    assert.hasClass(
        document.querySelector('.o-MobileMessagingNavbar-tab[data-tab-id="channel"]'),
        'o-isActive',
        "'channel' tab should be active initially when loading discuss with channel id as active_id"
    );

    await afterNextRender(
        () => document.querySelector(
            '.o-MobileMessagingNavbar-tab[data-tab-id="mailbox"]'
        ).click()
    );
    assert.hasClass(
        document.querySelector('.o-MobileMessagingNavbar-tab[data-tab-id="mailbox"]'),
        'o-isActive',
        "'mailbox' tab should be selected after click on mailbox tab"
    );
    assert.hasClass(
        document.querySelector(`
            .o-DiscussMobileMailboxSelection-button[data-mailbox-local-id="${
                env.messaging.$$$inbox().localId
            }"]
        `),
        'o-isActive',
        "'Inbox' mailbox should be auto-selected after click on mailbox tab"
    );
});

});
});
});

});
