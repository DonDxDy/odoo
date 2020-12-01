import { Component, hooks } from "@odoo/owl";
import { Dropdown } from "../../components/dropdown/dropdown";
import { Registry } from "../../core/registry";
import { Model } from "../model";
import { DropdownItem } from "../../components/dropdown/dropdown_item";
import { OwlEvent } from "@odoo/owl/dist/types/core/owl_event";
import { FACET_ICONS } from "../search_utils";
import { Dialog } from "../../components/dialog/dialog";
import { OdooEnv } from "../../types";
const { useState } = hooks;

interface ViewEnv extends OdooEnv {
  model: Model;
}

interface State {
  toDelete?: {
    id: number;
    userId: number | false;
  };
}

export class FavoriteMenu extends Component<{}, ViewEnv> {
  static registry = new Registry();
  static components = { Dialog, Dropdown, DropdownItem };
  static template = "wowl.FavoriteMenu";

  icon: string;
  title: string;
  state: State = useState({});

  constructor() {
    super(...arguments);
    this.icon = FACET_ICONS.favorite;
    this.title = this.env._t("Favorites");
  }

  get items() {
    const favorites = this.env.model.getFilters((f) => f.type === "favorite");
    // add element from a registry (add custom favorite, board addon,...)
    return favorites;
  }

  emptyState() {
    delete this.state.toDelete;
  }

  onItemRemoved(filterId: number) {
    const { id, userId } = this.items.find((f) => f.id === filterId);
    this.state.toDelete = { id, userId };
  }

  onDropdownItemSelected(ev: OwlEvent<{ payload: { id: number } }>) {
    const filterId = ev.detail.payload.id;
    this.env.model.toggleFilter(filterId);
  }

  onRemoveFavorite(filterId: number) {
    this.emptyState();
    this.env.model.deleteFavorite(filterId);
  }
}
