odoo.define('im_livechat/static/src/components/thread-needaction-preview/thread-needaction-preview.js', function (require) {
'use strict';

const ThreadNeedactionPreview = require('mail/static/src/components/thread-needaction-preview/thread-needaction-preview.js');

const { patch } = require('web.utils');

patch(
    ThreadNeedactionPreview,
    'im_livechat/static/src/components/thread-needaction-preview/thread-needaction-preview.js',
    {

        //--------------------------------------------------------------------------
        // Public
        //--------------------------------------------------------------------------

        /**
         * @override
         */
        image(...args) {
            if (this.thread.$$$channelType(this) === 'livechat') {
                return '/mail/static/src/img/smiley/avatar.jpg';
            }
            return this._super(...args);
        }

    }
);

});
