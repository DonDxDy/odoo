odoo.define('mail/static/src/components/composer-text-input/composer-text-input.js', function (require) {
'use strict';

const useUpdate = require('mail/static/src/component-hooks/use-update/use-update.js');
const usingModels = require('mail/static/src/component-mixins/using-models/using-models.js');
const {
    markEventHandled,
} = require('mail/static/src/utils/utils.js');

const { Component, QWeb } = owl;
const { useRef } = owl.hooks;

/**
 * ComposerInput relies on a minimal HTML editor in order to support mentions.
 */
class ComposerTextInput extends usingModels(Component) {

    /**
     * @override
     */
    constructor(...args) {
        super(...args);
        /**
         * Updates the composer text input content when composer is mounted
         * as textarea content can't be changed from the DOM.
         */
        useUpdate({ func: () => this._update() });
        /**
         * Last content of textarea from input event. Useful to determine
         * whether the current partner is typing something.
         */
        this._textareaLastInputValue = "";
        /**
         * Reference of the textarea. Useful to set height, selection and content.
         */
        this._textareaRef = useRef('textarea');
    }

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * @returns {string}
     */
    get textareaPlaceholder() {
        if (!this.composer) {
            return "";
        }
        if (!this.composer.$$$thread(this)) {
            return "";
        }
        if (
            this.composer.$$$thread(this).$$$model(this) ===
            'mail.channel'
        ) {
            if (this.composer.$$$thread(this).$$$correspondent(this)) {
                return _.str.sprintf(
                    this.env._t("Message %s..."),
                    this.composer.$$$thread(this).$$$correspondent(this).$$$nameOrDisplayName(this)
                );
            }
            return _.str.sprintf(
                this.env._t("Message #%s..."),
                this.composer.$$$thread(this).$$$displayName(this)
            );
        }
        if (this.composer.$$$isLog(this)) {
            return this.env._t("Log an internal note...");
        }
        return this.env._t("Send a message to followers...");
    }

    focus() {
        this._textareaRef.el.focus();
    }

    focusout() {
        this.saveStateInStore();
        this._textareaRef.el.blur();
    }

    /**
     * Saves the composer text input state in store
     */
    saveStateInStore() {
        this.env.invoke('Record/update', this.composer, {
            $$$textInputContent: this._getContent(),
            $$$textInputCursorEnd: this._getSelectionEnd(),
            $$$textInputCursorStart: this._getSelectionStart(),
            $$$textInputSelectionDirection: this._textareaRef.el.selectionDirection,
        });
    }

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * Returns textarea current content.
     *
     * @private
     * @returns {string}
     */
    _getContent() {
        return this._textareaRef.el.value;
    }

    /**
     * Returns selection end position.
     *
     * @private
     * @returns {integer}
     */
    _getSelectionEnd() {
        return this._textareaRef.el.selectionEnd;
    }

    /**
     * Returns selection start position.
     *
     * @private
     * @returns {integer}
     *
     */
    _getSelectionStart() {
        return this._textareaRef.el.selectionStart;
    }

    /**
     * Determines whether the textarea is empty or not.
     *
     * @private
     * @returns {boolean}
     */
    _isEmpty() {
        return this._getContent() === "";
    }

    /**
     * Updates the content and height of a textarea
     *
     * @private
     */
    _update() {
        if (!this.composer) {
            return;
        }
        this._textareaRef.el.value = this.composer.$$$textInputContent(this);
        this._textareaRef.el.setSelectionRange(
            this.composer.$$$textInputCursorStart(this),
            this.composer.$$$textInputCursorEnd(this),
            this.composer.$$$textInputSelectionDirection(this),
        );
        this._updateHeight();
    }

    /**
     * Updates the textarea height.
     *
     * @private
     */
    _updateHeight() {
        this._textareaRef.el.style.height = "0px";
        this._textareaRef.el.style.height = (this._textareaRef.el.scrollHeight) + "px";
    }

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * @private
     */
    _onFocusinTextarea() {
        this.env.invoke('Composer/focus', this.composer);
    }

    /**
     * @private
     */
    _onFocusoutTextarea() {
        this.saveStateInStore();
        this.env.invoke('Record/update', this.composer, { $$$hasFocus: false });
    }

    /**
     * @private
     */
    _onInputTextarea() {
        if (this._textareaLastInputValue !== this._textareaRef.el.value) {
            this.env.invoke(
                'Composer/handleCurrentPartnerIsTyping',
                this.composer
            );
        }
        this._textareaLastInputValue = this._textareaRef.el.value;
        this._updateHeight();
        this.saveStateInStore();
    }

    /**
     * @private
     * @param {KeyboardEvent} ev
     */
    _onKeydownTextarea(ev) {
        switch (ev.key) {
            case 'Escape':
                if (this.composer.$$$hasSuggestions(this)) {
                    ev.preventDefault();
                    this.env.invoke('Composer/closeSuggestions', this.composer);
                    markEventHandled(ev, 'ComposerTextInput.closeSuggestions');
                }
                break;
            // UP, DOWN, TAB: prevent moving cursor if navigation in mention suggestions
            case 'ArrowUp':
            case 'PageUp':
            case 'ArrowDown':
            case 'PageDown':
            case 'Home':
            case 'End':
            case 'Tab':
                if (this.composer.$$$hasSuggestions(this)) {
                    // We use preventDefault here to avoid keys native actions but actions are handled in keyUp
                    ev.preventDefault();
                }
                break;
            // ENTER: submit the message only if the dropdown mention proposition is not displayed
            case 'Enter':
                this._onKeydownTextareaEnter(ev);
                break;
        }
    }

    /**
     * @private
     * @param {KeyboardEvent} ev
     */
    _onKeydownTextareaEnter(ev) {
        if (this.composer.$$$hasSuggestions(this)) {
            ev.preventDefault();
            return;
        }
        if (
            this.sendShortcuts.includes('ctrl-enter') &&
            !ev.altKey &&
            ev.ctrlKey &&
            !ev.metaKey &&
            !ev.shiftKey
        ) {
            this.trigger('o-composer-text-input-send-shortcut');
            ev.preventDefault();
            return;
        }
        if (
            this.sendShortcuts.includes('enter') &&
            !ev.altKey &&
            !ev.ctrlKey &&
            !ev.metaKey &&
            !ev.shiftKey &&
            !this.env.messaging.$$$device(this).$$$isMobile(this)
        ) {
            this.trigger('o-composer-text-input-send-shortcut');
            ev.preventDefault();
            return;
        }
        if (
            this.sendShortcuts.includes('meta-enter') &&
            !ev.altKey &&
            !ev.ctrlKey &&
            ev.metaKey &&
            !ev.shiftKey
        ) {
            this.trigger('o-composer-text-input-send-shortcut');
            ev.preventDefault();
            return;
        }
    }

    /**
     * Key events management is performed in a Keyup to avoid intempestive RPC calls
     *
     * @private
     * @param {KeyboardEvent} ev
     */
    _onKeyupTextarea(ev) {
        switch (ev.key) {
            case 'Escape':
                // already handled in _onKeydownTextarea, break to avoid default
                break;
            // ENTER, HOME, END, UP, DOWN, PAGE UP, PAGE DOWN, TAB: check if navigation in mention suggestions
            case 'Enter':
                if (this.composer.$$$hasSuggestions(this)) {
                    this.env.invoke('Composer/insertSuggestion', this.composer);
                    this.env.invoke('Composer/closeSuggestions', this.composer);
                    this.focus();
                }
                break;
            case 'ArrowUp':
            case 'PageUp':
                if (this.composer.$$$hasSuggestions(this)) {
                    this.env.invoke('Composer/setPreviousSuggestionActive', this.composer);
                    this.env.invoke('Record/update', this.composer, {
                        $$$hasToScrollToActiveSuggestion: true,
                    });
                }
                break;
            case 'ArrowDown':
            case 'PageDown':
                if (this.composer.$$$hasSuggestions(this)) {
                    this.env.invoke('Composer/setNextSuggestionActive',
                        this.composer
                    );
                    this.env.invoke('Record/update', this.composer, {
                        $$$hasToScrollToActiveSuggestion: true,
                    });
                }
                break;
            case 'Home':
                if (this.composer.$$$hasSuggestions(this)) {
                    this.env.invoke('Composer/setFirstSuggestionActive',
                        this.composer
                    );
                    this.env.invoke('Record/update', this.composer, {
                        $$$hasToScrollToActiveSuggestion: true,
                    });
                }
                break;
            case 'End':
                if (this.composer.$$$hasSuggestions(this)) {
                    this.env.invoke('Composer/setLastSuggestionActive',
                        this.composer
                    );
                    this.env.invoke('Record/update', this.composer, {
                        $$$hasToScrollToActiveSuggestion: true,
                    });
                }
                break;
            case 'Tab':
                if (this.composer.$$$hasSuggestions(this)) {
                    if (ev.shiftKey) {
                        this.env.invoke('Composer/setPreviousSuggestionActive',
                            this.composer
                        );
                        this.env.invoke('Record/update', this.composer, {
                            $$$hasToScrollToActiveSuggestion: true,
                        });
                    } else {
                        this.env.invoke('Composer/setNextSuggestionActive',
                            this.composer
                        );
                        this.env.invoke('Record/update', this.composer, {
                            $$$hasToScrollToActiveSuggestion: true,
                        });
                    }
                }
                break;
            case 'Alt':
            case 'AltGraph':
            case 'CapsLock':
            case 'Control':
            case 'Fn':
            case 'FnLock':
            case 'Hyper':
            case 'Meta':
            case 'NumLock':
            case 'ScrollLock':
            case 'Shift':
            case 'ShiftSuper':
            case 'Symbol':
            case 'SymbolLock':
                // prevent modifier keys from resetting the suggestion state
                break;
            // Otherwise, check if a mention is typed
            default:
                this.saveStateInStore();
                this.env.invoke('Composer/detectSuggestionDelimiter',
                    this.composer
                );
        }
    }

}

Object.assign(ComposerTextInput, {
    defaultProps: {
        hasMentionSuggestionsBelowPosition: false,
        sendShortcuts: [],
    },
    props: {
        composer: {
            type: Object,
            validate(p) {
                if (p.constructor.modelName !== 'Composer') {
                    return false;
                }
                return true;
            },
        },
        hasMentionSuggestionsBelowPosition: Boolean,
        isCompact: Boolean,
        /**
         * Keyboard shortcuts from text input to send message.
         */
        sendShortcuts: {
            type: Array,
            element: String,
            validate: prop => {
                for (const shortcut of prop) {
                    if (!['ctrl-enter', 'enter', 'meta-enter'].includes(shortcut)) {
                        return false;
                    }
                }
                return true;
            },
        },
    },
    template: 'mail.ComposerTextInput',
});

QWeb.registerComponent('ComposerTextInput', ComposerTextInput);

return ComposerTextInput;

});
