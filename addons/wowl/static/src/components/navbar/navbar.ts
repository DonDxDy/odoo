import { Component, useState } from "@odoo/owl";
import { useService } from "../../core/hooks";
import { OdooEnv } from "../../types";
import { Dropdown } from "../dropdown/renderless/dropdown_renderless";
import { DropdownElement } from "../dropdown/renderless/dropdown_item_renderless";

export class NavBar extends Component<{}, OdooEnv> {
  static template = "wowl.NavBar";
  static components = { Dropdown, DropdownElement }

  actionManager = useService("action_manager");
  menuRepo = useService("menus");
  state = useState({ menuItems: this.menuRepo.getMenuAsTree("root").childrenTree });

  systrayItems = this.env.registries.systray.getAll();

  onMenuClicked(ev: any) {
    if (ev.defaultPrevented) return;
    ev.preventDefault();
    const payload = ev.detail;
    this.actionManager.doAction(payload.actionID);
  }
}
