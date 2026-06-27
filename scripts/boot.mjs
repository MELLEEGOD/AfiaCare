import { execFile, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const host = "127.0.0.1";
const port = Number(process.env.PORT || process.argv[2] || 5173);
const url = `http://${host}:${port}/?fresh=${Date.now()}`;
const root = resolve(".");
const buildOnly = process.argv.includes("--build-only");

function run(command, args = [], options = {}) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      shell: process.platform === "win32" ? true : false,
      stdio: options.stdio || "inherit",
      windowsHide: false,
      ...options,
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0 || options.allowFailure) resolveRun(code);
      else reject(new Error(`${command} ${args.join(" ")} exited with code ${code}`));
    });
  });
}

function capture(command, args = []) {
  return new Promise((resolveCapture) => {
    execFile(command, args, { cwd: root, windowsHide: true }, (error, stdout) => {
      resolveCapture(error ? "" : stdout);
    });
  });
}

async function processIdsOnPort(targetPort) {
  const output = await capture("netstat", ["-ano", "-p", "tcp"]);
  const ids = new Set();

  for (const line of output.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("TCP")) continue;
    const columns = trimmed.split(/\s+/);
    const localAddress = columns[1] || "";
    const state = columns[3] || "";
    const pid = columns[4] || "";
    if (localAddress.endsWith(`:${targetPort}`) && state === "LISTENING" && /^\d+$/.test(pid)) {
      ids.add(pid);
    }
  }

  return [...ids];
}

async function stopExistingServer() {
  const ids = await processIdsOnPort(port);
  if (!ids.length) return;

  console.log(`Stopping existing server on port ${port}: ${ids.join(", ")}`);
  for (const pid of ids) {
    await run("taskkill", ["/PID", pid, "/F"], { allowFailure: true });
  }
}

async function openBrowser() {
  if (process.platform === "win32") {
    await run("cmd", ["/c", "start", "", url], { allowFailure: true, stdio: "ignore", shell: false });
    return;
  }

  await run("xdg-open", [url], { allowFailure: true, stdio: "ignore" });
}

async function main() {
  console.log("AfiaCare boot");
  console.log(`Project: ${root}`);

  if (!existsSync(resolve("node_modules"))) {
    console.log("Installing dependencies...");
    await run("npm", ["install"]);
  }

  console.log("Building the latest UI...");
  await run("npm", ["run", "build"]);

  if (buildOnly) {
    console.log("Build-only check passed.");
    return;
  }

  await stopExistingServer();

  console.log(`Starting AfiaCare at ${url}`);
  await openBrowser();
  await run("node", ["scripts/serve-dist.mjs", String(port)]);
}

main().catch((error) => {
  console.error(`\nBoot failed: ${error.message}`);
  process.exit(1);
});
