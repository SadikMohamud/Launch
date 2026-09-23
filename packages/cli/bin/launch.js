#!/usr/bin/env node
// Entry point for the launch command.
//
// This stays deliberately thin so the shebang line and the real
// implementation can evolve independently, and so a syntax error in the CLI
// surfaces as a normal module load failure rather than a broken shim.

import { main } from '../src/cli.js';

await main();
