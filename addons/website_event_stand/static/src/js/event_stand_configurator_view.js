odoo.define('website_event_stand.event_stand_configurator_form_view', function (require) {
'use strict';

var EventStandConfiguratorFormController = require('website_event_stand.event_stand_configurator_form_controller');
var FormView = require('web.FormView');
var viewRegistry = require('web.view_registry');

var EventStandConfiguratorFormView = FormView.extend({
    config: _.extend({}, FormView.prototype.config, {
        Controller: EventStandConfiguratorFormController
    }),
});

viewRegistry.add('event_stand_configurator_form', EventStandConfiguratorFormView);

return EventStandConfiguratorFormView;

});
