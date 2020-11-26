import { Component } from "@odoo/owl";
import { actionManagerService } from "./action_manager/action_manager";
import {
  Error504Dialog,
  RedirectWarningDialog,
  SessionExpiredDialog,
  WarningDialog
} from "./components/error_dialogs/error_dialogs";
import { LoadingIndicator } from "./webclient/loading_indicator/loading_indicator";
import { userMenu, UserMenuItemFactory } from "./webclient/user_menu/user_menu";
// import { FormView } from "./views/form_view";
// import { GraphView } from "./views/graph_view";
// import { KanbanView } from "./views/kanban_view";
// import { ListView } from "./views/list_view";
// import { PivotView } from "./views/pivot_view";
import {
  documentationItem,
  logOutItem,
  odooAccountItem,
  preferencesItem,
  shortCutsItem,
  supportItem
} from "./webclient/user_menu_items/user_menu_items";
import { Registry } from "./core/registry";
import { cookieService } from "./services/cookie";
import { crashManagerService } from "./services/crash_manager";
import { dialogManagerService } from "./services/dialog_manager";
import { menusService } from "./services/menus";
import { modelService } from "./services/model";
import { notificationService } from "./notifications/notification_service";
import { routerService } from "./services/router";
import { rpcService } from "./services/rpc";
import { titleService } from "./services/title";
import { uiService } from "./services/ui/ui";
import { userService } from "./services/user";
import { viewManagerService } from "./services/view_manager";
import { Service, SystrayItem, Type } from "./types";

// -----------------------------------------------------------------------------
// Services
// -----------------------------------------------------------------------------

// Services registered in this registry will be deployed in the env. A component
// can then call the hook 'useService' in init with the name of the service it
// needs.
export const serviceRegistry: Registry<Service<any>> = new Registry();

const services = [
  actionManagerService,
  crashManagerService,
  cookieService,
  dialogManagerService,
  titleService,
  menusService,
  modelService,
  notificationService,
  routerService,
  rpcService,
  uiService,
  userService,
  viewManagerService,
];

for (let service of services) {
  serviceRegistry.add(service.name, service);
}

// -----------------------------------------------------------------------------
// Main Components
// -----------------------------------------------------------------------------

// Components registered in this registry will be rendered inside the root node
// of the webclient.
export const mainComponentRegistry: Registry<Type<Component>> = new Registry();

mainComponentRegistry.add("LoadingIndicator", LoadingIndicator);

// -----------------------------------------------------------------------------
// Client Actions
// -----------------------------------------------------------------------------

export { actionRegistry } from "./action_manager/action_registry";
// -----------------------------------------------------------------------------
// Views
// -----------------------------------------------------------------------------
// const views: View[] = [FormView, GraphView, KanbanView, ListView, PivotView];
export { viewRegistry } from "./views/view_registry";


// for (let view of views) {
//   viewRegistry.add(view.name, view);
// }

// -----------------------------------------------------------------------------
// Systray
// -----------------------------------------------------------------------------

export const systrayRegistry: Registry<SystrayItem> = new Registry();

systrayRegistry.add("wowl.user_menu", userMenu);

// -----------------------------------------------------------------------------
// Custom Dialogs for CrashManagerService
// -----------------------------------------------------------------------------

export const errorDialogRegistry: Registry<Type<Component>> = new Registry();

errorDialogRegistry
  .add("odoo.exceptions.AccessDenied", WarningDialog)
  .add("odoo.exceptions.AccessError", WarningDialog)
  .add("odoo.exceptions.MissingError", WarningDialog)
  .add("odoo.exceptions.UserError", WarningDialog)
  .add("odoo.exceptions.ValidationError", WarningDialog)
  .add("odoo.exceptions.RedirectWarning", RedirectWarningDialog)
  .add("odoo.http.SessionExpiredException", SessionExpiredDialog)
  .add("werkzeug.exceptions.Forbidden", SessionExpiredDialog)
  .add("504", Error504Dialog);

// -----------------------------------------------------------------------------
// Default UserMenu items
// -----------------------------------------------------------------------------

export const userMenuRegistry: Registry<UserMenuItemFactory> = new Registry();

userMenuRegistry
  .add("documentation", documentationItem)
  .add("support", supportItem)
  .add("shortcuts", shortCutsItem)
  .add("profile", preferencesItem)
  .add("odoo_account", odooAccountItem)
  .add("log_out", logOutItem);
