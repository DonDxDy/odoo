odoo.define('mail/static/src/components/follower-list-menu/Follower-list-menu.js', function (require) {
'use strict';

const usingModels = require('mail/static/src/component-mixins/using-models/using-models.js');

const { Component, QWeb } = owl;
const { useRef, useState } = owl.hooks;

class FollowerListMenu extends usingModels(Component) {
    /**
     * @override
     */
    constructor(...args) {
        super(...args);
        this.state = useState({
            /**
             * Determine whether the dropdown is open or not.
             */
            isDropdownOpen: false,
        });
        this._dropdownRef = useRef('dropdown');
        this._onClickCaptureGlobal = this._onClickCaptureGlobal.bind(this);
    }

    mounted() {
        document.addEventListener('click', this._onClickCaptureGlobal, true);
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
    _hide() {
        this.state.isDropdownOpen = false;
    }

    /**
     * @private
     * @param {KeyboardEvent} ev
     */
    _onKeydown(ev) {
        ev.stopPropagation();
        switch (ev.key) {
            case 'Escape':
                ev.preventDefault();
                this._hide();
                break;
        }
    }

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * @private
     * @param {MouseEvent} ev
     */
    _onClickAddChannels(ev) {
        ev.preventDefault();
        this._hide();
        this.env.invoke('Thread/promptAddChannelFollower', this.thread);
    }

    /**
     * @private
     * @param {MouseEvent} ev
     */
    _onClickAddFollowers(ev) {
        ev.preventDefault();
        this._hide();
        this.env.invoke('Thread/promptAddPartnerFollower', this.thread);
    }

    /**
     * Close the dropdown when clicking outside of it.
     *
     * @private
     * @param {MouseEvent} ev
     */
    _onClickCaptureGlobal(ev) {
        // since dropdown is conditionally shown based on state, dropdownRef can be null
        if (this._dropdownRef.el && !this._dropdownRef.el.contains(ev.target)) {
            this._hide();
        }
    }

    /**
     * @private
     * @param {MouseEvent} ev
     */
    _onClickFollowersButton(ev) {
        this.state.isDropdownOpen = !this.state.isDropdownOpen;
    }

    /**
     * @private
     * @param {MouseEvent} ev
     */
    _onClickFollower(ev) {
        this._hide();
    }
}

Object.assign(FollowerListMenu, {
    defaultProps: {
        isDisabled: false,
    },
    props: {
        isDisabled: Boolean,
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
    template: 'mail.FollowerListMenu',
});

QWeb.registerComponent('FollowerListMenu', FollowerListMenu);

return FollowerListMenu;

});
