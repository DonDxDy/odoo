odoo.define('website_slides/static/src/components/activity/activity_tests.js', function (require) {
'use strict';

const Activity = require('mail/static/src/components/activity/activity.js');
const {
    'Field/insert': insert,
} = require('mail/static/src/model/utils.js');
const {
    afterEach,
    beforeEach,
    createRootComponent,
    start,
} = require('mail/static/src/utils/test-utils.js');

QUnit.module('website_slides', {}, function () {
QUnit.module('components', {}, function () {
QUnit.module('activity', {}, function () {
QUnit.module('activity_tests.js', {
    beforeEach() {
        beforeEach(this);

        this.createActivityComponent = async activity => {
            await createRootComponent(this, Activity, {
                props: { activity },
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

QUnit.test('grant course access', async function (assert) {
    assert.expect(8);

    const env = await this.start({
        async mockRPC(route, args) {
            if (args.method === 'action_grant_access') {
                assert.strictEqual(args.args.length, 1);
                assert.strictEqual(args.args[0].length, 1);
                assert.strictEqual(args.args[0][0], 100);
                assert.strictEqual(args.kwargs.partner_id, 5);
                assert.step('access_grant');
            }
            return this._super(...arguments);
        },
    });
    const activity = env.invoke('Activity/create', {
        $$$canWrite: true,
        $$$id: 100,
        $$$requestingPartner: insert({
            $$$displayName: "Pauvre pomme",
            $$$id: 5,
        }),
        $$$thread: insert({
            $$$id: 100,
            $$$model: 'slide.channel',
        }),
        $$$type: insert({
            $$$displayName: "Access Request",
            $$$id: 1,
        }),
    });
    await this.createActivityComponent(activity);
    assert.containsOnce(
        document.body,
        '.o-Activity',
        "should have activity component"
    );
    assert.containsOnce(
        document.body,
        '.o-Activity-grantAccessButton',
        "should have grant access button"
    );

    document.querySelector('.o-Activity-grantAccessButton').click();
    assert.verifySteps(
        ['access_grant'],
        "Grant button should trigger the right rpc call"
    );
});

QUnit.test('refuse course access', async function (assert) {
    assert.expect(8);

    const env = await this.start({
        async mockRPC(route, args) {
            if (args.method === 'action_refuse_access') {
                assert.strictEqual(args.args.length, 1);
                assert.strictEqual(args.args[0].length, 1);
                assert.strictEqual(args.args[0][0], 100);
                assert.strictEqual(args.kwargs.partner_id, 5);
                assert.step('access_refuse');
            }
            return this._super(...arguments);
        },
    });
    const activity = env.invoke('Activity/create', {
        $$$canWrite: true,
        $$$id: 100,
        $$$requestingPartner: insert({
            $$$displayName: "Pauvre pomme",
            $$$id: 5,
        }),
        $$$thread: insert({
            $$$id: 100,
            $$$model: 'slide.channel',
        }),
        $$$type: insert({
            $$$displayName: "Access Request",
            $$$id: 1,
        }),
    });
    await this.createActivityComponent(activity);
    assert.containsOnce(
        document.body,
        '.o-Activity',
        "should have activity component"
    );
    assert.containsOnce(
        document.body,
        '.o-Activity-refuseAccessButton',
        "should have refuse access button"
    );

    document.querySelector('.o-Activity-refuseAccessButton').click();
    assert.verifySteps(
        ['access_refuse'],
        "refuse button should trigger the right rpc call"
    );
});

});
});
});

});
