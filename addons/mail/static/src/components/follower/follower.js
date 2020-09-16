odoo.define('mail/static/src/components/follower/follower.js', function (require) {
'use strict';

const usingModels = require('mail/static/src/component-mixins/using-models/using-models.js');

const { Component, QWeb } = owl;

class Follower extends usingModels(Component) {

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * @private
     * @param {MouseEvent} ev
     */
    _onClickDetails(ev) {
        ev.preventDefault();
        ev.stopPropagation();
        this.env.invoke('Follower/openProfile', this.follower);
    }

    /**
     * @private
     * @param {MouseEvent} ev
     */
    _onClickEdit(ev) {
        ev.preventDefault();
        this.env.invoke('Follower/showSubtypes', this.follower);
    }

    /**
     * @private
     * @param {MouseEvent} ev
     */
    _onClickRemove(ev) {
        this.env.invoke('Follower/remove', this.follower);
    }

}

Object.assign(Follower, {
    props: {
        follower: {
            type: Object,
            validate(p) {
                if (p.constructor.modelName !== 'Follower') {
                    return false;
                }
                return true;
            },
        },
    },
    template: 'mail.Follower',
});

QWeb.registerComponent('Follower', Follower);

return Follower;

});
