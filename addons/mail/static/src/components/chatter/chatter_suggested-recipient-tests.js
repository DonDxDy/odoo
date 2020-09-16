odoo.define('mail/static/src/components/chatter/chatter_suggested-recipients-tests', function (require) {
'use strict';

const Chatter = require('mail/static/src/components/chatter/chatter.js');
const {
    afterEach,
    afterNextRender,
    beforeEach,
    createRootComponent,
    start,
} = require('mail/static/src/utils/test-utils.js');

QUnit.module('mail', {}, function () {
QUnit.module('components', {}, function () {
QUnit.module('chatter', {}, function () {
QUnit.module('chatter_suggested-recipients-tests.js', {
    beforeEach() {
        beforeEach(this);

        this.createChatterComponent = async ({ chatter }, otherProps) => {
            const props = { chatter, ...otherProps };
            await createRootComponent(this, Chatter, {
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

QUnit.test('suggest recipient on "Send message" composer', async function (assert) {
    assert.expect(1);

    this.data['res.fake'].records.push(
        {
            email_cc: "john@test.be",
            id: 10,
            partner_ids: [100],
        }
    );
    this.data['res.partner'].records.push(
        {
            display_name: "John Jane",
            email: "john@jane.be",
            id: 100,
        }
    );
    const env = await this.start ();
    const chatter = env.invoke('Chatter/create', {
        $$$threadId: 10,
        $$$threadModel: 'res.fake',
    });
    await this.createChatterComponent({ chatter });
    await afterNextRender(() =>
        document.querySelector('.o-ChatterTopbar-buttonSendMessage').click()
    );
    assert.containsOnce(
        document.body,
        '.o-ComposerSuggestedRecipientList',
        "Should display a list of suggested recipients after opening the composer from 'Send message' button"
    );
});

QUnit.test('with 3 or less suggested recipients: no "show more" button', async function (assert) {
    assert.expect(1);

    this.data['res.fake'].records.push(
        {
            email_cc: "john@test.be",
            id: 10,
            partner_ids: [100],
        }
    );
    this.data['res.partner'].records.push(
        {
            display_name: "John Jane",
            email: "john@jane.be",
            id: 100,
        }
    );
    const env = await this.start ();
    const chatter = env.invoke('Chatter/create', {
        $$$threadId: 10,
        $$$threadModel: 'res.fake',
    });
    await this.createChatterComponent({ chatter });
    await afterNextRender(() =>
        document.querySelector('.o-ChatterTopbar-buttonSendMessage').click()
    );
    assert.containsNone(
        document.body,
        '.o-ComposerSuggestedRecipientList-showMore',
        "should not display 'show more' button with 3 or less suggested recipients"
    );
});

QUnit.test('display reason for suggested recipient on mouse over', async function (assert) {
    assert.expect(1);

    this.data['res.fake'].records.push(
        {
            id: 10,
            partner_ids: [100],
        }
    );
    this.data['res.partner'].records.push(
        {
            display_name: "John Jane",
            email: "john@jane.be",
            id: 100,
        }
    );
    const env = await this.start();
    const chatter = env.invoke('Chatter/create', {
        $$$threadId: 10,
        $$$threadModel: 'res.fake',
    });
    await this.createChatterComponent({ chatter });
    await afterNextRender(() =>
        document.querySelector('.o-ChatterTopbar-buttonSendMessage').click()
    );
    const partnerTitle = document
        .querySelector('.o-ComposerSuggestedRecipient[data-partner-id="100"]')
        .getAttribute('title');
    assert.strictEqual(
        partnerTitle,
        "Add as recipient and follower (reason: Email partner)",
        "must display reason for suggested recipient on mouse over",
    );
});

QUnit.test('suggested recipient without partner are unchecked by default', async function (assert) {
    assert.expect(1);

    this.data['res.fake'].records.push(
        {
            id: 10,
            email_cc: "john@test.be",
        }
    );
    const env = await this.start();
    const chatter = env.invoke('Chatter/create', {
        $$$threadId: 10,
        $$$threadModel: 'res.fake',
    });
    await this.createChatterComponent({ chatter });
    await afterNextRender(() =>
        document.querySelector('.o-ChatterTopbar-buttonSendMessage').click()
    );
    const checkboxUnchecked = document.querySelector(`
        .o-ComposerSuggestedRecipient:not([data-partner-id])
        input[type=checkbox]
    `);
    assert.notOk(
        checkboxUnchecked.checked,
        "suggested recipient without partner must be unchecked by default",
    );
});

QUnit.test('suggested recipient with partner are checked by default', async function (assert) {
    assert.expect(1);

    this.data['res.fake'].records.push(
        {
            id: 10,
            partner_ids: [100],
        }
    );
    this.data['res.partner'].records.push(
        {
            display_name: "John Jane",
            email: "john@jane.be",
            id: 100,
        }
    );
    const env = await this.start();
    const chatter = env.invoke('Chatter/create', {
        $$$threadId: 10,
        $$$threadModel: 'res.fake',
    });
    await this.createChatterComponent({ chatter });
    await afterNextRender(() =>
        document.querySelector('.o-ChatterTopbar-buttonSendMessage').click()
    );
    const checkboxChecked = document.querySelector(`
        .o-ComposerSuggestedRecipient[data-partner-id="100"]
        input[type=checkbox]
    `);
    assert.ok(
        checkboxChecked.checked,
        "suggested recipient with partner must be checked by default",
    );
});

QUnit.test('more than 3 suggested recipients: display only 3 and "show more" button', async function (assert) {
    assert.expect(1);

    this.data['res.fake'].records.push({
        id: 10,
        partner_ids: [
            100,
            1000,
            1001,
            1002,
        ],
    });
    this.data['res.partner'].records.push(
        {
            display_name: "John Jane",
            email: "john@jane.be",
            id: 100,
        },
        {
            display_name: "Jack Jone",
            email: "jack@jone.be",
            id: 1000,
        },
        {
            display_name: "jolly Roger",
            email: "Roger@skullflag.com",
            id: 1001,
        },
        {
            display_name: "jack sparrow",
            email: "jsparrow@blackpearl.bb",
            id: 1002,
        }
    );
    const env = await this.start();
    const chatter = env.invoke('Chatter/create', {
        $$$threadId: 10,
        $$$threadModel: 'res.fake',
    });
    await this.createChatterComponent({ chatter });
    await afterNextRender(() =>
        document.querySelector('.o-ChatterTopbar-buttonSendMessage').click()
    );
    assert.containsOnce(
        document.body,
        '.o-ComposerSuggestedRecipientList-showMore',
        "more than 3 suggested recipients display 'show more' button"
    );
});

QUnit.test('more than 3 suggested recipients: show all of them on click "show more" button', async function (assert) {
    assert.expect(1);

    this.data['res.fake'].records.push({
        id: 10,
        partner_ids: [
            100,
            1000,
            1001,
            1002,
        ],
    });
    this.data['res.partner'].records.push(
        {
            display_name: "John Jane",
            email: "john@jane.be",
            id: 100,
        },
        {
            display_name: "Jack Jone",
            email: "jack@jone.be",
            id: 1000,
        },
        {
            display_name: "jolly Roger",
            email: "Roger@skullflag.com",
            id: 1001,
        },
        {
            display_name: "jack sparrow",
            email: "jsparrow@blackpearl.bb",
            id: 1002,
        }
    );
    const env = await this.start();
    const chatter = env.invoke('Chatter/create', {
        $$$threadId: 10,
        $$$threadModel: 'res.fake',
    });
    await this.createChatterComponent({ chatter });
    await afterNextRender(() =>
        document.querySelector('.o-ChatterTopbar-buttonSendMessage').click()
    );
    await afterNextRender(() =>
        document.querySelector('.o-ComposerSuggestedRecipientList-showMore').click()
    );
    assert.containsN(
        document.body,
        '.o-ComposerSuggestedRecipient',
        4,
        "more than 3 suggested recipients: show all of them on click 'show more' button"
    );
});

QUnit.test('more than 3 suggested recipients -> click "show more" -> "show less" button', async function (assert) {
    assert.expect(1);

    this.data['res.fake'].records.push({
        id: 10,
        partner_ids: [
            100,
            1000,
            1001,
            1002,
        ],
    });
    this.data['res.partner'].records.push(
        {
            display_name: "John Jane",
            email: "john@jane.be",
            id: 100,
        },
        {
            display_name: "Jack Jone",
            email: "jack@jone.be",
            id: 1000,
        },
        {
            display_name: "jolly Roger",
            email: "Roger@skullflag.com",
            id: 1001,
        },
        {
            display_name: "jack sparrow",
            email: "jsparrow@blackpearl.bb",
            id: 1002,
        }
    );
    const env = await this.start();
    const chatter = env.invoke('Chatter/create', {
        $$$threadId: 10,
        $$$threadModel: 'res.fake',
    });
    await this.createChatterComponent({ chatter });
    await afterNextRender(() =>
        document.querySelector('.o-ChatterTopbar-buttonSendMessage').click()
    );
    await afterNextRender(() =>
        document.querySelector('.o-ComposerSuggestedRecipientList-showMore').click()
    );
    assert.containsOnce(
        document.body,
        '.o-ComposerSuggestedRecipientList-showLess',
        "more than 3 suggested recipients -> click 'show more' -> 'show less' button"
    );
});

QUnit.test('suggested recipients list display 3 suggested recipient and "show more" button when "show less" button is clicked', async function (assert) {
    assert.expect(2);

    this.data['res.fake'].records.push({
        id: 10,
        partner_ids: [
            100,
            1000,
            1001,
            1002,
        ],
    });
    this.data['res.partner'].records.push(
        {
            display_name: "John Jane",
            email: "john@jane.be",
            id: 100,
        },
        {
            display_name: "Jack Jone",
            email: "jack@jone.be",
            id: 1000,
        },
        {
            display_name: "jolly Roger",
            email: "Roger@skullflag.com",
            id: 1001,
        },
        {
            display_name: "jack sparrow",
            email: "jsparrow@blackpearl.bb",
            id: 1002,
        }
    );
    const env = await this.start();
    const chatter = env.invoke('Chatter/create', {
        $$$threadId: 10,
        $$$threadModel: 'res.fake',
    });
    await this.createChatterComponent({ chatter });

    await afterNextRender(() =>
        document.querySelector('.o-ChatterTopbar-buttonSendMessage').click()
    );
    await afterNextRender(() =>
        document.querySelector('.o-ComposerSuggestedRecipientList-showMore').click()
    );
    await afterNextRender(() =>
        document.querySelector('.o-ComposerSuggestedRecipientList-showLess').click()
    );
    assert.containsN(
        document.body,
        '.o-ComposerSuggestedRecipient',
        3,
        "suggested recipient list should display 3 suggested recipients after clicking on 'show less'."
    );
    assert.containsOnce(
        document.body,
        '.o-ComposerSuggestedRecipientList-showMore',
        "suggested recipient list should containt a 'show More' button after clicking on 'show less'."
    );
});

QUnit.test("suggested recipients should not be notified when posting an internal note", async function (assert) {
    assert.expect(1);

    this.data['res.fake'].records.push(
        {
            id: 10,
            partner_ids: [100],
        }
    );
    this.data['res.partner'].records.push(
        {
            display_name: "John Jane",
            email: "john@jane.be",
            id: 100,
        }
    );
    const env = await this.start({
        async mockRPC(route, args) {
            if (args.model === 'res.fake' && args.method === 'message_post') {
                assert.strictEqual(
                    args.kwargs.partner_ids.length,
                    0,
                    "message_post should not contain suggested recipients when posting an internal note"
                );
            }
            return this._super(...arguments);
        },
    });
    const chatter = env.invoke('Chatter/create', {
        $$$threadId: 10,
        $$$threadModel: 'res.fake',
    });
    await this.createChatterComponent({ chatter });
    await afterNextRender(() =>
        document.querySelector('.o-ChatterTopbar-buttonLogNote').click()
    );
    document.querySelector('.o-ComposerTextInput-textarea').focus();
    await afterNextRender(
        () => document.execCommand('insertText', false, "Dummy Message")
    );
    await afterNextRender(() => {
        document.querySelector('.o-Composer-buttonSend').click();
    });
});

});
});
});

});
