odoo.define('mail/static/src/components/composer-suggestion/composer-suggestion_canned-response-tests.js', function (require) {
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
QUnit.module('composer-suggestion_canned-response-tests.js', {
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

QUnit.test('canned response suggestion displayed', async function (assert) {
    assert.expect(1);

    this.data['mail.channel'].records.push(
        { id: 20 }
    );
    const env = await this.start();
    const thread = env.invoke('Thread/findFromId', {
        $$$id: 20,
        $$$model: 'mail.channel',
    });
    const cannedResponse = env.invoke('CannedResponse/create', {
        $$$id: 7,
        $$$source: 'hello',
        $$$substitution: "Hello, how are you?",
    });
    await this.createComposerSuggestion({
        composer: thread.$$$composer(),
        isActive: true,
        modelName: 'CannedResponse',
        record: cannedResponse,
    });

    assert.containsOnce(
        document.body,
        '.o-ComposerSuggestion',
        "Canned response suggestion should be present"
    );
});

QUnit.test('canned response suggestion correct data', async function (assert) {
    assert.expect(5);

    this.data['mail.channel'].records.push(
        { id: 20 }
    );
    const env = await this.start();
    const thread = env.invoke('Thread/findFromId', {
        $$$id: 20,
        $$$model: 'mail.channel',
    });
    const cannedResponse = env.invoke('CannedResponse/create', {
        $$$id: 7,
        $$$source: 'hello',
        $$$substitution: "Hello, how are you?",
    });
    await this.createComposerSuggestion({
        composer: thread.$$$composer(),
        isActive: true,
        modelName: 'CannedResponse',
        record: cannedResponse,
    });

    assert.containsOnce(
        document.body,
        '.o-ComposerSuggestion',
        "Canned response suggestion should be present"
    );
    assert.containsOnce(
        document.body,
        '.o-ComposerSuggestion-part1',
        "Canned response source should be present"
    );
    assert.strictEqual(
        document.querySelector('.o-ComposerSuggestion-part1').textContent,
        "hello",
        "Canned response source should be displayed"
    );
    assert.containsOnce(
        document.body,
        '.o-ComposerSuggestion-part2',
        "Canned response substitution should be present"
    );
    assert.strictEqual(
        document.querySelector('.o-ComposerSuggestion-part2').textContent,
        "Hello, how are you?",
        "Canned response substitution should be displayed"
    );
});

QUnit.test('canned response suggestion active', async function (assert) {
    assert.expect(2);

    this.data['mail.channel'].records.push(
        { id: 20 }
    );
    const env = await this.start();
    const thread = env.invoke('Thread/findFromId', {
        $$$id: 20,
        $$$model: 'mail.channel',
    });
    const cannedResponse = env.invoke('CannedResponse/create', {
        $$$id: 7,
        $$$source: 'hello',
        $$$substitution: "Hello, how are you?",
    });
    await this.createComposerSuggestion({
        composer: thread.$$$composer(),
        isActive: true,
        modelName: 'CannedResponse',
        record: cannedResponse,
    });

    assert.containsOnce(
        document.body,
        '.o-ComposerSuggestion',
        "Canned response suggestion should be displayed"
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
