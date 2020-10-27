export default [{
  input: "static/dist/js/src/main.js",
  external: ["@odoo/owl", "chart.js"],
  output: {
    file: "static/dist/app.js",
    format: "iife",
    name: "wowl",
    extend: true,
    globals: { "@odoo/owl": "owl", "chart.js": "Chart" },
  },
}, {
  input: "static/dist/js/tests/main.js",
  external: ["@odoo/owl", "chart.js", "qunit", "jquery"],
  output: {
    file: "static/dist/app_tests.js",
    format: "iife",
    name: "wowl",
    extend: true,
    globals: { "@odoo/owl": "owl", "chart.js": "Chart", "qunit": "QUnit", "jquery": "$" },
    interop: false, // to be allowed to add a 'debug' function on the QUnit object
  },
}];
