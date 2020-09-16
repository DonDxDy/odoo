odoo.define('mail/static/src/models/dialog-manager/dialog-manager.js', function (require) {
'use strict';

const {
    'Feature/defineActions': defineActions,
    'Feature/defineModel': defineModel,
    'Feature/defineSlice': defineFeatureSlice,
    'Field/link': link,
    'Field/one2many': one2many,
} = require('mail/static/src/model/utils.js');

const actions = defineActions({
    /**
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {DialogManager} dialogManager
     * @param {string} modelName
     * @param {Object} [recordData]
     */
    'DialogManager/open'(
        { env },
        dialogManager,
        modelName,
        recordData
    ) {
        if (!modelName) {
            throw new Error("Dialog should have a link to a model");
        }
        const record = env.invoke(`${modelName}/create`, recordData);
        const dialog = env.invoke('Dialog/create', {
            $$$manager: link(dialogManager),
            $$$record: link(record),
        });
        return dialog;
    },
});

const model = defineModel({
    name: 'DialogManager',
    fields: {
        // FIXME: dependent on implementation that uses insert order in relations!!
        $$$dialogs: one2many('Dialog', {
            inverse: '$$$manager',
            isCausal: true,
        }),
    },
});

return defineFeatureSlice(
    'mail/static/src/models/dialog-manager/dialog-manager.js',
    actions,
    model,
);

});
