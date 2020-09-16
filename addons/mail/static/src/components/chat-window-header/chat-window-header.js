odoo.define('mail/static/src/components/chat-window-header/chat-window-header.js', function (require) {
'use strict';

const usingModels = require('mail/static/src/component-mixins/using-models/using-models.js');
const {
    isEventHandled,
    markEventHandled,
} = require('mail/static/src/utils/utils.js');

const { Component, QWeb } = owl;

class ChatWindowHeader extends usingModels(Component) {

    /**
     * @returns {string}
     */
    get shiftNextText() {
        if (this.env.messaging.$$$locale(this).$$$textDirection(this) === 'rtl') {
            return this.env._t("Shift left");
        }
        return this.env._t("Shift right");
    }

    /**
     * @returns {string}
     */
    get shiftPrevText() {
        if (this.env.messaging.$$$locale(this).$$$textDirection(this) === 'rtl') {
            return this.env._t("Shift right");
        }
        return this.env._t("Shift left");
    }

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * @private
     * @param {MouseEvent} ev
     */
    _onClick(ev) {
        if (isEventHandled(ev, 'ChatWindowHeader.openProfile')) {
            return;
        }
        if (isEventHandled(ev, 'ChatWindowHeader.ClickShiftNext')) {
            return;
        }
        if (isEventHandled(ev, 'ChatWindowHeader.ClickShiftPrev')) {
            return;
        }
        const chatWindow = this.chatWindow;
        this.trigger('o-clicked', { chatWindow });
    }

    /**
     * @private
     * @param {MouseEvent} ev
     */
    _onClickName(ev) {
        if (
            this.chatWindow.$$$thread(this) &&
            this.chatWindow.$$$thread(this).$$$correspondent(this)
        ) {
            markEventHandled(ev, 'ChatWindowHeader.openProfile');
            this.env.invoke(
                'Partner/openProfile',
                this.chatWindow.$$$thread(this).$$$correspondent(this)
            );
        }
    }

    /**
     * @private
     * @param {MouseEvent} ev
     */
    _onClickClose(ev) {
        ev.stopPropagation();
        this.env.invoke('ChatWindow/close', this.chatWindow);
    }

    /**
     * @private
     * @param {MouseEvent} ev
     */
    _onClickExpand(ev) {
        ev.stopPropagation();
        this.env.invoke('ChatWindow/expand', this.chatWindow);
    }

    /**
     * @private
     * @param {MouseEvent} ev
     */
    _onClickShiftNext(ev) {
        markEventHandled(ev, 'ChatWindowHeader.ClickShiftNext');
        this.chatWindow.shiftNext();
        this.env.invoke('ChatWindow/shiftNext', this.chatWindow);
    }

    /**
     * @private
     * @param {MouseEvent} ev
     */
    _onClickShiftPrev(ev) {
        ev.stopPropagation();
        this.env.invoke('ChatWindow/shiftPrev', this.chatWindow);
    }

}

Object.assign(ChatWindowHeader, {
    defaultProps: {
        hasCloseAsBackButton: false,
        isExpandable: false,
    },
    props: {
        chatWindow: {
            type: Object,
            validate(p) {
                if (p.constructor.modelName !== 'ChatWindow') {
                    return false;
                }
                return true;
            },
        },
        hasCloseAsBackButton: Boolean,
        isExpandable: Boolean,
    },
    template: 'mail.ChatWindowHeader',
});

QWeb.registerComponent('ChatWindowHeader', ChatWindowHeader);

return ChatWindowHeader;

});
