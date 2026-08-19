// index.js — main entry for agent-swarm
import { parseArgs, HELP } from "./cli.js";
import { SwarmOrchestrator, setGoal } from "./orchestrator.js";
import { TEAMS } from "./teams.js";
import { detectRuntimes } from "./runtimes.js";

export function swarmPrompt(goal) {
  return `You are about to run a multi-agent swarm using YOUR OWN native subagents
(your built-in agent / subagent feature). Do NOT call any external API, CLI, or
third-party tool — every specialist runs inside you, on your own credit/session.

GOAL: ${goal}

Spawn these 6 specialist agents and run them in parallel (simultaneously):

1. Planner   — concise implementation plan (scope, steps, acceptance criteria)
2. Designer  — design spec (tech stack, file structure, visual direction)
3. Frontend  — implement the frontend (write working files)
4. Backend   — implement the backend / data layer (write working files)
5. Tester    — test checklist, then run tests against the built code
6. Reviewer  — audit correctness, security, quality; score 0-10

Rules:
- Each specialist is YOUR OWN subagent on YOUR OWN credit. No external API.
- Run them concurrently. Each records its start time (HH:MM:SS) as its FIRST line.
- When all 6 finish, print a status board: agent -> start time -> one-line result.
- Then assemble and deliver the final result.

Do all of this now.`;
}

export async function run(argv) {
  const { flags, rest } = parseArgs(argv);

  if (flags.help || rest.length === 0) {
    console.log(HELP);
    return;
  }

  const cmd = rest[0];
  const goal = rest.slice(1).join(" ");

  if (cmd === "help") {
    console.log(HELP);
  } else if (cmd === "detect") {
    const found = detectRuntimes();
    if (!found.length) {
      console.log("\x1b[33mNo CLI coding assistants found on this machine.\x1b[0m\nInstall one of:\n" +
        "  npm i -g @anthropic-ai/claude-code   (then: claude login)\n" +
        "  npm i -g @openai/codex               (then: codex auth)\n" +
        "  npm i -g @anthropic-ai/gemini-cli    (then: gemini auth)\n" +
        "  npm i -g @anthropic-ai/qwen-code");
    } else {
      console.log("\x1b[1mInstalled CLI agents:\x1b[0m");
      for (const r of found) console.log(`  ✔ ${r.name}  (${r.cmd})`);
      console.log("\n\x1b[90mNote: detection checks that the binary exists, not that it's logged in.\nIf a run fails instantly, authenticate first (claude login / codex auth / gemini auth / qwen auth).\x1b[0m");
    }
  } else if (cmd === "teams") {
    console.log("\x1b[1mAvailable teams:\x1b[0m");
    for (const [id, t] of Object.entries(TEAMS)) {
      console.log(`\n  \x1b[1m${id}\x1b[0m — ${t.label}`);
      for (const a of t.agents) console.log(`     · ${a.role}`);
    }
  } else if (cmd === "native") {
    if (!goal) {
      console.log(HELP);
      throw new Error("Missing goal. Usage: agent-swarm native \"<goal>\"");
    }
    const orch = new SwarmOrchestrator({ cwd: process.cwd(), runtimeIds: flags.runtimes, teamId: flags.team });
    console.log(orch.printNativeCommands(goal));
    console.log("\n" + HELP.split("\n").slice(1, 3).join("\n"));
  } else if (cmd === "swarm") {
    if (!goal) {
      console.log(HELP);
      throw new Error('Missing goal. Usage: agent-swarm swarm "<goal>"');
    }
    console.log("\x1b[1mCopy-paste this into ANY AI assistant (ZCode, ChatGPT, Claude Code, Codex, Gemini…) to run a 6-agent swarm on ITS OWN credit:\x1b[0m\n");
    console.log("```");
    console.log(swarmPrompt(goal));
    console.log("```");
  } else if (cmd === "run") {
    if (!goal) {
      console.log(HELP);
      throw new Error("Missing goal. Usage: agent-swarm run \"<goal>\"");
    }
    setGoal(goal);
    const orch = new SwarmOrchestrator({
      cwd: process.cwd(),
      runtimeIds: flags.runtimes,
      teamId: flags.team,
      mode: flags.mode,
      maxConcurrent: flags.maxConcurrent,
    });
    console.log(`\x1b[1magent-swarm\x1b[0m — team "${orch.teamId}" | goal: "${goal}"\n` +
      `Runtimes: ${orch.runtimes.map((r) => r.name).join(", ")}`);

    if (flags.native) {
      console.log("\n" + orch.printNativeCommands(goal) + "\n");
    }

    orch.printEstimate(goal);
    await orch.run();
  } else {
    console.log(HELP);
    throw new Error(`Unknown command: ${cmd}`);
  }
}
