import assert from "node:assert/strict";
import test from "node:test";
import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createWindowsBridgeInstaller } from "../integration/com.ulanzi.codexmicro.ulanziPlugin/plugin/windows-bridge-installer.js";

const pluginRoot = fileURLToPath(new URL(
  "../integration/com.ulanzi.codexmicro.ulanziPlugin/", import.meta.url
));

test("Windows Bridge installs for the current user and relaunches Codex through the local bridge", async () => {
  const home = await mkdtemp(join(tmpdir(), "codex-micro-win-"));
  const commands = [];
  const health = createServer((_request, response) => {
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify({ ok: true, service: "OpenCodexMicro", pid: 12345, codexConnected: false }));
  });
  await new Promise(resolve => health.listen(0, "127.0.0.1", resolve));
  const installer = createWindowsBridgeInstaller({
    pluginRoot,
    bridgeUrl: `http://127.0.0.1:${health.address().port}`,
    version: "9.8.7",
    home,
    localAppData: join(home, "AppData", "Local"),
    nodeExecutable: process.execPath,
    environmentPath: "",
    execute: async (command, args) => {
      commands.push([command, args]);
      return { stdout: args[0] === "--version" ? "v22.18.0\n" : "", stderr: "" };
    }
  });
  try {
    assert.equal((await installer.status()).installed, false);
    const installed = await installer.install();
    assert.equal(installed.installed, true);
    assert.equal(installed.serviceOnline, true);
    assert.equal(installed.installedVersion, "9.8.7");
    await access(join(home, "AppData", "Local", "OpenCodexMicro", "bridge.mjs"));
    const launcher = await readFile(installed.appPath, "utf8");
    assert.match(launcher, /Get-AppxPackage -Name OpenAI\.Codex/);
    assert.match(launcher, /CloseMainWindow\(\)/);
    assert.match(launcher, /Codex did not quit/);
    assert.match(launcher, /MainWindowHandle -ne \[IntPtr\]::Zero/);
    assert.match(launcher, /Stop-Process -Id \$codexProcess\.ProcessId -Force/);
    assert.match(launcher, /Codex remained in the tray/);
    assert.match(launcher, /--remote-debugging-address=127\.0\.0\.1/);

    await installer.launch();
    assert.ok(commands.some(([command]) => command === "powershell.exe"));
    assert.equal((await installer.uninstall()).installed, false);
    assert.ok(commands.some(([command, args]) =>
      command === "taskkill.exe" && args.join(" ") === "/PID 12345 /F"));
  } finally {
    health.close();
    await rm(home, { recursive: true, force: true });
  }
});
