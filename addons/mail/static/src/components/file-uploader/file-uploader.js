odoo.define('mail/static/src/components/file-uploader/file-uploader.js', function (require) {
'use strict';

const usingModels = require('mail/static/src/component-mixins/using-models/using-models.js');

const core = require('web.core');

const { Component } = owl;
const { useRef } = owl.hooks;

class FileUploader extends usingModels(Component) {

    /**
     * @override
     */
    constructor(...args) {
        super(...args);
        this._fileInputRef = useRef('fileInput');
        this._fileUploadId = _.uniqueId('o-FileUploader-fileupload');
        this._onAttachmentUploaded = this._onAttachmentUploaded.bind(this);
    }

    mounted() {
        $(window).on(this._fileUploadId, this._onAttachmentUploaded);
    }

    willUnmount() {
        $(window).off(this._fileUploadId);
    }

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * @param {FileList|Array} files
     * @returns {Promise}
     */
    async uploadFiles(files) {
        await this._unlinkExistingAttachments(files);
        this._createTemporaryAttachments(files);
        await this._performUpload(files);
        this._fileInputRef.el.value = '';
    }

    openBrowserFileUploader() {
        this._fileInputRef.el.click();
    }

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * @private
     * @param {Object} fileData
     * @returns {Attachment}
     */
     _createAttachment(fileData) {
        return this.env.invoke('Attachment/create', {
            ...fileData,
            ...this.newAttachmentExtraData
        });
    }

    /**
     * @private
     * @param {File} file
     * @returns {FormData}
     */
    _createFormData(file) {
        let formData = new window.FormData();
        formData.append('callback', this._fileUploadId);
        formData.append('csrf_token', core.csrf_token);
        formData.append('id', this.uploadId);
        formData.append('model', this.uploadModel);
        formData.append('ufile', file, file.name);
        return formData;
    }

    /**
     * @private
     * @param {FileList|Array} files
     */
    _createTemporaryAttachments(files) {
        for (const file of files) {
            this._createAttachment({
                $$$filename: file.name,
                $$$isTemporary: true,
                $$$name: file.name
            });
        }
    }
    /**
     * @private
     * @param {FileList|Array} files
     * @returns {Promise}
     */
    async _performUpload(files) {
        for (const file of files) {
            const uploadingAttachment = this.env.invoke('Attachment/find',
                attachment => (
                    attachment.$$$isTemporary(this) &&
                    attachment.$$$filename(this) === file.name
                )
            );

            try {
                const response = await this.env.browser.fetch('/web/binary/upload_attachment', {
                    method: 'POST',
                    body: this._createFormData(file),
                    signal: uploadingAttachment.$$$uploadingAbortController(this).signal,
                });
                let html = await response.text();
                const template = document.createElement('template');
                template.innerHTML = html.trim();
                window.eval(template.content.firstChild.textContent);
            } catch (e) {
                if (e.name !== 'AbortError') {
                    throw e;
                }
            }
        }
    }

    /**
     * @private
     * @param {FileList|Array} files
     * @returns {Promise}
     */
    async _unlinkExistingAttachments(files) {
        for (const file of files) {
            const attachment = this.attachments
                .find(
                    attachment => (
                        attachment.$$$name(this) === file.name &&
                        attachment.$$$size(this) === file.size
                    )
                );
            // if the files already exits, delete the file before upload
            if (attachment) {
                this.env.invoke('Attachment/remove', attachment);
            }
        }
    }

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * @private
     * @param {jQuery.Event} ev
     * @param {...Object} filesData
     */
    async _onAttachmentUploaded(ev, ...filesData) {
        for (const fileData of filesData) {
            const {
                error,
                filename,
                id, mimetype,
                name,
                size,
            } = fileData;
            if (error || !id) {
                this.env.services['notification'].notify({
                    type: 'danger',
                    message: owl.utils.escape(error),
                });
                const relatedTemporaryAttachments = this.env.invoke('Attachment/find',
                    attachment => (
                        attachment.$$$filename(this) === filename &&
                        attachment.$$$isTemporary(this)
                    )
                );
                for (const attachment of relatedTemporaryAttachments) {
                    this.env.invoke('Attachment/delete', attachment);
                }
                return;
            }
            // FIXME : needed to avoid problems on uploading
            // Without this the useStore selector of component could be not called
            // E.g. in attachment_box_tests.js
            await new Promise(resolve => setTimeout(resolve));
            const attachment = this._createAttachment({
                $$$filename: filename,
                $$$id: id,
                $$$mimetype: mimetype,
                $$$name: name,
                $$$size: size,
            });
            this.trigger('o-attachment-created', { attachment });
        }
    }

    /**
     * Called when there are changes in the file input.
     *
     * @private
     * @param {Event} ev
     * @param {EventTarget} ev.target
     * @param {FileList|Array} ev.target.files
     */
    async _onChangeAttachment(ev) {
        await this.uploadFiles(ev.target.files);
    }

}

Object.assign(FileUploader, {
    defaultProps: {
        uploadId: 0,
        uploadModel: 'mail.compose.message'
    },
    props: {
        attachments: {
            type: Array,
            element: Object,
            validate(p) {
                for (const i of p) {
                    if (i.constructor.modelName !== 'Attachment') {
                        return false;
                    }
                }
                return true;
            },
        },
        newAttachmentExtraData: {
            type: Object,
            optional: true,
        },
        uploadId: Number,
        uploadModel: String,
    },
    template: 'mail.FileUploader',
});

return FileUploader;

});
