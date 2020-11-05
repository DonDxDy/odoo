odoo.define('web.weekly_recurrent_task_tests', function (require) {
    "use strict";
    
    const FormView = require('web.FormView');
    const testUtils = require('web.test_utils');
    

    QUnit.module('weekly task', {
        beforeEach() {
            this.data = {
                partner: {
                    fields: {
                        id: {strin: "id", type:"integer"},
                        mon: {string: "Mon", type: "boolean"},
                        tue: {string: "Tue", type: "boolean"},
                        wed: {string: "Wed", type: "boolean"},
                        thu: {string: "Thu", type: "boolean"},
                        fri: {string: "Fri", type: "boolean"},
                        sat: {string: "Sat", type: "boolean"},
                        sun: {string: "Sun", type: "boolean"},

                    },
                    records: [
                        {
                            id : 1,
                            mon: false,
                            tue: false,
                            wed: false,
                            thu: false,
                            fri: false,
                            sat: false,
                            sun: false,
                        },
                    ],
                },
            };
        },
    }, function () {
            QUnit.module('weekly recurrent task widget');

            QUnit.test('simple day of week widget', async function (assert) {
                assert.expect(8);

                let step = 0;
                const form = await testUtils.createView({
                    View: FormView,
                    model: 'partner',
                    data: this.data,
                    res_id: 1,
                    debug:1,
                    arch: '<form string="Partners">' +
                            '<sheet>' +
                                '<group>' +
                                    '<widget name="web_weekly_recurrent_task" force_save="1"/>' +
                                    '<field name="mon" invisible="1"/>'+
                                    '<field name="tue" invisible="1"/>'+
                                    '<field name="wed" invisible="1"/>'+
                                    '<field name="thu" invisible="1"/>'+
                                    '<field name="fri" invisible="1"/>'+
                                    '<field name="sat" invisible="1"/>'+
                                    '<field name="sun" invisible="1"/>'+
                                '</group>' +
                            '</sheet>' +
                        '</form>',
                    mockRPC: function (route, args) {
                        if (args.method === 'write') {
                            step++;
                            if (step === 1) {
                                assert.strictEqual(args.args[1].sun, true,
                                "value of sunday should be true");
                                this.data.partner.records[0].sun = args.args[1].sun;
                            }
                            if (step === 2) {
                                assert.strictEqual(args.args[1].mon, true,
                                "value of monday should be true");

                                assert.strictEqual(args.args[1].tue, true,
                                "value of tuesday should be true");

                                assert.strictEqual(args.args[1].sun, false,
                                "value of sunday should be false");
                            }
                            return Promise.resolve();
                        }
                        return this._super.apply(this, arguments);
                    },
                });

                await testUtils .form.clickEdit(form);
                await testUtils.dom.click(document.getElementById('sun'));

                assert.strictEqual(document.getElementById('sun').checked, true,
                    "sunday check box should be checked");
                await testUtils.form.clickSave(form);

                await testUtils.form.clickEdit(form);

                await testUtils.dom.click(document.getElementById('mon'));
                assert.strictEqual(document.getElementById('mon').checked, true,
                    "monday check box should be checked");
                
                await testUtils.dom.click(document.getElementById('tue'));
                assert.strictEqual(document.getElementById('tue').checked, true,
                "tuesday check box should be checked");

                await testUtils.dom.click(document.getElementById('sun'));
                assert.strictEqual(document.getElementById('sun').checked, false,
                "sunday check box should be unchecked");

                await testUtils.form.clickSave(form);
                form.destroy();
            });            
        });
    });
