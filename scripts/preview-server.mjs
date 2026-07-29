import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../frontend/dist");
const noOpen = process.argv.includes("--no-open");
const requestedPortArgument = process.argv.find(argument => /^--port=\d+$/.test(argument));
const requestedPort = requestedPortArgument ? Number(requestedPortArgument.split("=")[1]) : 4173;
const host = "127.0.0.1";

const mimeTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".ico", "image/x-icon"],
  [".map", "application/json; charset=utf-8"]
]);

function safeFilePath(urlPath) {
  const decoded = decodeURIComponent(String(urlPath || "/").split("?")[0]);
  const relative = decoded === "/" ? "index.html" : decoded.replace(/^\/+/, "");
  const fullPath = path.resolve(root, relative);
  if (fullPath !== root && !fullPath.startsWith(root + path.sep)) return null;
  return fullPath;
}

function openBrowser(url) {
  let command;
  let args;
  if (process.platform === "win32") {
    command = "cmd.exe";
    args = ["/c", "start", "", url];
  } else if (process.platform === "darwin") {
    command = "open";
    args = [url];
  } else {
    command = "xdg-open";
    args = [url];
  }
  try {
    const child = spawn(command, args, { detached: true, stdio: "ignore" });
    child.unref();
  } catch (error) {
    console.warn(`Could not open a browser automatically: ${error.message}`);
  }
}

function makeServer() {
  return http.createServer((request, response) => {
    const filePath = safeFilePath(request.url);
    if (!filePath) {
      response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Invalid path");
      return;
    }
    fs.stat(filePath, (statError, stat) => {
      if (statError || !stat.isFile()) {
        response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        response.end("Not found");
        return;
      }
      const contentType = mimeTypes.get(path.extname(filePath).toLowerCase()) || "application/octet-stream";
      response.writeHead(200, {
        "Content-Type": contentType,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'"
      });
      const stream = fs.createReadStream(filePath);
      stream.on("error", error => {
        if (!response.headersSent) response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
        response.end(`Could not read file: ${error.message}`);
      });
      stream.pipe(response);
    });
  });
}

function listen(port) {
  const server = makeServer();
  server.once("error", error => {
    if (error.code === "EADDRINUSE" && port < requestedPort + 20) {
      listen(port + 1);
      return;
    }
    console.error(`Could not start the preview server: ${error.message}`);
    process.exitCode = 1;
  });
  server.listen(port, host, () => {
    const url = `http://${host}:${port}/`;
    console.log("");
    console.log("Running_Task browser preview is ready:");
    console.log(`  ${url}`);
    console.log("");
    console.log("Keep this window open while using the preview.");
    console.log("Press Ctrl+C or close this window to stop it.");
    console.log("Preview data stays in this browser only and is separate from the desktop SQLite database.");
    if (!noOpen) openBrowser(url);
  });
  const stop = () => server.close(() => process.exit(0));
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
}

if (!fs.existsSync(path.join(root, "index.html"))) {
  console.error(`Preview files were not found under ${root}`);
  process.exit(1);
}
listen(requestedPort);
