odoo.define('im_livechat/static/src/components/thread-preview/thread-preview.js', function (require) {
'use strict';

const ThreadPreview = require('mail/static/src/components/thread-preview/thread-preview.js');

const { patch } = require('web.utils');

patch(
    ThreadPreview,
    'im_livechat/static/src/components/thread-preview/thread-preview.js',
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
