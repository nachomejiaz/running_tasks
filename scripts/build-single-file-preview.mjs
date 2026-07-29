import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const dist = path.join(root, "frontend", "dist");
const outputDir = path.join(root, "preview");
const output = path.join(outputDir, "Running_Task_Preview.html");

const css = fs.readFileSync(path.join(dist, "styles.css"), "utf8");
const scripts = [
  "vendor/react.production.min.js",
  "vendor/react-dom.production.min.js",
  "vendor/htm.umd.js",
  "app.js"
].map(relative => fs.readFileSync(path.join(dist, relative), "utf8"));

for (const source of scripts) {
  if (/<\/script/i.test(source)) throw new Error("A JavaScript source contains a closing script tag and cannot be safely inlined.");
}

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light dark" />
  <meta name="description" content="Running_Task self-contained browser review preview." />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline';" />
  <title>Running_Task Preview</title>
  <style>${css}</style>
</head>
<body>
  <!-- Review-only preview. Production desktop data uses local SQLite. -->
  <div id="root"></div>
  <script>${scripts[0]}</script>
  <script>${scripts[1]}</script>
  <script>${scripts[2]}</script>
  <script>${scripts[3]}</script>
</body>
</html>
`;

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(output, html);
console.log(`Built self-contained preview: ${path.relative(root, output)}`);
