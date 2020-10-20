odoo.define('mail/static/src/components/chatter_search_box/chatter_search_box.js', function (require) {
'use strict';

const useStore = require('mail/static/src/component_hooks/use_store/use_store.js');

const { Component } = owl;

class ChatterSearchBox extends Component {

    /**
     * @override
     */
    constructor(...args) {
        super(...args);
        useStore(props => {
            const thread = this.env.models['mail.thread'].get(props.composerLocalId);
            return {
                thread: thread ? thread.__state : undefined,
            };
        });
    }

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * @returns {mail.thread|undefined}
     */
    get thread() {
        return this.env.models['mail.thread'].get(this.props.threadLocalId);
    }

}

Object.assign(ChatterSearchBox, {
    props: {
        threadLocalId: String,
    },
    template: 'mail.ChatterSearchBox',
});

return ChatterSearchBox;

});
