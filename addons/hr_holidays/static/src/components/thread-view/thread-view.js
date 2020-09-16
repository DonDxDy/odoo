odoo.define('hr_holidays/static/src/components/thread-view/thread-view.js', function (require) {
'use strict';

const ThreadView = require('mail/static/src/components/thread-view/thread-view.js');

const { patch } = require('web.utils');

patch(
    ThreadView,
    'hr_holidays/static/src/components/thread-view/thread-view.js',
    {

        //--------------------------------------------------------------------------
        // Public
        //--------------------------------------------------------------------------

        /**
         * Returns the "out of office" text for the correspondent of the thread if
         * applicable.
         *
         * @returns {string}
         */
        getOutOfOfficeText() {
            if (!this.threadView.$$$thread(this).$$$correspondent(this)) {
                return "";
            }
            if (!this.threadView.$$$thread(this).$$$correspondent(this).$$$out_of_office_date_end(this)) {
                return "";
            }
            const currentDate = new Date();
            const date = this.threadView.$$$thread(this).$$$correspondent(this).$$$out_of_office_date_end(this);
            const options = { day: 'numeric', month: 'short' };
            if (currentDate.getFullYear() !== date.getFullYear()) {
                options.year = 'numeric';
            }
            const formattedDate = date.toLocaleDateString(window.navigator.language, options);
            return _.str.sprintf(this.env._t("Out of office until %s."), formattedDate);
        },

    }
);

});
