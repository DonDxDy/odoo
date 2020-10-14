import { Component, tags } from "@odoo/owl";
import { OdooEnv, View, ViewProps } from "../types";
import { ControlPanel } from "../components/control_panel/control_panel";

const { xml } = tags;

class GraphController extends Component<ViewProps, OdooEnv> {
  static template = xml`
    <div>
        <ControlPanel breadcrumbs="props.breadcrumbs" views="props.views"/>
        <h2>Graph view</h2>

        <span>Model: <b><t t-esc="props.action.res_model"/></b></span>
    </div>
  `;
  static components = { ControlPanel };
}

export const GraphView: View = {
  name: "graph",
  icon: "fa-bar-chart",
  multiRecord: true,
  type: "graph",
  Component: GraphController,
};
