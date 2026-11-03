const STATES = Object.freeze({
  idle: { color: "#a9bbc7", de: "BEREIT", en: "IDLE" },
  working: { color: "#61b3ff", de: "ARBEITET", en: "WORKING" },
  complete: { color: "#53dfab", de: "FERTIG", en: "DONE" },
  attention: { color: "#ffc66a", de: "EINGABE NÖTIG", en: "INPUT NEEDED" },
  error: { color: "#ff7887", de: "FEHLER", en: "ERROR" },
  offline: { color: "#8595a3", de: "OFFLINE", en: "OFFLINE" }
});

export function taskStatusKind(status) {
  const value = String(status || "").toLowerCase();
  if (["working", "thinking", "running", "in_progress"].includes(value)) return "working";
  if (["unread", "complete", "completed", "done", "success"].includes(value)) return "complete";
  if (["attention", "notification", "input", "approval", "awaiting-approval", "awaiting-response", "waiting_input", "needs_input"].includes(value)) return "attention";
  if (["error", "failed", "failure"].includes(value)) return "error";
  if (value === "offline") return "offline";
  return "idle";
}

function escapeXml(value) {
  return String(value).replace(/[&<>"']/g, char =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[char]);
}

function titleLines(value) {
  const words = String(value || "Untitled").replace(/[\u0000-\u001f]/g, " ").trim().split(/\s+/);
  const lines = [];
  for (const word of words) {
    let rest = word;
    while (rest.length > 16) {
      if (lines.length === 3) break;
      lines.push(rest.slice(0, 16));
      rest = rest.slice(16);
    }
    if (lines.length === 3) break;
    const last = lines.length - 1;
    if (last >= 0 && lines[last].length + rest.length + 1 <= 16) {
      lines[last] += ` ${rest}`;
    } else if (rest) {
      lines.push(rest);
    }
    if (lines.length === 3 && words.at(-1) !== word) break;
  }
  if (!lines.length) lines.push("Untitled");
  const full = words.join(" ");
  const shown = lines.join(" ").replace(/…$/, "");
  if (full.length > shown.length) lines[2] = `${(lines[2] || "").slice(0, 15)}…`;
  return lines.slice(0, 3);
}

/** Render a complete key image; Ulanzi's automatic title is hidden for this key. */
export function taskDisplaySvg(title, status, language = "en") {
  const kind = taskStatusKind(status);
  const { color, de, en } = STATES[kind];
  const stateLabel = /^de/i.test(language) ? de : en;
  const lines = titleLines(title);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="196" height="196" viewBox="0 0 196 196">
    <defs>
      <linearGradient id="surface" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#1c2c38"/><stop offset="1" stop-color="#0b141c"/></linearGradient>
      <radialGradient id="glow" cx=".5" cy=".5" r=".5"><stop stop-color="${color}" stop-opacity=".95"/><stop offset=".28" stop-color="${color}" stop-opacity=".58"/><stop offset=".72" stop-color="${color}" stop-opacity=".12"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient>
      <clipPath id="window"><rect x="15" y="16" width="166" height="162" rx="17"/></clipPath>
    </defs>
    <rect width="196" height="196" rx="27" fill="#090f15"/>
    <rect x="6" y="6" width="184" height="184" rx="23" fill="url(#surface)" stroke="#354955" stroke-width="1.5"/>
    <g clip-path="url(#window)">
      <rect x="15" y="16" width="166" height="162" fill="#0b151e"/>
      <rect x="15" y="16" width="166" height="31" fill="#1a2a35"/>
      <path d="M15 47h166" stroke="#344954" stroke-width="1.5"/>
      <ellipse cx="130" cy="159" rx="92" ry="60" fill="url(#glow)"/>
      <path d="M24 130h148" stroke="${color}" stroke-opacity=".35" stroke-width="1"/>
    </g>
    <rect x="15" y="16" width="166" height="162" rx="17" fill="none" stroke="${color}" stroke-opacity=".55" stroke-width="2"/>
    <circle cx="29" cy="32" r="3" fill="#758b99"/><circle cx="40" cy="32" r="3" fill="#758b99"/><circle cx="51" cy="32" r="3" fill="${color}"/>
    <text x="168" y="36" fill="#859aaa" font-family="Consolas,monospace" font-size="13" text-anchor="end">&gt;_</text>
    <g fill="#f1f7fa" font-family="Arial,sans-serif" font-size="17" font-weight="700">
      ${lines.map((line, index) => `<text x="27" y="${72 + index * 21}">${escapeXml(line)}</text>`).join("")}
    </g>
    <rect x="23" y="139" width="150" height="27" rx="7" fill="#0a141d" fill-opacity=".76" stroke="${color}" stroke-opacity=".58"/>
    <circle cx="37" cy="152.5" r="5.5" fill="${color}"/>
    <text x="51" y="157" fill="${color}" font-family="Arial,sans-serif" font-size="11.8" font-weight="700" letter-spacing=".7">${escapeXml(stateLabel)}</text>
  </svg>`;
}
