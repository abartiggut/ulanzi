import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";

import {
  decodeThreadPathSegment,
  localThreadKey,
  validateThreadId
} from "../src/bridge/thread-key.mjs";
import {
  CodexCdpClient,
  composerSteerExpression,
  rendererActionExpression
} from "../src/bridge/codex-cdp.mjs";

const UUID = "f6805b8a-332a-43a0-a118-52d3e59542f6";

test("accepts formal and explicit temporary Codex thread ids", () => {
  assert.equal(validateThreadId(UUID), UUID);
  assert.equal(
    validateThreadId(`client-new-thread:${UUID}`),
    `client-new-thread:${UUID}`
  );
  assert.equal(localThreadKey(UUID), `local:${UUID}`);
  assert.equal(
    localThreadKey(`client-new-thread:${UUID}`),
    `local:client-new-thread:${UUID}`
  );
});

test("decodes one URL path segment and rejects arbitrary ids", () => {
  assert.equal(
    decodeThreadPathSegment(`client-new-thread%3A${UUID}`),
    `client-new-thread:${UUID}`
  );
  assert.throws(() => validateThreadId("arbitrary-thread"), /Invalid/);
  assert.throws(() => decodeThreadPathSegment("%not-encoded"), /encoded/);
});

test("named Micro actions preserve press and release phases", async () => {
  const client = new CodexCdpClient();
  client.platform = "darwin";
  const calls = [];
  client.dispatchAction = async (...args) => calls.push(args);

  for (const [action, key] of [
    ["fast", "ACT06"],
    ["approve", "ACT07"],
    ["reject", "ACT08"],
    ["fork", "ACT09"],
    ["mic", "ACT10"],
    ["submit", "ACT12"]
  ]) {
    await client.dispatchNamedAction(action, true);
    await client.dispatchNamedAction(action, false);
    assert.deepEqual(calls.splice(0), [[key, 1], [key, 0]]);
  }
});

test("renderer actions execute once on key down", async () => {
  const client = new CodexCdpClient();
  const calls = [];
  client.dispatchRendererAction = async (action) => calls.push(action);

  for (const action of ["pin", "new"]) {
    await client.dispatchNamedAction(action, true);
    await client.dispatchNamedAction(action, false);
  }
  assert.deepEqual(calls, ["pin", "new"]);
});

test("Windows microphone key toggles dictation on press and ignores release", async () => {
  const client = new CodexCdpClient();
  client.platform = "win32";
  const calls = [];
  client.dispatchMicroMessage = async (message, handler) => calls.push([message.type, handler]);

  await client.dispatchNamedAction("mic", true);
  await client.dispatchNamedAction("mic", false);
  await client.dispatchNamedAction("mic", true);
  await client.dispatchNamedAction("mic", false);

  assert.deepEqual(calls, [
    ["codex-micro-push-to-talk-start", "codex-micro-push-to-talk-start"],
    ["codex-micro-push-to-talk-stop", "codex-micro-push-to-talk-stop"]
  ]);
  assert.equal(client.microphoneActive, false);
});

test("new renderer action accepts the current localized New conversation control", () => {
  let clicks = 0;
  const button = {
    offsetParent: {},
    innerText: "",
    getAttribute(name) {
      return name === "aria-label" ? "新对话" : null;
    },
    click() { clicks += 1; }
  };
  const document = {
    querySelector() { return null; },
    querySelectorAll(selector) {
      assert.equal(selector, "button");
      return [button];
    }
  };

  assert.equal(
    vm.runInNewContext(rendererActionExpression("new"), { document }),
    true
  );
  assert.equal(clicks, 1);
});

test("new renderer action accepts the German New chat control", () => {
  let clicks = 0;
  const button = {
    offsetParent: {},
    innerText: "",
    getAttribute(name) { return name === "aria-label" ? "Neuer Chat" : null; },
    click() { clicks += 1; }
  };
  const document = {
    querySelector() { return null; },
    querySelectorAll(selector) {
      assert.equal(selector, "button");
      return [button];
    }
  };
  assert.equal(vm.runInNewContext(rendererActionExpression("new"), { document }), true);
  assert.equal(clicks, 1);
});

test("new renderer action prefers the language-independent sidebar structure", () => {
  let structuralClicks = 0;
  let localizedClicks = 0;
  const structuralButton = {
    offsetParent: {},
    click() { structuralClicks += 1; }
  };
  const localizedButton = {
    offsetParent: {},
    innerText: "New conversation",
    getAttribute() { return null; },
    click() { localizedClicks += 1; }
  };
  const sidebar = {
    querySelectorAll(selector) {
      assert.equal(selector, ".sidebar-item.relative > button.sidebar-item");
      return [structuralButton];
    }
  };
  const anchor = { closest: selector => selector === "nav" ? sidebar : null };
  const document = {
    querySelector(selector) {
      return selector === "[data-app-action-sidebar-project-create]" ? anchor : null;
    },
    querySelectorAll() { return [localizedButton]; }
  };

  assert.equal(
    vm.runInNewContext(rendererActionExpression("new"), { document }),
    true
  );
  assert.equal(structuralClicks, 1);
  assert.equal(localizedClicks, 0);
});

test("pin renderer action accepts the current localized Pin chat control", () => {
  let clicks = 0;
  const button = {
    offsetParent: {},
    getAttribute(name) {
      return name === "aria-label" ? "置顶聊天" : null;
    },
    click() { clicks += 1; }
  };
  const active = { querySelectorAll: () => [button] };
  const document = {
    querySelector(selector) {
      return selector === "[data-app-action-sidebar-thread-active=true]" ? active : null;
    }
  };

  assert.equal(
    vm.runInNewContext(rendererActionExpression("pin"), { document }),
    true
  );
  assert.equal(clicks, 1);
});

test("pin renderer action accepts German pin and unpin controls", () => {
  for (const label of ["Chat anpinnen", "Chat nicht mehr anpinnen"]) {
    let clicks = 0;
    const button = {
      offsetParent: {},
      getAttribute(name) { return name === "aria-label" ? label : null; },
      click() { clicks += 1; }
    };
    const active = { querySelectorAll: () => [button] };
    const document = {
      querySelector(selector) {
        return selector === "[data-app-action-sidebar-thread-active=true]" ? active : null;
      }
    };
    assert.equal(vm.runInNewContext(rendererActionExpression("pin"), { document }), true);
    assert.equal(clicks, 1);
  }
});

test("task DOM fallback clicks the thread row instead of nested Pin or Unpin controls", async () => {
  let taskClicks = 0;
  let pinClicks = 0;
  const pinButton = {
    getAttribute(name) {
      return name === "aria-label" ? "置顶聊天" : null;
    },
    click() { pinClicks += 1; }
  };
  const item = {
    getAttribute(name) {
      if (name === "data-app-action-sidebar-thread-id") return `local:${UUID}`;
      if (name === "role") return "button";
      return null;
    },
    matches(selector) {
      return selector === "[data-app-action-sidebar-thread-id][role=button]";
    },
    querySelector() { return pinButton; },
    click() { taskClicks += 1; }
  };
  const document = {
    querySelector() { return null; },
    querySelectorAll(selector) {
      assert.equal(selector, "[data-app-action-sidebar-thread-id]");
      return [item];
    }
  };
  const client = new CodexCdpClient();
  client.evaluate = expression => vm.runInNewContext(expression, { document });

  await client.activateThread(`local:${UUID}`);

  assert.equal(taskClicks, 1);
  assert.equal(pinClicks, 0, "Task navigation must never click a nested Pin control");

  const pinControl = {
    ...item,
    getAttribute(name) {
      if (name === "data-app-action-sidebar-thread-id") return `local:${UUID}`;
      if (name === "role") return "button";
      if (name === "aria-label") return "置顶聊天";
      return null;
    },
    click() { pinClicks += 1; }
  };
  const pinDocument = {
    querySelector() { return null; },
    querySelectorAll() { return [pinControl]; }
  };
  client.evaluate = expression => vm.runInNewContext(expression, { document: pinDocument });
  await assert.rejects(
    client.activateThread(`local:${UUID}`),
    /Task navigation control is not available/
  );
  assert.equal(pinClicks, 0, "Pin and Unpin controls must be explicitly rejected");
});

test("Windows task key waits for sidebar navigation and reports its failure", async () => {
  const client = new CodexCdpClient();
  client.platform = "win32";
  const calls = [];
  client.dispatchAgent = async (_slot, _threadKey, act) => calls.push(`hid:${act}`);
  client.activateThread = async () => calls.push("navigate");

  await client.clickThreadKey(`local:${UUID}`, 1);
  assert.deepEqual(calls, ["hid:1", "hid:0", "navigate"]);

  client.activateThread = async () => { throw new Error("Task is not loaded in the Codex sidebar"); };
  await assert.rejects(
    client.clickThreadKey(`local:${UUID}`, 1),
    /Task is not loaded in the Codex sidebar/
  );
});

test("steer renderer action accepts the current localized control", () => {
  let focused = 0;
  let clicks = 0;
  const editor = { offsetParent: {}, focus() { focused += 1; } };
  const button = {
    offsetParent: {},
    innerText: "",
    getAttribute(name) {
      return name === "aria-label" ? "调整方向" : null;
    },
    click() { clicks += 1; }
  };
  const document = {
    querySelectorAll(selector) {
      return selector === "button" ? [button] : [editor];
    }
  };

  assert.equal(
    vm.runInNewContext(composerSteerExpression(), { document }),
    true
  );
  assert.equal(focused, 1);
  assert.equal(clicks, 1);
});

test("unknown bridge actions are rejected", async () => {
  const client = new CodexCdpClient();
  await assert.rejects(
    client.dispatchNamedAction("unknown", true),
    /Unsupported Codex bridge action/
  );
});
