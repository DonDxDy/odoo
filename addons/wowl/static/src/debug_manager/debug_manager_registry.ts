import { Registry } from "../core/registry";
import { MenuElementFactory } from "../types";
import { backendDebugManagerItems, globalDebugManagerItems } from "./debug_manager_item";

export const debugManagerRegistry: Registry<MenuElementFactory> = new Registry();
backendDebugManagerItems.forEach((item) => {
  debugManagerRegistry.add(item.name, item);
});
globalDebugManagerItems.forEach((item) => {
  debugManagerRegistry.add(item.name, item);
});
