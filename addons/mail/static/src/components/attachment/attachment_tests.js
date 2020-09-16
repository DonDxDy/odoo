odoo.define('mail/static/src/components/attachment/attachment_tests.js', function (require) {
'use strict';

const Attachment = require('mail/static/src/components/attachment/attachment.js');
const {
    afterEach,
    afterNextRender,
    beforeEach,
    createRootComponent,
    start,
} = require('mail/static/src/utils/test-utils.js');

QUnit.module('mail', {}, function () {
QUnit.module('components', {}, function () {
QUnit.module('attachment', {}, function () {
QUnit.module('attachment_tests.js', {
    beforeEach() {
        beforeEach(this);

        this.createAttachmentComponent = async (attachment, otherProps) => {
            await createRootComponent(this, Attachment, {
                props: {
                    attachment,
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

QUnit.test('simplest layout', async function (assert) {
    assert.expect(8);

    const env = await this.start();
    const attachment = env.invoke('Attachment/create', {
        $$$filename: "test.txt",
        $$$id: 750,
        $$$mimetype: 'text/plain',
        $$$name: "test.txt",
    });
    await this.createAttachmentComponent(attachment, {
        detailsMode: 'none',
        isDownloadable: false,
        isEditable: false,
        showExtension: false,
        showFilename: false,
    });
    assert.containsOnce(
        document.body,
        '.o-Attachment',
        "should have attachment component in DOM"
    );
    const attachmentEl = document.querySelector('.o-Attachment');
    assert.strictEqual(
        attachmentEl.dataset.attachmentLocalId,
        env.invoke('Attachment/findFromId', { $$$id: 750 }).localId,
        "attachment component should be linked to attachment store model"
    );
    assert.strictEqual(
        attachmentEl.title,
        "test.txt",
        "attachment should have filename as title attribute"
    );
    assert.containsOnce(
        attachmentEl,
        '.o-Attachment-image',
        "attachment should have an image part"
    );
    const attachmentImage = document.querySelector('.o-Attachment-image');
    assert.hasClass(
        attachmentImage,
        'o_image',
        "attachment should have 'o_image' classname (required for mimetype.scss style)"
    );
    assert.strictEqual(
        attachmentImage.dataset.mimetype,
        'text/plain',
        "attachment should have data-mimetype set (required for mimetype.scss style)"
    );
    assert.containsNone(
        document.body,
        '.o-Attachment-details',
        "attachment should not have a details part"
    );
    assert.containsNone(
        document.body,
        '.o-Attachment-aside',
        "attachment should not have an aside part"
    );
});

QUnit.test('simplest layout + deletable', async function (assert) {
    assert.expect(6);

    const env = await this.start({
        async mockRPC(route, args) {
            if (route.includes('web/image/750')) {
                assert.ok(
                    route.includes('/160x160'),
                    "should fetch image with 160x160 pixels ratio");
                assert.step('fetch_image');
            }
            return this._super(...arguments);
        },
    });
    const attachment = env.invoke('Attachment/create', {
        $$$filename: "test.txt",
        $$$id: 750,
        $$$mimetype: 'text/plain',
        $$$name: "test.txt",
    });
    await this.createAttachmentComponent(attachment, {
        detailsMode: 'none',
        isDownloadable: false,
        isEditable: true,
        showExtension: false,
        showFilename: false
    });
    assert.containsOnce(
        document.body,
        '.o-Attachment',
        "should have attachment component in DOM"
    );
    assert.containsOnce(
        document.body,
        '.o-Attachment-image',
        "attachment should have an image part"
    );
    assert.containsNone(
        document.body,
        '.o-Attachment-details',
        "attachment should not have a details part"
    );
    assert.containsOnce(
        document.body,
        '.o-Attachment-aside',
        "attachment should have an aside part"
    );
    assert.containsOnce(
        document.body,
        '.o-Attachment-asideItem',
        "attachment should have only one aside item"
    );
    assert.containsOnce(
        document.body,
        '.o-Attachment-asideItemUnlink',
        "attachment should have a delete button"
    );
});

QUnit.test('simplest layout + downloadable', async function (assert) {
    assert.expect(6);

    const env = await this.start();
    const attachment = env.invoke('Attachment/create', {
        $$$filename: "test.txt",
        $$$id: 750,
        $$$mimetype: 'text/plain',
        $$$name: "test.txt",
    });
    await this.createAttachmentComponent(attachment, {
        detailsMode: 'none',
        isDownloadable: true,
        isEditable: false,
        showExtension: false,
        showFilename: false
    });
    assert.containsOnce(
        document.body,
        '.o-Attachment',
        "should have attachment component in DOM"
    );
    assert.containsOnce(
        document.body,
        '.o-Attachment-image',
        "attachment should have an image part"
    );
    assert.containsNone(
        document.body,
        '.o-Attachment-details',
        "attachment should not have a details part"
    );
    assert.containsOnce(
        document.body,
        '.o-Attachment-aside',
        "attachment should have an aside part"
    );
    assert.containsOnce(
        document.body,
        '.o-Attachment-asideItem',
        "attachment should have only one aside item"
    );
    assert.containsOnce(
        document.body,
        '.o-Attachment-asideItemDownload',
        "attachment should have a download button"
    );
});

QUnit.test('simplest layout + deletable + downloadable', async function (assert) {
    assert.expect(8);

    const env = await this.start();
    const attachment = env.invoke('Attachment/create', {
        $$$filename: "test.txt",
        $$$id: 750,
        $$$mimetype: 'text/plain',
        $$$name: "test.txt",
    });
    await this.createAttachmentComponent(attachment, {
        detailsMode: 'none',
        isDownloadable: true,
        isEditable: true,
        showExtension: false,
        showFilename: false
    });
    assert.containsOnce(
        document.body,
        '.o-Attachment',
        "should have attachment component in DOM"
    );
    assert.containsOnce(
        document.body,
        '.o-Attachment-image',
        "attachment should have an image part"
    );
    assert.containsNone(
        document.body,
        '.o-Attachment-details',
        "attachment should not have a details part"
    );
    assert.containsOnce(
        document.body,
        '.o-Attachment-aside',
        "attachment should have an aside part"
    );
    assert.hasClass(
        document.querySelector('.o-Attachment-aside'),
        'o-hasMultipleAction',
        "attachment aside should contain multiple actions"
    );
    assert.containsN(
        document.body,
        '.o-Attachment-asideItem',
        2,
        "attachment should have only two aside items"
    );
    assert.containsOnce(
        document.body,
        '.o-Attachment-asideItemDownload',
        "attachment should have a download button"
    );
    assert.containsOnce(
        document.body,
        '.o-Attachment-asideItemUnlink',
        "attachment should have a delete button"
    );
});

QUnit.test('layout with card details', async function (assert) {
    assert.expect(3);

    const env = await this.start();
    const attachment = env.invoke('Attachment/create', {
        $$$filename: "test.txt",
        $$$id: 750,
        $$$mimetype: 'text/plain',
        $$$name: "test.txt",
    });
    await this.createAttachmentComponent(attachment, {
        detailsMode: 'card',
        isDownloadable: false,
        isEditable: false,
        showExtension: false,
        showFilename: false
    });
    assert.containsOnce(
        document.body,
        '.o-Attachment-image',
        "attachment should have an image part"
    );
    assert.containsNone(
        document.body,
        '.o-Attachment-details',
        "attachment should not have a details part"
    );
    assert.containsNone(
        document.body,
        '.o-Attachment-aside',
        "attachment should not have an aside part"
    );
});

QUnit.test('layout with card details and filename', async function (assert) {
    assert.expect(3);

    const env = await this.start();
    const attachment = env.invoke('Attachment/create', {
        $$$filename: "test.txt",
        $$$id: 750,
        $$$mimetype: 'text/plain',
        $$$name: "test.txt",
    });
    await this.createAttachmentComponent(attachment, {
        detailsMode: 'card',
        isDownloadable: false,
        isEditable: false,
        showExtension: false,
        showFilename: true
    });
    assert.containsOnce(
        document.body,
        '.o-Attachment-details',
        "attachment should have a details part"
    );
    assert.containsOnce(
        document.body,
        '.o-Attachment-filename',
        "attachment should not have its filename shown"
    );
    assert.containsNone(
        document.body,
        '.o-Attachment-extension',
        "attachment should have its extension shown"
    );
});

QUnit.test('layout with card details and extension', async function (assert) {
    assert.expect(3);

    const env = await this.start();
    const attachment = env.invoke('Attachment/create', {
        $$$filename: "test.txt",
        $$$id: 750,
        $$$mimetype: 'text/plain',
        $$$name: "test.txt",
    });
    await this.createAttachmentComponent(attachment, {
        detailsMode: 'card',
        isDownloadable: false,
        isEditable: false,
        showExtension: true,
        showFilename: false
    });
    assert.containsOnce(
        document.body,
        '.o-Attachment-details',
        "attachment should have a details part"
    );
    assert.containsNone(
        document.body,
        '.o-Attachment-filename',
        "attachment should not have its filename shown"
    );
    assert.containsOnce(
        document.body,
        '.o-Attachment-extension',
        "attachment should have its extension shown"
    );
});

QUnit.test('layout with card details and filename and extension', async function (assert) {
    assert.expect(3);

    const env = await this.start();
    const attachment = env.invoke('Attachment/create', {
        $$$filename: "test.txt",
        $$$id: 750,
        $$$mimetype: 'text/plain',
        $$$name: "test.txt",
    });
    await this.createAttachmentComponent(attachment, {
        detailsMode: 'card',
        isDownloadable: false,
        isEditable: false,
        showExtension: true,
        showFilename: true
    });
    assert.containsOnce(
        document.body,
        '.o-Attachment-details',
        "attachment should have a details part"
    );
    assert.containsOnce(
        document.body,
        '.o-Attachment-filename',
        "attachment should have its filename shown"
    );
    assert.containsOnce(
        document.body,
        '.o-Attachment-extension',
        "attachment should have its extension shown"
    );
});

QUnit.test('simplest layout with hover details and filename and extension', async function (assert) {
    assert.expect(8);

    const env = await this.start();
    const attachment = env.invoke('Attachment/create', {
        $$$filename: "test.txt",
        $$$id: 750,
        $$$mimetype: 'text/plain',
        $$$name: "test.txt",
    });
    await this.createAttachmentComponent(attachment, {
        detailsMode: 'hover',
        isDownloadable: true,
        isEditable: true,
        showExtension: true,
        showFilename: true
    });
    assert.containsNone(
        document.body,
        '.o-Attachment-details:not(.o-Attachment-imageOverlayDetails)',
        "attachment should not have a details part directly"
    );
    assert.containsOnce(
        document.body,
        '.o-Attachment-imageOverlayDetails',
        "attachment should have a details part in the overlay"
    );
    assert.containsOnce(
        document.body,
        '.o-Attachment-image',
        "attachment should have an image part"
    );
    assert.containsOnce(
        document.body,
        '.o-Attachment-imageOverlay',
        "attachment should have an image overlay part"
    );
    assert.containsOnce(
        document.body,
        '.o-Attachment-filename',
        "attachment should have its filename shown"
    );
    assert.containsOnce(
        document.body,
        '.o-Attachment-extension',
        "attachment should have its extension shown"
    );
    assert.containsOnce(
        document.body,
        '.o-Attachment-actions',
        "attachment should have an actions part"
    );
    assert.containsNone(
        document.body,
        '.o-Attachment-aside',
        "attachment should not have an aside element"
    );
});

QUnit.test('auto layout with image', async function (assert) {
    assert.expect(7);

    const env = await this.start();
    const attachment = env.invoke('Attachment/create', {
        $$$filename: "test.png",
        $$$id: 750,
        $$$mimetype: 'image/png',
        $$$name: "test.png",
    });
    await this.createAttachmentComponent(attachment, {
        detailsMode: 'auto',
        isDownloadable: false,
        isEditable: false,
        showExtension: true,
        showFilename: true
    });
    assert.containsNone(
        document.body,
        '.o-Attachment-details:not(.o-Attachment-imageOverlayDetails)',
        "attachment should not have a details part directly"
    );
    assert.containsOnce(
        document.body,
        '.o-Attachment-imageOverlayDetails',
        "attachment should have a details part in the overlay"
    );
    assert.containsOnce(
        document.body,
        '.o-Attachment-image',
        "attachment should have an image part"
    );
    assert.containsOnce(
        document.body,
        '.o-Attachment-imageOverlay',
        "attachment should have an image overlay part"
    );
    assert.containsOnce(
        document.body,
        '.o-Attachment-filename',
        "attachment should have its filename shown"
    );
    assert.containsOnce(
        document.body,
        '.o-Attachment-extension',
        "attachment should have its extension shown"
    );
    assert.containsNone(
        document.body,
        '.o-Attachment-aside',
        "attachment should not have an aside element"
    );
});

QUnit.test('view attachment', async function (assert) {
    assert.expect(3);

    const env = await this.start({
        hasDialog: true,
    });
    const attachment = env.invoke('Attachment/create', {
        $$$filename: "test.png",
        $$$id: 750,
        $$$mimetype: 'image/png',
        $$$name: "test.png",
    });
    await this.createAttachmentComponent(attachment, {
        detailsMode: 'hover',
        isDownloadable: false,
        isEditable: false,
    });
    assert.containsOnce(
        document.body,
        '.o-Attachment-image',
        "attachment should have an image part"
    );
    await afterNextRender(() => document.querySelector('.o-Attachment-image').click());
    assert.containsOnce(
        document.body,
        '.o-Dialog',
        'a dialog should have been opened once attachment image is clicked',
    );
    assert.containsOnce(
        document.body,
        '.o-AttachmentViewer',
        'an attachment viewer should have been opened once attachment image is clicked',
    );
});

QUnit.test('close attachment viewer', async function (assert) {
    assert.expect(3);

    const env = await this.start({ hasDialog: true });
    const attachment = env.invoke('Attachment/create', {
        $$$filename: "test.png",
        $$$id: 750,
        $$$mimetype: 'image/png',
        $$$name: "test.png",
    });
    await this.createAttachmentComponent(attachment, {
        detailsMode: 'hover',
        isDownloadable: false,
        isEditable: false,
    });
    assert.containsOnce(
        document.body,
        '.o-Attachment-image',
        "attachment should have an image part"
    );

    await afterNextRender(() => document.querySelector('.o-Attachment-image').click());
    assert.containsOnce(
        document.body,
        '.o-AttachmentViewer',
        "an attachment viewer should have been opened once attachment image is clicked",
    );

    await afterNextRender(() =>
        document.querySelector('.o-AttachmentViewer-headerItemButtonClose').click()
    );
    assert.containsNone(
        document.body,
        '.o-Dialog',
        "attachment viewer should be closed after clicking on close button"
    );
});

});
});
});

});
