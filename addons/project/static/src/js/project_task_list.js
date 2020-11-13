odoo.define('project.project_task_list', function (require) {
"use strict";

const ListController = require('web.ListController');
const ListRenderer = require('web.ListRenderer');
const ListView = require('web.ListView');
const view_registry = require('web.view_registry');

const ProjectTaskListController = ListController.extend({
    custom_events: _.extend({}, ListController.prototype.custom_events, {
        'marked_as_done_changed': '_onMarkedAsDoneChanged'
    }),
    /**
     * When the marked_as_done_toggle_button is clicked, we reload the view to see the updating.
     * @param {Object} event
     */
    _onMarkedAsDoneChanged: function (event) {
        this.reload();
    }
});

const ProjectTaskListRenderer = ListRenderer.extend({
    _renderRow: function (record) {
        const $tr = this._super.apply(this, arguments);
        if (record.data.hasOwnProperty('marked_as_done') && record.data.marked_as_done) {
            $tr.addClass('o_done_task'); // XBO TODO: add style when the task is done
        }
        return $tr;
    }
});

const ProjectTaskListView = ListView.extend({
    config: _.extend({}, ListView.prototype.config, {
        Controller: ProjectTaskListController,
        Renderer: ProjectTaskListRenderer
    })
});

view_registry.add('project_task_tree', ProjectTaskListView);

return { ProjectTaskListController, ProjectTaskListRenderer, ProjectTaskListView };
});
