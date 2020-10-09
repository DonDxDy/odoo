import { Component, tags } from "@odoo/owl";
import { actionRegistry } from "./registries";

// Demo code
class HelloAction extends Component {
  static template = tags.xml`<div>Discuss ClientAction</div>`;
}
actionRegistry.add("mail.widgets.discuss", HelloAction);
// actionRegistry.add("mail.widgets.discuss", () => console.log("I'm a function client action"));
