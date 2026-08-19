// zcode.js — ZCode (Z.ai desktop app) subagent generator.
//
// ZCode has no headless CLI; its subagents are Markdown files under
// ~/.zcode/agents/ that the desktop app loads. This module writes those files
// and returns a launch prompt to paste into the ZCode app.

import os from "os";
import path from "path";
import fs from "fs";

export const ZCODE_AGENTS_DIR =
  process.env.ZCODE_AGENTS_DIR || path.join(os.homedir(), ".zcode", "agents");

const SUBAGENTS = [
  {
    name: "planner",
    description:
      "Plans the implementation — scope, steps, acceptance criteria. Launch this agent to produce a plan before any coding starts.",
    body:
      "You are the Planner. Given the user's goal, produce a precise implementation plan: scope and user stories, feature list, acceptance criteria, and a task breakdown where each task names the specialist who should do it (designer / frontend / backend / tester). Be concrete: file paths, tech choices, interfaces. Do NOT write application code.",
  },
  {
    name: "designer",
    description:
      "Designs the architecture and visual direction. Launch this agent to produce a design spec before implementation.",
    body:
      "You are the Designer / Architect. Given the user's goal, produce a design spec: tech-stack justification, project file structure, data models and key interfaces/APIs, and the division of work between a frontend and a backend specialist. Prefer zero-build stacks (plain HTML/CSS/JS, plain Node.js).",
  },
  {
    name: "frontend",
    description:
      "Implements the frontend. Launch this agent to build the UI as complete, working files.",
    body:
      "You are the Frontend Developer. Given the goal and any design/plan context provided, implement the frontend in plain HTML/CSS/JS (or a zero-build stack per the design). Write complete, working files, then verify they render. Report what you built and any compromises.",
  },
  {
    name: "backend",
    description:
      "Implements the backend and data layer. Launch this agent to build the server and endpoints.",
    body:
      "You are the Backend Developer. Given the goal and any design/plan context provided, implement the backend in plain Node.js with no build step. Write complete, working files, run the server, and verify endpoints respond. Report what you built and any compromises.",
  },
  {
    name: "tester",
    description:
      "Writes and runs tests against the built code. Launch this agent to verify the work.",
    body:
      "You are the Tester / QA. Given the goal and the built code, write test cases and EXECUTE real tests (run the code, hit endpoints, check outputs). List each test as PASS/FAIL with exact error output for failures. Do not fix code — only report.",
  },
  {
    name: "reviewer",
    description:
      "Audits correctness, security, and quality. Launch this agent to review all changes.",
    body:
      "You are the Code Reviewer. Audit ALL changed files for correctness, security (secrets, injection), maintainability, and spec compliance. Score the result 0-10 and report Critical / Major / Minor findings with concrete fix instructions.",
  },
];

function markdown(a) {
  return `---\nname: ${a.name}\ndescription: ${a.description}\ntools: Read, Write, Edit, Bash\nmodel: inherit\n---\n\n${a.body}\n`;
}

export function installZcodeAgents(dir = ZCODE_AGENTS_DIR) {
  fs.mkdirSync(dir, { recursive: true });
  for (const a of SUBAGENTS) {
    fs.writeFileSync(path.join(dir, `${a.name}.md`), markdown(a));
  }
  return dir;
}

export function zcodeLaunchPrompt(goal) {
  return (
    `Run the subagents planner, designer, frontend, backend, tester, reviewer on this goal, in parallel where you can:\n\n` +
    `GOAL: ${goal}\n\n` +
    `Each records its start time (HH:MM:SS) as its FIRST output line. When all 6 finish, print a status board: agent -> start time -> one-line result.`
  );
}
