import { Component, hooks, tags } from "@odoo/owl";
import { OdooEnv, Type, ViewProps } from "../types";
import { Dialog } from "../components/dialog/dialog";
const { useRef } = hooks;
const { xml } = tags;

const SIZE_CLASSES: { [key: string]: string } = {
  "extra-large": "modal-xl",
  large: "modal-lg",
  small: "modal-sm",
};

interface LegacyViewDialogProps {
  Component: Type<Component<{}, OdooEnv>>;
  ComponentProps: ViewProps;
}

export class LegacyViewDialog extends Component<LegacyViewDialogProps, OdooEnv> {
  // Empty buttons slot purposefully defined.
  static template = xml`
    <Dialog t-props="dialogProps" t-ref="dialogRef">
      <t t-component="props.Component" t-props="props.ComponentProps" t-ref="compRef"/>
      <t t-set-slot="buttons"/>
    </Dialog>
  `;
  static components = { Dialog };
  compRef = useRef("compRef");
  dialogRef = useRef<Dialog>("dialogRef");
  dialogProps: { title?: string; size?: string } = {};

  constructor() {
    super(...arguments);
    const { ComponentProps } = this.props;
    const dialogLegacySize = ComponentProps?.action?.context.dialog_size;
    if (dialogLegacySize) {
      this.dialogProps.size = SIZE_CLASSES[dialogLegacySize] || undefined;
    }
    const actionName = ComponentProps?.action?.name;
    if (actionName) {
      this.dialogProps.title = this.env._t(actionName);
    }
  }

  mounted() {
    this.updateFooter();
  }

  updateFooter() {
    // Retrieve the widget climbing the wrappers
    const controllerComp: any = this.compRef.comp!;
    const controller = controllerComp.componentRef.comp;
    const viewAdapter = controller.controllerRef.comp;
    const widget = viewAdapter.widget;

    // Footer buttons rendering
    const modal = this.dialogRef.comp!.modalRef.el!;
    const dialogFooter = modal.querySelector("footer");
    widget.renderButtons(dialogFooter);

    // Modal style
    modal.querySelector("main.modal-body")!.classList.add("o_act_window");
  }
}
