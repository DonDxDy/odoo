odoo.define('sale.sale_section', function (require) {
"use strict";
var core = require('web.core');
var dialogs = require('web.view_dialogs');
var FormController = require('web.FormController');
var ListRenderer = require('web.ListRenderer');
var relational_fields = require('web.relational_fields');

var _t = core._t;

FormController.include({
    custom_events: _.extend({}, FormController.prototype.custom_events, {
       open_one2many_section: '_onOpenOne2ManySection',
    }),
    _onOpenOne2ManySection: function (event) {
        event.stopPropagation();
        var data = event.data;
        var record;
        if (data.id) {
           record = this.model.get(data.id, {raw: true});
        }
        new dialogs.FormViewDialog(this, {
            context: data.context,
            domain: data.domain,
            fields_view: data.fields_view,
            model: this.model,
            on_saved: data.on_saved,
            parentID: data.parentID,
            readonly: data.readonly,
            recordID: record && record.id,
            res_id: record && record.res_id,
            res_model: data.field.relation,
            shouldSaveLocally: true,
            disable_multiple_selection: true,
            title: _t("Create new section"),
        }).open();
    }
});

relational_fields.FieldOne2Many.include({
    custom_events: _.extend({}, relational_fields.FieldOne2Many.prototype.custom_events, {
        'add_section': '_onAddSection',
    }),
    _openSectionFormDialog: function (params) {
        var context = this.record.getContext(this.recordParams);
        context = _.extend(context, {default_line_type: 'section'});
        this.trigger_up('open_one2many_section', _.extend(params, {
            domain: this.record.getDomain(this.recordParams),
            context: context,
            field: this.field,
            fields_view: this.attrs.views && this.attrs.views.form,
            parentID: this.value.id,
            viewInfo: this.view,
        }));
    },
    _onAddSection: function (event) {
        var self = this;
        event.stopPropagation();
        this._openSectionFormDialog({
            on_saved: function (record) {
                self._setValue({ operation: 'ADD', id: record.id });
            },
        });
    }
});

ListRenderer.include({
    events: _.extend({}, ListRenderer.prototype.events, {
        'click a.o_field_x2many_list_section_add': '_onAddSection',
        'click a.o_field_x2many_list_row_add': '_onAddRecord'
    }),

    init: function (parent, state, params) {
        this._super.apply(this, arguments);
        this.sectionLine = params.arch.attrs.section_line;
    },
    // Disable sorting for section
    _onSortColumn: function (event) {
        if (!this.sectionLine) {
            this._super.apply(this, arguments);
        }
    },
    _renderBodyCell: function (record, node, index, options) {
        var $cell = this._super.apply(this, arguments);
        if (this.sectionLine && record.data.line_type === 'section') {
            if ($cell.hasClass('o_handle_cell')) {
                return $cell;
            } else if ($cell.hasClass('product_name')) {
                var nbrColumns = this.addTrashIcon ? this._getNumberOfCols() - 2: this._getNumberOfCols();
                $cell.attr('colspan', nbrColumns);
            } else {
                return $cell.addClass('o_hidden');
            }
        }
        return $cell;
    },
    _renderRows: function () {
        var self = this;
        var $rows = this._super.apply(this, arguments);
        if (this.sectionLine && this.addCreateLine) {
            $rows = _.map($rows, function ($row){
                if ($row.find('.o_field_x2many_list_row_add').length){
                    var $item = $('<a href="#">')
                        .addClass('o_field_x2many_list_row_add')
                        .text(_t("Add an item"));
                        
                    var $section = $('<a href="#">')
                    .addClass('o_field_x2many_list_section_add ml16')
                    .text(_t("Add a section"));
                        
                    var $td = $('<td>')
                        .attr('colspan', self._getNumberOfCols())
                        .append([$item, $section]);
                        
                    return $('<tr>').append($td);
                }
                return $row;
            });
        }
        return $rows;
    },
    _onAddSection: function (event) {
        event.preventDefault();
        event.stopPropagation();
        var self = this;
        this.unselectRow().then(function () {
            self.trigger_up('add_section');
        });
    }
});

});