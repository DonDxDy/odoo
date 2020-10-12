import { Component } from "@odoo/owl";

export class DropdownItem extends Component {
    static template = "wowl.DropdownItem";
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
    fire() {
        this.trigger('dropdown-item-selected', this.props.value);
    }

}
