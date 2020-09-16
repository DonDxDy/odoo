odoo.define('website_slides/static/src/components/activity/activity.js', function (require) {
'use strict';

const Activity = require('mail/static/src/components/activity/activity.js');
const { patch } = require('web.utils');

patch(
    Activity,
    'website_slides/static/src/components/activity/activity.js',
    {

        //--------------------------------------------------------------------------
        // Handlers
        //--------------------------------------------------------------------------

        /**
         * @private
         */
        async _onGrantAccess(ev) {
            await this.env.services.rpc({
                model: 'slide.channel',
                method: 'action_grant_access',
                args: [[this.activity.$$$thread(this).$$$id(this)]],
                kwargs: {
                    partner_id: this.activity.$$$requestingPartner(this).$$$id(this),
                },
            });
            this.trigger('reload');
        },
        /**
         * @private
         */
        async _onRefuseAccess(ev) {
            await this.env.services.rpc({
                model: 'slide.channel',
                method: 'action_refuse_access',
                args: [[this.activity.$$$thread(this).$$$id(this)]],
                kwargs: {
                    partner_id: this.activity.$$$requestingPartner(this).$$$id(this),
                },
            });
            this.trigger('reload');
        },
    }
);

});
