odoo.define('mail/static/src/components/follower-subtype-list/follower-subtype-list.js', function (require) {
'use strict';

const usingModels = require('mail/static/src/component-mixins/using-models/using-models.js');

const { Component, QWeb } = owl;

class FollowerSubtypeList extends usingModels(Component) {

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * Called when clicking on cancel button.
     *
     * @private
     * @param {MouseEvent} ev
     */
    _onClickCancel(ev) {
        this.env.invoke('Follower/closeSubtypes',
            this.record.$$$follower(this)
        );
    }

    /**
     * Called when clicking on apply button.
     *
     * @private
     * @param {MouseEvent} ev
     */
    _onClickApply(ev) {
        this.env.invoke('Follower/updateSubtypes',
            this.record.$$$follower(this)
        );
    }

}

Object.assign(FollowerSubtypeList, {
    props: {
        record: {
            type: Object,
            validate(p) {
                if (p.constructor.modelName !== 'FollowerSubtypeList') {
                    return false;
                }
                return true;
            },
        },
    },
    template: 'mail.FollowerSubtypeList',
});

QWeb.registerComponent('FollowerSubtypeList', FollowerSubtypeList);

return FollowerSubtypeList;

});
