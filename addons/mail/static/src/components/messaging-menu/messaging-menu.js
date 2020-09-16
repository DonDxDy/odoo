odoo.define('mail/static/src/components/messaging-menu/messaging-menu.js', function (require) {
'use strict';

const usingModels = require('mail/static/src/component-mixins/using-models/using-models.js');

const { Component, QWeb } = owl;

class MessagingMenu extends usingModels(Component) {

    /**
     * @override
     */
    constructor(...args) {
        super(...args);
        /**
         * global JS generated ID for this component. Useful to provide a
         * custom class to autocomplete input, so that click in an autocomplete
         * item is not considered as a click away from messaging menu in mobile.
         */
        this.id = _.uniqueId('o_messagingMenu_');

        // bind since passed as props
        this._onMobileNewMessageInputSelect = this._onMobileNewMessageInputSelect.bind(this);
        this._onMobileNewMessageInputSource = this._onMobileNewMessageInputSource.bind(this);

        this._onClickCaptureGlobal = this._onClickCaptureGlobal.bind(this);
    }

    mounted() {
        document.addEventListener('click', this._onClickCaptureGlobal, true);
    }

    willUnmount() {
        document.removeEventListener('click', this._onClickCaptureGlobal, true);
    }

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * @returns {Discuss}
     */
    get discuss() {
        return this.env.messaging && this.env.messaging.$$$discuss(this);
    }

    /**
     * @returns {MessagingMenu}
     */
    get messagingMenu() {
        return this.env.messaging && this.env.messaging.$$$messagingMenu(this);
    }

    /**
     * @returns {string}
     */
    get mobileNewMessageInputPlaceholder() {
        return this.env._t("Search user...");
    }

    /**
     * @returns {Object[]}
     */
    get tabs() {
        return [{
            icon: 'fa fa-envelope',
            id: 'all',
            label: this.env._t("All"),
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
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * Closes the menu when clicking outside, if appropriate.
     *
     * @private
     * @param {MouseEvent} ev
     */
    _onClickCaptureGlobal(ev) {
        if (!this.env.messaging) {
            /**
             * Messaging not created, which means essential models like
             * messaging menu are not ready, so user interactions are omitted
             * during this (short) period of time.
             */
            return;
        }
        // in mobile: keeps the messaging menu open in background
        // TODO: maybe need to move this to a mobile component?
        // task-2089887
        if (this.env.messaging.$$$device(this).$$$isMobile(this)) {
            return;
        }
        // ignore click inside the menu
        if (this.el.contains(ev.target)) {
            return;
        }
        // in all other cases: close the messaging menu when clicking outside
        this.env.invoke('MessagingMenu/close',
            this.messagingMenu
        );
    }

    /**
     * @private
     * @param {MouseEvent} ev
     */
    _onClickDesktopTabButton(ev) {
        this.env.invoke('Record/update', this.messagingMenu, {
            $$$activeTabId: ev.currentTarget.dataset.tabId,
        });
    }

    /**
     * @private
     * @param {MouseEvent} ev
     */
    _onClickNewMessage(ev) {
        if (!this.env.messaging.$$$device(this).$$$isMobile(this)) {
            this.env.invoke('ChatWindowManager/openNewMessage',
                this.env.messaging.$$$chatWindowManager(this)
            );
            this.env.invoke('MessagingMenu/close',
                this.messagingMenu
            );
        } else {
            this.env.invoke('MessagingMenu/toggleMobileNewMessage',
                this.messagingMenu
            );
        }
    }

    /**
     * @private
     * @param {MouseEvent} ev
     */
    _onClickToggler(ev) {
        // avoid following dummy href
        ev.preventDefault();
        if (!this.env.messaging) {
            /**
             * Messaging not created, which means essential models like
             * messaging menu are not ready, so user interactions are omitted
             * during this (short) period of time.
             */
            return;
        }
        this.env.invoke('MessagingMenu/toggleOpen',
            this.messagingMenu
        );
    }

    /**
     * @private
     * @param {CustomEvent} ev
     */
    _onHideMobileNewMessage(ev) {
        ev.stopPropagation();
        this.env.invoke('MessagingMenu/toggleMobileNewMessage',
            this.messagingMenu
        );
    }

    /**
     * @private
     * @param {Event} ev
     * @param {Object} ui
     * @param {Object} ui.item
     * @param {integer} ui.item.id
     */
    _onMobileNewMessageInputSelect(ev, ui) {
        this.env.invoke('Messaging/openChat',
            this.env.messaging,
            { partnerId: ui.item.id }
        );
    }

    /**
     * @private
     * @param {Object} req
     * @param {string} req.term
     * @param {function} res
     */
    _onMobileNewMessageInputSource(req, res) {
        const value = _.escape(req.term);
        this.env.invoke('Partner/imSearch', {
            callback: partners => {
                const suggestions = partners.map(partner => {
                    return {
                        id: partner.$$$id(this),
                        value: partner.$$$nameOrDisplayName(this),
                        label: partner.$$$nameOrDisplayName(this),
                    };
                });
                res(_.sortBy(suggestions, 'label'));
            },
            keyword: value,
            limit: 10,
        });
    }

    /**
     * @private
     * @param {CustomEvent} ev
     * @param {Object} ev.detail
     * @param {string} ev.detail.tabId
     */
    _onSelectMobileNavbarTab(ev) {
        ev.stopPropagation();
        this.env.invoke('Record/update', this.messagingMenu, {
            $$$activeTabId: ev.detail.tabId,
        });
    }

}

Object.assign(MessagingMenu, {
    props: {},
    template: 'mail.MessagingMenu',
});

QWeb.registerComponent('MessagingMenu', MessagingMenu);

return MessagingMenu;

});
