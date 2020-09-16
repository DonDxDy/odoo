odoo.define('mail/static/src/components/thread-preview/thread-preview.js', function (require) {
'use strict';

const usingModels = require('mail/static/src/component-mixins/using-models/using-models.js');
const {
    htmlToTextContentInline,
} = require('mail.utils');

const { Component, QWeb } = owl;
const { useRef } = owl.hooks;

class ThreadPreview extends usingModels(Component) {

    /**
     * @override
     */
    constructor(...args) {
        super(...args);
        /**
         * Reference of the "mark as read" button. Useful to disable the
         * top-level click handler when clicking on this specific button.
         */
        this._markAsReadRef = useRef('markAsRead');
    }

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * Get the image route of the thread.
     *
     * @returns {string}
     */
    image() {
        if (this.thread.$$$correspondent(this)) {
            return this.thread.$$$correspondent(this).$$$avatarUrl(this);
        }
        return `/web/image/mail.channel/${this.thread.$$$id(this)}/image_128`;
    }

    /**
     * Get inline content of the last message of this conversation.
     *
     * @returns {string}
     */
    get inlineLastMessageBody() {
        if (!this.thread.$$$lastMessage(this)) {
            return '';
        }
        return htmlToTextContentInline(
            this.thread.$$$lastMessage(this).$$$prettyBody(this)
        );
    }

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * @private
     * @param {MouseEvent} ev
     */
    _onClick(ev) {
        const markAsRead = this._markAsReadRef.el;
        if (markAsRead && markAsRead.contains(ev.target)) {
            // handled in `_onClickMarkAsRead`
            return;
        }
        this.env.invoke('Tthread/open', this.thread);
        if (!this.env.messaging.$$$device(this).$$$isMobile(this)) {
            this.env.invoke('MessagingMenu/close',
                this.env.messaging.$$$messagingMenu(this)
            );
        }
    }

    /**
     * @private
     * @param {MouseEvent} ev
     */
    _onClickMarkAsRead(ev) {
        if (this.thread.$$$lastMessage(this)) {
            this.env.invoke('Thread/markAsSeen',
                this.thread,
                this.thread.$$$lastNonTransientMessage(this),
            );
        }
    }

}

Object.assign(ThreadPreview, {
    props: {
        thread: {
            type: Object,
            validate(p) {
                if (p.constructor.modelName !== 'Thread') {
                    return false;
                }
                return true;
            },
        },
    },
    template: 'mail.ThreadPreview',
});

QWeb.registerComponent('ThreadPreview', ThreadPreview);

return ThreadPreview;

});
