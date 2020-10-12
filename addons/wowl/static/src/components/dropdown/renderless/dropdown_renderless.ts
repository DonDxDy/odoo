import { Component, useState } from "@odoo/owl";

export class Dropdown extends Component {
    static template = "wowl.Dropdown";
    static props = {
        show: {
            type: Boolean,
            optional: true,
        },
        hover: {
            type: Boolean,
            optional: true,
        },
        hoverOpenDelay: {
            type: Number,
            optional: true,
        },
        hoverCloseDelay: {
            type: Number,
            optional: true,
        },
        closeOnClickOutside: {
            type: Boolean,
            optional: true,
        },
    };
    static defaultProps = {
        show: false,
        hover: false,
        hoverOpenDelay: 100,
        hoverCloseDelay: 500,
        closeOnClickOutside: true,
    };

    state = useState({ show: this.props.show });
    hoverOpenDelayHandle: number = Number.NaN;
    hoverCloseDelayHandle: number = Number.NaN;

    mounted() {
        window.addEventListener('click', this.onWindowClicked.bind(this));
    }

    willUnmount() {
        window.removeEventListener('click', this.onWindowClicked.bind(this));
    }

    willUpdateProps(nextProps: any) {
        this.state.show = nextProps.show;
        return Promise.resolve();
    }

    startHoverCloseDelayTimer() {
        this.hoverCloseDelayHandle = setTimeout(this._closeDropdown.bind(this), this.props.hoverCloseDelay);
    }

    startHoverOpenDelayTimer() {
        this.hoverOpenDelayHandle = setTimeout(this._openDropdown.bind(this), this.props.hoverOpenDelay);
    }

    stopHoverCloseDelayTimer() {
        clearTimeout(this.hoverCloseDelayHandle);
        this.hoverCloseDelayHandle = Number.NaN;
    }

    stopHoverOpenDelayTimer() {
        clearTimeout(this.hoverOpenDelayHandle);
        this.hoverOpenDelayHandle = Number.NaN;
    }

    /**
     * Private
     */
    _closeDropdown() {
        this.state.show = false;
    }
    _openDropdown() {
        this.state.show = true;
    }
    _toggleDropdown() {
        this.state.show = !this.state.show;
    }

    /**
     * Handlers
     */
    onWindowClicked(ev: MouseEvent) {
        if (ev.defaultPrevented) return;
        ev.preventDefault();

        const target = ev.target as Element;
        const element = target.closest('.o_dropdown');
        const gotClickedInside = element && element === this.el;
        if (!gotClickedInside) {
            this._closeDropdown();
        }
    }

    onTogglerClick() {
        this._toggleDropdown();
    }

    onTogglerMouseOver() {
        if (this.props.hover) {
            this.stopHoverCloseDelayTimer();
        }
    }

    onTogglerMouseEnter() {
        if (this.props.hover) {
            this.stopHoverCloseDelayTimer();
            this.startHoverOpenDelayTimer();
        }
    }

    onTogglerMouseLeave() {
        if (this.props.hover) {
            if (Number.isNaN(this.hoverCloseDelayHandle)) {
                this.startHoverCloseDelayTimer();
            }
            this.stopHoverOpenDelayTimer();
        }
    }
}
