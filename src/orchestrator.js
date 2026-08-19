// orchestrator.js — the swarm conductor.
//
// Fan-out model (works for ANY runtime):
//   1. Detect installed CLI agents (claude, codex, gemini, qwen, opencode, copilot).
//   2. For each phase, run all specialists SIMULTANEOUSLY — one session per agent,
//      each reading the shared docs/ folder (that's how they "talk" to each other).
//   3. Collect outputs, print a status board, move to the next phase.
//
// Native model (Claude Code / Gemini CLI / Qwen Code interactive sessions):
//   agent-swarm prints the exact commands to spawn real subagents inside your
//   interactive session, so you get true in-session subagents (Claude Code's
//   Agent tool / Gemini's /agent / Qwen's /agent) with zero extra tooling.

import { execSync, spawn } from "node:child_process";
import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { detectRuntimes, RUNTIMES } from "./runtimes.js";
import { buildPrompts, TEAMS } from "./teams.js";

export class SwarmOrchestrator {
  constructor({ cwd, runtimeIds, teamId, maxConcurrent }) {
    this.cwd = cwd;
    this.teamId = teamId || "standard";
    this.maxConcurrent = maxConcurrent || 8;
    this.runtimes = this.pickRuntimes(runtimeIds);
    this.workDir = join(cwd, ".swarm");
    mkdirSync(this.workDir, { recursive: true });
  }

  pickRuntimes(ids) {
    const installed = detectRuntimes();
    if (ids && ids.length) {
      const chosen = installed.filter((r) => ids.includes(r.id));
      if (!chosen.length) {
        throw new Error(
          `No installed runtimes match: ${ids.join(", ")}\n` +
            `Installed: ${installed.map((r) => r.name).join(", ") || "none — install a CLI agent first"}`
        );
      }
      return chosen;
    }
    if (!installed.length) {
      throw new Error(
        "No CLI coding assistant found. Install one of:\n" +
          "  claude (npm i -g @anthropic-ai/claude-code)\n" +
          "  codex  (npm i -g @openai/codex)\n" +
          "  gemini (npm i -g @anthropic-ai/gemini-cli)\n" +
          "  qwen   (npm i -g @anthropic-ai/qwen-code)"
      );
    }
    return installed;
  }

  /** Interactive mode: print the native subagent commands for the user's session. */
  printNativeCommands(goal) {
    const lines = [];
    for (const rt of this.runtimes) {
      lines.push(`\n\x1b[1m━━━ ${rt.name} ━━━\x1b[0m`);
      lines.push(rt.nativeHint || "Use agent-swarm's parallel mode (below).");
    }
    const team = TEAMS[this.teamId];
    lines.push(`\n\x1b[1mSpecialists for team "${this.teamId}":\x1b[0m`);
    for (const a of team.agents) {
      lines.push(`  \x1b[90m${a.role}:\x1b[0m ${a.prompt.split("\n")[0]}`);
    }
    return lines.join("\n");
  }

  /** Parallel mode: run a specific set of agents simultaneously. */
  async runPhaseByAgents(phaseLabel, agents, contextFiles = {}) {
    const tasks = agents.map((a, i) => {
      const rt = this.runtimes[i % this.runtimes.length];
      const context = Object.entries(contextFiles)
        .map(([f, content]) => `--- ${f} ---\n${content}`)
        .join("\n\n");
      return { agent: { ...a, prompt: a.prompt.replace("{goal}", phaseLabel).replace("{context}", context) }, rt };
    });
    return this._executeTasks(tasks);
  }

  /** Parallel mode: run all specialists simultaneously, one session each. */
  async runPhase(phaseLabel, contextFiles = {}) {
    const prompts = buildPrompts(this.teamId, phaseLabel, contextFiles);
    const tasks = [];

    // Round-robin runtimes across agents so work spreads across CLIs.
    for (let i = 0; i < prompts.length; i++) {
      const rt = this.runtimes[i % this.runtimes.length];
      tasks.push({ agent: prompts[i], rt });
    }

    return this._executeTasks(tasks);
  }

  async _executeTasks(tasks) {
    const results = [];
    let idx = 0;
    const worker = async () => {
      while (idx < tasks.length) {
        const t = tasks[idx++];
        const outDir = join(this.workDir, t.agent.id);
        mkdirSync(outDir, { recursive: true });
        const cmd = t.rt.spawn(this.cwd, t.agent.prompt, outDir);
        console.log(`▶ ${t.agent.role} (${t.rt.name})…`);
        const start = Date.now();
        try {
          execSync(cmd, { cwd: this.cwd, stdio: "ignore", timeout: 20 * 60_000 });
          results.push({ agent: t.agent.id, ok: true, secs: Math.round((Date.now() - start) / 1000) });
        } catch {
          results.push({ agent: t.agent.id, ok: false, secs: Math.round((Date.now() - start) / 1000) });
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(this.maxConcurrent, tasks.length) }, worker));

    console.log("\n\x1b[1m━━━ Status board ━━━\x1b[0m");
    for (const r of results) console.log(`  ${r.ok ? "\x1b[32m✔\x1b[0m" : "\x1b[31m✖\x1b[0m"} ${r.agent} — ${r.ok ? "done" : "failed"} (${r.secs}s)`);

    // Collect generated docs as shared context for later phases.
    const collected = {};
    for (const r of results) {
      const dir = join(this.workDir, r.agent);
      for (const f of ["out.md", "out.json"]) {
        const p = join(dir, f);
        if (existsSync(p)) collected[`${r.agent}/${f}`] = readFileSync(p, "utf8").slice(0, 3000);
      }
    }
    return results;
  }
}
