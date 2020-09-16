odoo.define('mail/static/src/models/attachment-viewer/attachment-viewer.js', function (require) {
'use strict';

const {
    'Feature/defineActions': defineActions,
    'Feature/defineModel': defineModel,
    'Feature/defineSlice': defineFeatureSlice,
    'Field/attr': attr,
    'Field/many2many': many2many,
    'Field/many2one': many2one,
} = require('mail/static/src/model/utils.js');

const actions = defineActions({
    /**
     * Close the attachment viewer by closing its linked dialog.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {AttachmentViewer} attachmentViewer
     */
    'AttachmentViewer/close'(
        { env },
        attachmentViewer
    ) {
        const dialog = env.invoke('Dialog/find',
            dialog => dialog.$$$record(this) === attachmentViewer
        );
        if (dialog) {
            env.invoke('Record/delete', dialog);
        }
    },
});

const model = defineModel({
    name: 'AttachmentViewer',
    fields: {
        /**
         * Angle of the image. Changes when the user rotates it.
         */
        $$$angle: attr({
            default: 0,
        }),
        $$$attachment: many2one('Attachment'),
        $$$attachments: many2many('Attachment', {
            inverse: '$$$attachmentViewer',
        }),
        /**
         * Determine whether the image is loading or not. Useful to diplay
         * a spinner when loading image initially.
         */
        $$$isImageLoading: attr({
            default: false,
        }),
        /**
         * Scale size of the image. Changes when user zooms in/out.
         */
        $$$scale: attr({
            default: 1,
        }),
    },
});

return defineFeatureSlice(
    'mail/static/src/models/attachment-viewer/attachment-viewer.js',
    actions,
    model,
);

});
