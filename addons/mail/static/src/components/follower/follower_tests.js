odoo.define('mail/static/src/components/follower/follower_tests.js', function (require) {
'use strict';

const Follower = require('mail/static/src/components/follower/follower.js');
const {
    'Field/insert': insert,
    'Field/link': link,
} = require('mail/static/src/model/utils.js');
const { makeDeferred } = require('mail/static/src/utils/deferred/deferred.js');
const {
    afterEach,
    afterNextRender,
    beforeEach,
    createRootComponent,
    start,
} = require('mail/static/src/utils/test-utils.js');

const Bus = require('web.Bus');

QUnit.module('mail', {}, function () {
QUnit.module('components', {}, function () {
QUnit.module('follower', {}, function () {
QUnit.module('follower_tests.js', {
    beforeEach() {
        beforeEach(this);

        this.createFollowerComponent = async (follower) => {
            await createRootComponent(this, Follower, {
                props: { follower },
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

QUnit.test('base rendering not editable', async function (assert) {
    assert.expect(5);

    const env = await this.start();
    const thread = env.invoke('Thread/create', {
        $$$id: 100,
        $$$model: 'res.partner',
    });
    const follower = await env.invoke('Follower/create', {
        $$$channel: insert({
            $$$id: 1,
            $$$model: 'mail.channel',
            $$$name: "François Perusse",
        }),
        $$$followedThread: link(thread),
        $$$id: 2,
        $$$isActive: true,
        $$$isEditable: false,
    });
    await this.createFollowerComponent(follower);
    assert.containsOnce(
        document.body,
        '.o-Follower',
        "should have follower component"
    );
    assert.containsOnce(
        document.body,
        '.o-Follower-details',
        "should display a details part"
    );
    assert.containsOnce(
        document.body,
        '.o-Follower-avatar',
        "should display the avatar of the follower"
    );
    assert.containsOnce(
        document.body,
        '.o-Follower-name',
        "should display the name of the follower"
    );
    assert.containsNone(
        document.body,
        '.o-Follower-button',
        "should have no button as follower is not editable"
    );
});

QUnit.test('base rendering editable', async function (assert) {
    assert.expect(6);

    const env = await this.start();
    const thread = env.invoke('Thread/create', {
        $$$id: 100,
        $$$model: 'res.partner',
    });
    const follower = await env.invoke('Follower/create', {
        $$$channel: insert({
            $$$id: 1,
            $$$model: 'mail.channel',
            $$$name: "François Perusse",
        }),
        $$$followedThread: link(thread),
        $$$id: 2,
        $$$isActive: true,
        $$$isEditable: true,
    });
    await this.createFollowerComponent(follower);
    assert.containsOnce(
        document.body,
        '.o-Follower',
        "should have follower component"
    );
    assert.containsOnce(
        document.body,
        '.o-Follower-details',
        "should display a details part"
    );
    assert.containsOnce(
        document.body,
        '.o-Follower-avatar',
        "should display the avatar of the follower"
    );
    assert.containsOnce(
        document.body,
        '.o-Follower-name',
        "should display the name of the follower"
    );
    assert.containsOnce(
        document.body,
        '.o-Follower-editButton',
        "should have an edit button"
    );
    assert.containsOnce(
        document.body,
        '.o-Follower-removeButton',
        "should have a remove button"
    );
});

QUnit.test('click on channel follower details', async function (assert) {
    assert.expect(7);

    const bus = new Bus();
    bus.on('do-action', null, payload => {
        assert.step('do_action');
        assert.strictEqual(
            payload.action.res_id,
            10,
            "The redirect action should redirect to the right res id (10)"
        );
        assert.strictEqual(
            payload.action.res_model,
            'mail.channel',
            "The redirect action should redirect to the right res model (mail.channel)"
        );
        assert.strictEqual(
            payload.action.type,
            "ir.actions.act_window",
            "The redirect action should be of type 'ir.actions.act_window'"
        );
    });
    this.data['mail.channel'].records.push(
        { id: 10 }
    );
    this.data['res.partner'].records.push(
        { id: 100 }
    );
    const env = await this.start({
        env: { bus },
    });
    const thread = env.invoke('Thread/create', {
        $$$id: 100,
        $$$model: 'res.partner',
    });
    const follower = await env.invoke('Follower/create', {
        $$$channel: insert({
            $$$id: 10,
            $$$model: 'mail.channel',
            $$$name: "channel",
        }),
        $$$followedThread: link(thread),
        $$$id: 2,
        $$$isActive: true,
        $$$isEditable: true,
    });
    await this.createFollowerComponent(follower);
    assert.containsOnce(
        document.body,
        '.o-Follower',
        "should have follower component"
    );
    assert.containsOnce(
        document.body,
        '.o-Follower-details',
        "should display a details part"
    );

    document.querySelector('.o-Follower-details').click();
    assert.verifySteps(
        ['do_action'],
        "clicking on channel should redirect to channel form view"
    );
});

QUnit.test('click on partner follower details', async function (assert) {
    assert.expect(7);

    const openFormDef = makeDeferred();
    const bus = new Bus();
    bus.on('do-action', null, payload => {
        assert.step('do_action');
        assert.strictEqual(
            payload.action.res_id,
            3,
            "The redirect action should redirect to the right res id (3)"
        );
        assert.strictEqual(
            payload.action.res_model,
            'res.partner',
            "The redirect action should redirect to the right res model (res.partner)"
        );
        assert.strictEqual(
            payload.action.type,
            "ir.actions.act_window",
            "The redirect action should be of type 'ir.actions.act_window'"
        );
        openFormDef.resolve();
    });
    this.data['res.partner'].records.push(
        { id: 100 }
    );
    const env = await this.start({
        env: { bus },
    });
    const thread = env.invoke('Thread/create', {
        $$$id: 100,
        $$$model: 'res.partner',
    });
    const follower = await env.invoke('Follower/create', {
        $$$followedThread: link(thread),
        $$$id: 2,
        $$$isActive: true,
        $$$isEditable: true,
        $$$partner: insert({
            $$$email: "bla@bla.bla",
            $$$id: env.messaging.$$$currentPartner().$$$id(),
            $$$name: "François Perusse",
        }),
    });
    await this.createFollowerComponent(follower);
    assert.containsOnce(
        document.body,
        '.o-Follower',
        "should have follower component"
    );
    assert.containsOnce(
        document.body,
        '.o-Follower-details',
        "should display a details part"
    );

    document.querySelector('.o-Follower-details').click();
    await openFormDef;
    assert.verifySteps(
        ['do_action'],
        "clicking on follower should redirect to partner form view"
    );
});

QUnit.test('click on edit follower', async function (assert) {
    assert.expect(5);

    this.data['mail.followers'].records.push(
        {
            id: 2,
            is_active: true,
            is_editable: true,
            partner_id: this.data.currentPartnerId,
            res_id: 100,
            res_model: 'res.partner',
        }
    );
    this.data['res.partner'].records.push(
        {
            id: 100,
            message_follower_ids: [2],
        }
    );
    const env = await this.start({
        hasDialog: true,
        async mockRPC(route, args) {
            if (route.includes('/mail/read_subscription_data')) {
                assert.step('fetch_subtypes');
            }
            return this._super(...arguments);
        },
    });
    const thread = env.invoke('Thread/create', {
        $$$id: 100,
        $$$model: 'res.partner',
    });
    await env.invoke('Thread/refreshFollowers', thread);
    await this.createFollowerComponent(thread.$$$followers()[0]);
    assert.containsOnce(
        document.body,
        '.o-Follower',
        "should have follower component"
    );
    assert.containsOnce(
        document.body,
        '.o-Follower-editButton',
        "should display an edit button"
    );

    await afterNextRender(() =>
        document.querySelector('.o-Follower-editButton').click()
    );
    assert.verifySteps(
        ['fetch_subtypes'],
        "clicking on edit follower should fetch subtypes"
    );
    assert.containsOnce(
        document.body,
        '.o-FollowerSubtypeList',
        "A dialog allowing to edit follower subtypes should have been created"
    );
});

QUnit.test('edit follower and close subtype dialog', async function (assert) {
    assert.expect(6);

    this.data['res.partner'].records.push(
        { id: 100 }
    );
    const env = await this.start({
        hasDialog: true,
        async mockRPC(route, args) {
            if (route.includes('/mail/read_subscription_data')) {
                assert.step('fetch_subtypes');
                return [{
                    default: true,
                    followed: true,
                    internal: false,
                    id: 1,
                    name: "Dummy test",
                    res_model: 'res.partner'
                }];
            }
            return this._super(...arguments);
        },
    });
    const thread = env.invoke('Thread/create', {
        $$$id: 100,
        $$$model: 'res.partner',
    });
    const follower = await env.invoke('Follower/create', {
        $$$followedThread: link(thread),
        $$$id: 2,
        $$$isActive: true,
        $$$isEditable: true,
        $$$partner: insert({
            $$$email: "bla@bla.bla",
            $$$id: env.messaging.$$$currentPartner().$$$id(),
            $$$name: "François Perusse",
        }),
    });
    await this.createFollowerComponent(follower);
    assert.containsOnce(
        document.body,
        '.o-Follower',
        "should have follower component"
    );
    assert.containsOnce(
        document.body,
        '.o-Follower-editButton',
        "should display an edit button"
    );

    await afterNextRender(() =>
        document.querySelector('.o-Follower-editButton').click()
    );
    assert.verifySteps(
        ['fetch_subtypes'],
        "clicking on edit follower should fetch subtypes"
    );
    assert.containsOnce(
        document.body,
        '.o-FollowerSubtypeList',
        "dialog allowing to edit follower subtypes should have been created"
    );

    await afterNextRender(
        () => document.querySelector('.o-FollowerSubtypeList-closeButton').click()
    );
    assert.containsNone(
        document.body,
        '.o-DialogManager-dialog',
        "follower subtype dialog should be closed after clicking on close button"
    );
});

});
});
});

});
