import { Component, tags } from "@odoo/owl";
import { useService } from "../core/hooks";
import { ActionRequest } from "../services/action_manager/action_manager";
import { ViewDescription } from "../services/view_manager";
import { OdooEnv, ViewProps, ViewType } from "../types";
import { ControlPanelSubTemplates } from "./abstract_controller";
import { AbstractModel } from "./abstract_model";

interface ViewEnv extends OdooEnv {
  models?: { [name: string]: AbstractModel };
}

export class AbstractView extends Component<ViewProps, ViewEnv> {
  static template = "wowl.AbstractView";
  static modelClass = AbstractModel;
  static components = {};

  model: AbstractModel;

  __main__: string = tags.xml`<t/>`;

  viewDescription: ViewDescription = {} as any;

  viewManager = useService("view_manager");
  actionManager = useService("action_manager");

  cpSubTemplates: ControlPanelSubTemplates = {
    topLeft: "wowl.Views.ControlPanelTopLeft",
    topRight: null,
    bottomLeft: null,
    bottomRight: "wowl.Views.ControlPanelBottomRight",
  };

  constructor() {
    super(...arguments);

    const Model = (this.constructor as any).modelClass;
    const modelType = Model.type;
    this.env.models = this.env.models || {};
    if (this.env.models[modelType]) {
      this.model = this.env.models[modelType];
    } else {
      this.model = new Model(this.env);
      this.env.models[modelType] = this.model;
    }
  }

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

    await this.model.load({
      irFilters: this.viewDescription.irFilters,
    });
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
