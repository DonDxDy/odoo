odoo.define('mail.ActivityRenderer', function (require) {
"use strict";

var AbstractRenderer = require('web.AbstractRenderer');
var ActivityRecord = require('mail.ActivityRecord');
var core = require('web.core');
var dialogs = require('web.view_dialogs');
var field_registry = require('web.field_registry');
var qweb = require('web.QWeb');
var session = require('web.session');
var utils = require('web.utils');

var KanbanActivity = field_registry.get('kanban_activity');
var _t = core._t;
var QWeb = core.qweb;

var ActivityRenderer = AbstractRenderer.extend({
    className: 'o_activity_view',
    events: {
        'click .o_send_mail_template': '_onSenMailTemplateClicked',
        'click .o_activity_empty_cell': '_onEmptyCell',
        'click .o_record_selector': '_onRecordSelector',
    },

    /**
     * @override
     * @param {Object} params.templates
     */
    init: function (parent, state, params) {
        this._super.apply(this, arguments);

        this.qweb = new qweb(session.debug, {_s: session.origin});
        this.qweb.add_template(utils.json_node_to_xml(params.templates));
    },

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * @private
     * @param {Object} activityGroup
     * @param {integer} resID
     * @returns {Object}
     */
    _getKanbanActivityData: function (activityGroup, resID) {
        return {
            data: {
                activity_ids: {
                    model: 'mail.activity',
                    res_ids: activityGroup.ids,
                },
                activity_state: activityGroup.state,
            },
            fields: {
                activity_ids: {},
                activity_state: {
                    selection: [
                        ['overdue', "Overdue"],
                        ['today', "Today"],
                        ['planned', "Planned"],
                    ],
                },
            },
            fieldsInfo: {},
            model: this.state.model,
            type: 'record',
            res_id: resID,
            getContext: function () {
                return {}; // session.user_context
            },
            //todo intercept event or changes on record to update view
        };
    },
    /**
     * @override
     * @private
     */
    _getRecord: function (recordId) {
        return _.findWhere(this.state.data, { res_id: recordId });
    },
    /**
     * @override
     * @private
     */
    _render: function () {
        this.$el.addClass('table-responsive');
        this.$el.html(QWeb.render('mail.ActivityView', { isEmpty: !this.state.activity_types.length }));
        this.$('table')
            .append(this._renderHeader())
            .append(this._renderBody())
            .append(this._renderFooter());
        return this._super.apply(this, arguments);
    },
    /**
     * @private
     * @returns {jQueryElement} a jquery element <tbody>
     */
    _renderBody: function () {
        var $rows = _.map(this.state.activity_res_ids, this._renderRow.bind(this));
        return $('<tbody>').append($rows);
    },
    /**
     * @private
     * @returns {jQueryElement} a <tfoot> element
     */
    _renderFooter: function () {
        return QWeb.render('mail.ActivityViewFooter', {name: _.str.sprintf(_t('Schedule activity for %s'), this.arch.attrs.string)});
    },
    /**
     * @private
     * @returns {jQueryElement} a jquery element <thead>
     */
    _renderHeader: function () {
        var $tr = $('<tr>')
                .append($('<th>')) //empty cell for name
                .append(_.map(this.state.activity_types, this._renderHeaderCell.bind(this)));
        return $('<thead>').append($tr);
    },
    /**
     * @private
     * @param {Object} activity_type
     * @returns {jQueryElement} a <th> element
     */
    _renderHeaderCell: function (activity_type) {
        return QWeb.render('mail.ActivityViewHeaderCell', {
            id: activity_type[0],
            name: activity_type[1],
            template_list: activity_type[2] || [],
        });
    },
    /**
     * @private
     * @param {integer} resId
     * @returns {jQueryElement} a <tr> element
     */
    _renderRow: function (resId) {
        var self = this;
        var record = this._getRecord(resId);
        var $nameTD = $('<td>', {
            class: _.contains(this.filteredResIDs, resId) ? 'o_activity_filter_' + this.activeFilter : '',
        });
        var activityRecord = new ActivityRecord(this, record, { qweb: this.qweb });
        activityRecord.appendTo($nameTD);

        var $cells = _.map(this.state.activity_types, function (node) {
            var activity_type_id = node[0];
            var activity_group = self.state.grouped_activities[resId];
            activity_group = activity_group && activity_group[activity_type_id] || {count: 0, ids: [], state: false};

            var $td = $(QWeb.render('mail.ActivityViewRow', {
                resId: resId,
                activityGroup: activity_group,
                activityTypeId: activity_type_id,
            }));
            if (activity_group.state) {
                var record = self._getKanbanActivityData(activity_group, resId);
                var widget = new KanbanActivity(self, "activity_ids", record, {});
                widget.appendTo($td).then(function() {
                    // replace clock by closest deadline
                    var $date = $('<div class="o_closest_deadline">');
                    var date = new Date(activity_group.o_closest_deadline);
                    // To remove year only if current year
                    if (moment().year() === moment(date).year()) {
                        $date.text(date.toLocaleDateString(moment().locale(), { day: 'numeric', month: 'short' }));
                    } else {
                        $date.text(moment(date).format('ll'));
                    }
                    $td.find('a').html($date);
                    if (activity_group.count > 1) {
                        $td.find('a').append($('<span>', {
                            class: 'badge badge-light badge-pill border-0 float-right ' + activity_group.state,
                            text: activity_group.count,
                        }));
                    }
                });
            }
            return $td;
        });
        var $tr = $('<tr/>', {class: 'o_data_row'})
            .append($nameTD)
            .append($cells);
        return $tr;
    },

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * @private
     * @param {MouseEvent} ev
     */
    _onEmptyCell: function (ev) {
        var self = this;
        ev.preventDefault();
        var data = $(ev.currentTarget).data();
        this.do_action({
            type: 'ir.actions.act_window',
            res_model: 'mail.activity',
            view_mode: 'form',
            view_type: 'form',
            views: [[false, 'form']],
            target: 'new',
            context: {
                default_res_id: data.resId,
                default_res_model: this.state.model,
                default_activity_type_id: data.activityTypeId,
            },
            res_id: false,
        }, {
            on_close: function () {
                self.trigger_up('reload');
            },
        });
    },
    /**
     * @private
     * @param {MouseEvent} ev
     */
    _onRecordSelector: function (ev) {
        var self = this;
        ev.stopPropagation();
        return new dialogs.SelectCreateDialog(this, {
            res_model: this.state.model,
            domain: this.state.domain,
            title: _.str.sprintf(_t("Search: %s"), this.arch.attrs.string),
            disable_multiple_selection: true,
            on_selected: function (record) {
                var widget = new KanbanActivity(self, "activity_ids", self._getKanbanActivityData({}, record[0]), {});
                widget.scheduleActivity();
            },
        }).open();
    },
    /**
     * @private
     * @override
     * @param {MouseEvent} ev
     */
    _onSenMailTemplateClicked: function (ev) {
        var $target = $(ev.currentTarget);
        var templateID = $target.data('template-id');
        var activityTypeID = $target.closest('th').data('activity-type-id');
        this.trigger_up('send_mail_template', {
            activityTypeID: activityTypeID,
            templateID: templateID,
        });
    },
});

return ActivityRenderer;

});
