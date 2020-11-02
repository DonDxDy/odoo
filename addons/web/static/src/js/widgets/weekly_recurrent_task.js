odoo.define('web.weekly_recurrent_task', function (require) {
    'use strict';

    const AbstractField = require('web.AbstractFieldOwl');
    const fieldRegistry = require('web.field_registry_owl');


    class RcurrentTaskWidget extends AbstractField {
        constructor(parent) {
            super(...arguments);
            this.parent = parent;
            this.weekdays = moment.weekdaysShort(true).map(name => name.toLowerCase());
        }

        mounted(){
            if (this.parent.mode == "readonly") {
                this.el.classList.remove("o_field_empty");
            }
        }

        _onCheckboxClick(item) {
            this.trigger('field-changed', {
                dataPointID: this.dataPointId,
                changes: {[item.toElement.id]: item.toElement.checked},
            });
        }
    }

    RcurrentTaskWidget.template = ["web.recurrent_task"];
    fieldRegistry.add('web_weekly_recurrent_task', RcurrentTaskWidget);

    return RcurrentTaskWidget;
});
