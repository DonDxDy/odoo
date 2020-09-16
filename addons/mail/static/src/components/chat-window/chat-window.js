odoo.define('mail/static/src/components/chat-window/chat-window.js', function (require) {
'use strict';

const useUpdate = require('mail/static/src/component-hooks/use-update/use-update.js');
const usingModels = require('mail/static/src/component-mixins/using-models/using-models.js');
const { isEventHandled } = require('mail/static/src/utils/utils.js');

const { Component, QWeb } = owl;
const { useRef } = owl.hooks;

class ChatWindow extends usingModels(Component) {

    /**
     * @override
     */
    constructor(...args) {
        super(...args);
        useUpdate({ func: () => this._update() });
        /**
         * Reference of the header of the chat window.
         * Useful to prevent click on header from wrongly focusing the window.
         */
        this._chatWindowHeaderRef = useRef('header');
        /**
         * Reference of the autocomplete input (new_message chat window only).
         * Useful when focusing this chat window, which consists of focusing
         * this input.
         */
        this._inputRef = useRef('input');
        /**
         * Reference of thread in the chat window (chat window with thread
         * only). Useful when focusing this chat window, which consists of
         * focusing this thread. Will likely focus the composer of thread, if
         * it has one!
         */
        this._threadRef = useRef('thread');
        // the following are passed as props to children
        this._onAutocompleteSelect = this._onAutocompleteSelect.bind(this);
        this._onAutocompleteSource = this._onAutocompleteSource.bind(this);
    }

    mounted() {
        this.env.messagingBus.on('will_hide_home_menu', this, this._onWillHideHomeMenu.bind(this));
        this.env.messagingBus.on('will_show_home_menu', this, this._onWillShowHomeMenu.bind(this));
    }

    willUnmount() {
        this.env.messagingBus.off('will_hide_home_menu', this, this._onWillHideHomeMenu.bind(this));
        this.env.messagingBus.off('will_show_home_menu', this, this._onWillShowHomeMenu.bind(this));
    }

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * Get the content of placeholder for the autocomplete input of
     * 'new_message' chat window.
     *
     * @returns {string}
     */
    get newMessageFormInputPlaceholder() {
        return this.env._t("Search user...");
    }

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * Apply visual position of the chat window.
     *
     * @private
     */
    _applyVisibleOffset() {
        const textDirection = (
            this.env.messaging.$$$locale(this).$$$textDirection(this)
        );
        const offsetFrom = textDirection === 'rtl' ? 'left' : 'right';
        const oppositeFrom = offsetFrom === 'right' ? 'left' : 'right';
        this.el.style[offsetFrom] = this.chatWindow.visibleOffset + 'px';
        this.el.style[oppositeFrom] = 'auto';
    }

    /**
     * Focus this chat window.
     *
     * @private
     */
    _focus() {
        this.env.invoke('Record/update', this.chatWindow, {
            $$$isDoFocus: false,
            $$$isFocused: true,
        });
        if (this._inputRef.comp) {
            this._inputRef.comp.focus();
        }
        if (this._threadRef.comp) {
            this._threadRef.comp.focus();
        }
    }

    /**
     * Save the scroll positions of the chat window in the store.
     * This is useful in order to remount chat windows and keep previous
     * scroll positions. This is necessary because when toggling on/off
     * home menu, the chat windows have to be remade from scratch.
     *
     * @private
     */
    _saveThreadScrollTop() {
        if (
            !this._threadRef.comp ||
            !this.chatWindow.$$$threadViewer(this) ||
            !this.chatWindow.$$$threadViewer(this).$$$threadView(this)
        ) {
            return;
        }
        this.chatWindow.$$$threadViewer(this).saveThreadCacheScrollHeightAsInitial(
            this._threadRef.comp.getScrollHeight()
        );
        this.chatWindow.$$$threadViewer(this).saveThreadCacheScrollPositionsAsInitial(
            this._threadRef.comp.getScrollTop()
        );
    }

    /**
     * @private
     */
    _update() {
        if (!this.chatWindow) {
            // chat window is being deleted
            return;
        }
        if (this.chatWindow.$$$isDoFocus(this)) {
            this._focus();
        }
        this._applyVisibleOffset();
    }

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * Called when selecting an item in the autocomplete input of the
     * 'new_message' chat window.
     *
     * @private
     * @param {Event} ev
     * @param {Object} ui
     * @param {Object} ui.item
     * @param {integer} ui.item.id
     */
    async _onAutocompleteSelect(ev, ui) {
        const chat = await this.env.invoke(
            'Messaging/getChat',
            { partnerId: ui.item.id }
        );
        if (!chat) {
            return;
        }
        this.env.invoke('ChatWindowManager/openThread',
            this.env.messaging.$$$chatWindowManager(this),
            chat,
            {
                makeActive: true,
                replaceNewMessage: true,
            }
        );
    }

    /**
     * Called when typing in the autocomplete input of the 'new_message' chat
     * window.
     *
     * @private
     * @param {Object} req
     * @param {string} req.term
     * @param {function} res
     */
    _onAutocompleteSource(req, res) {
        this.env.invoke('Partner/imSearch', {
            callback: (partners) => {
                const suggestions = partners.map(partner => {
                    return {
                        id: partner.$$$id(this),
                        value: partner.$$$nameOrDisplayName(this),
                        label: partner.$$$nameOrDisplayName(this),
                    };
                });
                res(_.sortBy(suggestions, 'label'));
            },
            keyword: _.escape(req.term),
            limit: 10,
        });
    }

    /**
     * Called when clicking on header of chat window. Usually folds the chat
     * window.
     *
     * @private
     * @param {CustomEvent} ev
     */
    _onClickedHeader(ev) {
        ev.stopPropagation();
        if (this.env.messaging.$$$device(this).$$$isMobile(this)) {
            return;
        }
        if (this.chatWindow.$$$isFolded(this)) {
            this.env.invoke('ChatWindow/unfold', this.chatWindow);
            this.env.invoke('ChatWindow/focus', this.chatWindow);
        } else {
            this._saveThreadScrollTop();
            this.env.invoke('ChatWindow/fold', this.chatWindow);
        }
    }

    /**
     * Called when an element in the thread becomes focused.
     *
     * @private
     * @param {FocusEvent} ev
     */
    _onFocusinThread(ev) {
        ev.stopPropagation();
        if (!this.chatWindow) {
            // prevent crash on destroy
            return;
        }
        this.env.invoke('Record/update', this.chatWindow, {
            $$$isFocused: true,
        });
    }

    /**
     * Focus out the chat window.
     *
     * @private
     */
    _onFocusout() {
        if (!this.chatWindow) {
            // ignore focus out due to record being deleted
            return;
        }
        this.env.invoke('Record/update', this.chatWindow, {
            $$$isFocused: false,
        });
    }

    /**
     * @private
     * @param {KeyboardEvent} ev
     */
    _onKeydown(ev) {
        /**
         * Prevent auto-focus of fuzzy search in the home menu.
         * Useful in order to allow copy/paste content inside chat window with
         * CTRL-C & CTRL-V when on the home menu.
         */
        ev.stopPropagation();
        if (!this.chatWindow) {
            // prevent crash during delete
            return;
        }
        switch (ev.key) {
            case 'Tab':
                ev.preventDefault();
                if (ev.shiftKey) {
                    this.env.invoke(
                        'ChatWindow/focusPreviousVisibleUnfoldedChatWindow',
                        this.chatWindow
                    );
                } else {
                    this.env.invoke(
                        'ChatWindow/focusNextVisibleUnfoldedChatWindow',
                        this.chatWindow
                    );
                }
                break;
            case 'Escape':
                if (isEventHandled(ev, 'ComposerTextInput.closeSuggestions')) {
                    break;
                }
                if (isEventHandled(ev, 'Composer.closeEmojisPopover')) {
                    break;
                }
                ev.preventDefault();
                this.env.invoke(
                    'ChatWindow/focusNextVisibleUnfoldedChatWindow',
                    this.chatWindow
                );
                this.env.invoke('ChatWindow/close',
                    this.chatWindow
                );
                break;
        }
    }

    /**
     * Save the scroll positions of the chat window in the store.
     * This is useful in order to remount chat windows and keep previous
     * scroll positions. This is necessary because when toggling on/off
     * home menu, the chat windows have to be remade from scratch.
     *
     * @private
     */
    async _onWillHideHomeMenu() {
        this._saveThreadScrollTop();
    }

    /**
     * Save the scroll positions of the chat window in the store.
     * This is useful in order to remount chat windows and keep previous
     * scroll positions. This is necessary because when toggling on/off
     * home menu, the chat windows have to be remade from scratch.
     *
     * @private
     */
    async _onWillShowHomeMenu() {
        this._saveThreadScrollTop();
    }

}

Object.assign(ChatWindow, {
    defaultProps: {
        hasCloseAsBackButton: false,
        isExpandable: false,
        isFullscreen: false,
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
        isFullscreen: Boolean,
    },
    template: 'mail.ChatWindow',
});

QWeb.registerComponent('ChatWindow', ChatWindow);

return ChatWindow;

});
