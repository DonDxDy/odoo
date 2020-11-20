import { Component, tags } from "@odoo/owl";
import { useService } from "../core/hooks";
import { ActionRequest } from "../services/action_manager/action_manager";
import { ViewDescription } from "../services/view_manager";
import { OdooEnv, ViewProps, ViewType } from "../types";
import { ControlPanelSubTemplates } from "./abstract_controller";

export class AbstractView extends Component<ViewProps, OdooEnv> {
  static template = "wowl.AbstractView";
  static components = {};

  __main__: string = tags.xml`<t/>`;
  modelFields: { [name: string]: any; } = {};
  viewDescription: ViewDescription = {} as any;
  favorites: any[] = [];

  viewManager = useService("view_manager");
  actionManager = useService("action_manager");

  cpSubTemplates: ControlPanelSubTemplates = {
    topLeft: "wowl.Views.ControlPanelTopLeft",
    topRight: null,
    bottomLeft: null,
    bottomRight: "wowl.Views.ControlPanelBottomRight",
  };

  async willStart() {
    const params = {
      model: this.props.model,
      views: this.props.views,
      context: this.props.context,
    };
    const options = {
      actionId: this.props.actionId,
      context: this.props.context,
      withActionMenus: this.props.withActionMenus,
      withFilters: this.props.withFilters,
    };
    const viewDescriptions = await this.viewManager.loadViews(params, options);
    this.viewDescription = viewDescriptions[this.props.type];
  }

  /**
   * Called when an element of the breadcrumbs is clicked.
   *
   * @param {string} jsId
   */
  onBreadcrumbClicked(jsId: string) {
    this.actionManager.restore(jsId);
  }
  /**
   * Called when a view is clicked in the view switcher.
   *
   * @param {ViewType} viewType
   */
  onViewClicked(viewType: ViewType) {
    this.actionManager.switchView(viewType);
  }

  // Demo code (move to kanban)
  _onExecuteAction(action: ActionRequest) {
    this.actionManager.doAction(action);
  }
  _onOpenFormView() {
    if (this.props.type !== "form") {
      this.actionManager.switchView("form");
    }
  }
}
