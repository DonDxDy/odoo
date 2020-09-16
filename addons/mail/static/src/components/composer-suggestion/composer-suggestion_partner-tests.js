odoo.define('mail/static/src/components/composer-suggestion/composer-suggestion_partner-tests.js', function (require) {
'use strict';

const ComposerSuggestion = require('mail/static/src/components/composer-suggestion/composer-suggestion.js');
const {
    afterEach,
    beforeEach,
    createRootComponent,
    start,
} = require('mail/static/src/utils/test-utils.js');

QUnit.module('mail', {}, function () {
QUnit.module('components', {}, function () {
QUnit.module('composer-suggestion', {}, function () {
QUnit.module('composer-suggestion_partner-tests.js', {
    beforeEach() {
        beforeEach(this);

        this.createComposerSuggestion = async props => {
            await createRootComponent(this, ComposerSuggestion, {
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

QUnit.test('partner mention suggestion displayed', async function (assert) {
    assert.expect(1);

    this.data['mail.channel'].records.push(
        { id: 20 }
    );
    const env = await this.start();
    const thread = env.invoke('Thread/findFromId', {
        $$$id: 20,
        $$$model: 'mail.channel',
    });
    const partner = env.invoke('Partner/create', {
        $$$id: 7,
        $$$im_status: 'online',
        $$$name: "Demo User",
    });
    await this.createComposerSuggestion({
        composer: thread.$$$composer(),
        isActive: true,
        modelName: 'mail.partner',
        record: partner,
    });
    assert.containsOnce(
        document.body,
        '.o-ComposerSuggestion',
        "Partner mention suggestion should be present"
    );
});

QUnit.test('partner mention suggestion correct data', async function (assert) {
    assert.expect(6);

    this.data['mail.channel'].records.push(
        { id: 20 }
    );
    const env = await this.start();
    const thread = env.invoke('Thread/findFromId', {
        $$$id: 20,
        $$$model: 'mail.channel',
    });
    const partner = env.invoke('Partner/create', {
        $$$email: "demo_user@odoo.com",
        $$$id: 7,
        $$$im_status: 'online',
        $$$name: "Demo User",
    });
    await this.createComposerSuggestion({
        composer: thread.$$$composer(),
        isActive: true,
        modelName: 'Partner',
        record: partner,
    });
    assert.containsOnce(
        document.body,
        '.o-ComposerSuggestion',
        "Partner mention suggestion should be present"
    );
    assert.strictEqual(
        document.querySelectorAll('.o-PartnerImStatusIcon').length,
        1,
        "Partner's im_status should be displayed"
    );
    assert.containsOnce(
        document.body,
        '.o-ComposerSuggestion-part1',
        "Partner's name should be present"
    );
    assert.strictEqual(
        document.querySelector('.o-ComposerSuggestion-part1').textContent,
        "Demo User",
        "Partner's name should be displayed"
    );
    assert.containsOnce(
        document.body,
        '.o-ComposerSuggestion-part2',
        "Partner's email should be present"
    );
    assert.strictEqual(
        document.querySelector('.o-ComposerSuggestion-part2').textContent,
        "(demo_user@odoo.com)",
        "Partner's email should be displayed"
    );
});

QUnit.test('partner mention suggestion active', async function (assert) {
    assert.expect(2);

    this.data['mail.channel'].records.push(
        { id: 20 }
    );
    const env = await this.start();
    const thread = env.invoke('Thread/findFromId', {
        $$$id: 20,
        $$$model: 'mail.channel',
    });
    const partner = env.invoke('Partner/create', {
        $$$id: 7,
        $$$im_status: 'online',
        $$$name: "Demo User",
    });
    await this.createComposerSuggestion({
        composer: thread.$$$composer(),
        isActive: true,
        modelName: 'Partner',
        record: partner,
    });
    assert.containsOnce(
        document.body,
        '.o-ComposerSuggestion',
        "Partner mention suggestion should be displayed"
    );
    assert.hasClass(
        document.querySelector('.o-ComposerSuggestion'),
        'active',
        "should be active initially"
    );
});

});
});
});

});
