odoo.define('web.weekly_recurrent_task', function (require) {
    'use strict';

    const AbstractField = require('web.AbstractFieldOwl');
    const fieldRegistry = require('web.field_registry_owl');


    class RcurrentTaskWidget extends AbstractField {
        constructor(parent) {
            super(...arguments);
            this.readonly = true;
            this.parent = parent;
            this.checked_list = {"sun":false, "mon":false, "tue":false, "wed":false, "thu":false, "fri":false, "sat":false};
            this.week_day_list = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
            const week_day_default = moment.weekdaysMin();
            this.week_days = {}
            for(let i in week_day_default) {
                this.week_days[week_day_default[i]] = this.week_day_list[i];
            }
            this.weekdays = moment.weekdaysMin(true);
        }

        async willStart() {
            if(this.recordData.recurrence_id) {
                const record = await this.env.services.rpc({
                    model: this.recordData.recurrence_id.model,
                    method: 'read',
                    args: [this.recordData.recurrence_id.data.id, this.week_day_list]
                });

                for(let key in record[0]) {
                    if( key != 'id' && record[0][key] == true){
                        this.checked_list[key] = true;
                    }
                }
            }
        }

        mounted(){
            this._bind_event();
            for(let key in this.checked_list) {
                const check_box = this.el.querySelector('#'+key);
                this.checked_list[key] == true ? check_box.checked = true : check_box.checked = false;
            }
            if(this.parent.mode == "readonly"){
                this.el.classList.remove("o_field_empty")
            }
        }

        _bind_event() {
            this.el.querySelectorAll('.custom-control-input').forEach(item => {
                item.addEventListener('click', (item) => {
                    this._onCheckboxClick(item);
                })
            });
        }

        _onCheckboxClick(item) {
            this.checked_list[item.toElement.value] = item.toElement.checked;
            this.trigger('field-changed', {
                dataPointID: this.dataPointId,
                changes: this.checked_list,
            });
        }
    }

    RcurrentTaskWidget.template = ["web.recurrent_task"];
    fieldRegistry.add('web_weekly_recurrent_task', RcurrentTaskWidget);

    return RcurrentTaskWidget;
});
