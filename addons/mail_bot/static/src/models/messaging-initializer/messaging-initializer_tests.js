odoo.define('mail_bot/static/src/models/messaging-initializer/messaging-initializer_tests.js', function (require) {
"use strict";

const {
    afterEach,
    beforeEach,
    start,
} = require('mail/static/src/utils/test-utils.js');

QUnit.module('mail_bot', {}, function () {
QUnit.module('models', {}, function () {
QUnit.module('messaging-initializer', {}, function () {
QUnit.module('messaging-initializer_tests.js', {
    beforeEach() {
        beforeEach(this);

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


QUnit.test('OdooBot initialized at init', async function (assert) {
    // TODO this test should be completed in combination with
    // implementing _mockMailChannelInitOdooBot task-2300480
    assert.expect(2);

    await this.start({
        env: {
            session: {
                odoobot_initialized: false,
            },
        },
        async mockRPC(route, args) {
            if (args.method === 'init_odoobot') {
                assert.step('init_odoobot');
            }
            return this._super(...arguments);
        },
    });

    assert.verifySteps(
        ['init_odoobot'],
        "should have initialized OdooBot at init"
    );
});

});
});
});

});
