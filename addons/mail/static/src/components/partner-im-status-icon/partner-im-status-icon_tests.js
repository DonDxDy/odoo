odoo.define('mail/static/src/components/partner-im-status-icon/partner-im-status-icon_tests.js', function (require) {
'use strict';

const PartnerImStatusIcon = require('mail/static/src/components/partner-im-status-icon/partner-im-status-icon.js');
const {
    afterEach,
    afterNextRender,
    beforeEach,
    createRootComponent,
    start,
} = require('mail/static/src/utils/test-utils.js');

QUnit.module('mail', {}, function () {
QUnit.module('components', {}, function () {
QUnit.module('partner-im-status-icon', {}, function () {
QUnit.module('partner-im-status-icon_tests.js', {
    beforeEach() {
        beforeEach(this);

        this.createPartnerImStatusIcon = async partner => {
            await createRootComponent(this, PartnerImStatusIcon, {
                props: { partner },
                target: this.widget.el
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

QUnit.test('initially online', async function (assert) {
    assert.expect(3);

    const env = await this.start();
    const partner = env.invoke('Partner/create', {
        $$$id: 7,
        $$$name: "Demo User",
        $$$im_status: 'online',
    });
    await this.createPartnerImStatusIcon(partner);
    assert.containsOnce(
        document.body,
        '.o-PartnerImStatusIcon',
        "should have partner IM status icon"
    );
    assert.strictEqual(
        document.querySelector('.o-PartnerImStatusIcon').dataset.partnerLocalId,
        partner.localId,
        "partner IM status icon should be linked to partner with ID 7"
    );
    assert.containsOnce(
        document.body,
        '.o-PartnerImStatusIcon.o-isOnline',
        "partner IM status icon should have online status rendering"
    );
});

QUnit.test('initially offline', async function (assert) {
    assert.expect(1);

    const env = await this.start();
    const partner = env.invoke('Partner/create', {
        $$$id: 7,
        $$$name: "Demo User",
        $$$im_status: 'offline',
    });
    await this.createPartnerImStatusIcon(partner);
    assert.containsOnce(
        document.body,
        '.o-PartnerImStatusIcon.o-isOffline',
        "partner IM status icon should have offline status rendering"
    );
});

QUnit.test('initially away', async function (assert) {
    assert.expect(1);

    const env = await this.start();
    const partner = env.invoke('Partner/create', {
        $$$id: 7,
        $$$name: "Demo User",
        $$$im_status: 'away',
    });
    await this.createPartnerImStatusIcon(partner);
    assert.containsOnce(
        document.body,
        '.o-PartnerImStatusIcon.o-isAway',
        "partner IM status icon should have away status rendering"
    );
});

QUnit.test('change icon on change partner im_status', async function (assert) {
    assert.expect(4);

    const env = await this.start();
    const partner = env.invoke('Partner/create', {
        $$$id: 7,
        $$$name: "Demo User",
        $$$im_status: 'online',
    });
    await this.createPartnerImStatusIcon(partner);
    assert.containsOnce(
        document.body,
        '.o-PartnerImStatusIcon.o-isOnline',
        "partner IM status icon should have online status rendering"
    );

    await afterNextRender(() =>
        env.invoke('Record/update', partner, {
            $$$im_status: 'offline',
        })
    );
    assert.containsOnce(
        document.body,
        '.o-PartnerImStatusIcon.o-isOffline',
        "partner IM status icon should have offline status rendering"
    );

    await afterNextRender(() =>
        env.invoke('Record/update', partner, {
            $$$im_status: 'away',
        })
    );
    assert.containsOnce(
        document.body,
        '.o-PartnerImStatusIcon.o-isAway',
        "partner IM status icon should have away status rendering"
    );

    await afterNextRender(() =>
        env.invoke('Record/update', partner, {
            $$$im_status: 'online',
        })
    );
    assert.containsOnce(
        document.body,
        '.o-PartnerImStatusIcon.o-isOnline',
        "partner IM status icon should have online status rendering in the end"
    );
});

});
});
});

});
