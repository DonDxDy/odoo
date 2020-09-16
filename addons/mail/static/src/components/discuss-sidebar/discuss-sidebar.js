odoo.define('mail/static/src/components/discuss-sidebar/discuss-sidebar.js', function (require) {
'use strict';

const useUpdate = require('mail/static/src/component-hooks/use-update/use-update.js');
const usingModels = require('mail/static/src/component-mixins/using-models/using-models.js');

const { Component, QWeb } = owl;
const { useRef } = owl.hooks;

class DiscussSidebar extends usingModels(Component) {

    /**
     * @override
     */
    constructor(...args) {
        super(...args);
        useUpdate({ func: () => this._update() });
        /**
         * Reference of the quick search input. Useful to filter channels and
         * chats based on this input content.
         */
        this._quickSearchInputRef = useRef('quickSearchInput');

        // bind since passed as props
        this._onAddChannelAutocompleteSelect = this._onAddChannelAutocompleteSelect.bind(this);
        this._onAddChannelAutocompleteSource = this._onAddChannelAutocompleteSource.bind(this);
        this._onAddChatAutocompleteSelect = this._onAddChatAutocompleteSelect.bind(this);
        this._onAddChatAutocompleteSource = this._onAddChatAutocompleteSource.bind(this);
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
     * @returns {string}
     */
    get FIND_OR_CREATE_CHANNEL() {
        return this.env._t("Find or create a channel...");
    }

    /**
     * @returns {Thread[]}
     */
    get orderedMailboxes() {
        return this.env.invoke('Thread/all',
            thread => (
                    thread.$$$isPinned(this) &&
                    thread.$$$model(this) === 'mail.box'
                )
            )
            .sort(
                (mailbox1, mailbox2) => {
                    if (mailbox1 === this.env.messaging.$$$inbox(this)) {
                        return -1;
                    }
                    if (mailbox2 === this.env.messaging.$$$inbox(this)) {
                        return 1;
                    }
                    if (mailbox1 === this.env.messaging.$$$starred(this)) {
                        return -1;
                    }
                    if (mailbox2 === this.env.messaging.$$$starred(this)) {
                        return 1;
                    }
                    const mailbox1Name = mailbox1.$$$displayName(this);
                    const mailbox2Name = mailbox2.$$$displayName(this);
                    mailbox1Name < mailbox2Name ? -1 : 1;
                }
            );
    }

    /**
     * Return the list of chats that match the quick search value input.
     *
     * @returns {Thread[]}
     */
    get quickSearchPinnedAndOrderedChats() {
        const allOrderedAndPinnedChats = this.env.invoke('Thread/all',
                thread => (
                    thread.$$$channelType() === 'chat' &&
                    thread.$$$isPinned() &&
                    thread.$$$model() === 'mail.channel'
                )
            )
            .sort(
                (c1, c2) => (
                    c1.$$$displayName(this) < c2.$$$displayName(this)
                    ? -1
                    : 1
                )
            );
        if (!this.discuss.$$$sidebarQuickSearchValue(this)) {
            return allOrderedAndPinnedChats;
        }
        const qsVal = this.discuss.$$$sidebarQuickSearchValue(this).toLowerCase();
        return allOrderedAndPinnedChats.filter(chat => {
            const nameVal = chat.$$$displayName(this).toLowerCase();
            return nameVal.includes(qsVal);
        });
    }

    /**
     * Return the list of channels that match the quick search value input.
     *
     * @returns {Thread[]}
     */
    get quickSearchOrderedAndPinnedMultiUserChannels() {
        const allOrderedAndPinnedMultiUserChannels = this.env.invoke('Thread/all',
                thread => (
                    thread.$$$channelType() === 'channel' &&
                    thread.$$$isPinned() &&
                    thread.$$$model() === 'mail.channel'
                )
            )
            .sort(
                (c1, c2) => (
                    c1.$$$displayName(this) < c2.$$$displayName(this)
                    ? -1
                    : 1
                )
            );
        if (!this.discuss.$$$sidebarQuickSearchValue(this)) {
            return allOrderedAndPinnedMultiUserChannels;
        }
        const qsVal = this.discuss.$$$sidebarQuickSearchValue(this).toLowerCase();
        return allOrderedAndPinnedMultiUserChannels.filter(channel => {
            const nameVal = channel.$$$displayName(this).toLowerCase();
            return nameVal.includes(qsVal);
        });
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
        if (this._quickSearchInputRef.el) {
            this._quickSearchInputRef.el.value = this.discuss.$$$sidebarQuickSearchValue(this);
        }
    }

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * @private
     * @param {Event} ev
     * @param {Object} ui
     * @param {Object} ui.item
     * @param {integer} ui.item.id
     */
    _onAddChannelAutocompleteSelect(ev, ui) {
        this.env.invoke('Discuss/handleAddChannelAutocompleteSelect',
            this.discuss,
            ev,
            ui
        );
    }

    /**
     * @private
     * @param {Object} req
     * @param {string} req.term
     * @param {function} res
     */
    _onAddChannelAutocompleteSource(req, res) {
        this.env.invoke('Discuss/handleAddChannelAutocompleteSource',
            this.discuss,
            req,
            res
        );
    }

    /**
     * @private
     * @param {Event} ev
     * @param {Object} ui
     * @param {Object} ui.item
     * @param {integer} ui.item.id
     */
    _onAddChatAutocompleteSelect(ev, ui) {
        this.env.invoke('Discuss/handleAddChatAutocompleteSelect',
            this.discuss,
            ev,
            ui
        );
    }

    /**
     * @private
     * @param {Object} req
     * @param {string} req.term
     * @param {function} res
     */
    _onAddChatAutocompleteSource(req, res) {
        this.env.invoke('Discuss/handleAddChatAutocompleteSource',
            this.discuss,
            req,
            res
        );
    }

    /**
     * Called when clicking on add channel icon.
     *
     * @private
     * @param {MouseEvent} ev
     */
    _onClickChannelAdd(ev) {
        ev.stopPropagation();
        this.env.invoke('Record/update', this.discuss, {
            $$$isAddingChannel: true,
        });
    }

    /**
     * Called when clicking on channel title.
     *
     * @private
     * @param {MouseEvent} ev
     */
    _onClickChannelTitle(ev) {
        ev.stopPropagation();
        return this.env.bus.trigger('do-action', {
            action: {
                name: this.env._t("Public Channels"),
                type: 'ir.actions.act_window',
                res_model: 'mail.channel',
                views: [[false, 'kanban'], [false, 'form']],
                domain: [['public', '!=', 'private']]
            },
        });
    }

    /**
     * Called when clicking on add chat icon.
     *
     * @private
     * @param {MouseEvent} ev
     */
    _onClickChatAdd(ev) {
        ev.stopPropagation();
        this.env.invoke('Record/update', this.discuss, {
            $$$isAddingChat: true,
        });
    }

    /**
     * @private
     * @param {CustomEvent} ev
     */
    _onHideAddingItem(ev) {
        ev.stopPropagation();
        this.env.invoke('Discuss/clearIsAddingItem',
            this.discuss
        );
    }

    /**
     * @private
     * @param {KeyboardEvent} ev
     */
    _onInputQuickSearch(ev) {
        ev.stopPropagation();
        this.env.invoke('Record/update', this.discuss, {
            $$$sidebarQuickSearchValue: this._quickSearchInputRef.el.value,
        });
    }

}

Object.assign(DiscussSidebar, {
    props: {},
    template: 'mail.DiscussSidebar',
});

QWeb.registerComponent('DiscussSidebar', DiscussSidebar);

return DiscussSidebar;

});
