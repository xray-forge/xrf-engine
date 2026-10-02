import * as fs from "node:fs";
import * as path from "node:path";

import { blueBright, green, greenBright, red, yellow, yellowBright } from "chalk";
import * as tstl from "typescript-to-lua";

import { discoverChecks, ICheckDescriptor } from "#/checks/utils/discover_checks";
import { BUILD_CHECKS_TSCONFIG, TARGET_GAME_DATA_CHECKS_DIR, TARGET_GAME_DATA_SCRIPTS_DIR } from "#/globals/paths";
import { NodeLogger } from "#/utils/logging";
import { TimeTracker } from "#/utils/timing";

const log: NodeLogger = NodeLogger.forFile(__filename);

/**
 * Lua module the framework exposes its entry points through.
 *
 * The transpiler emits a directory import as an explicit `.index`, so this is what the barrel at
 * `src/engine/checks/framework/index.ts` resolves to at runtime.
 */
const FRAMEWORK_MODULE: string = "checks.framework.index";

export interface IBuildChecksParameters {
  verbose?: boolean;
}

/**
 * Transpile flows into gamedata and emit a console launcher for each one.
 *
 * Flows live outside the regular script build, so nothing here affects normal build or watch timings.
 * Running this command is the only way flow code reaches gamedata.
 */
export async function buildChecks(parameters: IBuildChecksParameters = {}): Promise<void> {
  NodeLogger.IS_VERBOSE = Boolean(parameters.verbose);

  log.info(blueBright("Build flows"));

  const timeTracker: TimeTracker = new TimeTracker().start();
  const checks: Array<ICheckDescriptor> = discoverChecks();

  if (!checks.length) {
    return log.warn("No flows found, nothing to build");
  }

  log.info("Discovered flows:", checks.length);

  transpileChecks();
  timeTracker.addMark("CHECKS_TRANSPILED");

  emitLaunchers(checks);
  timeTracker.addMark("CHECKS_LAUNCHERS");

  log.info("Flows built in", timeTracker.end().getDuration() / 1000, "sec");
  log.pushNewLine();
  log.info("Run in game console (engine variant must be", yellowBright("mixed"), "or", yellowBright("release") + "):");

  for (const check of checks) {
    log.info(" ", greenBright(check.command), green(`(${check.relative})`));
  }
}

/**
 * Flatten a possibly chained diagnostic message into readable text.
 */
function flattenDiagnostic(message: string | { messageText: string; next?: Array<unknown> }): string {
  return typeof message === "string" ? message : message.messageText;
}

/**
 * Transpile the checks project, flows and the game MCP endpoint, into gamedata.
 */
export function transpileChecks(): void {
  const result = tstl.transpileProject(BUILD_CHECKS_TSCONFIG, { noHeader: true, tstlVerbose: false });

  if (result.diagnostics?.length) {
    result.diagnostics.forEach((it) => {
      log.error(red("Lua issue:"), it.code, yellowBright(it.file?.fileName), red(flattenDiagnostic(it.messageText)));
    });

    throw new Error(
      `Checks transpiling failed with ${result.diagnostics.length} issue(s). Use ${yellow(
        "'npm run typecheck:checks'"
      )} for investigation.`
    );
  }
}

/**
 * Write one launcher script per check into `$game_scripts$`, plus a reset launcher per flow.
 *
 * Clearing `package.loaded` inside the launcher is what lets a rebuild take effect without a game
 * restart: `run_script` reloads the launcher, but would otherwise reuse the cached check module.
 */
function emitLaunchers(checks: Array<ICheckDescriptor>): void {
  fs.mkdirSync(TARGET_GAME_DATA_SCRIPTS_DIR, { recursive: true });

  let emitted: number = 0;

  for (const check of checks) {
    const emittedPath: string = path.resolve(TARGET_GAME_DATA_CHECKS_DIR, check.emitted);

    // Guard against the transpiler changing how it derives emitted file names: a launcher
    // pointing at a module that does not exist would only fail once typed into the console.
    if (!fs.existsSync(emittedPath)) {
      throw new Error(
        `Expected transpiled check at '${emittedPath}' for source '${check.relative}'. ` +
          `Emitted file naming changed, launcher module '${check.module}' would not resolve.`
      );
    }

    writeLauncher(check.launcher, check);

    emitted += 1;
  }

  log.info("Emitted launchers:", emitted, green(TARGET_GAME_DATA_CHECKS_DIR));
}

/**
 * Lua dropping every cached check module from `package.loaded`.
 *
 * Runs once, before anything is required. Clearing the framework here rather than between checks is
 * what keeps it to a single live instance, so the ambient assertion context cannot end up in one copy
 * while the runner reads another.
 */
const UNLOAD_CHECK_MODULES: string =
  `  for name in pairs(package.loaded) do\n` +
  `    if string.sub(name, 1, 7) == "checks." then\n` +
  `      package.loaded[name] = nil\n` +
  `    end\n` +
  `  end\n`;

/**
 * Write a single launcher script that requires a source file and runs whatever it registered.
 *
 * The work must live in `main`: `run_script X` loads the file into namespace `X`, then resumes
 * `X.main()` as a coroutine. Without it the engine ends up calling a nil value.
 */
function writeLauncher(launcher: string, check: ICheckDescriptor): void {
  const body: string =
    `-- Generated by 'xrf checks build'. Do not edit.\n` +
    `-- Launcher for ${check.relative}.\n` +
    `-- Run with: run_script ${launcher.replace(/\.script$/, "")}\n` +
    `function main()\n` +
    UNLOAD_CHECK_MODULES +
    `  require("${check.module}")\n` +
    `  require("${FRAMEWORK_MODULE}").run("${check.identity}")\n` +
    `end\n`;

  fs.writeFileSync(path.resolve(TARGET_GAME_DATA_SCRIPTS_DIR, launcher), body, "utf8");

  log.debug("Emitted launcher:", launcher, "->", `${check.module} as '${check.identity}'`);
}
