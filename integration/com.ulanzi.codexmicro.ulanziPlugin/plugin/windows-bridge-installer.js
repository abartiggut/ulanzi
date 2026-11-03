import { access, copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { homedir } from "node:os";
import { delimiter, join, resolve } from "node:path";

const execFileAsync = promisify(execFile);

async function exists(path) {
  try {
    await access(path, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function selectWindowsNodeRuntime({
  nodeExecutable = process.execPath,
  environmentPath = process.env.PATH || "",
  execute = execFileAsync
} = {}) {
  const candidates = [
    ...environmentPath.split(delimiter).filter(Boolean).map(directory => join(directory, "node.exe")),
    nodeExecutable
  ];
  for (const candidate of [...new Set(candidates)]) {
    if (!await exists(candidate)) continue;
    try {
      const { stdout = "" } = await execute(candidate, ["--version"]);
      const match = String(stdout).trim().match(/^v?(\d+)(?:\.(\d+))?/);
      if (match && Number(match[1]) >= 20) {
        return {
          executable: candidate,
          version: String(stdout).trim().replace(/^v/, ""),
          source: candidate === nodeExecutable ? "ulanzi" : "system"
        };
      }
    } catch {
      // Continue to the next installed Node runtime.
    }
  }
  throw new Error("Node.js 20 or later is required for Codex Bridge.");
}

function windowsLauncher() {
  return `$ErrorActionPreference = 'Stop'
$debugUrl = 'http://127.0.0.1:9222/json/list'
function Test-CodexDebugEndpoint {
  try {
    $targets = @(Invoke-RestMethod -Uri $debugUrl -TimeoutSec 1)
    if (-not ($targets | Where-Object { $_.type -eq 'page' -and $_.url -like 'app://*' })) { return $false }
    $listeners = @(Get-NetTCPConnection -LocalPort 9222 -State Listen -ErrorAction Stop)
    if (-not $listeners -or ($listeners | Where-Object { $_.LocalAddress -notin @('127.0.0.1', '::1') })) { return $false }
    foreach ($listenerPid in @($listeners | Select-Object -ExpandProperty OwningProcess -Unique)) {
      $owner = Get-CimInstance Win32_Process -Filter "ProcessId = $listenerPid"
      if ($owner.ExecutablePath -notlike '*\\OpenAI.Codex_*\\app\\ChatGPT.exe') { return $false }
    }
    return $true
  } catch { return $false }
}
if (Test-CodexDebugEndpoint) { exit 0 }

$running = @(Get-CimInstance Win32_Process -Filter "Name = 'ChatGPT.exe'" |
  Where-Object { $_.ExecutablePath -like '*\\OpenAI.Codex_*\\app\\ChatGPT.exe' -and $_.CommandLine -notmatch '--type=' })
if ($running) {
  foreach ($codexProcess in $running) {
    $window = Get-Process -Id $codexProcess.ProcessId -ErrorAction SilentlyContinue
    if (-not $window -or -not $window.CloseMainWindow()) {
      throw 'Codex is running without a closable window. Quit Codex manually, then press the Bridge key again.'
    }
  }
  for ($attempt = 0; $attempt -lt 100; $attempt++) {
    $running = @(Get-CimInstance Win32_Process -Filter "Name = 'ChatGPT.exe'" |
      Where-Object { $_.ExecutablePath -like '*\\OpenAI.Codex_*\\app\\ChatGPT.exe' -and $_.CommandLine -notmatch '--type=' })
    if (-not $running) { break }
    Start-Sleep -Milliseconds 200
  }
  if ($running) {
    foreach ($codexProcess in $running) {
      $window = Get-Process -Id $codexProcess.ProcessId -ErrorAction SilentlyContinue
      if ($window -and $window.MainWindowHandle -ne [IntPtr]::Zero) {
        throw 'Codex did not quit. Finish any open dialog, then press the Bridge key again.'
      }
      Stop-Process -Id $codexProcess.ProcessId -Force -ErrorAction Stop
    }
    for ($attempt = 0; $attempt -lt 25; $attempt++) {
      $running = @(Get-CimInstance Win32_Process -Filter "Name = 'ChatGPT.exe'" |
        Where-Object { $_.ExecutablePath -like '*\\OpenAI.Codex_*\\app\\ChatGPT.exe' -and $_.CommandLine -notmatch '--type=' })
      if (-not $running) { break }
      Start-Sleep -Milliseconds 200
    }
    if ($running) { throw 'Codex remained in the tray after closing. Quit it manually, then press the Bridge key again.' }
  }
}

$package = Get-AppxPackage -Name OpenAI.Codex | Sort-Object Version -Descending | Select-Object -First 1
if (-not $package) { throw 'The Codex desktop app is not installed.' }
$codex = Join-Path $package.InstallLocation 'app\\ChatGPT.exe'
if (-not (Test-Path -LiteralPath $codex)) { throw "Codex executable is missing: $codex" }
Start-Process -FilePath $codex -ArgumentList @(
  '--remote-debugging-address=127.0.0.1',
  '--remote-debugging-port=9222',
  '--remote-allow-origins=http://127.0.0.1:9222'
)
for ($attempt = 0; $attempt -lt 150; $attempt++) {
  Start-Sleep -Milliseconds 200
  try {
    if (Test-CodexDebugEndpoint) { exit 0 }
  } catch {}
}
throw 'Codex started, but its local debug endpoint did not become available.'
`;
}

export function createWindowsBridgeInstaller({
  pluginRoot,
  bridgeUrl,
  version,
  home = homedir(),
  localAppData = process.env.LOCALAPPDATA || join(home, "AppData", "Local"),
  nodeExecutable = process.execPath,
  environmentPath = process.env.PATH || "",
  execute = execFileAsync,
  spawnProcess = spawn
}) {
  const appRoot = join(localAppData, "OpenCodexMicro");
  const bridgeRuntime = join(appRoot, "bridge.mjs");
  const launcher = join(appRoot, "launch-codex.ps1");
  const metadataPath = join(appRoot, "install.json");
  const bundledRuntime = resolve(pluginRoot, "installer", "bridge.mjs");

  async function probeBridge() {
    try {
      const response = await fetch(`${bridgeUrl}/health`, { signal: AbortSignal.timeout(1200) });
      const body = await response.json();
      if (!response.ok || body.service !== "OpenCodexMicro") throw new Error("Unexpected Bridge service");
      return { serviceOnline: true, cdpConnected: Boolean(body.codexConnected), serviceError: null, pid: body.pid };
    } catch (error) {
      return { serviceOnline: false, cdpConnected: false, serviceError: error.message, pid: null };
    }
  }

  async function status() {
    let metadata = null;
    try { metadata = JSON.parse(await readFile(metadataPath, "utf8")); } catch {}
    const [runtimeInstalled, launcherInstalled, probe] = await Promise.all([
      exists(bridgeRuntime), exists(launcher), probeBridge()
    ]);
    const installed = runtimeInstalled && launcherInstalled;
    return {
      supported: true,
      installed,
      appInstalled: launcherInstalled,
      serviceInstalled: runtimeInstalled,
      installedVersion: metadata?.version || null,
      bundledVersion: version,
      needsUpdate: !installed || metadata?.version !== version,
      appPath: launcher,
      nodeExecutable: metadata?.nodeExecutable || null,
      nodeVersion: metadata?.nodeVersion || null,
      nodeSource: metadata?.nodeSource || null,
      ...probe
    };
  }

  async function ensureService() {
    if (!await exists(bridgeRuntime)) return status();
    const probe = await probeBridge();
    if (probe.serviceOnline) return status();
    let metadata;
    try { metadata = JSON.parse(await readFile(metadataPath, "utf8")); } catch {}
    const runtime = metadata?.nodeExecutable;
    if (!runtime || !await exists(runtime)) throw new Error("Bridge Node runtime is missing. Repair the installation.");
    const child = spawnProcess(runtime, [bridgeRuntime], {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
      cwd: appRoot
    });
    child.unref();
    for (let attempt = 0; attempt < 30; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 100));
      if ((await probeBridge()).serviceOnline) return status();
    }
    throw new Error("Codex Bridge did not start.");
  }

  async function install() {
    if (!await exists(bundledRuntime)) throw new Error("Bundled Bridge runtime is missing.");
    const runtime = await selectWindowsNodeRuntime({ nodeExecutable, environmentPath, execute });
    await mkdir(appRoot, { recursive: true });
    await copyFile(bundledRuntime, bridgeRuntime);
    await writeFile(launcher, windowsLauncher());
    for (const notice of ["LICENSE", "NOTICE.md", "THIRD_PARTY_NOTICES.md"]) {
      await copyFile(resolve(pluginRoot, "installer", notice), join(appRoot, notice));
    }
    await writeFile(metadataPath, `${JSON.stringify({
      version,
      nodeExecutable: runtime.executable,
      nodeVersion: runtime.version,
      nodeSource: runtime.source,
      installedAt: new Date().toISOString()
    }, null, 2)}\n`);
    await ensureService();
    return status();
  }

  async function launch() {
    if (!await exists(launcher)) throw new Error("Codex Bridge is not installed.");
    await ensureService();
    await execute("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", launcher]);
    return status();
  }

  async function start() {
    if (!(await status()).installed) await install();
    return launch();
  }

  async function uninstall() {
    const probe = await probeBridge();
    if (probe.serviceOnline && Number.isInteger(probe.pid)) {
      await execute("taskkill.exe", ["/PID", String(probe.pid), "/F"]);
    }
    await rm(appRoot, { recursive: true, force: true });
    return status();
  }

  return { status, install, launch, start, uninstall, ensureService };
}
