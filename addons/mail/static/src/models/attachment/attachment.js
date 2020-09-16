odoo.define('mail/static/src/models/attachment/attachment.js', function (require) {
'use strict';

const {
    'Feature/defineSlice': defineFeatureSlice,
    'Field/attr': attr,
    'Field/clear': clear,
    'Field/insert': insert,
    'Field/link': link,
    'Field/many2many': many2many,
    'Field/many2one': many2one,
    'Field/replace': replace,
} = require('mail/static/src/model/utils.js');

return defineFeatureSlice('mail/static/src/models/attachment/attachment.js', {
    actions: {
        /**
         * @param {Object} _
         * @param {Object} data
         * @return {Object}
         */
        'Attachment/convertData'(
            _,
            data
        ) {
            const data2 = {};
            if ('filename' in data) {
                data2.$$$filename = data.filename;
            }
            if ('id' in data) {
                data2.$$$id = data.id;
            }
            if ('mimetype' in data) {
                data2.$$$mimetype = data.mimetype;
            }
            if ('name' in data) {
                data2.$$$name = data.name;
            }
            // relation
            if ('res_id' in data && 'res_model' in data) {
                data2.$$$originThread = insert({
                    $$$id: data.res_id,
                    $$$model: data.res_model,
                });
            }
            return data2;
        },
        /**
         * Remove this attachment globally.
         *
         * @param {Object} param0
         * @param {web.env} param0.env
         * @param {Attachment} attachment
         */
        async 'Attachment/remove'(
            { env },
            attachment
        ) {
            if (!attachment.$$$isTemporary(this)) {
                await env.invoke(
                    'Record/doAsync',
                    attachment,
                    () => env.services.rpc({
                        model: 'ir.attachment',
                        method: 'unlink',
                        args: [attachment.$$$id(this)],
                    }, { shadow: true })
                );
            } else if (attachment.$$$uploadingAbortController(this)) {
                attachment.$$$uploadingAbortController(this).abort();
            }
            env.invoke('Record/delete', attachment);
        },
        /**
         * View provided attachment(s), with given attachment initially. Prompts
         * the attachment viewer.
         *
         * @param {Object} param0
         * @param {web.env} param0.env
         * @param {Object} param1
         * @param {Attachment} [param1.attachment]
         * @param {Attachments[]} param1.attachments
         * @returns {string|undefined} unique id of open dialog, if open
         */
        'Attachment/view'(
            { env },
            {
                attachment,
                attachments,
            }
        ) {
            const hasOtherAttachments = attachments && attachments.length > 0;
            if (!attachment && !hasOtherAttachments) {
                return;
            }
            if (!attachment && hasOtherAttachments) {
                attachment = attachments[0];
            } else if (attachment && !hasOtherAttachments) {
                attachments = [attachment];
            }
            if (!attachments.includes(attachment)) {
                return;
            }
            env.invoke('DialogManager/open',
                env.messaging.$$$dialogManager(this),
                'AttachmentViewer',
                {
                    $$$attachment: link(attachment),
                    $$$attachments: replace(attachments),
                }
            );
        },
    },
    model: {
        name: 'Attachment',
        fields: {
            $$$activities: many2many('Activity', {
                inverse: '$$$attachments',
            }),
            $$$attachmentViewer: many2many('AttachmentViewer', {
                inverse: '$$$attachments',
            }),
            $$$checkSum: attr(),
            $$$composers: many2many('Composer', {
                /**
                 * @param {Object} param0
                 * @param {web.env} param0.env
                 * @param {Attachment} param0.record
                 * @returns {Composer[]}
                 */
                compute({ env, record }) {
                    if (record.$$$isTemporary(this)) {
                        return [];
                    }
                    const relatedTemporaryAttachment = env.invoke('Attachment/find',
                        att => (
                            att.$$$filename(this) === record.$$$filename(this) &&
                            att.$$$isTemporary(this)
                        )
                    );
                    if (relatedTemporaryAttachment) {
                        const composers = relatedTemporaryAttachment.$$$composers(this);
                        env.invoke('Record/delete', relatedTemporaryAttachment);
                        return replace(composers);
                    }
                    return [];
                },
                inverse: '$$$attachments',
            }),
            $$$defaultSource: attr({
                /**
                 * @param {Object} param0
                 * @param {Attachment} param0.record
                 * @returns {string|undefined}
                 */
                compute({ record }) {
                    if (record.$$$fileType(this) === 'image') {
                        return `/web/image/${
                            record.$$$id(this)
                        }?unique=1&amp;signature=${
                            record.$$$checkSum(this)
                        }&amp;model=ir.attachment`;
                    }
                    if (record.$$$fileType(this) === 'application/pdf') {
                        return `/web/static/lib/pdfjs/web/viewer.html?file=/web/content/${
                            record.$$$id(this)
                        }?model%3Dir.attachment`;
                    }
                    if (record.$$$fileType(this) && record.$$$fileType(this).includes('text')) {
                        return `/web/content/${
                            record.$$$id(this)
                        }?model%3Dir.attachment`;
                    }
                    if (record.$$$fileType(this) === 'youtu') {
                        const urlArr = record.$$$url(this).split('/');
                        let token = urlArr[urlArr.length - 1];
                        if (token.includes('watch')) {
                            token = token.split('v=')[1];
                            const amp = token.indexOf('&');
                            if (amp !== -1) {
                                token = token.substring(0, amp);
                            }
                        }
                        return `https://www.youtube.com/embed/${token}`;
                    }
                    if (record.$$$fileType(this) === 'video') {
                        return `/web/image/${record.$$$id(this)}?model=ir.attachment`;
                    }
                    return clear();
                },
            }),
            $$$displayName: attr({
                /**
                 * @param {Object} param0
                 * @param {Attachment} param0.record
                 * @returns {string|undefined}
                 */
                compute({ record }) {
                    const displayName = (
                        record.$$$name(this) ||
                        record.$$$filename(this)
                    );
                    if (displayName) {
                        return displayName;
                    }
                    return clear();
                },
            }),
            $$$extension: attr({
                /**
                 * @param {Object} param0
                 * @param {Attachment} param0.record
                 * @returns {string|undefined}
                 */
                compute({ record }) {
                    const extension = (
                        record.$$$filename(this) &&
                        record.$$$filename(this).split('.').pop()
                    );
                    if (extension) {
                        return extension;
                    }
                    return clear();
                },
            }),
            $$$filename: attr(),
            $$$fileType: attr({
                /**
                 * @param {Object} param0
                 * @param {Attachment} param0.record
                 * @returns {string|undefined}
                 */
                compute({ record }) {
                    if (record.$$$type(this) === 'url' && !record.$$$url(this)) {
                        return clear();
                    } else if (!record.$$$mimetype(this)) {
                        return clear();
                    }
                    const match = record.$$$type(this) === 'url'
                        ? record.$$$url(this).match('(youtu|.png|.jpg|.gif)')
                        : record.$$$mimetype(this).match('(image|video|application/pdf|text)');
                    if (!match) {
                        return clear();
                    }
                    if (match[1].match('(.png|.jpg|.gif)')) {
                        return 'image';
                    }
                    return match[1];
                },
            }),
            $$$id: attr({
                id: true,
            }),
            $$$isLinkedToComposer: attr({
                /**
                 * @param {Object} param0
                 * @param {Attachment} param0.record
                 * @returns {boolean}
                 */
                compute({ record }) {
                    return record.$$$composers(this).length > 0;
                },
            }),
            $$$isTemporary: attr({
                default: false,
            }),
            $$$isTextFile: attr({
                /**
                 * @param {Object} param0
                 * @param {Attachment} param0.record
                 * @returns {boolean}
                 */
                compute({ record }) {
                    if (!record.$$$fileType(this)) {
                        return false;
                    }
                    return record.$$$fileType(this).includes('text');
                },
            }),
            $$$isViewable: attr({
                /**
                 * @param {Object} param0
                 * @param {Attachment} param0.record
                 * @returns {boolean}
                 */
                compute({ record }) {
                    return (
                        record.$$$mediaType(this) === 'image' ||
                        record.$$$mediaType(this) === 'video' ||
                        record.$$$mimetype(this) === 'application/pdf' ||
                        record.$$$isTextFile(this)
                    );
                },
            }),
            $$$mediaType: attr({
                /**
                 * @param {Object} param0
                 * @param {Attachment} param0.record
                 * @returns {string}
                 */
                compute({ record }) {
                    return (
                        record.$$$mimetype(this) &&
                        record.$$$mimetype(this).split('/').shift()
                    );
                },
            }),
            $$$messages: many2many('Message', {
                inverse: '$$$attachments',
            }),
            $$$mimetype: attr({
                default: '',
            }),
            $$$name: attr(),
            $$$originThread: many2one('Thread', {
                inverse: '$$$originThreadAttachments',
            }),
            $$$size: attr(),
            $$$threads: many2many('Thread', {
                inverse: '$$$attachments',
            }),
            /**
             * Abort Controller linked to the uploading process of this attachment.
             * Useful in order to cancel the in-progress uploading of this attachment.
             */
            $$$uploadingAbortController: attr({
                /**
                 * @param {Object} param0
                 * @param {web.env} param0.env
                 * @param {Attachment} param0.record
                 * @returns {AbortController|undefined}
                 */
                compute({ env, record }) {
                    if (record.$$$isTemporary(this)) {
                        if (!record.$$$uploadingAbortController(this)) {
                            const abortController = new window.AbortController();
                            abortController.signal.onabort = () => {
                                env.messagingBus.trigger('o-attachment-upload-abort', {
                                    record,
                                });
                            };
                            return abortController;
                        }
                        return record.$$$uploadingAbortController(this);
                    }
                    return undefined;
                },
            }),
            $$$type: attr(),
            $$$url: attr(),
        },
    },
});

// let nextTemporaryId = -1;
// function getAttachmentNextTemporaryId() {
//     const id = nextTemporaryId;
//     nextTemporaryId -= 1;
//     return id;
// }
// function factory(dependencies) {

//     class Attachment extends dependencies['mail.model'] {

//         //----------------------------------------------------------------------
//         // Public
//         //----------------------------------------------------------------------

//         /**
//          * @override
//          */
//         static create(data) {
//             const isMulti = typeof data[Symbol.iterator] === 'function';
//             const dataList = isMulti ? data : [data];
//             for (const data of dataList) {
//                 if (!data.$$$id) {
//                     data.$$$id = getAttachmentNextTemporaryId();
//                 }
//             }
//             return super.create(...arguments);
//         }

//     }
// }

});
