odoo.define('mail/static/src/components/composer-suggestion/composer-suggestion_channel-tests.js', function (require) {
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
QUnit.module('composer-suggestion_channel-tests.js', {
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

QUnit.test('channel mention suggestion displayed', async function (assert) {
    assert.expect(1);

    this.data['mail.channel'].records.push(
        { id: 20 }
    );
    const env = await this.start();
    const thread = env.invoke('Thread/findFromId', {
        $$$id: 20,
        $$$model: 'mail.channel',
    });
    const channel = env.invoke('Thread/create', {
        $$$id: 7,
        $$$name: "General",
        $$$model: 'mail.channel',
    });
    await this.createComposerSuggestion({
        composer: thread.$$$composer(),
        isActive: true,
        modelName: 'Thread',
        record: channel,
    });
    assert.containsOnce(
        document.body,
        '.o-ComposerSuggestion',
        "Channel mention suggestion should be present"
    );
});

QUnit.test('channel mention suggestion correct data', async function (assert) {
    assert.expect(3);

    this.data['mail.channel'].records.push(
        { id: 20 }
    );
    const env = await this.start();
    const thread = env.invoke('Thread/findFromId', {
        $$$id: 20,
        $$$model: 'mail.channel',
    });
    const channel = env.invoke('Thread/create', {
        $$$id: 7,
        $$$name: "General",
        $$$model: 'mail.channel',
    });
    await this.createComposerSuggestion({
        composer: thread.$$$composer(),
        isActive: true,
        modelName: 'Thread',
        record: channel,
    });
    assert.containsOnce(
        document.body,
        '.o-ComposerSuggestion',
        "Channel mention suggestion should be present"
    );
    assert.containsOnce(
        document.body,
        '.o-ComposerSuggestion-part1',
        "Channel name should be present"
    );
    assert.strictEqual(
        document.querySelector('.o-ComposerSuggestion-part1').textContent,
        "General",
        "Channel name should be displayed"
    );
});

QUnit.test('channel mention suggestion active', async function (assert) {
    assert.expect(2);

    this.data['mail.channel'].records.push(
        { id: 20 }
    );
    const env = await this.start();
    const thread = env.invoke('Thread/findFromId', {
        $$$id: 20,
        $$$model: 'mail.channel',
    });
    const channel = env.invoke('Thread/create', {
        $$$id: 7,
        $$$name: "General",
        $$$model: 'mail.channel',
    });
    await this.createComposerSuggestion({
        composer: thread.$$$composer(),
        isActive: true,
        modelName: 'Thread',
        record: channel,
    });
    assert.containsOnce(
        document.body,
        '.o-ComposerSuggestion',
        "Channel mention suggestion should be displayed"
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
