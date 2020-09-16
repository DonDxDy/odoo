odoo.define('im_livechat/static/src/components/discuss-sidebar/discuss-sidebar.js', function (require) {
'use strict';

const DiscussSidebar = require('mail/static/src/components/discuss-sidebar/discuss-sidebar.js');

const { patch } = require('web.utils');

patch(
    DiscussSidebar,
    'im_livechat/static/src/components/discuss-sidebar/discuss-sidebar.js',
    {

        //--------------------------------------------------------------------------
        // Public
        //--------------------------------------------------------------------------

        /**
         * Return the list of livechats that match the quick search value input.
         *
         * @returns {Thread[]}
         */
        quickSearchOrderedAndPinnedLivechatList() {
            const allOrderedAndPinnedLivechats = this.env.invoke('Thread/all',
                thread =>
                    thread.$$$channelType(this) === 'livechat' &&
                    thread.$$$isPinned(this) &&
                    thread.$$$model(this) === 'mail.channel'
                )
                .sort((c1, c2) => {
                    // sort by: last message id (desc), id (desc)
                    if (c1.$$$lastMessage(this) && c2.$$$lastMessage(this)) {
                        return (
                            c2.$$$lastMessage(this).$$$id(this) -
                            c1.$$$lastMessage(this).$$$id(this)
                        );
                    }
                    // a channel without a last message is assumed to be a new
                    // channel just created with the intent of posting a new
                    // message on it, in which case it should be moved up.
                    if (!c1.$$$lastMessage(this)) {
                        return -1;
                    }
                    if (!c2.$$$lastMessage(this)) {
                        return 1;
                    }
                    return c2.$$$id(this) - c1.$$$id(this);
                });
            if (!this.discuss.$$$sidebarQuickSearchValue(this)) {
                return allOrderedAndPinnedLivechats;
            }
            const qsVal = this.discuss.$$$sidebarQuickSearchValue(this).toLowerCase();
            return allOrderedAndPinnedLivechats.filter(livechat => {
                const nameVal = livechat.$$$displayName(this).toLowerCase();
                return nameVal.includes(qsVal);
            });
        },

    }
);

});
