#!/usr/bin/env node
// agent-swarm — universal multi-agent swarm orchestrator for CLI coding assistants
import { run } from "../src/index.js";

run(process.argv.slice(2)).catch((err) => {
  console.error(`\n✖ Fatal: ${err.message}`);
  process.exit(1);
});
