// runtimes.js — knows every CLI coding assistant and how to spawn subagents on it.
// Each runtime adapter: detects installation, runs a session non-interactively
// (so the orchestrator can launch many in parallel), and collects results.
//
// No new API keys anywhere: every agent runs under the host CLI's own login
// (claude login, codex auth, gemini auth...). The orchestrator is just a
// coordinator — the credits/subscription of YOUR existing account are used.

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

export const RUNTIMES = {
  claude: {
    name: "Claude Code",
    cmd: "claude",
    detect: () => which("claude"),
    // Claude Code subagent: run a focused session that reports back.
    spawn: (cwd, prompt, outDir, opts = {}) =>
      `${quote("claude")} -p ${quote(prompt)} --allowedTools "Bash" --output-format json` +
      ` --max-turns ${opts.maxTurns ?? 50}` +
      ` 2>${quote(join(outDir, "err.log"))} >${quote(join(outDir, "out.json"))}`,
    // Native in-session subagent prompt (used when running INSIDE an interactive
    // Claude Code session — paste this into Claude Code):
    nativeHint:
      'Enable agent teams with: export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1\n' +
      'Then ask Claude: "spawn a team: <roles>" — Claude coordinates natively.',
  },
  codex: {
    name: "OpenAI Codex CLI",
    cmd: "codex",
    detect: () => which("codex"),
    spawn: (cwd, prompt, outDir, opts = {}) =>
      `${quote("codex")} -p ${quote(prompt)} --session ${quote(slugFrom(cwd))}` +
      ` 2>${quote(join(outDir, "err.log"))} >${quote(join(outDir, "out.md"))}`,
    nativeHint: "Codex supports subagent sessions via --session; agent-swarm manages one session per specialist.",
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
      ` 2>${quote(join(outDir, "err.log"))} >${quote(join(outDir, "out.md"))}`,
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
      ` 2>${quote(join(outDir, "err.log"))} >${quote(join(outDir, "out.md"))}`,
    nativeHint:
      'In Qwen Code: { "experimental": { "enableAgents": true } } in ~/.qwen/settings.json, then /agent <name> -p "<prompt>".',
  },
  opencode: {
    name: "OpenCode",
    cmd: "opencode",
    detect: () => which("opencode"),
    spawn: (cwd, prompt, outDir, opts = {}) =>
      `${quote("opencode")} noninteractive ${quote(prompt)}` +
      ` 2>${quote(join(outDir, "err.log"))} >${quote(join(outDir, "out.md"))}`,
    nativeHint: "OpenCode supports /delegate for spawning parallel agents.",
  },
  copilot: {
    name: "GitHub Copilot CLI",
    cmd: "copilot",
    detect: () => which("copilot"),
    spawn: (cwd, prompt, outDir, opts = {}) =>
      `${quote("copilot")} -p ${quote(prompt)}` +
      ` 2>${quote(join(outDir, "err.log"))} >${quote(join(outDir, "out.md"))}`,
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

function which(cmd) {
  try {
    execSync(`command -v ${quote(cmd)}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function home() {
  return process.env.HOME || process.env.USERPROFILE || "/tmp";
}

function quote(s) {
  return `"${String(s).replace(/"/g, '\\"')}"`;
}

function slugFrom(cwd) {
  return cwd.replace(/[^a-zA-Z0-9]+/g, "-").slice(-60);
}
