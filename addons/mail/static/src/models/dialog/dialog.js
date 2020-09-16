odoo.define('mail/static/src/models/dialog/dialog.js', function (require) {
'use strict';

const {
    'Feature/defineModel': defineModel,
    'Feature/defineSlice': defineFeatureSlice,
    'Field/many2one': many2one,
    'Field/one2one': one2one,
} = require('mail/static/src/model/utils.js');

const model = defineModel({
    name: 'Dialog',
    fields: {
        $$$manager: many2one('DialogManager', {
            inverse: '$$$dialogs',
        }),
        /**
         * Content of dialog that is directly linked to a record that models
         * a UI component, such as AttachmentViewer. These records must be
         * created from @see `DialogManager/open`.
         */
        $$$record: one2one('Record', {
            isCausal: true,
        }),
    },
});

return defineFeatureSlice(
    'mail/static/src/models/dialog/dialog.js',
    model,
);

});
