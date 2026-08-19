// index.js — main entry for agent-swarm
//
// agent-swarm NEVER spawns an external CLI and NEVER calls any AI API. It prints
// one universal prompt that makes ANY AI assistant spawn its own 6 specialist
// subagents natively — on its own account/credit, zero extra keys.

import { parseArgs, HELP } from "./cli.js";
import { TEAMS } from "./teams.js";

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

function printSwarm(goal) {
  console.log(
    "\x1b[1mCopy-paste this into ANY AI assistant (ZCode, ChatGPT, Claude Code, Codex, Gemini…) to run a 6-agent swarm on ITS OWN credit:\x1b[0m\n"
  );
  console.log("```");
  console.log(swarmPrompt(goal));
  console.log("```");
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
  } else if (cmd === "teams") {
    console.log("\x1b[1mSwarm team — 6 specialists:\x1b[0m");
    for (const a of TEAMS.standard.agents) console.log(`  · ${a.role}`);
    console.log('\nUse: agent-swarm "<goal>"  (or  agent-swarm swarm "<goal>")');
  } else if (cmd === "swarm") {
    if (!goal) {
      console.log(HELP);
      throw new Error('Missing goal. Usage: agent-swarm swarm "<goal>"');
    }
    printSwarm(goal);
  } else {
    // Default: treat the whole input as the goal and print the swarm prompt.
    printSwarm(rest.join(" "));
  }
}
