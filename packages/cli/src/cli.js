// Command line interface.
//
// Argument parsing is delegated to commander so unknown flags produce a clear
// error rather than being silently ignored, and so --help and --version are
// real commands rather than strings matched by hand.

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { Command, InvalidArgumentError } from 'commander';
import { normaliseOptions } from './validate.js';
import { runPipeline } from './pipeline.js';
import { runDoctor, formatDoctor } from './doctor.js';
import { createReporter, formatElapsed } from './progress.js';
import { LaunchError, EXIT } from './errors.js';

const here = path.dirname(fileURLToPath(import.meta.url));

/** Read the version from the package manifest rather than duplicating it. */
function readVersion() {
  try {
    const manifest = JSON.parse(fs.readFileSync(path.join(here, '..', 'package.json'), 'utf8'));
    return manifest.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

/** Parse an integer option, rejecting anything that is not a number. */
function parseInteger(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new InvalidArgumentError('Expected a number.');
  return parsed;
}

/**
 * Print a failure the way a user can act on.
 *
 * Stack traces are hidden unless --debug is passed, because a stack tells
 * someone with a blocked execution policy nothing about execution policies.
 */
function reportFailure(error, debug) {
  const isKnown = error instanceof LaunchError;

  process.stderr.write(`\nLaunch failed: ${error.message}\n`);

  if (isKnown && error.fix) {
    process.stderr.write(`  ${error.fix}\n`);
  }

  if (!isKnown) {
    process.stderr.write('  This is a bug in Launch. Rerun with --debug for the full details.\n');
  }

  if (debug) {
    process.stderr.write(`\n${error.stack ?? error}\n`);
    if (error.cause) process.stderr.write(`\nCaused by:\n${error.cause.stack ?? error.cause}\n`);
  }

  process.stderr.write('\n');
  return isKnown ? error.exitCode : EXIT.TARGET;
}

/** Print the human readable summary of a successful render. */
function reportSuccess(result, reporter) {
  if (result.mode === 'tokens-only') {
    reporter.line('');
    reporter.line(`  Tokens  ${result.tokens}`);
    reporter.line(`  Stills  ${result.stills}`);
    reporter.line('');
    return;
  }

  reporter.line('');
  reporter.line(`  Film    ${result.video}`);
  reporter.line(`  Poster  ${result.poster}`);
  reporter.line(`  Tokens  ${result.tokens}`);
  reporter.line(
    `  ${result.dimensions}, ${result.durationSeconds}s, ${result.sizeHuman}, in ${result.elapsedHuman}`
  );
  reporter.line(`  Scenes  ${result.scenes.join(' -> ')}`);
  reporter.line('');
}

/** Build the command tree. */
export function buildProgram() {
  const program = new Command();

  program
    .name('launch')
    .description('Turn any website or local project into a finished promo film with one command.')
    .version(readVersion(), '-v, --version', 'print the version and exit')
    .helpOption('-h, --help', 'print this help and exit')
    .showHelpAfterError('(run launch --help to see every option)');

  program
    .argument('[target]', 'an http or https URL, or a path to a local project folder', '.')
    .option('-f, --format <format>', 'landscape, vertical or square', 'landscape')
    .option('--long', 'render the extended sequence, about 45 seconds', false)
    .option('-d, --duration <seconds>', 'total length, from 8 to 90 seconds', parseInteger)
    .option('--fps <rate>', 'frames per second, 30 or 60', parseInteger, 60)
    .option('-q, --quality <level>', 'draft for fast iteration, final for delivery', 'final')
    .option('-o, --out <folder>', 'where to write the film', 'launch-output')
    .option('--poster-at <seconds>', 'the moment to use for the poster image', parseInteger)
    .option('--tokens-only', 'write the design tokens and stills, and render nothing', false)
    .option('--wait-for <selector>', 'wait for this CSS selector before capturing')
    .option('--timeout <ms>', 'how long to wait for the page to load', parseInteger, 30_000)
    .option('--json', 'print the result as JSON on stdout', false)
    .option('--debug', 'print stack traces and keep the working files', false)
    .addHelpText('after', `
Examples:
  launch https://example.com                     a landscape film from a live site
  launch https://example.com --format vertical   a 9:16 film for social feeds
  launch . --long                                45 seconds from the project in this folder
  launch https://example.com --tokens-only       just the design tokens and stills
  launch doctor                                  check everything is installed

Output goes to ./launch-output as an .mp4, a matching .jpg poster and a
.tokens.json describing what was measured from the page.
`)
    .action(async (target, rawOptions) => {
      // doctor is accepted as a positional so "launch doctor" reads naturally,
      // while still being a real subcommand below.
      if (target === 'doctor') {
        await runDoctorCommand(rawOptions);
        return;
      }

      const options = normaliseOptions(rawOptions);
      const reporter = createReporter({ quiet: options.json });

      try {
        reporter.line('');
        const result = await runPipeline(target, options, reporter);

        if (options.json) process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        else reportSuccess(result, reporter);

        process.exitCode = EXIT.OK;
      } catch (error) {
        reporter.done();

        if (options.json) {
          process.stdout.write(`${JSON.stringify({
            ok: false,
            error: error.message,
            fix: error instanceof LaunchError ? error.fix : undefined,
            elapsedMs: reporter.elapsedMs(),
          }, null, 2)}\n`);
          process.exitCode = error instanceof LaunchError ? error.exitCode : EXIT.TARGET;
          return;
        }

        process.exitCode = reportFailure(error, options.debug);
      }
    });

  program
    .command('doctor')
    .description('check Node, FFmpeg, Chromium, disk space and output permissions')
    // This subcommand deliberately declares no --out or --json of its own.
    // Commander assigns a flag to the parent when the parent declares the
    // same name, so a duplicate here would be parsed into the parent and the
    // subcommand's copy would stay permanently false. The parent's values are
    // read instead, which is also why "launch doctor --json" and
    // "launch --json doctor" behave identically.
    .action((_options, command) => runDoctorCommand(command.parent.opts()));

  return program;
}

/** Shared implementation for both spellings of the doctor command. */
async function runDoctorCommand(options = {}) {
  const report = await runDoctor({ out: options.out });

  if (options.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    process.stdout.write(formatDoctor(report));
  }

  process.exitCode = report.exitCode;
}

/** Entry point. */
export async function main(argv = process.argv) {
  const program = buildProgram();

  // Commander throws for an unknown flag or a bad argument. Those are usage
  // errors and must exit with the usage code rather than a generic failure.
  program.exitOverride((error) => {
    if (error.code === 'commander.helpDisplayed' || error.code === 'commander.version' || error.code === 'commander.help') {
      process.exit(EXIT.OK);
    }
    process.exit(EXIT.USAGE);
  });

  try {
    await program.parseAsync(argv);
  } catch (error) {
    if (error?.exitCode !== undefined && error?.code?.startsWith?.('commander.')) {
      process.exit(EXIT.USAGE);
    }
    process.exitCode = reportFailure(error, argv.includes('--debug'));
  }
}
