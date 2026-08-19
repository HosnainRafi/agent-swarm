// orchestrator.js — the swarm conductor.
//
// Two modes:
//   fast    — every specialist runs simultaneously in one full-parallel wave.
//             Roughly N sessions of tokens (N = team size). Fastest.
//   economy — specialists are grouped into waves of at most 3 simultaneous
//             agents; each later wave reuses the docs/ outputs of earlier waves
//             as shared context, so nothing is re-generated. Roughly 3 sessions
//             of tokens regardless of team size. Cheapest.
//
// Native model (Claude Code / Gemini CLI / Qwen Code interactive sessions):
//   agent-swarm prints the exact commands to spawn real subagents inside your
//   interactive session (Claude Code's Agent tool / Gemini's /agent / Qwen's /agent).

import { execSync } from "node:child_process";
import { mkdirSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { detectRuntimes } from "./runtimes.js";
import { buildPrompts, TEAMS } from "./teams.js";

// Wave plans: how agents group for each mode.
// fast: one wave with everyone.
// economy: planner+designer first (they produce the blueprint docs), then
//          all build/test/review specialists in one wave of <=3 concurrency.
const WAVE_PLANS = {
  fast: (agents) => [agents],
  economy: (agents) => {
    const lead = agents.filter((a) => a.id === "planner" || a.id === "designer");
    const rest = agents.filter((a) => !lead.includes(a));
    const waves = [...(lead.length ? [lead] : []), ...(rest.length ? [rest] : [])];
    return waves.length ? waves : [agents];
  },
};

export class SwarmOrchestrator {
  constructor({ cwd, runtimeIds, teamId, mode, maxConcurrent }) {
    this.cwd = cwd;
    this.teamId = teamId || "standard";
    this.mode = mode || "fast";
    this.maxConcurrent = maxConcurrent || (this.mode === "economy" ? 3 : 8);
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

  /** Print a pre-run estimate so the user knows the token budget before starting. */
  printEstimate(goal) {
    const team = TEAMS[this.teamId];
    const n = team.agents.length;
    const waves = WAVE_PLANS[this.mode](team.agents);
    const simSessions = this.mode === "fast" ? n : 3;
    console.log(`\n\x1b[1m━━━ Swarm estimate ━━━\x1b[0m`);
    console.log(`  Mode:      ${this.mode} (${waves.length} wave${waves.length > 1 ? "s" : ""}, max ${this.maxConcurrent} concurrent)`);
    console.log(`  Agents:    ${n} specialist${n > 1 ? "s" : ""} — ${team.agents.map((a) => a.role.split(" —")[0]).join(", ")}`);
    console.log(`  Est. cost: ~${simSessions} session${simSessions > 1 ? "s" : ""} of tokens (economy reuses earlier docs as shared context)`);
    console.log(`  Consumed from: your existing ${this.runtimes.map((r) => r.name).join("/")} subscription — no new keys.`);
  }

  /** Run all specialists in waves (mode-aware). */
  async run() {
    const team = TEAMS[this.teamId];
    const waves = WAVE_PLANS[this.mode](team.agents);
    const allResults = [];

    for (let w = 0; w < waves.length; w++) {
      const wave = waves[w];
      console.log(`\n\x1b[1m━━━ Wave ${w + 1}/${waves.length} — ${wave.map((a) => a.role.split(" —")[0]).join(", ")} ━━━\x1b[0m`);

      // Later waves reuse earlier agents' docs as shared context (economy magic).
      const ctx = {};
      if (w > 0) {
        for (const prev of allResults) {
          if (prev.ok) {
            const out = join(this.workDir, prev.agent, "out.md");
            if (existsSync(out)) ctx[`${prev.agent}/out.md`] = readFileSync(out, "utf8").slice(0, 2000);
          }
        }
      }

      const tasks = wave.map((a, i) => {
        const rt = this.runtimes[i % this.runtimes.length];
        const context = Object.entries(ctx).map(([f, c]) => `--- previous agent output: ${f} ---\n${c}`).join("\n\n");
        return { agent: { ...a, prompt: a.prompt.replace("{goal}", goalText()).replace("{context}", context) }, rt };
      });

      const results = await this._executeTasks(tasks);
      allResults.push(...results);
    }

    const fails = allResults.filter((r) => !r.ok);
    console.log(`\n✔ Swarm complete (${allResults.length - fails.length}/${allResults.length} agents succeeded). Outputs in .swarm/.`);
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
    return results;
  }
}

// Goal text captured from the run command (set by index.js before run()).
let goalText = () => "";
export function setGoal(g) {
  goalText = () => g;
}
