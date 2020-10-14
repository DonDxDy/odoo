import { Component, tags } from "@odoo/owl";
import { OdooEnv, View, ViewProps } from "../types";
import { ControlPanel } from "../components/control_panel/control_panel";

const { xml } = tags;

class KanbanController extends Component<ViewProps, OdooEnv> {
  static template = xml`
    <div>
        <ControlPanel breadcrumbs="props.breadcrumbs" views="props.views"/>
        <h2>Kanban view</h2>

        <span>Model: <b><t t-esc="props.model"/></b></span>
    </div>
  `;
  static components = { ControlPanel };
}

export const KanbanView: View = {
  name: "kanban",
  icon: "fa-th-large",
  multiRecord: true,
  type: "kanban",
  Component: KanbanController,
};
