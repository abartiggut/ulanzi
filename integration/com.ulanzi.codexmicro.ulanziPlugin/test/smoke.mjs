import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { WebSocketServer } from "ws";

const packageRootUrl = new URL("..", import.meta.url);
const manifest = JSON.parse(await readFile(new URL("manifest.json", packageRootUrl)));
const navigateAction = manifest.Actions.find(action =>
  action.UUID === "com.ulanzi.ulanzistudio.codexmicro.navigate"
);
assert.deepEqual(navigateAction?.Controllers, ["Encoder"]);
assert.equal(navigateAction?.Encoder?.layout, "layouts/navigate-encoder.json");
assert.equal(manifest.Version, "0.5.1");
assert.equal(manifest.Software?.MinVersion, "3.0.1");
assert.equal(manifest.OS?.find(item => item.Platform === "mac")?.MinimumVersion, "13.0");
assert.equal(manifest.OS?.find(item => item.Platform === "windows")?.MinimumVersion, "10");
assert.ok(
  manifest.Actions.every(action => action.PropertyInspectorPath === "property-inspector/setup.html"),
  "every action must expose the shared Bridge setup inspector"
);
const setupInspector = await readFile(new URL("property-inspector/setup.html", packageRootUrl), "utf8");
assert.match(setupInspector, /Codex Bridge Setup/);
assert.match(setupInspector, /Install \/ Repair/);
assert.match(setupInspector, /bridgeSetup/);
const setupScript = setupInspector.match(/<script>([\s\S]*)<\/script>/)?.[1];
assert.ok(setupScript, "setup inspector must contain its client script");
assert.doesNotThrow(() => new Function(setupScript), "setup inspector script must parse");
for (const asset of [
  "installer/bridge.mjs",
  "installer/CodexBridge.png",
  "installer/LICENSE",
  "installer/NOTICE.md",
  "installer/THIRD_PARTY_NOTICES.md"
]) {
  assert.ok((await readFile(new URL(asset, packageRootUrl))).length > 0, `${asset} must be bundled`);
}
assert.match(manifest.Overview, /Ulanzi D200 Series/);
assert.match(manifest.Description, /Windows 10\/11/);
assert.match(manifest.Description, /npm run setup:windows/);
assert.match(manifest.Description, /github\.com\/abartiggut\/ulanzi/);

const localizedActionNames = {
  "en.json": ["Codex Task 1", "Latest Task & Scroll", "Submit to Codex"],
  "zh_CN.json": ["Codex 任务 1", "最新任务与滚动", "提交到 Codex"],
  "zh_HK.json": ["Codex 任務 1", "最新任務與捲動", "提交至 Codex"],
  "ja_JP.json": ["Codex タスク 1", "最新タスクとスクロール", "Codex に送信"],
  "de_DE.json": ["Codex-Aufgabe 1", "Letzte Aufgabe & Scrollen", "An Codex senden"],
  "ko_KR.json": ["Codex 작업 1", "최신 작업 및 스크롤", "Codex에 제출"],
  "pt_PT.json": ["Tarefa Codex 1", "Tarefa recente e deslocamento", "Enviar para o Codex"],
  "es_ES.json": ["Tarea Codex 1", "Tarea reciente y desplazamiento", "Enviar a Codex"]
};

const localizedInstallPrompts = {
  "en.json": "Install the Ulanzi Studio plugin for me:",
  "zh_CN.json": "替我安装一下UlanziStudio插件：",
  "zh_HK.json": "請替我安裝 Ulanzi Studio 外掛程式：",
  "ja_JP.json": "Ulanzi Studio プラグインをインストールしてください：",
  "de_DE.json": "Installiere bitte das Ulanzi-Studio-Plugin für mich:",
  "ko_KR.json": "Ulanzi Studio 플러그인을 설치해 주세요:",
  "pt_PT.json": "Instala o plugin do Ulanzi Studio por mim:",
  "es_ES.json": "Instálame el plugin de Ulanzi Studio:"
};

const llmInstallationLink =
  "https://github.com/UlanziTechnology/OpenCodexMicro#1-llm--agent-installation";

for (const locale of [
  "en.json",
  "zh_CN.json",
  "zh_HK.json",
  "ja_JP.json",
  "de_DE.json",
  "ko_KR.json",
  "pt_PT.json",
  "es_ES.json"
]) {
  const messages = JSON.parse(await readFile(new URL(locale, packageRootUrl)));
  const forkLocale = locale === "en.json" || locale === "de_DE.json";
  assert.equal(messages.Name, "Codex Micro", `${locale} must localize Name`);
  assert.ok(messages.Overview?.length > 20, `${locale} must localize Overview`);
  assert.match(messages.Description, forkLocale ? /github\.com\/abartiggut\/ulanzi/ : /github\.com\/UlanziTechnology\/OpenCodexMicro/);
  if (forkLocale) assert.match(messages.Description, /npm run setup:windows/);
  else assert.match(messages.Description, /npm run install:plugin/);
  assert.match(messages.Description, /npm run setup/);
  if (!forkLocale) assert.match(messages.Description, /Latest Task & Scroll/);
  assert.ok(messages.Localization?.BridgeSetup?.length > 0, `${locale} must localize the setup page`);
  assert.ok(messages.Localization?.InstallRepair?.length > 0, `${locale} must localize Bridge installation`);
  assert.ok(messages.Localization?.UninstallBridge?.length > 0, `${locale} must localize Bridge uninstallation`);
  assert.ok(messages.Localization?.BridgeAppInfoTitle?.length > 0, `${locale} must explain Codex Bridge.app`);
  assert.ok(messages.Localization?.BackgroundActivityTitle?.length > 0, `${locale} must explain background activity`);
  assert.ok(messages.Localization?.NodeSelectionStrategy?.length > 0, `${locale} must explain Node selection`);
  assert.ok(messages.Localization?.UlanziNodeSignatureNotice?.length > 0, `${locale} must explain the Ulanzi Node signature`);
  if (!forkLocale) assert.ok(
    messages.Description.includes(`${localizedInstallPrompts[locale]}${
      locale.startsWith("zh_") || locale === "ja_JP.json" ? "" : " "
    }${llmInstallationLink}`),
    `${locale} must localize the anchored LLM installation prompt`
  );
  assert.equal(messages.Actions?.length, manifest.Actions.length, `${locale} must localize every action`);
  assert.ok(
    messages.Actions.every(action => action.Name?.length > 0 && action.Tooltip?.length > 0),
    `${locale} must localize every action name and tooltip`
  );
  assert.deepEqual(
    [messages.Actions[0].Name, messages.Actions[9].Name, messages.Actions[13].Name],
    localizedActionNames[locale],
    `${locale} action localization must follow manifest action order`
  );
  if (!forkLocale) assert.match(
    messages.Description.split("\n\n").at(-1),
    /open ~\/Applications\/Codex\\ Bridge\.app$/,
    `${locale} must end with the Bridge launch command`
  );
}

const bridgeRequests = [];
const bridge = createServer((request, response) => {
  bridgeRequests.push(`${request.method} ${request.url}`);
  response.setHeader("Content-Type", "application/json");
  if (request.url === "/health") {
    response.end(JSON.stringify({ ok: true, service: "OpenCodexMicro", codexConnected: true, updatedAt: Date.now() }));
    return;
  }
  if (request.url === "/state") {
    response.end(JSON.stringify({
      connected: true,
      slots: [
        { id: 0, threadKey: "11111111-1111-1111-1111-111111111111", title: "Working task", status: "thinking" },
        { id: 1, threadKey: "22222222-2222-2222-2222-222222222222", title: "Unread task", status: "unread" },
        { id: 2, threadKey: "33333333-3333-3333-3333-333333333333", title: "Input task", status: "input" },
        { id: 3, threadKey: "44444444-4444-4444-4444-444444444444", title: "Failed task", status: "error" },
        { id: 4, threadKey: "55555555-5555-5555-5555-555555555555", title: "Idle task", status: "idle" }
      ],
      usage: { windows: [{ kind: "weekly", remainingPercent: 23 }] }
    }));
    return;
  }
  response.end(JSON.stringify({ ok: true, bridge: true }));
});
await new Promise(resolve => bridge.listen(0, "127.0.0.1", resolve));
const bridgePort = bridge.address().port;

const host = new WebSocketServer({ host: "127.0.0.1", port: 0 });
await new Promise(resolve => host.once("listening", resolve));
const hostPort = host.address().port;
const messages = [];

const nodeBinary = process.env.PLUGIN_NODE_BINARY || process.execPath;
const pluginRoot = process.env.PLUGIN_RUNTIME_ROOT || new URL("..", import.meta.url);
const child = spawn(nodeBinary, ["dist/app.js", "127.0.0.1", String(hostPort), "en-US", "3.0.0"], {
  cwd: pluginRoot,
  env: { ...process.env, CODEX_BRIDGE_URL: `http://127.0.0.1:${bridgePort}` },
  stdio: ["ignore", "pipe", "pipe"]
});

try {
  const client = await new Promise((resolve, reject) => {
    host.once("connection", resolve);
    child.once("error", reject);
    child.once("exit", code => reject(new Error(`Plugin exited before connecting with code ${code}: ${child.stderr.read() || "no stderr"}`)));
  });
  client.on("message", raw => messages.push(JSON.parse(String(raw))));
  await new Promise(resolve => setTimeout(resolve, 100));
  assert.equal(messages[0]?.cmd, "connected");

  client.send(JSON.stringify({
    cmd: "sendToPlugin",
    uuid: "com.ulanzi.ulanzistudio.codexmicro.task1",
    actionid: "setup-action",
    key: "0_0",
    payload: { type: "bridgeSetup", action: "status" }
  }));
  await new Promise(resolve => setTimeout(resolve, 150));
  const setupStatus = messages.find(message =>
    message.cmd === "sendToPropertyInspector" &&
    message.actionid === "setup-action" &&
    message.payload?.type === "bridgeSetupStatus"
  );
  assert.equal(setupStatus?.payload?.status?.serviceOnline, true);
  assert.equal(setupStatus?.payload?.status?.cdpConnected, true);
  assert.equal(setupStatus?.payload?.status?.bundledVersion, "0.5.1");

  const launchEvent = {
    uuid: "com.ulanzi.ulanzistudio.codexmicro.launch",
    actionid: "launch-on-page-two",
    key: "2_2",
    param: {}
  };
  client.send(JSON.stringify({ cmd: "add", ...launchEvent }));
  client.send(JSON.stringify({ cmd: "setactive", ...launchEvent, active: true }));
  await new Promise(resolve => setTimeout(resolve, 150));
  assert.ok(messages.some(message => message.cmd === "setactive" &&
    message.actionid === launchEvent.actionid && message.active === true));
  assert.ok(!messages.some(message => message.cmd === "logMessage" &&
    message.actionid === launchEvent.actionid),
  "An already connected Codex must not be relaunched when its page becomes active");

  const taskStates = ["WORKING", "DONE", "INPUT NEEDED", "ERROR", "IDLE"];
  for (let index = 0; index < taskStates.length; index += 1) {
    client.send(JSON.stringify({
      cmd: "add",
      uuid: `com.ulanzi.ulanzistudio.codexmicro.task${index + 1}`,
      actionid: `a${index + 1}`,
      key: `0_${index}`,
      param: {}
    }));
  }
  await new Promise(resolve => setTimeout(resolve, 700));
  for (let index = 0; index < taskStates.length; index += 1) {
    const taskUuid = `com.ulanzi.ulanzistudio.codexmicro.task${index + 1}`;
    const state = messages.find(message =>
      message.cmd === "state" && message.param?.statelist?.[0]?.uuid === taskUuid
    );
    const item = state?.param?.statelist?.[0];
    assert.equal(item?.type, 1);
    assert.match(item?.data || "", /^data:image\/svg\+xml;base64,/);
    assert.equal(item?.showtext, false);
    assert.equal(Object.hasOwn(item || {}, "state"), false, "task icon update must not send a state index");
    const taskSvg = Buffer.from(item.data.split(",")[1], "base64").toString();
    assert.match(taskSvg, new RegExp(taskStates[index]));
  }
  const task1State = messages.find(message =>
    message.cmd === "state" && message.param?.statelist?.[0]?.uuid.endsWith(".task1")
  );
  const task1Svg = Buffer.from(task1State.param.statelist[0].data.split(",")[1], "base64").toString();
  assert.match(task1Svg, />Working task<\/text>/);

  client.send(JSON.stringify({ cmd: "keydown", uuid: "com.ulanzi.ulanzistudio.codexmicro.task1", actionid: "a1", key: "0_0", param: {} }));
  client.send(JSON.stringify({ cmd: "run", uuid: "com.ulanzi.ulanzistudio.codexmicro.task1", actionid: "a1", key: "0_0", param: {} }));
  client.send(JSON.stringify({ cmd: "keyup", uuid: "com.ulanzi.ulanzistudio.codexmicro.task1", actionid: "a1", key: "0_0", param: {} }));
  await new Promise(resolve => setTimeout(resolve, 150));
  const threadRequests = bridgeRequests.filter(item => item.includes("/thread/11111111-1111-1111-1111-111111111111/click?slot=0"));
  assert.equal(threadRequests.length, 1, "run must not duplicate a keydown task invocation");

  const navigateEvent = {
    uuid: "com.ulanzi.ulanzistudio.codexmicro.navigate",
    actionid: "action-navigate",
    key: "Encoder_0",
    param: {}
  };
  client.send(JSON.stringify({ cmd: "add", ...navigateEvent }));
  client.send(JSON.stringify({ cmd: "dialdown", ...navigateEvent }));
  client.send(JSON.stringify({ cmd: "dialup", ...navigateEvent }));
  client.send(JSON.stringify({ cmd: "dialrotate", rotateEvent: "left", ...navigateEvent }));
  client.send(JSON.stringify({ cmd: "dialrotate", rotateEvent: "right", ...navigateEvent }));
  await new Promise(resolve => setTimeout(resolve, 150));
  assert.equal(
    bridgeRequests.filter(item => item.includes("/thread/11111111-1111-1111-1111-111111111111/click?slot=0")).length,
    2,
    "Encoder press must open task slot 1"
  );
  assert.deepEqual(
    messages.filter(message => message.cmd === "hotkey").map(message => message.keylist),
    ["SCROLL UP", "SCROLL DOWN"]
  );
  const navigateState = messages.find(message =>
    message.cmd === "state" &&
    message.param?.statelist?.[0]?.uuid === navigateEvent.uuid
  );
  assert.equal(navigateState?.param?.statelist?.[0]?.path, "assets/icons/task-working.png");
  assert.equal(navigateState?.param?.statelist?.[0]?.textdata, "");

  const actions = ["fast", "pin", "new", "fork", "steer", "mic", "submit"];
  for (const [index, action] of actions.entries()) {
    const uuid = `com.ulanzi.ulanzistudio.codexmicro.${action}`;
    const event = { uuid, actionid: `action-${action}`, key: `1_${index}`, param: {} };
    client.send(JSON.stringify({ cmd: "add", ...event }));
    client.send(JSON.stringify({ cmd: "keydown", ...event }));
    client.send(JSON.stringify({ cmd: "run", ...event }));
    client.send(JSON.stringify({ cmd: "keyup", ...event }));
  }
  const usageEvent = {
    uuid: "com.ulanzi.ulanzistudio.codexmicro.usage",
    actionid: "action-usage",
    key: "2_0",
    param: {}
  };
  client.send(JSON.stringify({ cmd: "add", ...usageEvent }));
  client.send(JSON.stringify({ cmd: "keydown", ...usageEvent }));
  client.send(JSON.stringify({ cmd: "run", ...usageEvent }));
  client.send(JSON.stringify({ cmd: "keyup", ...usageEvent }));
  await new Promise(resolve => setTimeout(resolve, 250));

  for (const action of actions) {
    assert.equal(
      bridgeRequests.filter(item => item === `POST /action/${action}/down`).length,
      1,
      `${action} must execute once on keydown`
    );
    assert.equal(
      bridgeRequests.filter(item => item === `POST /action/${action}/up`).length,
      1,
      `${action} must preserve keyup`
    );
  }
  assert.equal(
    bridgeRequests.filter(item => item === "POST /focus").length,
    1,
    "Usage must focus Codex once on keydown"
  );
  const usageState = messages.find(message =>
    message.cmd === "state" &&
    message.param?.statelist?.[0]?.uuid === usageEvent.uuid
  );
  const usageItem = usageState?.param?.statelist?.[0];
  assert.equal(usageItem?.type, 1);
  assert.equal(usageItem?.showtext, true);
  assert.equal(usageItem?.textdata, "USAGE");
  assert.match(usageItem?.data || "", /^data:image\/svg\+xml;base64,/);
  const usageSvg = Buffer.from(usageItem.data.split(",")[1], "base64").toString();
  assert.match(usageSvg, />23<tspan/);
  assert.match(usageSvg, /#ffc66a/);
  process.stdout.write("Codex Micro plugin smoke test passed.\n");
} finally {
  child.kill("SIGTERM");
  host.close();
  bridge.close();
}
