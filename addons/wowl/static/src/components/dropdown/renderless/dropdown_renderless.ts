import { Component, useState } from "@odoo/owl";

export enum DropdownCollapseMode {
    All = 'all',
    Level = 'level',
    None = 'none',
}
export enum DropdownToggleMode {
    Click = 'click',
    Hover = 'hover',
}

export class Dropdown extends Component {
    static template = "wowl.Dropdown";
    static props = {
        openedByDefault: {
            type: Boolean,
            optional: true,
        },
        collapseMode: {
            type: DropdownCollapseMode,
            optional: true,
        },
        toggleMode: {
            type: DropdownToggleMode,
            optional: true,
        }
    };
    static defaultProps = {
        openedByDefault: false,
        collapseMode: DropdownCollapseMode.All,
        toggleMode: DropdownToggleMode.Click,
    };

    state = useState({ open: this.props.openedByDefault })

    mounted() {
        window.addEventListener('click', this.onWindowClicked.bind(this));
    }

    unmount() {
        window.removeEventListener('click', this.onWindowClicked.bind(this));
    }

    /**
     * Private
     */

    /**
     * Toggle the items of the dropdown.
     * If it has several levels, only the current one is toggled
     */
    _toggle() {
        this.state.open = !this.state.open;
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
            // We clicked outside
            this.state.open = false;
        }
    }

    onTogglerClicked() {
        if (this.props.toggleMode === DropdownToggleMode.Click) {
            this._toggle();
        }
    }

    onTogglerHovered() {
        if (this.props.toggleMode === DropdownToggleMode.Hover) {
            this._toggle();
        }
    }

    /**
     * When an item (leaf) is selected, check if the dropdown should collapse.
     * Can collapse one level or all levels.
     * Options are passed through props.
     */
    onElementSelected(ev: any) {
        if (!ev.detail) return; // this is not a leaf.

        // Trigger up
        this.trigger('element-selected', ev.detail);

        // Collapse
        switch (this.props.collapseMode) {
            case DropdownCollapseMode.Level:
                this._toggle();
                break;
            case DropdownCollapseMode.All:
                // this._toggle();
                this.trigger('toggle-all');
                break;
            case DropdownCollapseMode.None:
            default:
                break;
        }
    }
}
