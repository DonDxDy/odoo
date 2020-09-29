import * as owl from "@odoo/owl";
import { Env } from "@odoo/owl/dist/types/component/component";
import { EventBus } from "@odoo/owl/dist/types/core/event_bus";
import type { Registries } from "./registries";
import { deployServices, Services } from "./services";

type Browser = Env["browser"];
export interface OdooBrowser extends Browser {
  XMLHttpRequest: typeof window["XMLHttpRequest"];
}

export interface OdooEnv extends Env {
  browser: OdooBrowser;
  services: Services;
  registries: Registries;
  bus: EventBus;
}

export async function makeEnv(
  templates: string,
  registries: Registries,
  browser: OdooBrowser
): Promise<OdooEnv> {
  const qweb = new owl.QWeb();
  qweb.addTemplates(templates);

  const env = {
    browser,
    qweb,
    bus: new owl.core.EventBus(),
    registries,
    services: {} as any,
  };

  await deployServices(env, registries.services);
  return env;
}
