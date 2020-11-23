import { Component, QWeb, tags, useState } from "@odoo/owl";
import { ElementArchNode, OdooEnv, FormRendererProps, View } from "../types";
import { AbstractController, ControlPanelSubTemplates } from "./abstract_controller";
import { ActionMenus } from "./action_menus/action_menus";
import { Pager, usePager } from "./pager";
import type { DBRecord } from "../services/model";

import { useService } from "../core/hooks";
const { css, xml } = tags;

import { parseArch } from "./arch_parser";

interface FormControllerState {
  mode: "edit" | "readonly";
  record: DBRecord | null;
}

interface DynamicTagProps {
  tag: string;
  attributes: {[key: string]: any};
}

class DynamicTag extends Component<DynamicTagProps, OdooEnv> {
  static template = xml`<t t-call="{{_template}}"/>`;
  static templates: {[key: string]: string} = {};

  _template: string;

  constructor() {
    super(...arguments);

    if (!(this.props.tag in DynamicTag.templates)) {
      DynamicTag.templates[this.props.tag] = xml`
        <${this.props.tag} t-att="props.attributes">
          <t t-slot="default"/>
        </${this.props.tag}>
      `;
    }
    this._template = DynamicTag.templates[this.props.tag];
    console.log(DynamicTag.templates);
  }
}

class FormRenderer extends Component<FormRendererProps, OdooEnv> {
  static template = "wowl.FormView";

  archRoot: ElementArchNode;

  constructor() {
    super(...arguments);

    this.archRoot = parseArch(this.props.arch);
  }
}
FormRenderer.components = {
  DynamicTag,
};

class FormController extends AbstractController {
  static components = {
    ...AbstractController.components,
    Renderer: FormRenderer,
    ActionMenus,
    Pager,
  };
  cpSubTemplates: ControlPanelSubTemplates = {
    ...this.cpSubTemplates,
    bottomLeft: "wowl.FormView.ControlPanelBottomLeft",
    bottomRight: "wowl.FormView.ControlPanelBottomRight",
  };
  static props = {
    recordId: { type: Number, optional: true },
    recordIds: { type: Array, element: Number, optional: true },
  };
  static defaultProps = {
    recordIds: [],
  };

  modelService = useService("model");
  state: FormControllerState = useState({
    mode: "readonly",
    record: null,
  });
  pager = usePager("pager", {
    currentMinimum: this.props.recordId
      ? this.props.recordIds!.indexOf(this.props.recordId) + 1
      : 0,
    limit: 1,
    size: this.props.recordIds!.length,
    onPagerChanged: this.onPagerChanged.bind(this),
  });

  async willStart() {
    await super.willStart();
    if (this.props.recordId) {
      this.state.mode = "readonly";
      return this.loadRecord(this.props.recordId);
    } else {
      this.state.mode = "edit";
    }
  }

  async loadRecord(id: number) {
    const result = await this.modelService(this.props.model).read([id], ["id", "display_name"]);
    this.state.record = result[0];
  }

  get actionMenusProps() {
    if (this.state.mode === "readonly") {
      return {
        selectedIds: [1, 2],
        items: {
          print: [
            {
              name: this.env._t("Print report"),
              id: 1,
              callback: () => () => {},
            },
          ],
          action: [
            {
              name: this.env._t("Export"),
              id: 1,
              callback: () => () => {},
            },
            {
              name: this.env._t("Archive"),
              id: 2,
              callback: () => () => {},
            },
            {
              name: this.env._t("Delete"),
              id: 3,
              callback: () => () => {},
            },
          ],
        },
      };
    }
  }
  get rendererProps(): FormRendererProps {
    return { ...super.rendererProps, mode: this.state.mode, record: this.state.record };
  }

  async onPagerChanged(currentMinimum: number, limit: number) {
    await this.loadRecord(this.props.recordIds![currentMinimum - 1]);
    return {};
  }
  _onCreate() {
    this.state.mode = "edit";
  }
  _onDiscard() {
    this.state.mode = "readonly";
  }
  _onEdit() {
    this.state.mode = "edit";
  }
  _onSave() {
    this.state.mode = "readonly";
  }
}

export const FormView: View = {
  name: "form",
  icon: "fa-edit",
  multiRecord: false,
  type: "form",
  Component: FormController,
  Renderer: FormRenderer,
};
