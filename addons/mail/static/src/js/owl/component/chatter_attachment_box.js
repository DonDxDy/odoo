odoo.define('mail.component.AttachmentBox', function (require) {
'use strict';

const AttachmentList = require('mail.component.AttachmentList');
const core = require('web.core');

const { Component, connect } = owl;

class AttachmentBox extends Component {
    /**
     * @param {...any} args
     */
    constructor(...args) {
        super(...args);

        this.template = 'mail.component.AttachmentBox';
        this.components = { AttachmentList };

        this.fileuploadId = _.uniqueId('o_ChatterAttachmentBox_fileInput');
        this._attachmentUploadedListener = ev => this._onAttachmentUploaded(ev);
    }

    mounted() {
        window.addEventListener(this.fileuploadId, this._attachmentUploadedListener);

        this.env.store.dispatch('fetchDocumentAttachments', {
            resId: this.props.resId,
            resModel: this.props.resModel,
        });
    }

    willUnmount() {
        window.removeEventListener(this.fileuploadId, this._attachmentUploadedListener);
    }

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * @private
     * @param {jQuery.Event} ev
     * @param {...Object} fileData
     */
    _onAttachmentUploaded(ev, ...filesData) {
        for (const fileData of filesData) {
            const {
                error,
                filename,
                id,
                mimetype,
                name,
                size,
            } = fileData;
            if (error || !id) {
                this.env.do_warn(error);
                return;
            }
            this.env.store.commit('createAttachment', {
                filename,
                id,
                mimetype,
                name,
                res_id: this.props.resId,
                res_model: this.props.resModel,
                size,
                uploaded: true,
            });
        }
    }


    /**
     * @private
     * @param {Event} ev
     */
    async _onChangeAttachment(ev) {
        const files = ev.target.files;
        let formData = new window.FormData();
        formData.append('callback', this.fileuploadId);
        formData.append('csrf_token', core.csrf_token);
        formData.append('id', this.props.resId);
        formData.append('model', this.props.resModel);
        for (const file of files) {
            // removing existing key with blank data and appending again with file info
            // In safari, existing key will not be updated when append with new file.
            formData.delete('ufile');
            formData.append('ufile', file, file.name);
            const response = await window.fetch('/web/binary/upload_attachment', {
                method: 'POST',
                body: formData,
            });
            let html = await response.text();
            const template = document.createElement('template');
            template.innerHTML = html.trim();
            window.eval.call(window, template.content.firstChild.textContent);
        }
        this.refs.fileInput.value = '';
    }

    /**
     * @private
     */
    _onClickAddAttachment() {
        this.refs.fileInput.click();
    }
}

return connect(
    AttachmentBox,
    /**
     * @param {Object} state
     * @param {Object} ownProps
     * @param {integer} ownProps.resId
     * @param {string} ownProps.resModel
     * @param {Object} getters
     * @return {Object}
     */
    (state, ownProps, getters) => {
        return {
            imageAttachmentLocalIds: getters.imageAttachments({
                resId: ownProps.resId,
                resModel: ownProps.resModel,
            }).map(att => att.localId),
            nonImageAttachmentLocalIds: getters.nonImageAttachments({
                resId: ownProps.resId,
                resModel: ownProps.resModel,
            }).map(att => att.localId),
        };
    },
    { deep: false }
);

});
