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

export class DropdownRenderless extends Component {
    static template = "wowl.DropdownRenderless";
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
        document.addEventListener('click', this.onDocumentClicked.bind(this));
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
    onDocumentClicked(ev: MouseEvent) {
        if (ev.defaultPrevented) return;
        const target = ev.target as Element;
        const parentDropdown = target.closest('.o_dropdown');
        const clickedInside = parentDropdown && parentDropdown === this.el;
        if (!clickedInside) {
            // We clicked outside
            ev.preventDefault();
            console.log('We clicked outside');
            this._toggle();
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
     * When an item (leaf) is clicked, check if the dropdown should collapse.
     * Can collapse one level or all levels.
     * Options are passed through props.
     */
    dropdownItemClicked(ev: any) {
        if (!ev.detail) return; // this is not a leaf.

        // Trigger up
        this.trigger('item-selected', ev.detail);

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
