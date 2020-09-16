odoo.define('mail/static/src/components/follower-subtype/follower-subtype.js', function (require) {
'use strict';

const usingModels = require('mail/static/src/component-mixins/using-models/using-models.js');

const { Component } = owl;

class FollowerSubtype extends usingModels(Component) {

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * Called when clicking on cancel button.
     *
     * @private
     * @param {Event} ev
     */
    _onChangeCheckbox(ev) {
        if (ev.target.checked) {
            this.env.invoke('Follower/selectSubtype',
                this.follower,
                this.followerSubtype
            );
        } else {
            this.env.invoke('Follower/unselectSubtype',
                this.follower,
                this.followerSubtype
            );
        }
    }

}

Object.assign(FollowerSubtype, {
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
        followerSubtype: {
            type: Object,
            validate(p) {
                if (p.constructor.modelName !== 'FollowerSubtype') {
                    return false;
                }
                return true;
            },
        },
    },
    template: 'mail.FollowerSubtype',
});

return FollowerSubtype;

});
