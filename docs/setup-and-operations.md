# Setup and Operations

## Windows 10/11 (experimental)

From the [abartiggut fork](https://github.com/abartiggut/ulanzi), install
Codex Desktop and Ulanzi Studio 3.4.8 or later. Connect the D200. In PowerShell
at the `windows-port` repository root, after saving profile edits and fully
quitting Ulanzi Studio:

```powershell
npm ci
npm run setup:windows
```

This builds and installs the Ulanzi plugin under
`%APPDATA%\Ulanzi\UlanziDeck\Plugins\com.ulanzi.codexmicro.ulanziPlugin` and
the user-local Bridge under `%LOCALAPPDATA%\OpenCodexMicro`. Restart Ulanzi
Studio, then add Codex Micro actions to the device. The plugin starts the Bridge
service when Ulanzi Studio opens it.

Press **Launch Codex Bridge**. If Codex is already running without CDP, the
launcher asks it to close, waits for the process to exit, and starts it with
the local debug port. If only the tray process remains after 20 seconds, the
launcher stops it. Finish any open Codex dialog if it cannot close. You can
also run the launcher from PowerShell:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$env:LOCALAPPDATA\OpenCodexMicro\launch-codex.ps1"
```

To open a Codex page from the main deck with one key, assign Ulanzi Studio's
**Pages → Go to Page** action to an empty main-deck key and select the page
containing **Launch Codex Bridge**. When that page becomes active, the Bridge
action starts Codex if CDP is disconnected. An existing connected Codex session
is left running. Ulanzi Studio's Multi Action editor does not include its page
navigation actions, so use the native page action for this workflow.

The launcher uses the installed `OpenAI.Codex` package and enables CDP on
`127.0.0.1:9222`. The Bridge API listens on `127.0.0.1:17373`. Check both
installation and connection:

```powershell
Invoke-RestMethod http://127.0.0.1:17373/health
```

`service` should be `OpenCodexMicro` and `codexConnected` should be `true`.
The setup panel in Ulanzi Studio reports these separately. The port cannot be
connected while Codex is running without the launcher. A full device test needs
at least one action assigned to a physical key.

For a repeatable installation by another coding agent, including locale
selection, stable action IDs and Bridge command routing, follow the
[Windows agent checklist](windows-agent-install.md).

## macOS

OpenCodexMicro has two installed components:

```text
Codex Desktop <-> Codex Bridge sidecar <-> Ulanzi Studio plugin <-> D200
```

## Dependencies

- macOS;
- Codex Desktop;
- Ulanzi Studio with a supported keypad device;
- Node.js 20 or newer only for repository-based manual installation.

## 1. Set up Codex Bridge.app in Ulanzi Studio

Drag any Codex Micro action onto a key and select it. In the shared
**Codex Bridge Setup** page, choose **Install / Repair**. The plugin installs
its bundled Bridge runtime, wrapper app, and user LaunchAgent without requiring
a repository path, npm, or administrator access. Then choose
**Launch Codex Bridge** and wait for the CDP status to become connected.

## 2. Set up Codex Bridge.app from the repository

From the repository root:

```bash
npm install
npm run setup
```

The installer builds the sidecar, writes and starts
`io.opencodexmicro.bridge`, and ad-hoc signs:

```text
~/Applications/Codex Bridge.app
```

To install without starting the sidecar LaunchAgent:

```bash
npm run setup -- --no-start
```

## 3. Install the Ulanzi Studio plugin

Quit Ulanzi Studio before replacing a plugin that is currently loaded, then
run:

```bash
npm run install:plugin
```

The repository ships the prebuilt `dist/app.js`. The command validates that
the manifest entry point exists and atomically replaces:

```text
~/Library/Application Support/Ulanzi/UlanziDeck/Plugins/com.ulanzi.codexmicro.ulanziPlugin
```

Restart Ulanzi Studio and confirm the **Codex Micro** category and actions are
visible.

Plugin development still uses `npm run build:plugin` and `npm run check`; commit
the updated `dist/app.js` and `dist/package.json` with source changes.

## Starting Codex

Quit a normally launched Codex instance, then open:

```text
~/Applications/Codex Bridge.app
```

The wrapper launches `/Applications/ChatGPT.app/Contents/MacOS/ChatGPT` with:

```text
--remote-debugging-address=127.0.0.1
--remote-debugging-port=9222
--remote-allow-origins=http://127.0.0.1:9222
```

CDP binds to `127.0.0.1:9222` and the sidecar API to `127.0.0.1:17373`.
Neither endpoint is reachable from the LAN.

## Installed files and service

```text
~/Applications/Codex Bridge.app
~/Library/Application Support/OpenCodexMicro/bridge.mjs
~/Library/Application Support/OpenCodexMicro/bridge.log
~/Library/Application Support/OpenCodexMicro/bridge-error.log
~/Library/LaunchAgents/io.opencodexmicro.bridge.plist
~/Library/Application Support/Ulanzi/UlanziDeck/Plugins/com.ulanzi.codexmicro.ulanziPlugin
```

Inspect or restart the Bridge sidecar:

```bash
launchctl print "gui/$(id -u)/io.opencodexmicro.bridge"
launchctl kickstart -k "gui/$(id -u)/io.opencodexmicro.bridge"
```

## Diagnostics

```bash
curl http://127.0.0.1:17373/health
curl http://127.0.0.1:17373/state
tail -f "$HOME/Library/Application Support/OpenCodexMicro/bridge.log"
tail -f "$HOME/Library/Application Support/OpenCodexMicro/bridge-error.log"
```

| Symptom | Check |
| --- | --- |
| Plugin category is missing | Confirm the installed plugin directory contains `manifest.json` and `dist/app.js`, then restart Ulanzi Studio |
| Plugin keys show offline | Start Codex with `Codex Bridge.app` and check `/health` and `/state` |
| A task key does not switch | Check `bridge-error.log` and confirm `/state` contains the displayed thread |
| Steer does nothing | Confirm a running task exposes the visible composer Steer action |
| An action has no effect | Confirm the plugin can reach `127.0.0.1:17373` and inspect the Bridge log |

## Update

```bash
git pull
npm install
npm run check
npm run setup
npm run install:plugin
```

Restart Ulanzi Studio after updating the plugin.

## Uninstall

```bash
npm run uninstall
```

This stops and removes the Bridge LaunchAgent, Bridge runtime, wrapper app, and
installed Codex Micro plugin directory.

## Development

```bash
npm install
npm run check
```

Main entry points:

- `src/bridge/`: Codex renderer bridge;
- `scripts/build-bridge.mjs`: bundle the loopback sidecar;
- `scripts/install.mjs`: install the sidecar and wrapper app;
- `scripts/install-plugin.mjs`: validate and install the prebuilt Ulanzi plugin;
- `integration/com.ulanzi.codexmicro.ulanziPlugin/`: Ulanzi Studio plugin;
- `scripts/uninstall.mjs`: remove both installed components.
