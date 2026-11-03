import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createWindowsBridgeInstaller } from "../integration/com.ulanzi.codexmicro.ulanziPlugin/plugin/windows-bridge-installer.js";

if (process.platform !== "win32") throw new Error("This setup command requires Windows.");
const pluginRoot = resolve("integration/com.ulanzi.codexmicro.ulanziPlugin");
const metadata = JSON.parse(await readFile(resolve("package.json"), "utf8"));
const installer = createWindowsBridgeInstaller({
  pluginRoot,
  bridgeUrl: "http://127.0.0.1:17373",
  version: metadata.version
});
const result = await installer.install();
console.log(`Codex Bridge installed: ${result.appPath}`);
console.log(`Bridge service online: ${result.serviceOnline}`);
console.log("Use Launch Codex Bridge in Ulanzi Studio to start or restart Codex with local CDP.");
