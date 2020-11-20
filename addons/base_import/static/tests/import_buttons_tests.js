odoo.define('web.base_import_tests', function (require) {
"use strict";

const FormView = require('web.FormView');
const KanbanView = require('web.KanbanView');
const ListView = require('web.ListView');
const PivotView = require('web.PivotView');
const testUtils = require('web.test_utils');

const cpHelpers = testUtils.controlPanel;
const createActionManager = testUtils.createActionManager;
const createView = testUtils.createView;

QUnit.module('Base Import Tests', {
    beforeEach: function () {
        this.data = {
            foo: {
                fields: {
                    foo: {string: "Foo", type: "char"},
                },
                records: [
                    {id: 1, foo: "yop"},
                ]
            },
        };
        this.actions = [{
            id: 1,
            name: 'Partners Action 1',
            res_model: 'foo',
            type: 'ir.actions.act_window',
            views: [[1, 'list']],
        }, {
            id: 2,
            name: 'Partners',
            res_model: 'foo',
            type: 'ir.actions.act_window',
            views: [[2, 'list']],
        }, {
            id: 3,
            name: 'Partners',
            res_model: 'foo',
            type: 'ir.actions.act_window',
            views: [[3, 'list']],
        }, {
            id: 4,
            name: 'Partners',
            res_model: 'foo',
            type: 'ir.actions.act_window',
            views: [[4, 'kanban']],
        }, {
            id: 5,
            name: 'Partners',
            res_model: 'foo',
            type: 'ir.actions.act_window',
            views: [[5, 'kanban']],
        }, {
            id: 6,
            name: 'Partners',
            res_model: 'foo',
            type: 'ir.actions.act_window',
            views: [[6, 'kanban']],
        }, {
            id: 7,
            name: 'Partners',
            res_model: 'foo',
            type: 'ir.actions.act_window',
            views: [[false, 'pivot']],
        }];

        this.archs = {
            // list views
            'foo,1,list': '<tree><field name="foo"/></tree>',
            'foo,2,list': '<tree create="0"><field name="foo"/></tree>',
            'foo,3,list': '<tree import="0"><field name="foo"/></tree>',

            // kanban views
            'foo,4,kanban': '<kanban><templates><t t-name="kanban-box">' +
                '<div class="oe_kanban_global_click"><field name="foo"/></div>' +
                '</t></templates></kanban>',
            'foo,5,kanban': '<kanban><templates><t t-name="kanban-box">' +
                '<div class="oe_kanban_global_click"><field name="foo"/></div>' +
                '</t></templates></kanban>',

            // pivot views
            'foo,false,pivot': '<pivot><field name="foobar" type="measure"/></pivot>',

            // search views
            'foo,false,search': '<search></search>',
        };
    }
});

QUnit.test('import in favorite dropdown in list', async function (assert) {
    assert.expect(2);

    var actionManager = await createActionManager({
        actions: this.actions,
        archs: this.archs,
        data: this.data,
    });

    testUtils.mock.intercept(actionManager, 'do_action', function () {
        assert.ok(true, "should have triggered a do_action");
    });

    await actionManager.doAction(1);

    await cpHelpers.toggleFavoriteMenu(actionManager);
    assert.containsOnce(actionManager, '.o_import_menu');

    await testUtils.dom.click(actionManager.$('.o_import_menu button'));

    actionManager.destroy();
});

QUnit.test('import favorite dropdown item should not in list with create="0"', async function (assert) {
    assert.expect(1);

    const list = await createView({
        View: ListView,
        model: 'foo',
        data: this.data,
        arch: '<tree create="0"><field name="foo"/></tree>',
    });

    await testUtils.dom.click(list.$('.o_favorite_menu button'));
    assert.containsNone(list, '.o_import_menu');

    list.destroy();
});

QUnit.test('import favorite dropdown item should not in list with import="0"', async function (assert) {
    assert.expect(1);

    const list = await createView({
        View: ListView,
        model: 'foo',
        data: this.data,
        arch: '<tree import="0"><field name="foo"/></tree>',
    });

    await testUtils.dom.click(list.$('.o_favorite_menu button'));
    assert.containsNone(list, '.o_import_menu');

    list.destroy();
});

QUnit.test('import in favorite dropdown in kanban', async function (assert) {
    assert.expect(2);

    const kanban = await createView({
        View: KanbanView,
        model: 'foo',
        data: this.data,
        arch: `<kanban>
                <templates>
                    <t t-name="kanban-box">
                        <div><field name="foo"/></div>
                    </t>
                </templates>
            </kanban>`,
    });

    testUtils.mock.intercept(kanban, 'do_action', function () {
        assert.ok(true, "should have triggered a do_action");
    });

    await testUtils.dom.click(kanban.$('.o_favorite_menu button'));
    assert.containsOnce(kanban, '.o_import_menu');

    await testUtils.dom.click(kanban.$('.o_import_menu button'));

    kanban.destroy();
});

QUnit.test('import favorite dropdown item should not in list with create="0"', async function (assert) {
    assert.expect(1);

    const kanban = await createView({
        View: KanbanView,
        model: 'foo',
        data: this.data,
        arch: `<kanban create="0">
                <templates>
                    <t t-name="kanban-box">
                        <div><field name="foo"/></div>
                    </t>
                </templates>
            </kanban>`,
    });

    await testUtils.dom.click(kanban.$('.o_favorite_menu button'));
    assert.containsNone(kanban, '.o_import_menu');

    kanban.destroy();
});

QUnit.test('import dropdown favorite should not in kanban with import="0"', async function (assert) {
    assert.expect(1);

    const kanban = await createView({
        View: KanbanView,
        model: 'foo',
        data: this.data,
        arch: `<kanban import="0">
                <templates>
                    <t t-name="kanban-box">
                        <div><field name="foo"/></div>
                    </t>
                </templates>
            </kanban>`,
    });

    await testUtils.dom.click(kanban.$('.o_favorite_menu button'));
    assert.containsNone(kanban, '.o_import_menu');

    kanban.destroy();
});

QUnit.test('import should not available in favorite dropdown in pivot (other than kanban or list)', async function (assert) {
    assert.expect(1);

    this.data.foo.fields.foobar = { string: "Fubar", type: "integer", group_operator: 'sum' };

    const pivot = await createView({
        View: PivotView,
        model: 'foo',
        data: this.data,
        arch: '<pivot><field name="foobar" type="measure"/></pivot>',
    });

    await testUtils.dom.click(pivot.$('.o_favorite_menu button'));
    assert.containsNone(pivot, '.o_import_menu');

    pivot.destroy();
});

QUnit.test('import should not available in favorite dropdown in dialog view', async function (assert) {
    assert.expect(1);

    this.data.bar = {
        fields: {
            display_name: { string: "Bar", type: "char" },
        },
        records: []
    };
    for (let i = 0; i < 10; i++) {
        this.data.bar.records.push({ id: i + 1, display_name: "Bar " + (i + 1) });
    }
    this.data.foo.fields.m2o = { string: "M2O", type: "many2one", relation: "bar"};

    const form = await createView({
        View: FormView,
        model: 'foo',
        data: this.data,
        arch: '<form><field name="m2o"/></form>',
        archs: {
            'bar,false,list': '<tree><field name="display_name"/></tree>',
            'bar,false,search': '<search></search>',
        },
    });

    await testUtils.fields.many2one.searchAndClickItem('m2o', {
        item: 'Search More',
        search: '',
    });

    await cpHelpers.toggleFavoriteMenu('.modal');
    assert.containsNone(document.querySelector('.modal'), '.o_import_menu',
        "Import menu should not be available");

    form.destroy();
});

});
