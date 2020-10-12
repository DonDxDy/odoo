import { Component } from "@odoo/owl";

export class DropdownElement extends Component {
    static template = "wowl.DropdownElement";
    static props = {
        value: {
            type: Object,
            optional: true
        },
    };
    static defaultProps = {
        value: null,
    };

    /**
     * Handlers
     */
    onClick(ev: MouseEvent) {
        ev.preventDefault();
        this.trigger('dropdown-element-clicked', this.props.value);
    }

    onMouseOver(ev: MouseEvent) {
        ev.preventDefault();
        this.trigger('dropdown-element-hovered', this.props.value);
    }

}
