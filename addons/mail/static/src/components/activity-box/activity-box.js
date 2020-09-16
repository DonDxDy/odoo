odoo.define('mail/static/src/components/activity-box/activity-box.js', function (require) {
'use strict';

const usingModels = require('mail/static/src/component-mixins/using-models/using-models.js');

const { Component, QWeb } = owl;

class ActivityBox extends usingModels(Component) {

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * @private
     */
    _onClickTitle() {
        this.env.invoke('Chatter/toggleActivityBoxVisibility', this.chatter);
    }

}

Object.assign(ActivityBox, {
    props: {
        chatter: {
            type: Object,
            validate(p) {
                if (p.constructor.modelName !== 'Chatter') {
                    return false;
                }
                return true;
            },
        },
    },
    template: 'mail.ActivityBox',
});

QWeb.registerComponent('ActivityBox', ActivityBox);

return ActivityBox;

});
