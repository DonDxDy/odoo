odoo.define('mail/static/src/components/attachment-list/attachment-list.js', function (require) {
'use strict';

const { Component, QWeb } = owl;

class AttachmentList extends Component {}

Object.assign(AttachmentList, {
    defaultProps: {
        attachments: [],
    },
    props: {
        areAttachmentsDownloadable: {
            type: Boolean,
            optional: true,
        },
        areAttachmentsEditable: {
            type: Boolean,
            optional: true,
        },
        attachments: {
            type: Array,
            element: Object,
            validate(p) {
                for (const i of p) {
                    if (p.constructor.modelName !== 'Attachment') {
                        return false;
                    }
                }
                return true;
            },
        },
        attachmentsDetailsMode: {
            type: String,
            optional: true,
            validate: prop => ['auto', 'card', 'hover', 'none'].includes(prop),
        },
        attachmentsImageSize: {
            type: String,
            optional: true,
            validate: prop => ['small', 'medium', 'large'].includes(prop),
        },
        showAttachmentsExtensions: {
            type: Boolean,
            optional: true,
        },
        showAttachmentsFilenames: {
            type: Boolean,
            optional: true,
        },
    },
    template: 'mail.AttachmentList',
});

QWeb.registerComponent('AttachmentList', AttachmentList);

return AttachmentList;

});
