// runtimes.js — knows every CLI coding assistant and how to spawn subagents on it.
// Each runtime adapter: detects installation, runs a session non-interactively
// (so the orchestrator can launch many in parallel), and collects results.
//
// No new API keys anywhere: every agent runs under the host CLI's own login
// (claude login, codex auth, gemini auth, zcode auth...). The orchestrator is
// just a coordinator — the credits/subscription of YOUR existing account are used.
//
// Cross-platform notes (v1.2):
//   - detection uses `where` on Windows, `command -v` elsewhere.
//   - spawn commands merge stderr into stdout (`>out.md 2>&1`) so the same
//     string works under cmd.exe (Windows) and POSIX shells.

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

export const RUNTIMES = {
  claude: {
    name: "Claude Code",
    cmd: "claude",
    detect: () => which("claude"),
    // Allowed tools include Write/Edit so specialists can actually produce the
    // docs/plan.md, docs/design.md etc. files the team prompts ask for.
    spawn: (cwd, prompt, outDir, opts = {}) =>
      `${quote("claude")} -p ${quote(prompt)} --allowedTools "Bash,Write,Edit"` +
      ` --max-turns ${opts.maxTurns ?? 50}` +
      ` >${quote(join(outDir, "out.md"))} 2>&1`,
    nativeHint:
      'Enable agent teams: export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1\n' +
      'Then ask Claude: "spawn a team: planner, designer, frontend, backend, tester, reviewer" — Claude coordinates them natively in-session.',
  },
  codex: {
    name: "OpenAI Codex CLI",
    cmd: "codex",
    detect: () => which("codex"),
    spawn: (cwd, prompt, outDir, opts = {}) =>
      `${quote("codex")} exec ${quote(prompt)} --session ${quote(slugFrom(cwd))}` +
      ` >${quote(join(outDir, "out.md"))} 2>&1`,
    nativeHint:
      'Codex spawns parallel subagents in-session. Ask: "spawn 6 specialists (planner, designer, frontend, backend, tester, reviewer) and run them in parallel on <goal>" — Codex fans them out on your OpenAI account.',
  },
  gemini: {
    name: "Gemini CLI",
    cmd: "gemini",
    detect: () => which("gemini"),
    enableAgents: () => {
      const p = join(home(), ".gemini", "settings.json");
      return existsSync(p);
    },
    spawn: (cwd, prompt, outDir, opts = {}) =>
      `${quote("gemini")} -p ${quote(prompt)} --no-auto-compact` +
      ` >${quote(join(outDir, "out.md"))} 2>&1`,
    nativeHint:
      'In Gemini CLI: enable subagents in ~/.gemini/settings.json { "experimental": { "enableAgents": true } }\n' +
      'then use /agent <name> -p "<prompt>" inside a session.',
  },
  qwen: {
    name: "Qwen Code",
    cmd: "qwen",
    detect: () => which("qwen"),
    spawn: (cwd, prompt, outDir, opts = {}) =>
      `${quote("qwen")} -p ${quote(prompt)}` +
      ` >${quote(join(outDir, "out.md"))} 2>&1`,
    nativeHint:
      'In Qwen Code: { "experimental": { "enableAgents": true } } in ~/.qwen/settings.json, then /agent <name> -p "<prompt>".',
  },
  zcode: {
    name: "ZCode (Z.ai / GLM)",
    cmd: "zcode",
    detect: () => which("zcode"),
    spawn: (cwd, prompt, outDir, opts = {}) =>
      `${quote("zcode")} -p ${quote(prompt)}` +
      ` >${quote(join(outDir, "out.md"))} 2>&1`,
    nativeHint:
      'ZCode (Z.ai terminal harness) spawns sub-agents natively. Ask: "spawn a team of 6 — planner, designer, frontend, backend, tester, reviewer — and run them in parallel on <goal>" — ZCode fans them out on your GLM account.',
  },
  opencode: {
    name: "OpenCode",
    cmd: "opencode",
    detect: () => which("opencode"),
    spawn: (cwd, prompt, outDir, opts = {}) =>
      `${quote("opencode")} noninteractive ${quote(prompt)}` +
      ` >${quote(join(outDir, "out.md"))} 2>&1`,
    nativeHint: "OpenCode supports /delegate for spawning parallel agents.",
  },
  copilot: {
    name: "GitHub Copilot CLI",
    cmd: "copilot",
    detect: () => which("copilot"),
    spawn: (cwd, prompt, outDir, opts = {}) =>
      `${quote("copilot")} -p ${quote(prompt)}` +
      ` >${quote(join(outDir, "out.md"))} 2>&1`,
    nativeHint: "Copilot CLI delegates via chat sessions; agent-swarm runs one per specialist.",
  },
};

export function detectRuntimes() {
  const found = [];
  for (const [id, rt] of Object.entries(RUNTIMES)) {
    if (rt.detect()) found.push({ id, ...rt });
  }
  return found;
}

// Cross-platform command existence check.
// Windows has no `command` builtin; use `where` there, `command -v` elsewhere.
function which(cmd) {
  const probe = process.platform === "win32" ? `where ${cmd}` : `command -v ${cmd}`;
  try {
    execSync(probe, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function home() {
  return process.env.HOME || process.env.USERPROFILE || "/tmp";
}

// NOTE: prompt is wrapped in double quotes. On Windows cmd.exe a double-quote
// inside the prompt should be escaped as `""` rather than `\"`. Goals rarely
// contain quotes, so the POSIX `\"` form is kept for simplicity; a fully
// shell-agnostic spawner (execFile + args array) is the next hardening step.
function quote(s) {
  return `"${String(s).replace(/"/g, '\\"')}"`;
}

function slugFrom(cwd) {
  return cwd.replace(/[^a-zA-Z0-9]+/g, "-").slice(-60);
}
