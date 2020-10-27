import { Component, hooks } from "@odoo/owl";
import { useService } from "../core/hooks";
import { ViewDescriptions } from "../services/view_manager";
import { OdooEnv, ViewProps, ViewType } from "../types";
import { Model, ModelParams } from "./model";
import { FavoriteMenu } from "./favorite_menu/favorite_menu";
import { Dialog } from "../components/dialog/dialog";
import { Dropdown } from "../components/dropdown/dropdown";
import { DropdownItem } from "../components/dropdown/dropdown_item";
import { SubTemplates } from "./base_view";
import { ActionRequest } from "../action_manager/action_manager";
const { useSubEnv } = hooks;

export type FieldType =
  | "float"
  | "integer"
  | "boolean"
  | "char"
  | "one2many"
  | "many2many"
  | "many2one"
  | "number"
  | "date"
  | "datetime"
  | "selection";

export interface FieldDefinition {
  relation?: string;
  relation_field?: string;
  string: string;
  type: FieldType;
  default?: any;
  selection?: any[][];
  store?: boolean;
  sortable?: boolean;
}

export interface Fields {
  [fieldName: string]: FieldDefinition;
} // similar to ModelFields but without id

export class View<T extends ViewProps = ViewProps, U extends Model = Model> extends Component<
  T,
  OdooEnv
> {
  static template = "wowl.AbstractView";
  static modelClass = Model;
  static components = { FavoriteMenu, Dialog, Dropdown, DropdownItem };

  model: U;
  modelParams: ModelParams = {} as ModelParams;

  viewManager = useService("view_manager");
  actionManager = useService("action_manager");

  cpSubTemplates: SubTemplates = {
    cpTopLeft: "wowl.Views.ControlPanelTopLeft",
    cpTopRight: null,
    cpBottomLeft: null,
    cpBottomRight: "wowl.Views.ControlPanelBottomRight",
    main: null,
  };

  constructor(parent?: Component | null, props?: T) {
    super(...arguments);

    const Model = (this.constructor as any).modelClass;
    const model = new Model(this.env);
    this.model = model;
    useSubEnv({ model });
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

    this.processViewDescriptions(viewDescriptions);

    await this.model.load(this.modelParams);
  }

  mounted() {
    this.model.on("UPDATE", this, this.render);
  }

  willUnmount() {
    this.model.off("UPDATE", this); // useful?
  }

  /** we set here parts of own state and set model params */
  processViewDescriptions(viewDescriptions: ViewDescriptions) {
    const { context, model: modelName } = this.props;
    Object.assign(this.modelParams, {
      context,
      modelName,
      searchViewDescription: viewDescriptions.search,
    });
  }

  onBreadcrumbClicked(jsId: string) {
    this.actionManager.restore(jsId);
  }

  onViewClicked(viewType: ViewType) {
    this.actionManager.switchView(viewType);
  }

  _onExecuteAction(action: ActionRequest) {
    this.actionManager.doAction(action);
  }

  _onOpenFormView() {
    if (this.props.type !== "form") {
      this.actionManager.switchView("form");
    }
  }
}
