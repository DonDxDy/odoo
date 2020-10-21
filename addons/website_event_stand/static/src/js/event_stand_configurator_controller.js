odoo.define('website_event_stand.event_stand_configurator_form_controller', function (require) {
'use strict';

var FormController = require('web.FormController');

var EventStandConfiguratorFormController = FormController.extend({

    saveRecord: function () {
        var self = this;
        return this._super.apply(this, arguments).then(function () {
            const state = self.model.get(self.handle, {raw: true});
            self.do_action({
                type: 'ir.actions.act_window_close',
                infos: {
                    eventStandConfiguration: {
                        event_id: {id: state.data.event_id},
                        event_stand_id: {id: state.data.event_stand_id},
                        event_stand_slot_ids: {
                            operation: 'MULTI',
                            commands: [{
                                operation: 'REPLACE_WITH',
                                ids: state.data.event_stand_slot_ids}]
                        }
                    }
                }
            });
        });
    }
});

return EventStandConfiguratorFormController;

});
