odoo.define('mail/static/src/components/chat-window-hidden-menu/chat-window-hidden-menu.js', function (require) {
'use strict';

const usingModels = require('mail/static/src/component-mixins/using-models/using-models.js');

const { Component, QWeb } = owl;
const { useRef } = owl.hooks;

class ChatWindowHiddenMenu extends usingModels(Component) {

    /**
     * @override
     */
    constructor(...args) {
        super(...args);
        this._onClickCaptureGlobal = this._onClickCaptureGlobal.bind(this);
        /**
         * Reference of the dropup list. Useful to auto-set max height based on
         * browser screen height.
         */
        this._listRef = useRef('list');
        /**
         * The intent of the toggle button depends on the last rendered state.
         */
        this._wasMenuOpen;
    }

    mounted() {
        this._apply();
        document.addEventListener('click', this._onClickCaptureGlobal, true);
    }

    patched() {
        this._apply();
    }

    willUnmount() {
        document.removeEventListener('click', this._onClickCaptureGlobal, true);
    }

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * @private
     */
    _apply() {
        this._applyListHeight();
        this._applyOffset();
        this._wasMenuOpen = (
            this.env.messaging.$$$chatWindowManager(this).$$$isHiddenMenuOpen(this)
        );
    }

    /**
     * @private
     */
    _applyListHeight() {
        const device = this.env.messaging.$$$device(this);
        const height = device.$$$globalWindowInnerHeight(this) / 2;
        this._listRef.el.style['max-height'] = `${height}px`;
    }

    /**
     * @private
     */
    _applyOffset() {
        const textDirection = (
            this.env.messaging.$$$locale(this).$$$textDirection(this)
        );
        const offsetFrom = textDirection === 'rtl' ? 'left' : 'right';
        const oppositeFrom = offsetFrom === 'right' ? 'left' : 'right';
        const offset = (
            this.env.messaging.$$$chatWindowManager(this).$$$visual(this).hidden.offset
        );
        this.el.style[offsetFrom] = `${offset}px`;
        this.el.style[oppositeFrom] = 'auto';
    }

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * Closes the menu when clicking outside.
     * Must be done as capture to avoid stop propagation.
     *
     * @private
     * @param {MouseEvent} ev
     */
    _onClickCaptureGlobal(ev) {
        if (this.el.contains(ev.target)) {
            return;
        }
        this.env.invoke(
            'ChatWindowManager/closeHiddenMenu',
            this.env.messaging.$$$chatWindowManager(this)
        );
    }

    /**
     * @private
     * @param {MouseEvent} ev
     */
    _onClickToggle(ev) {
        if (this._wasMenuOpen) {
            this.env.invoke(
                'ChatWindowManager/closeHiddenMenu',
                this.env.messaging.$$$chatWindowManager(this)
            );
        } else {
            this.env.invoke(
                'ChatWindowManager/openHiddenMenu',
                this.env.messaging.$$$chatWindowManager(this)
            );
        }
    }

    /**
     * @private
     * @param {CustomEvent} ev
     * @param {Object} ev.detail
     * @param {ChatWindow} ev.detail.chatWindow
     */
    _onClickedChatWindow(ev) {
        const chatWindow = ev.detail.chatWindow;
        this.env.invoke('ChatWindow/makeActive', chatWindow);
        this.env.invoke(
            'ChatWindowManager/closeHiddenMenu',
            this.env.messaging.$$$chatWindowManager(this)
        );
    }

}

Object.assign(ChatWindowHiddenMenu, {
    props: {},
    template: 'mail.ChatWindowHiddenMenu',
});

QWeb.registerComponent('ChatWindowHiddenMenu', ChatWindowHiddenMenu);

return ChatWindowHiddenMenu;

});
