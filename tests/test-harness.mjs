import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const root = path.resolve(here, "..");

function memoryStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.has(String(key)) ? values.get(String(key)) : null; },
    setItem(key, value) { values.set(String(key), String(value)); },
    removeItem(key) { values.delete(String(key)); },
    clear() { values.clear(); }
  };
}

export function createBrowserContext() {
  const rootElement = { id: "root" };
  const attributes = new Map();
  const context = {
    console,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    Date,
    Math,
    JSON,
    Promise,
    Map,
    Set,
    WeakMap,
    WeakSet,
    Symbol,
    Object,
    Array,
    String,
    Number,
    Boolean,
    RegExp,
    Error,
    TypeError,
    URL,
    URLSearchParams,
    Blob,
    TextEncoder,
    TextDecoder,
    performance: { now: () => Date.now() },
    navigator: { userAgent: "Running_Task render smoke test", platform: "test" },
    location: { href: "http://127.0.0.1:4173/", origin: "http://127.0.0.1:4173" },
    localStorage: memoryStorage(),
    sessionStorage: memoryStorage(),
    crypto: { randomUUID: () => "00000000-0000-4000-8000-000000000001" },
    matchMedia: () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }),
    addEventListener() {},
    removeEventListener() {},
    requestAnimationFrame(callback) { return setTimeout(() => callback(Date.now()), 0); },
    cancelAnimationFrame(id) { clearTimeout(id); },
    confirm: () => true,
    alert() {},
    document: {
      getElementById(id) { return id === "root" || id === "global-search" ? rootElement : null; },
      createElement(tagName) {
        return {
          tagName: String(tagName).toUpperCase(),
          style: {},
          children: [],
          setAttribute() {},
          appendChild(child) { this.children.push(child); },
          remove() {},
          click() {},
          focus() {}
        };
      },
      body: { appendChild() {}, removeChild() {} },
      documentElement: {
        setAttribute(name, value) { attributes.set(String(name), String(value)); },
        getAttribute(name) { return attributes.get(String(name)) || null; }
      }
    }
  };
  context.window = context;
  context.self = context;
  context.global = context;
  context.globalThis = context;
  context.ReactDOM = {
    render(element) { context.__capturedRoot = element; }
  };
  return vm.createContext(context);
}

export function loadApplication(exportNames = []) {
  const context = createBrowserContext();
  const react = fs.readFileSync(path.join(root, "frontend/dist/vendor/react.production.min.js"), "utf8");
  const htm = fs.readFileSync(path.join(root, "frontend/dist/vendor/htm.umd.js"), "utf8");
  const application = fs.readFileSync(path.join(root, "frontend/dist/app.js"), "utf8");
  vm.runInContext(react, context, { filename: "react.production.min.js" });
  vm.runInContext(htm, context, { filename: "htm.umd.js" });
  const names = ["RunningTaskApp", "defaultData", ...exportNames];
  const exportExpression = names.map(name => `${JSON.stringify(name)}: typeof ${name} === "undefined" ? undefined : ${name}`).join(",");
  vm.runInContext(`${application}\n;globalThis.__runningTaskTest = {${exportExpression}};`, context, { filename: "app.js" });
  return { context, exports: context.__runningTaskTest };
}

export function expandReactTree(node, stats = { nodes: 0, components: 0, hostElements: 0 }, depth = 0) {
  if (depth > 160) throw new Error("React tree exceeded the smoke-test depth limit.");
  if (node === null || node === undefined || typeof node === "boolean") return stats;
  if (Array.isArray(node)) {
    for (const child of node) expandReactTree(child, stats, depth + 1);
    return stats;
  }
  if (typeof node === "string" || typeof node === "number") {
    stats.nodes += 1;
    return stats;
  }
  if (typeof node !== "object") return stats;

  stats.nodes += 1;
  if (!node.type) return stats;
  const props = node.props || {};
  if (typeof node.type === "function") {
    stats.components += 1;
    let rendered;
    if (node.type.prototype && typeof node.type.prototype.render === "function") {
      const instance = new node.type(props);
      instance.props = props;
      rendered = instance.render();
    } else {
      rendered = node.type(props);
    }
    return expandReactTree(rendered, stats, depth + 1);
  }
  if (typeof node.type === "string") {
    stats.hostElements += 1;
    return expandReactTree(props.children, stats, depth + 1);
  }
  return expandReactTree(props.children, stats, depth + 1);
}
