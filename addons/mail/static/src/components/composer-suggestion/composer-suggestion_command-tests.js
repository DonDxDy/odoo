odoo.define('mail/static/src/components/composer-suggestion/composer-suggestion_command-tests.js', function (require) {
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
QUnit.module('composer-suggestion_command-tests.js', {
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

QUnit.test('command suggestion displayed', async function (assert) {
    assert.expect(1);

    this.data['mail.channel'].records.push(
        { id: 20 }
    );
    const env = await this.start();
    const thread = env.invoke('Thread/findFromId', {
        $$$id: 20,
        $$$model: 'mail.channel',
    });
    const command = env.invoke('ChannelCommand/create', {
        $$$name: 'whois',
        $$$help: "Displays who it is",
    });
    await this.createComposerSuggestion({
        composer: thread.$$$composer(),
        isActive: true,
        modelName: 'ChannelCommand',
        record: command,
    });
    assert.containsOnce(
        document.body,
        '.o-ComposerSuggestion',
        "Command suggestion should be present"
    );
});

QUnit.test('command suggestion correct data', async function (assert) {
    assert.expect(5);

    this.data['mail.channel'].records.push(
        { id: 20 }
    );
    const env = await this.start();
    const thread = env.invoke('Thread/findFromId', {
        $$$id: 20,
        $$$model: 'mail.channel',
    });
    const command = env.invoke('ChannelCommand/create', {
        $$$name: 'whois',
        $$$help: "Displays who it is",
    });
    await this.createComposerSuggestion({
        composer: thread.$$$composer(),
        isActive: true,
        modelName: 'ChannelCommand',
        record: command,
    });
    assert.containsOnce(
        document.body,
        '.o-ComposerSuggestion',
        "Command suggestion should be present"
    );
    assert.containsOnce(
        document.body,
        '.o-ComposerSuggestion-part1',
        "Command name should be present"
    );
    assert.strictEqual(
        document.querySelector('.o-ComposerSuggestion-part1').textContent,
        "whois",
        "Command name should be displayed"
    );
    assert.containsOnce(
        document.body,
        '.o-ComposerSuggestion-part2',
        "Command help should be present"
    );
    assert.strictEqual(
        document.querySelector('.o-ComposerSuggestion-part2').textContent,
        "Displays who it is",
        "Command help should be displayed"
    );
});

QUnit.test('command suggestion active', async function (assert) {
    assert.expect(2);

    this.data['mail.channel'].records.push(
        { id: 20 }
    );
    const env = await this.start();
    const thread = env.invoke('Thread/findFromId', {
        $$$id: 20,
        $$$model: 'mail.channel',
    });
    const command = env.invoke('ChannelCommand/create', {
        $$$name: 'whois',
        $$$help: "Displays who it is",
    });
    await this.createComposerSuggestion({
        composer: thread.$$$composer(),
        isActive: true,
        modelName: 'ChannelCommand',
        record: command,
    });
    assert.containsOnce(
        document.body,
        '.o-ComposerSuggestion',
        "Command suggestion should be displayed"
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
