odoo.define('mail/static/src/components/attachment-box/attachment-box_tests.js', function (require) {
"use strict";

const AttachmentBox = require('mail/static/src/components/attachment-box/attachment-box.js');
const {
    'Field/insert': insert,
} = require('mail/static/src/model/utils.js');
const {
    afterEach,
    afterNextRender,
    beforeEach,
    createRootComponent,
    dragenterFiles,
    dropFiles,
    start,
} = require('mail/static/src/utils/test-utils.js');

const { file: { createFile } } = require('web.test_utils');

QUnit.module('mail', {}, function () {
QUnit.module('components', {}, function () {
QUnit.module('attachment-box', {}, function () {
QUnit.module('attachment-box_tests.js', {
    beforeEach() {
        beforeEach(this);

        this.createAttachmentBoxComponent = async (thread, otherProps) => {
            await createRootComponent(this, AttachmentBox, {
                props: {
                    thread,
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

QUnit.test('base empty rendering', async function (assert) {
    assert.expect(4);

    const env = await this.start();
    const thread = env.invoke('Thread/create', {
        $$$id: 100,
        $$$model: 'res.partner',
    });
    await this.createAttachmentBoxComponent(thread);
    assert.containsOnce(
        document.body,
        '.o-AttachmentBox',
        "should have an attachment box"
    );
    assert.containsOnce(
        document.body,
        '.o-AttachmentBox-buttonAdd',
        "should have a button add"
    );
    assert.containsOnce(
        document.body,
        '.o-FileUploader-input',
        "should have a file input"
    );
    assert.containsNone(
        document.body,
        `
            .o-AttachmentBox
            .o-Attachment
        `,
        "should not have any attachment"
    );
});

QUnit.test('base non-empty rendering', async function (assert) {
    assert.expect(6);

    this.data['ir.attachment'].records.push(
        {
            mimetype: 'text/plain',
            name: 'Blah.txt',
            res_id: 100,
            res_model: 'res.partner',
        },
        {
            mimetype: 'text/plain',
            name: 'Blu.txt',
            res_id: 100,
            res_model: 'res.partner',
        }
    );
    const env = await this.start({
        async mockRPC(route, args) {
            if (route.includes('ir.attachment/search_read')) {
                assert.step('ir.attachment/search_read');
            }
            return this._super(...arguments);
        },
    });
    const thread = env.invoke('Thread/create', {
        $$$id: 100,
        $$$model: 'res.partner',
    });
    await env.invoke('Thread/fetchAttachments', thread);
    await this.createAttachmentBoxComponent(thread);
    assert.verifySteps(
        ['ir.attachment/search_read'],
        "should have fetched attachments"
    );
    assert.containsOnce(
        document.body,
        '.o-AttachmentBox',
        "should have an attachment box"
    );
    assert.containsOnce(
        document.body,
        '.o-AttachmentBox-buttonAdd',
        "should have a button add"
    );
    assert.containsOnce(
        document.body,
        '.o-FileUploader-input',
        "should have a file input"
    );
    assert.containsOnce(
        document.body,
        '.o-AttachmentBox-AttachmentList',
        "should have an attachment list"
    );
});

QUnit.test('attachment box: drop attachments', async function (assert) {
    assert.expect(5);

    const env = await this.start();
    const thread = env.invoke('Thread/create', {
        $$$id: 100,
        $$$model: 'res.partner',
    });
    await env.invoke('Thread/fetchAttachments', thread);
    await this.createAttachmentBoxComponent(thread);
    const files = [
        await createFile({
            content: 'hello, world',
            contentType: 'text/plain',
            name: 'text.txt',
        }),
    ];
    assert.containsOnce(
        document.body,
        '.o-AttachmentBox',
        "should have an attachment box"
    );

    await afterNextRender(() =>
        dragenterFiles(document.querySelector('.o-AttachmentBox'))
    );
    assert.containsOnce(
        document.body,
        '.o-AttachmentBox-dropZone',
        "should have a drop zone"
    );
    assert.containsNone(
        document.body,
        `
            .o-AttachmentBox
            .o-Attachment
        `,
        "should have no attachment before files are dropped"
    );

    await afterNextRender(() =>
        dropFiles(
            document.querySelector('.o-AttachmentBox-dropZone'),
            files
        )
    );
    assert.containsOnce(
        document.body,
        `
            .o-AttachmentBox
            .o-Attachment
        `,
        "should have 1 attachment in the box after files dropped"
    );

    await afterNextRender(() =>
        dragenterFiles(document.querySelector('.o-AttachmentBox'))
    );
    const file1 = await createFile({
        content: 'hello, world',
        contentType: 'text/plain',
        name: 'text2.txt',
    });
    const file2 = await createFile({
        content: 'hello, world',
        contentType: 'text/plain',
        name: 'text3.txt',
    });
    await afterNextRender(() =>
        dropFiles(
            document.querySelector('.o-AttachmentBox-dropZone'),
            [file1, file2]
        )
    );
    assert.containsN(
        document.body,
        `
            .o-AttachmentBox
            .o-Attachment
        `,
        3,
        "should have 3 attachments in the box after files dropped"
    );
});

QUnit.test('view attachments', async function (assert) {
    assert.expect(7);

    const env = await this.start({
        hasDialog: true,
    });
    const thread = env.invoke('Thread/create', {
        $$$attachments: [
            insert({
                $$$id: 143,
                $$$mimetype: 'text/plain',
                $$$name: 'Blah.txt'
            }),
            insert({
                $$$id: 144,
                $$$mimetype: 'text/plain',
                $$$name: 'Blu.txt'
            })
        ],
        $$$id: 100,
        $$$model: 'res.partner',
    });
    const firstAttachment = env.invoke('Attachment/findFromId', {
        $$$id: 143,
    });
    await this.createAttachmentBoxComponent(thread);
    await afterNextRender(() =>
        document.querySelector(`
            .o-Attachment[data-attachment-local-id="${firstAttachment.localId}"]
            .o-Attachment-image
        `).click()
    );
    assert.containsOnce(
        document.body,
        '.o-Dialog',
        "a dialog should have been opened once attachment image is clicked",
    );
    assert.containsOnce(
        document.body,
        '.o-AttachmentViewer',
        "an attachment viewer should have been opened once attachment image is clicked",
    );
    assert.strictEqual(
        document.querySelector('.o-AttachmentViewer-name').textContent,
        'Blah.txt',
        "attachment viewer iframe should point to clicked attachment",
    );
    assert.containsOnce(
        document.body,
        '.o-AttachmentViewer-buttonNavigationNext',
        "attachment viewer should allow to see next attachment",
    );

    await afterNextRender(() =>
        document.querySelector('.o-AttachmentViewer-buttonNavigationNext').click()
    );
    assert.strictEqual(
        document.querySelector('.o-AttachmentViewer-name').textContent,
        'Blu.txt',
        "attachment viewer iframe should point to next attachment of attachment box",
    );
    assert.containsOnce(
        document.body,
        '.o-AttachmentViewer-buttonNavigationNext',
        "attachment viewer should allow to see next attachment",
    );

    await afterNextRender(() =>
        document.querySelector('.o-AttachmentViewer-buttonNavigationNext').click()
    );
    assert.strictEqual(
        document.querySelector('.o-AttachmentViewer-name').textContent,
        'Blah.txt',
        "attachment viewer iframe should point anew to first attachment",
    );
});

QUnit.test('remove attachment should ask for confirmation', async function (assert) {
    assert.expect(5);

    const env = await this.start();
    const thread = env.invoke('Thread/create', {
        $$$attachments: insert({
            $$$id: 143,
            $$$mimetype: 'text/plain',
            $$$name: 'Blah.txt'
        }),
        $$$id: 100,
        $$$model: 'res.partner',
    });
    await this.createAttachmentBoxComponent(thread);
    assert.containsOnce(
        document.body,
        '.o-Attachment',
        "should have an attachment",
    );
    assert.containsOnce(
        document.body,
        '.o-Attachment-actionUnlink',
        "attachment should have a delete button"
    );

    await afterNextRender(() =>
        document.querySelector('.o-Attachment-actionUnlink').click()
    );
    assert.containsOnce(
        document.body,
        '.o-AttachmentDeleteConfirmDialog',
        "A confirmation dialog should have been opened"
    );
    assert.strictEqual(
        document.querySelector('.o-AttachmentDeleteConfirmDialog-mainText').textContent,
        `Do you really want to delete "Blah.txt"?`,
        "Confirmation dialog should contain the attachment delete confirmation text"
    );

    // Confirm the deletion
    await afterNextRender(() =>
        document.querySelector('.o-AttachmentDeleteConfirmDialog-confirmButton').click()
    );
    assert.containsNone(
        document.body,
        '.o-Attachment',
        "should no longer have an attachment",
    );
});

});
});
});

});
