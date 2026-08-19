# agent-swarm

Spawn a team of AI subagents — working simultaneously — inside the CLI coding assistant you already pay for.

Claude Code, Codex, Gemini CLI, Qwen Code, OpenCode, or Copilot CLI. **No external APIs, no extra keys, no extra credits account.** Every specialist runs as its own session of your existing assistant, under your existing subscription. agent-swarm is only the coordinator.

## Why this exists

Claude Code has a great feature: you ask it to spawn subagents (a planner, a designer, a developer, a tester...), and they work in parallel inside your session. But that pattern is locked to Claude Code. agent-swarm brings the **same pattern to every CLI coding assistant** — including Claude Code — so you can use whichever one your credits are on.

## Install

```bash
npm install -g agent-swarm
```

Or run once without installing:

```bash
npx agent-swarm run "your goal"
```

## Quick start

```bash
# 1. Make sure your CLI agent is installed and logged in:
claude login        # or: codex auth / gemini auth / qwen auth

# 2. Spawn the team:
agent-swarm run "build a todo web app with dark mode and local storage"

# 3. Watch the status board — every specialist works simultaneously:
#    ✔ planner ✔ designer ✔ frontend ✔ backend ✔ tester ✔ reviewer
```

## Commands

| Command | What it does |
|---|---|
| `agent-swarm run "<goal>"` | Fan out specialists in parallel (one CLI session each) |
| `agent-swarm native "<goal>"` | Print the exact commands to spawn **true in-session subagents** (Claude Code agent teams, Gemini/Qwen `/agent`) |
| `agent-swarm detect` | Show which CLI agents are installed on your machine |
| `agent-swarm teams` | List available team templates |

### Options

| Flag | Default | Meaning |
|---|---|---|
| `--team <name>` | standard | `standard` · `research` · `bugfix` |
| `--runtime <a,b>` | all installed | Restrict to e.g. `claude,codex` |
| `--concurrent <n>` | 8 | Max parallel sessions |
| `--native` | off | With `run`: also print native in-session subagent commands |

## Teams

**standard** — plan → design → build in parallel → test → review. Specialists: Planner, Designer, Frontend Dev, Backend Dev, Tester, Reviewer.

**research** — three agents investigate the same question from different angles at the same time: a supporter, a devil's advocate, and a synthesizer who reads both reports and writes the final answer.

**bugfix** — two debuggers test competing hypotheses in parallel, then a judge compares the fixes, tests each against the failing case, and applies the winner.

## How the "no extra keys" promise works

| Question | Answer |
|---|---|
| Which AI runs the agents? | The same CLI assistant you already use (Claude Code, Codex, Gemini CLI, Qwen Code...) |
| Whose credits are consumed? | **Yours** — the session uses the login/subscription you already have |
| Does agent-swarm call any AI API? | No. It launches CLI sessions and coordinates them |
| Do I need a new account or token? | No. If `claude` works today, your swarm works today |

In short: the key is like the water connection to your house. agent-swarm doesn't add a new pipe company — it just adds a smart pump that uses your existing water. Each agent session consumes your normal per-session quota, so one swarm run is roughly N sessions worth (N = team size).

## Native in-session subagents (the real deal)

`agent-swarm native "<goal>"` prints the commands to spawn genuine in-session subagents — the same thing Claude Code does internally:

**Claude Code** (v2.1.178+, interactive session):

```bash
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1   # enable agent teams
claude
# then inside Claude Code, just ask:
# "spawn a team: one on UX, one on architecture, one playing devil's advocate"
# Claude creates teammates that share a task list and message each other directly.
```

**Gemini CLI:**

```json
// ~/.gemini/settings.json
{ "experimental": { "enableAgents": true } }
```

Then inside a Gemini session: `/agent planner -p "<prompt>"`.

**Qwen Code** — same as Gemini, in `~/.qwen/settings.json`, using `/agent <name> -p "<prompt>"`.

agent-swarm's parallel mode works even where native subagents don't exist (Codex, Copilot CLI, GLM-based CLIs), and works side-by-side with the native mode — run `--native` to get both.

## Advanced

```bash
# Only use Claude Code + Codex (spread work between your two accounts):
agent-swarm run "<goal>" --runtime claude,codex

# Research question from 3 angles simultaneously:
agent-swarm run "is WebGPU production-ready in 2026?" --team research

# Bug squad with competing hypotheses:
agent-swarm run "app crashes when uploading files larger than 5MB" --team bugfix
```

## License

MIT
