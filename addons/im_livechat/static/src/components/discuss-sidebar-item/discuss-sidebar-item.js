odoo.define('im_livechat/static/src/components/discuss-sidebar-item/discuss-sidebar-item.js', function (require) {
'use strict';

const DiscussSidebarItem = require('mail/static/src/components/discuss-sidebar-item/discuss-sidebar-item.js');

const { patch } = require('web.utils');

patch(
    DiscussSidebarItem,
    'im_livechat/static/src/components/discuss-sidebar-item/discuss-sidebar-item.js',
    {

        //--------------------------------------------------------------------------
        // Public
        //--------------------------------------------------------------------------

        /**
         * @override
         */
        hasUnpin(...args) {
            const res = this._super(...args);
            return res || this.thread.$$$channelType(this) === 'livechat';
        }

    }
);

});
