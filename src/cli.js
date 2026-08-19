// cli.js — command parsing and help for agent-swarm

export function parseArgs(argv) {
  const flags = {};
  const rest = [];
  for (const a of argv) {
    if (a === "--help" || a === "-h") flags.help = true;
    else rest.push(a);
  }
  return { flags, rest };
}

export const HELP = `
\x1b[1magent-swarm\x1b[0m — one goal, six specialist agents, on YOUR AI's own credit.

agent-swarm never spawns an external CLI and never calls an AI API. It prints one
universal prompt that makes ANY AI assistant (ZCode, ChatGPT, Claude Code, Codex,
Gemini…) spawn its own 6 specialist subagents natively, in parallel, on its own
account. No external processes, no extra keys.

\x1b[1mUsage:\x1b[0m
  agent-swarm "<goal>"             Print the universal 6-agent swarm prompt
  agent-swarm swarm "<goal>"       Same (explicit form)
  agent-swarm run "<goal>"         Alias for swarm (backward compatible)
  agent-swarm zcode "<goal>"       Write 6 ZCode subagents to ~/.zcode/agents/
                                    and print a launch prompt for the ZCode app
  agent-swarm teams                Show the 6 specialist roles
  agent-swarm help                 This help

\x1b[1mHow it works:\x1b[0m
  1. Run  agent-swarm "build a todo app"
  2. Copy the printed prompt into any AI assistant.
  3. That assistant spawns Planner, Designer, Frontend, Backend, Tester, and
     Reviewer as its OWN subagents, in parallel, on its own credit, then reports
     a status board.

\x1b[1mExamples:\x1b[0m
  agent-swarm "build a todo app with dark mode"
  agent-swarm swarm "build a REST API for inventory management"
`;
