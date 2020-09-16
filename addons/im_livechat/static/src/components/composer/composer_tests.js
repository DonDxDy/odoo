odoo.define('im_livechat/static/src/components/composer/composer_tests.js', function (require) {
'use strict';

const Composer = require('mail/static/src/components/composer/composer.js');
const {
    afterEach,
    beforeEach,
    createRootComponent,
    start,
} = require('mail/static/src/utils/test-utils.js');

QUnit.module('im_livechat', {}, function () {
QUnit.module('components', {}, function () {
QUnit.module('composer', {}, function () {
QUnit.module('composer_tests.js', {
    beforeEach() {
        beforeEach(this);

        this.createComposerComponent = async (composer, otherProps) => {
            await createRootComponent(this, Composer, {
                props: {
                    composer,
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

QUnit.test('livechat: no add attachment button', async function (assert) {
    // Attachments are not yet supported in livechat, especially from livechat
    // visitor PoV. This may likely change in the future with task-2029065.
    assert.expect(2);

    const env = await this.start();
    const thread = env.invoke('Thread/create', {
        $$$channelType: 'livechat',
        $$$id: 10,
        $$$model: 'mail.channel',
    });
    await this.createComposerComponent(thread.$$$composer());
    assert.containsOnce(
        document.body,
        '.o-Composer',
        "should have a composer"
    );
    assert.containsNone(
        document.body,
        '.o-Composer-buttonAttachment',
        "composer linked to livechat should not have a 'Add attachment' button"
    );
});

});
});
});

});
