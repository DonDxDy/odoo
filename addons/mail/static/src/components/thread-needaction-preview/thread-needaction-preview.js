odoo.define('mail/static/src/components/thread-needaction-preview/thread-needaction-preview.js', function (require) {
'use strict';

const usingModels = require('mail/static/src/component-mixins/using-models/using-models.js');
const {
    htmlToTextContentInline,
} = require('mail.utils');

const { Component, QWeb } = owl;
const { useRef } = owl.hooks;

class ThreadNeedactionPreview extends usingModels(Component) {

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
        if (this.thread.$$$moduleIcon(this)) {
            return this.thread.$$$moduleIcon(this);
        }
        if (this.thread.$$$correspondent(this)) {
            return this.thread.$$$correspondent(this).$$$avatarUrl(this);
        }
        if (this.thread.$$$model(this) === 'mail.channel') {
            return `/web/image/mail.channel/${this.thread.$$$id(this)}/image_128`;
        }
        return '/mail/static/src/img/smiley/avatar.jpg';
    }

    /**
     * Get inline content of the last message of this conversation.
     *
     * @returns {string}
     */
    get inlineLastNeedactionMessageBody() {
        if (!this.thread.$$$lastNeedactionMessage(this)) {
            return '';
        }
        return htmlToTextContentInline(
            this.thread.$$$lastNeedactionMessage(this).$$$prettyBody(this)
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
        this.env.invoke('Thread/markNeedactionMessagesAsRead',
            this.thread
        );
        this.env.invoke('Thread/open',
            this.thread
        );
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
        this.env.invoke('Thread/markNeedactionMessagesAsRead',
            this.thread
        );
    }

}

Object.assign(ThreadNeedactionPreview, {
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
    template: 'mail.ThreadNeedactionPreview',
});

QWeb.registerComponent('ThreadNeedactionPreview', ThreadNeedactionPreview);

return ThreadNeedactionPreview;

});
