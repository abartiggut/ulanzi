# OpenCodexMicro agent guide

This is the entry point for coding agents installing or operating the
abartiggut Windows fork. Detect the host OS first. On Windows, follow
[the complete Windows agent checklist](docs/windows-agent-install.md);
the repository's two setup skills are for macOS.

## Project overview

OpenCodexMicro connects Codex Desktop to an Ulanzi Studio plugin through a
loopback-only Bridge and a connected Ulanzi D200:

```text
Codex Desktop -> local Bridge -> Ulanzi Studio plugin -> D200
```

This repository is an independent fork. The upstream Ulanzi-maintained
implementation scope is limited to
`integration/com.ulanzi.codexmicro.ulanziPlugin/`. The plugin consumes state
and action interfaces exposed by the existing Bridge. Ulanzi did not design,
specify, develop, or maintain CDP or Codex's CDP implementation. Read
`NOTICE.md` before making attribution or responsibility claims.

## Publishing the Windows port

The development repository is `https://github.com/abartiggut/ulanzi`.
`https://github.com/abartiggut/OpenCodexMicro` is the GitHub-registered fork
of `UlanziTechnology/OpenCodexMicro` used for discoverability in its fork list.
When asked to publish Windows-port changes, keep the `windows-port` branch on
both abartiggut repositories in sync. Do not create a pull request to the
upstream Ulanzi repository unless the user explicitly asks for one.

## Windows 10/11: install without guessing

Use the `windows-port` branch. First inspect any existing checkout and the
installed plugin at
`%APPDATA%\Ulanzi\UlanziDeck\Plugins\com.ulanzi.codexmicro.ulanziPlugin`.
Read [docs/windows-agent-install.md](docs/windows-agent-install.md) for
preflight, exact commands, language behaviour, Studio action assignment,
Bridge routes, health checks and restart handling.

From a clean checkout, after saving Studio profile edits and fully quitting
Ulanzi Studio, the Windows install commands are:

~~~powershell
npm ci
npm run setup:windows
~~~

Restart Ulanzi Studio and assign the Codex Micro actions in its GUI. Use
**Launch Codex Bridge** to start Codex with CDP, then check
`http://127.0.0.1:17373/health` for `codexConnected=true`. The launcher
may close the current Codex GUI. If this agent runs inside that GUI, save
progress before triggering the restart and resume verification afterward.
Do not use `npm run setup`, `Codex Bridge.app`, or the macOS skills on
Windows. The Ulanzi Studio language selects action labels; it does not change
the install command or Bridge routes.

## macOS setup routing

When asked to install, configure, repair, or start OpenCodexMicro, inspect the
installed Ulanzi Studio plugins before choosing a skill. Do not infer plugin
installation from the presence of this repository.

1. Search under:

   ```text
   ~/Library/Application Support/Ulanzi/UlanziDeck/Plugins/
   ```

   Inspect plugin `manifest.json` files and treat Codex Micro as installed only
   when a manifest contains this exact UUID:

   ```text
   com.ulanzi.ulanzistudio.codexmicro
   ```

   Also verify that the manifest's `CodePath` exists in the same plugin
   directory. Do not rely only on the directory name.

2. If the plugin is not installed or its `CodePath` is missing, load and use
   `$install-ulanzi-studio-plugin` from
   `skills/install-ulanzi-studio-plugin/SKILL.md`. After successful installation
   and verification, continue to step 3.

3. If the plugin is already installed, or was just installed in step 2, load
   and use `$setup-codex-bridge` from `skills/setup-codex-bridge/SKILL.md`.

4. Report the plugin and Bridge verification results separately. Do not
   reinstall a valid plugin unless the user explicitly requests an update or
   repair.

Follow the authorization, application-shutdown, verification, and scope
boundaries in each selected `SKILL.md`. Do not restore or invoke the removed
Python/D200 standalone runtime.

## Key repository paths

- `integration/com.ulanzi.codexmicro.ulanziPlugin/`: prebuilt Ulanzi Studio
  plugin and its source.
- `src/bridge/`: inherited local Bridge implementation.
- `scripts/install-plugin.mjs`: atomic local plugin installer.
- `scripts/install.mjs`: Codex Bridge.app and sidecar installer.
- `scripts/install-windows.mjs`: Windows Bridge installer.
- `docs/windows-agent-install.md`: Windows install, language and action routing.
- `LICENSE`, `NOTICE.md`, and `THIRD_PARTY_NOTICES.md`: centralized licensing,
  attribution, modification, and responsibility information.
