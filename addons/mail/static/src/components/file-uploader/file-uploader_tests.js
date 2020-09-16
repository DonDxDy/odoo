odoo.define('mail/static/src/components/file-uploader/file-uploader_tests.js', function (require) {
"use strict";

const FileUploader = require('mail/static/src/components/file-uploader/file-uploader.js');
const {
    afterEach,
    beforeEach,
    createRootComponent,
    nextAnimationFrame,
    start,
} = require('mail/static/src/utils/test-utils.js');

const {
    file: {
        createFile,
        inputFiles,
    },
} = require('web.test_utils');

QUnit.module('mail', {}, function () {
QUnit.module('components', {}, function () {
QUnit.module('file-uploader', {}, function () {
QUnit.module('file-uploader_tests.js', {
    beforeEach() {
        beforeEach(this);
        this.components = [];

        this.createFileUploaderComponent = async otherProps => {
            return createRootComponent(this, FileUploader, {
                props: {
                    attachments: [],
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

QUnit.test('no conflicts between file uploaders', async function (assert) {
    assert.expect(2);

    const env = await this.start();
    const fileUploader1 = await this.createFileUploaderComponent();
    const fileUploader2 = await this.createFileUploaderComponent();
    const file1 = await createFile({
        name: 'text1.txt',
        content: 'hello, world',
        contentType: 'text/plain',
    });
    inputFiles(
        fileUploader1.el.querySelector('.o-FileUploader-input'),
        [file1]
    );
    await nextAnimationFrame(); // we can't use afterNextRender as fileInput are display:none
    assert.strictEqual(
        env.invoke('Attachment/all').length,
        1,
        'Uploaded file should be the only attachment created'
    );

    const file2 = await createFile({
        name: 'text2.txt',
        content: 'hello, world',
        contentType: 'text/plain',
    });
    inputFiles(
        fileUploader2.el.querySelector('.o-FileUploader-input'),
        [file2]
    );
    await nextAnimationFrame();
    assert.strictEqual(
        env.invoke('Attachment/all').length,
        2,
        'Uploaded file should be the only attachment added'
    );
});

});
});
});

});
