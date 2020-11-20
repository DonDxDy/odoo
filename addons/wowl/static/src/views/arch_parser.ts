import {
  ArchNode,
  ElementArchNode,
  TextArchNode,
} from "../types";


// Arch parser

function parseElementArchNode(node: Element): ElementArchNode {
  const childNodes: ArchNode[] = [];
  const children: ElementArchNode[] = [];
  for (const childNode of node.childNodes) {
    if (childNode instanceof Element) {
      const archChildNode = parseElementArchNode(childNode as Element);
      childNodes.push(archChildNode);
      children.push(archChildNode);
    } else {
      childNodes.push(parseTextArchNode(childNode as Text));
    }
  }

  const attributes: {[key: string]: string} = {};
  for (const attribute of node.attributes) {
    attributes[attribute.name] = attribute.value;
  }

  return {
    type: "element",
    tag: node.tagName,
    childNodes,
    children,
    attributes,
    getAttribute(name: string, defaultValue?: any): any {
      return this.hasAttribute(name) ? this.attributes[name] : defaultValue;
    },
    hasAttribute(name: string): boolean {
      return this.attributes.hasOwnProperty(name);
    },
  };
}

function parseTextArchNode(node: Text): TextArchNode {
  return {
    type: "text",
    text: node.textContent!,
  };
}

export function parseArch(arch: string): ElementArchNode {
  const parser = new DOMParser();
  const document = parser.parseFromString(arch, "text/xml");
  return parseElementArchNode(document.documentElement);
}



// Arch traverser

const textSymbol = Symbol("text");
const elementSymbol = Symbol("element");

type ArchTraverserVisitorFn = (archNode: ArchNode) => any;
type ElementArchTraverserVisitorFn = (archNode: ElementArchNode, visitorFn: ArchTraverserVisitorFn) => any;
type TextArchTraverserVisitorFn = (archNode: TextArchNode) => any;

interface ArchTraverserConfigs {
  [textSymbol]?: TextArchTraverserVisitorFn;
  [elementSymbol]?: ElementArchTraverserVisitorFn;
  [key: string]: ElementArchTraverserVisitorFn;
}

function visitArchNode(configs: ArchTraverserConfigs, archNode: ArchNode): any {
  if (archNode.type === "text") {
    const textVisitor = configs[textSymbol];
    if (textVisitor) {
      return textVisitor.call(configs, archNode as TextArchNode);
    }
  } else if (archNode.type === "element") {
    const elementVisitor = configs[(archNode as ElementArchNode).tag] || configs[elementSymbol];
    if (elementVisitor) {
      return elementVisitor.call(configs, archNode as ElementArchNode, visitArchNode.bind(null, configs));
    }
  }
}

export function traverseArch(archNode: ArchNode, configs: ArchTraverserConfigs): any {
  const defaultedConfigs = Object.assign({
    [elementSymbol](node: ElementArchNode) {
      for (const child of node.childNodes) {
        visitArchNode(defaultedConfigs, child);
      }
    },
  }, configs);

  return visitArchNode(defaultedConfigs, archNode);
}



// Example

const arch: ArchNode = parseArch(`
  <form>
    <sheet>
      <div class="oe_title">
        <h1>
          <field name="name"/>
        </h1>
      </div>
      <notebook>
        <page string="Page 1">
          <div>Hello</div>
        </page>
        <page string="Page 2">
          <div>World</div>
        </page>
      </notebook>
    </sheet>
  </form>
`);

interface Attributes {
  [key: string]: any;
}

function createElement(tag: string, attributes: Attributes, childNodes: (HTMLElement | string)[]): HTMLElement {
  const element = document.createElement(tag);
  for (const [key, value] of Object.entries(attributes)) {
    element.setAttribute(key, value);
  }
  for (const child of childNodes) {
    element.append(child);
  }
  return element;
}

const result: HTMLElement = traverseArch(arch, {
  [textSymbol](node) {
    return node.text;
  },
  [elementSymbol](node, visit) {
    return createElement(node.tag, node.attributes, node.childNodes.map(visit));
  },
  field(node) {
    return createElement("span", { class: "o_field_widget" }, [ node.attributes.name ]);
  },
  form(node, visit) {
    return createElement("div", { class: "o_form_view" }, node.children.map(visit));
  },
  notebook(node, visit) {
    console.log(this);
    const pages = node.childNodes
      .filter(child => child.type === "element" && child.tag === "page")
      .map(child => this.page(child as ElementArchNode, visit));

    return createElement("div", { class: "o_form_notebook" }, [
      createElement("div", { class: "o_form_notebook_header" }, pages.map(page => page[0])),
      createElement("div", { class: "o_form_notebook_content" }, pages.map(page => page[1])),
    ]);
  },
  page(node, visit) {
    return [
      createElement("div", { class: "o_form_page_header" }, [ node.attributes.string ]),
      createElement("div", { class: "o_form_page_content" }, node.children.map(visit)),
    ];
  },
  sheet(node, visit) {
    return createElement("div", { class: "o_form_sheet" }, node.childNodes.map(visit));
  },
});

console.log("traverse result:", result);
