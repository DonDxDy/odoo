odoo.define('web.weekly_recurrent_task', function (require) {
    'use strict';

    const Registry = require('web.widget_registry_owl');
    const { useState } = owl.hooks;


    class RcurrentTaskWidget extends owl.Component {
        constructor(parent) {
            super(...arguments);
            this.parent = parent;
            this.weekdays = moment.weekdaysShort(true).map(name => name.toLowerCase());
            this.state = useState({ days : this._filter_data(this.props.record.data) });
        }

        mounted() {
            this.el.querySelectorAll('.custom-control-input').forEach(el => {
                el.dissabled = true;
            });
        }

        _onCheckboxClick(item) {
            this.trigger('field-changed', {
                dataPointID: this.props.record.id,
                changes: {[item.toElement.id]: item.toElement.checked},
            });
        }

        updateState(state) {
            this.state.days = this._filter_data(state.data);
        }

        _filter_data(data) {
            let weekday_state = {};
            for(let val of this.weekdays) {
                weekday_state[val] = data[val];
            }
            return weekday_state;
        }
    }

    RcurrentTaskWidget.template = ["web.recurrent_task"];
    RcurrentTaskWidget.fieldDependencies = {
                                            sun: {type: 'boolean'},
                                            mon: {type: 'boolean'},
                                            tue: {type: 'boolean'},
                                            wed: {type: 'boolean'},
                                            thu: {type: 'boolean'},
                                            fri: {type: 'boolean'},
                                            sat: {type: 'boolean'},
                                        };
    Registry.add('web_weekly_recurrent_task', RcurrentTaskWidget);

    return RcurrentTaskWidget;
});
