odoo.define('mail/static/src/components/discuss/discuss.js', function (require) {
'use strict';

const useUpdate = require('mail/static/src/component-hooks/use-update/use-update.js');
const usingModels = require('mail/static/src/component-mixins/using-models/using-models.js');

const { Component, QWeb } = owl;
const { useRef } = owl.hooks;

class Discuss extends usingModels(Component) {

    /**
     * @override
     */
    constructor(...args) {
        super(...args);
        useUpdate({ func: () => this._update() });
        this._updateLocalStoreProps();
        /**
         * Reference of the composer. Useful to focus it.
         */
        this._composerRef = useRef('composer');
        /**
         * Reference of the ThreadView. Useful to focus it.
         */
        this._threadViewRef = useRef('threadView');
        // bind since passed as props
        this._onMobileAddItemHeaderInputSelect = this._onMobileAddItemHeaderInputSelect.bind(this);
        this._onMobileAddItemHeaderInputSource = this._onMobileAddItemHeaderInputSource.bind(this);
    }

    mounted() {
        this.env.invoke('Record/update', this.discuss, {
            $$$isOpen: true,
        });
        if (this.discuss.$$$thread(this)) {
            this.trigger('o-push-state-action-manager');
        } else if (this.env.messaging.$$$isInitialized(this)) {
            this.env.invoke('Discuss/openInitThread',
                this.discuss
            );
        }
        this._updateLocalStoreProps();
    }

    patched() {
        this.trigger('o-update-control-panel');
        if (this.discuss.$$$thread(this)) {
            this.trigger('o-push-state-action-manager');
        }
        if (
            this.discuss.$$$thread(this) &&
            this.discuss.$$$thread(this) === this.env.messaging.$$$inbox(this) &&
            this.discuss.$$$threadView(this) &&
            this._lastThreadCache === this.discuss.$$$threadView(this).$$$threadCache(this).localId &&
            this._lastThreadCounter > 0 &&
            this.discuss.$$$thread(this).counter === 0
        ) {
            this.trigger('o-show-rainbow-man');
        }
        this._activeThreadCache = (
            this.discuss.$$$threadView(this) &&
            this.discuss.$$$threadView(this).$$$threadCache(this)
        );
        this._updateLocalStoreProps();
    }

    willUnmount() {
        if (this.discuss) {
            this.env.invoke('Discuss/close', this.discuss);
        }
    }

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * @returns {string}
     */
    get addChannelInputPlaceholder() {
        return this.env._t("Create or search channel...");
    }

    /**
     * @returns {string}
     */
    get addChatInputPlaceholder() {
        return this.env._t("Search user...");
    }

    /**
     * @returns {Discuss}
     */
    get discuss() {
        return (
            this.env.messaging &&
            this.env.messaging.$$$discuss(this)
        );
    }

    /**
     * @returns {Object[]}
     */
    mobileNavbarTabs() {
        return [{
            icon: 'fa fa-inbox',
            id: 'mailbox',
            label: this.env._t("Mailboxes"),
        }, {
            icon: 'fa fa-user',
            id: 'chat',
            label: this.env._t("Chat"),
        }, {
            icon: 'fa fa-users',
            id: 'channel',
            label: this.env._t("Channel"),
        }];
    }

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * @private
     */
    _update() {
        if (!this.discuss) {
            return;
        }
        if (this.discuss.$$$isDoFocus(this)) {
            this.env.invoke('Record/update', this.discuss, {
                $$$isDoFocus: false,
            });
            const composer = this._composerRef.comp;
            if (composer) {
                composer.focus();
            } else {
                const threadView = this._threadViewRef.comp;
                if (threadView) {
                    threadView.focus();
                }
            }
        }
    }

    /**
     * @private
     */
    _updateLocalStoreProps() {
        /**
         * Locally tracked store props `activeThreadCache`.
         * Useful to set scroll position from last stored one and to display
         * rainbox man on inbox.
         */
        this._lastThreadCache = (
            this.discuss.$$$threadView(this) &&
            this.discuss.$$$threadView(this).$$$threadCache(this) &&
            this.discuss.$$$threadView(this).$$$threadCache(this).localId
        );
        /**
         * Locally tracked store props `threadCounter`.
         * Useful to display the rainbow man on inbox.
         */
        this._lastThreadCounter = (
            this.discuss.$$$thread(this) &&
            this.discuss.$$$thread(this).$$$counter(this)
        );
    }

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * @private
     */
    _onDialogClosedModerationDiscard() {
        this.env.invoke('Record/update', this.discuss, {
            $$$hasModerationDiscardDialog: false,
        });
    }

    /**
     * @private
     */
    _onDialogClosedModerationReject() {
        this.env.invoke('Record/update', this.discuss, {
            $$$hasModerationRejectDialog: false,
        });
    }

    /**
     * @private
     * @param {CustomEvent} ev
     */
    _onHideMobileAddItemHeader(ev) {
        ev.stopPropagation();
        this.env.invoke('Discuss/clearIsAddingItem', this.discuss);
    }

    /**
     * @private
     * @param {Event} ev
     * @param {Object} ui
     * @param {Object} ui.item
     * @param {integer} ui.item.id
     */
    _onMobileAddItemHeaderInputSelect(ev, ui) {
        const discuss = this.discuss;
        if (discuss.$$$isAddingChannel(this)) {
            this.env.invoke('Discuss/handleAddChannelAutocompleteSelect', discuss, ev, ui);
        } else {
            this.env.invoke('Discuss/handleAddChatAutocompleteSelect', discuss, ev, ui);
        }
    }

    /**
     * @private
     * @param {Object} req
     * @param {string} req.term
     * @param {function} res
     */
    _onMobileAddItemHeaderInputSource(req, res) {
        if (this.discuss.$$$isAddingChannel(this)) {
            this.env.invoke('Discuss/handleAddChannelAutocompleteSource',
                this.discuss,
                req,
                res
            );
        } else {
            this.env.invoke('Discuss/handleAddChatAutocompleteSource',
                this.discuss,
                req,
                res
            );
        }
    }

    /**
     * @private
     */
    _onReplyingToMessageMessagePosted() {
        this.env.services['notification'].notify({
            message: _.str.sprintf(
                this.env._t(`Message posted on "%s"`),
                owl.utils.escape(
                    this.discuss.$$$replyingToMessage(this).$$$originThread(this).$$$displayName(this)
                )
            ),
            type: 'warning',
        });
        this.env.invoke('Discuss/clearReplyingToMessage', this.discuss);
    }

    /**
     * @private
     * @param {CustomEvent} ev
     * @param {Object} ev.detail
     * @param {string} ev.detail.tabId
     */
    _onSelectMobileNavbarTab(ev) {
        ev.stopPropagation();
        if (this.discuss.$$$activeMobileNavbarTabId(this) === ev.detail.tabId) {
            return;
        }
        this.env.invoke('Discuss/clearReplyingToMessage', this.discuss);
        this.env.invoke('Record/update', this.discuss, {
            $$$activeMobileNavbarTabId: ev.detail.tabId,
        });
    }

    /**
     * @private
     * @param {CustomEvent} ev
     */
    _onThreadRendered(ev) {
        this.trigger('o-update-control-panel');
    }

}

Object.assign(Discuss, {
    props: {},
    template: 'mail.Discuss',
});

QWeb.registerComponent('Discuss', Discuss);

return Discuss;

});
