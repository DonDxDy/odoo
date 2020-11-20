odoo.define('fleet.fleet_kanban', function (require) {
    'use strict';

    const KanbanRecord = require('web.KanbanRecord');

    KanbanRecord.include({

        /**
         * @override
         * @private
         */
        _openRecord() {
            if (this.modelName === 'fleet.vehicle.model.brand' && this.$(".o_kanban_button a").length) {
                this.$('.o_kanban_button a').first().click();
            } else {
                this._super.apply(this, arguments);
            }
        },
    });
});
