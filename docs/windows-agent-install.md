# Windows setup for AI agents

This is the abartiggut Windows 10/11 port of OpenCodexMicro. Use the
`windows-port` branch. The upstream project and the older `main` branch
describe the macOS installation; their `npm run setup` command is not the
Windows installer.

The system has four parts:

~~~text
Codex Desktop (OpenAI.Codex) <-> local CDP :9222 <-> local Bridge :17373
                                           <-> Ulanzi Studio plugin <-> D200
~~~

## Agent checklist

1. Confirm Windows 10/11, Codex Desktop, Ulanzi Studio 3.4.8 or later, an
   attached D200, Node.js 20 or later, and Git. Check for an existing checkout
   and uncommitted changes before cloning or updating anything.
2. Clone this branch if no checkout exists:

   ~~~powershell
   git clone --branch windows-port https://github.com/abartiggut/ulanzi.git
   cd ulanzi
   npm ci
   npm run check
   ~~~

   With an existing clean checkout, use `git fetch origin windows-port`,
   `git switch windows-port`, then `git pull --ff-only origin windows-port`.
   Then run `npm ci` and `npm run check`. Preserve any uncommitted work
   instead of overwriting it.

3. Save any Ulanzi Studio profile edits. Quit Ulanzi Studio completely,
   including its tray process, before replacing the plugin. Do not stop Codex
   for this installation step.
4. Run `npm run setup:windows` from the repository root. This builds and
   installs the plugin into the current user's Ulanzi directory and installs
   the Bridge into `%LOCALAPPDATA%\OpenCodexMicro`. It does not install a
   standalone device driver or change the Codex installation.
5. Confirm the installed plugin manifest has UUID
   `com.ulanzi.ulanzistudio.codexmicro` and that its `CodePath`
   (`dist/app.js`) exists. Confirm the Bridge service responds:

   ~~~powershell
   $plugin = Join-Path $env:APPDATA 'Ulanzi\UlanziDeck\Plugins\com.ulanzi.codexmicro.ulanziPlugin'
   $manifest = Get-Content (Join-Path $plugin 'manifest.json') -Raw | ConvertFrom-Json
   if ($manifest.UUID -ne 'com.ulanzi.ulanzistudio.codexmicro') { throw 'Wrong plugin UUID' }
   if (-not (Test-Path (Join-Path $plugin $manifest.CodePath))) { throw 'Missing plugin entry point' }
   Invoke-RestMethod http://127.0.0.1:17373/health
   ~~~

6. Start Ulanzi Studio and confirm **Codex Micro** appears in the action
   catalogue and the D200 says connected. Assign **Codex Task 1–5** to five
   keys and **Launch Codex Bridge** to another key. No profile layout is
   bundled; assign actions through Ulanzi Studio, not through a separate
   keyboard shortcut tool. Other actions can be added as needed.
7. Start or restart Codex with the **Launch Codex Bridge** key, or run:

   ~~~powershell
   powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$env:LOCALAPPDATA\OpenCodexMicro\launch-codex.ps1"
   ~~~

   This closes an existing Codex desktop instance gracefully, handles a
   remaining tray process, and starts Codex with local CDP. If the installing
   agent is running **inside that same Codex app**, save progress before this
   restart; the current agent session can be interrupted. If Codex shows an
   open dialog that prevents closing, finish the dialog and retry.
8. Check `Invoke-RestMethod http://127.0.0.1:17373/health` again.
   `service` must be `OpenCodexMicro` and `codexConnected` must be
   `true`. Read `http://127.0.0.1:17373/state` to verify task slots.
   Report plugin installation, device visibility, Bridge health and Codex
   connection separately. Do not claim a physical key was tested from a
   successful HTTP response alone.

To open the Codex page from a main deck key, put Ulanzi Studio's native
**Pages → Go to Page** action on that key and target the page containing the
Bridge action. Activating that page starts the Bridge action automatically
when Codex is disconnected. The Codex logo artwork is
`integration/com.ulanzi.codexmicro.ulanziPlugin/assets/icons/plugin.png`.

## Languages

Ulanzi Studio passes its UI language to the plugin. The plugin ships
`en.json`, `de_DE.json`, `es_ES.json`, `pt_PT.json`, `ja_JP.json`,
`ko_KR.json`, `zh_CN.json` and `zh_HK.json`. German Studio uses the
German action names and German status labels on task keys. Other supported
Studio languages use their own action names; task-card status labels currently
use English outside German. Unsupported languages fall back to English.
Change the language in Ulanzi Studio and restart Studio; there is no npm
language flag. Codex Desktop's language is independent of Studio's language.
The Bridge uses structural controls where available and has localized
fallbacks for supported Codex UI actions.

Find actions by their meaning or stable UUID suffix rather than assuming
the English labels are visible. For example, German **Codex-Aufgabe 1** is
`com.ulanzi.ulanzistudio.codexmicro.task1`, and **Codex Bridge starten**
is the `.launch` action.

## How keys control Codex

Ulanzi Studio owns the USB device and sends key events to the plugin. The
plugin reads live state from `GET /state` and renders each task title and
status on its key. It maps keypad `keydown`/`keyup` to the local Bridge;
the host's additional `run` event is not a second press. Encoder events
are handled separately. The Bridge listens only on `127.0.0.1:17373`;
Codex CDP listens only on `127.0.0.1:9222`.

| Studio action | UUID suffix | Physical control and local Bridge route |
| --- | --- | --- |
| Task 1–5 | `.task1` … `.task5` | Press opens the displayed chat via `POST /thread/{encoded-thread-key}/click?slot=0..4` |
| Fast | `.fast` | Press/release via `POST /action/fast/{down|up}` |
| Pin | `.pin` | Press/release via `POST /action/pin/{down|up}` |
| New | `.new` | Press/release via `POST /action/new/{down|up}` |
| Fork | `.fork` | Press/release via `POST /action/fork/{down|up}` |
| Mic | `.mic` | Press/release via `POST /action/mic/{down|up}`; Windows toggles dictation on each press |
| Steer | `.steer` | Press/release via `POST /action/steer/{down|up}` |
| Submit | `.submit` | Press/release via `POST /action/submit/{down|up}` |
| Usage | `.usage` | Press focuses Codex via `POST /focus` |
| Launch Codex Bridge | `.launch` | Press, or activate its page while disconnected; plugin installer/launcher, no `/action/launch` route |
| Latest Task & Scroll encoder | `.navigate` | Press opens task 1; turn scrolls via Studio hotkey |
| Model & Reasoning encoder | `.model` | Turn changes model; hold and turn changes effort via `POST /composer/{model|reasoning}/{left|right}` |
| Context Navigator encoder | `.context` | Turn/press controls the + / @ menu via `POST /composer/context/{up|down|select|close}` |
| Permission Pilot encoder | `.permissions` | Turn/press selects policy or approval via `POST /permissions/...` with active context and request key |

The exact action names, UUIDs and translations are in
`integration/com.ulanzi.codexmicro.ulanziPlugin/manifest.json` and the
locale JSON files. [Configuration](configuration.md) describes each action's
visible behaviour. Read-only `GET /health` and `GET /state` are suitable
installation checks. Do not invoke Submit, Steer, approval or permission
routes merely to test setup: those change the active Codex chat.

## When something is missing

- **No Codex Micro category:** inspect the installed manifest and entry point,
  then fully restart Ulanzi Studio.
- **Bridge offline:** rerun `npm run setup:windows` or use the plugin's
  **Install / Repair** setup page.
- **Bridge online, `codexConnected=false`:** start Codex through the
  Bridge key or the installed launcher. A normally launched Codex instance
  has no CDP endpoint.
- **No tasks on keys:** confirm the D200 is connected, the five task actions
  are assigned, and `GET /state` contains slots.
- **Steer has no effect:** it requires Codex to expose a Steer control for the
  running task; Queue is a different action.

Further paths and diagnostics: [Setup and Operations](setup-and-operations.md).
