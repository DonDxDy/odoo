odoo.define('mail/static/src/components/follower-subtype/follower-subtype_tests.js', function (require) {
'use strict';

const FollowerSubtype = require('mail/static/src/components/follower-subtype/follower-subtype.js');
const {
    'Field/insert': insert,
    'Field/link': link,
} = require('mail/static/src/model/utils.js');
const {
    afterEach,
    afterNextRender,
    beforeEach,
    createRootComponent,
    start,
} = require('mail/static/src/utils/test-utils.js');

QUnit.module('mail', {}, function () {
QUnit.module('components', {}, function () {
QUnit.module('follower-subtype', {}, function () {
QUnit.module('follower-subtype_tests.js', {
    beforeEach() {
        beforeEach(this);

        this.createFollowerSubtypeComponent = async ({ follower, followerSubtype }) => {
            await createRootComponent(this, FollowerSubtype, {
                props: {
                    follower,
                    followerSubtype,
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

QUnit.test('simplest layout of a followed subtype', async function (assert) {
    assert.expect(5);

    const env = await this.start();
    const thread = env.invoke('Thread/create', {
        $$$id: 100,
        $$$model: 'res.partner',
    });
    const follower = env.invoke('Follower/create', {
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
    const followerSubtype = env.invoke('FollowerSubtype/create', {
        $$$id: 1,
        $$$isDefault: true,
        $$$isInternal: false,
        $$$name: "Dummy test",
        $$$resModel: 'res.partner'
    });
    env.invoke('Record/update', follower, {
        $$$selectedSubtypes: link(followerSubtype),
        $$$subtypes: link(followerSubtype),
    });
    await this.createFollowerSubtypeComponent({
        follower,
        followerSubtype,
    });
    assert.containsOnce(
        document.body,
        '.o-FollowerSubtype',
        "should have follower subtype component"
    );
    assert.containsOnce(
        document.body,
        '.o-FollowerSubtype-label',
        "should have a label"
    );
    assert.containsOnce(
        document.body,
        '.o-FollowerSubtype-checkbox',
        "should have a checkbox"
    );
    assert.strictEqual(
        document.querySelector('.o-FollowerSubtype-label').textContent,
        "Dummy test",
        "should have the name of the subtype as label"
    );
    assert.ok(
        document.querySelector('.o-FollowerSubtype-checkbox').checked,
        "checkbox should be checked as follower subtype is followed"
    );
});

QUnit.test('simplest layout of a not followed subtype', async function (assert) {
    assert.expect(5);

    const env = await this.start();
    const thread = env.invoke('Thread/create', {
        $$$id: 100,
        $$$model: 'res.partner',
    });
    const follower = env.invoke('Follower/create', {
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
    const followerSubtype = env.invoke('FollowerSubtype/create', {
        $$$id: 1,
        $$$isDefault: true,
        $$$isInternal: false,
        $$$name: "Dummy test",
        $$$resModel: 'res.partner'
    });
    env.invoke('Record/update', follower, {
        $$$subtypes: link(followerSubtype),
    });
    await this.createFollowerSubtypeComponent({
        follower,
        followerSubtype,
    });
    assert.containsOnce(
        document.body,
        '.o-FollowerSubtype',
        "should have follower subtype component"
    );
    assert.containsOnce(
        document.body,
        '.o-FollowerSubtype-label',
        "should have a label"
    );
    assert.containsOnce(
        document.body,
        '.o-FollowerSubtype-checkbox',
        "should have a checkbox"
    );
    assert.strictEqual(
        document.querySelector('.o-FollowerSubtype-label').textContent,
        "Dummy test",
        "should have the name of the subtype as label"
    );
    assert.notOk(
        document.querySelector('.o-FollowerSubtype-checkbox').checked,
        "checkbox should not be checked as follower subtype is not followed"
    );
});

QUnit.test('toggle follower subtype checkbox', async function (assert) {
    assert.expect(5);

    const env = await this.start();
    const thread = env.invoke('Thread/create', {
        $$$id: 100,
        $$$model: 'res.partner',
    });
    const follower = env.invoke('Follower/create', {
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
    const followerSubtype = env.invoke('FollowerSubtype/create', {
        $$$id: 1,
        $$$isDefault: true,
        $$$isInternal: false,
        $$$name: "Dummy test",
        $$$resModel: 'res.partner'
    });
    env.invoke('Record/update', follower, {
        $$$subtypes: link(followerSubtype),
    });
    await this.createFollowerSubtypeComponent({
        follower,
        followerSubtype,
    });
    assert.containsOnce(
        document.body,
        '.o-FollowerSubtype',
        "should have follower subtype component"
    );
    assert.containsOnce(
        document.body,
        '.o-FollowerSubtype-checkbox',
        "should have a checkbox"
    );
    assert.notOk(
        document.querySelector('.o-FollowerSubtype-checkbox').checked,
        "checkbox should not be checked as follower subtype is not followed"
    );

    await afterNextRender(() =>
        document.querySelector('.o-FollowerSubtype-checkbox').click()
    );
    assert.ok(
        document.querySelector('.o-FollowerSubtype-checkbox').checked,
        "checkbox should now be checked"
    );

    await afterNextRender(() =>
        document.querySelector('.o-FollowerSubtype-checkbox').click()
    );
    assert.notOk(
        document.querySelector('.o-FollowerSubtype-checkbox').checked,
        "checkbox should be no more checked"
    );
});

});
});
});

});
