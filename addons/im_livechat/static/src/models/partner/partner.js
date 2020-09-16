odoo.define('im_livechat/static/src/models/partner/partner.js', function (require) {
'use strict';

const {
    'Feature/defineActions': defineActions,
    'Feature/defineSlice': defineFeatureSlice,
} = require('mail/static/src/model/utils.js');

let nextPublicId = -1;

const actions = defineActions({
    'Partner/getNextPublicId'() {
        const id = nextPublicId;
        nextPublicId -= 1;
        return id;
    },
});

return defineFeatureSlice(
    'im_livechat/static/src/models/partner/partner.js',
    actions,
);

});
