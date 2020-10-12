import { Component, useState } from "@odoo/owl";
import { useService } from "../../core/hooks";
import { OdooEnv } from "../../types";
import { Dropdown } from "../dropdown/dropdown";
import { DropdownItem } from "../dropdown/dropdown_item";

export class NavBar extends Component<{}, OdooEnv> {
  static template = "wowl.NavBar";
  static components = { Dropdown, DropdownItem }

  actionManager = useService("action_manager");
  menuRepo = useService("menus");
  state = useState({ menuItems: this.menuRepo.getMenuAsTree("root").childrenTree });

  systrayItems = this.env.registries.systray.getAll();

  onMenuClicked(ev: any) {
    const payload = ev.detail;
    this.actionManager.doAction(payload.actionID);
  }
}
