// cli.js — command parsing and help for agent-swarm

export function parseArgs(argv) {
  const flags = {};
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--runtime") flags.runtimes = (flags.runtimes || []).concat(argv[++i].split(","));
    else if (a === "--team") flags.team = argv[++i];
    else if (a === "--concurrent") flags.maxConcurrent = parseInt(argv[++i], 10);
    else if (a === "--mode") flags.mode = argv[++i];
    else if (a === "--native") flags.native = true;
    else if (a === "--help" || a === "-h") flags.help = true;
    else rest.push(a);
  }
  return { flags, rest };
}

export const HELP = `
\x1b[1magent-swarm\x1b[0m — spawn a team of AI subagents inside the CLI coding assistant
you already pay for. No external APIs, no extra keys, no extra credits account.

\x1b[1mUsage:\x1b[0m
  agent-swarm run "<goal>"          Fan out specialists in PARALLEL (one session each)
  agent-swarm native "<goal>"       Print commands to spawn TRUE in-session subagents
                                    (Claude Code agent teams / Gemini / Qwen /agent)
  agent-swarm swarm "<goal>"        Print ONE universal prompt that makes ANY AI
                                    spawn its own 6 subagents on ITS OWN credit
  agent-swarm teams                 List available team templates
  agent-swarm detect                Show which CLI agents are installed
  agent-swarm help                  This help

\x1b[1mOptions:\x1b[0m
  --runtime <a,b>       Use only these: claude,codex,gemini,qwen,opencode,copilot
  --team <name>         standard | research | bugfix  (default: standard)
  --mode <name>         fast | economy  (default: fast)
                        fast    = all specialists in one full-parallel wave (~N sessions of tokens)
                        economy = max 3 simultaneous agents, grouped in waves with shared
                                  context reuse (~3 sessions of tokens, slower but cheaper)
  --concurrent <n>      Max parallel sessions (default: 8 fast / 3 economy)
  --native              (run only) also print native in-session subagent commands

\x1b[1mHow it works:\x1b[0m
  Every specialist agent runs as its own session of the CLI agent you already use
  (Claude Code, Codex, Gemini CLI, Qwen Code...). Each session uses the same login
  and subscription you already have — agent-swarm only coordinates, it never talks
  to any AI API itself. Specialists share context through the docs/ folder and the
  .swarm/ status directory, so they effectively work simultaneously on your project.

\x1b[1mFor "use the AI's own credit" (no CLI, no extra keys):\x1b[0m
  agent-swarm swarm "<goal>" prints a self-contained prompt. Paste it into ANY
  assistant (ZCode, ChatGPT, Claude Code, Codex, Gemini…) and it will spawn its
  own 6 native subagents on its own account — zero external CLI, zero new keys.

\x1b[1mExamples:\x1b[0m
  agent-swarm run "build a todo web app with dark mode and local storage"
  agent-swarm run "research whether WebGPU is ready for production" --team research
  agent-swarm run "app crashes when uploading files >5MB" --team bugfix
  agent-swarm native "build a REST API for inventory management"
  agent-swarm swarm "build a todo app with dark mode"
`;
