import { level, log, time_global } from "xray16";
import {
  AnyArgs,
  AnyCallable,
  executeConsoleCommand,
  LuaArray,
  Nillable,
  TCount,
  TDuration,
  TLabel,
  TName,
} from "xray16/lib";
import { $isNil, $isNotNil } from "xray16/macros";

import { EFlowOutcome, EFlowTravel } from "@/engine/checks/framework/result_types";
import { registry } from "@/engine/core/database";
import { EGameEvent, EventsManager } from "@/engine/core/managers/events";
import { ENotificationType, ITipNotification } from "@/engine/core/managers/notifications/notifications_types";
import { openLogFile } from "@/engine/core/utils/logging";

const PREFIX: TLabel = "[check]";
/** Maximum failures echoed to the console. The result file always holds all of them. */
const CONSOLE_FAILURE_LIMIT: TCount = 25;

/**
 * Dedicated `$logs$\xrf_checks.log`, holding everything reported across a whole game session.
 *
 * Written directly rather than through `LuaLogger` on purpose. A check is something explicitly asked
 * for, so its output must not depend on `forge.ltx` debug flags, and duplicating every line into
 * `xrf_lua.log` would bury it in the noisiest file in the folder.
 */
const [isLogOpened, openedLog] = pcall(openLogFile, "checks");
const checksFile: Nillable<LuaFile> = isLogOpened ? (openedLog as LuaFile) : null;

if (!isLogOpened) {
  log(`${PREFIX} could not open xrf_checks.log, console only -> ${tostring(openedLog)}`);
}

// Lines reported while a caller collects them, null otherwise.
let collectedLines: Nillable<Array<TLabel>> = null;

/**
 * Write one line to both destinations, which are deliberately identical.
 *
 * @param text - Line to write, already formatted.
 */
function writeLine(text: TLabel): void {
  log(text);

  if ($isNotNil(collectedLines)) {
    collectedLines.push(text);
  }

  if ($isNotNil(checksFile)) {
    checksFile.write(text);
    checksFile.write("\n");
  }
}

/**
 * Run a body and collect the lines it reports, which are written as usual too.
 *
 * @param body - Body to run.
 * @returns What the body returned, and the lines it reported.
 */
export function collectReportedLines<T>(body: () => T): { result: T; lines: Array<TLabel> } {
  const previous: Nillable<Array<TLabel>> = collectedLines;
  const lines: Array<TLabel> = [];

  collectedLines = lines;

  try {
    return { result: body(), lines };
  } finally {
    collectedLines = previous;
  }
}

/**
 * Print a line to the game console, the engine log and the check log.
 *
 * @param base - Base string for interpolation.
 * @param args - Variadic list of values to interpolate.
 */
export function report(base: string, ...args: AnyArgs): void {
  writeLine(`[${time_global()}] ${PREFIX} ${string.format(base, ...args)}`);
}

/**
 * Mark the start of an invocation, so a session of repeated walks stays navigable.
 *
 * @param name - Name of the flow being walked.
 */
export function reportBanner(name: TName): void {
  writeLine("");
  writeLine(`=== ${name} @ ${time_global()} ===`);
}

/**
 * Show a line in game as a PDA tip, for output the operator has to act on.
 *
 * @param base - Base string for interpolation.
 * @param args - Variadic list of values to interpolate.
 */
export function notify(base: string, ...args: AnyArgs): void {
  const text: TLabel = string.format(base, ...args);
  const [isCompleted, caught] = pcall(() =>
    EventsManager.emitEvent<ITipNotification>(EGameEvent.NOTIFICATION, {
      type: ENotificationType.TIP,
      caption: text,
      showtime: 15_000,
    })
  );

  if (!isCompleted) {
    report("could not show notification '%s' -> %s", text, tostring(caught));
  }
}

/**
 * Turn engine script logging on, since the engine drops non error script messages while the
 * `lua_debug` mask is off, and it ships off.
 */
export function ensureScriptLoggingEnabled(): void {
  executeConsoleCommand("lua_debug", "on");
}

/**
 * Single failed assertion.
 */
export interface ICheckFailure {
  assertion: TLabel;
  detail: TLabel;
}

/**
 * Outcome of a single invocation of a flow.
 */
export interface ICheckResult {
  name: TName;
  outcome: EFlowOutcome;
  steps: TCount;
  checked: TCount;
  failures: LuaArray<ICheckFailure>;
  skipReason: Nillable<TLabel>;
  travel: EFlowTravel;
}

/**
 * Collector behind the free assertion functions, one per invocation.
 *
 * Bodies report through it instead of throwing, so one failed assertion does not hide the rest.
 */
export class CheckContext {
  public readonly name: TName;
  /** Whether steps may move the actor, which a caller polling a walk it already moved turns off. */
  public readonly isTravelAllowed: boolean;
  public readonly failures: LuaArray<ICheckFailure> = new LuaTable();

  public checked: TCount = 0;
  public steps: TCount = 0;
  public travel: EFlowTravel = EFlowTravel.NONE;

  public constructor(name: TName, isTravelAllowed: boolean = true) {
    this.name = name;
    this.isTravelAllowed = isTravelAllowed;
  }

  /**
   * Record a failed assertion.
   *
   * @param assertion - Short label of what was being verified.
   * @param detail - Context needed to locate the problem.
   */
  public fail(assertion: TLabel, detail: TLabel): void {
    table.insert(this.failures, { assertion: assertion, detail: detail });
  }

  /**
   * Assert a condition, recording a failure instead of throwing when it does not hold.
   *
   * @param condition - Result of the assertion.
   * @param assertion - Short label of what was being verified.
   * @param detail - Context needed to locate the problem.
   */
  public expect(condition: boolean, assertion: TLabel, detail: TLabel): void {
    this.checked += 1;

    if (!condition) {
      this.fail(assertion, detail);
    }
  }

  /**
   * Assert that a value matches the expected one.
   *
   * @param actual - Value produced by the code under check.
   * @param expected - Value the code is expected to produce.
   * @param assertion - Short label of what was being verified.
   */
  public expectEqual(actual: unknown, expected: unknown, assertion: TLabel): void {
    this.expect(actual === expected, assertion, `expected '${tostring(expected)}', got '${tostring(actual)}'`);
  }

  /**
   * Run a callable and record a failure when it aborts, instead of letting the abort kill the run.
   *
   * @param callable - Function to protect.
   * @param assertion - Short label of what was being verified.
   * @param detail - Context needed to locate the problem.
   * @returns Whether the call completed without error.
   */
  public expectNoThrow(callable: AnyCallable, assertion: TLabel, detail: TLabel): boolean {
    this.checked += 1;

    const [isCompleted, caught] = pcall(callable);

    if (!isCompleted) {
      this.fail(assertion, `${detail} -> ${tostring(caught)}`);
    }

    return isCompleted as boolean;
  }
}

/**
 * A world state a flow needs before it is worth starting.
 */
export interface IStateRequirement {
  holds: (this: void) => boolean;
  missing: TLabel;
}

/**
 * Everything needed before a check or flow is worth running at all.
 */
export interface ICheckRequirements {
  /** Level that must be loaded, otherwise the run reports as skipped. */
  level?: TName;
  /**
   * Progression the flow starts from. Nothing here is ever forced: an unmet requirement blocks the
   * run and says which flow to walk instead, because forcing a chain into a mid state produces portion
   * combinations the game's own logic never produces.
   */
  state?: Array<IStateRequirement>;
}

/**
 * Decide whether the current environment can host a run.
 *
 * A registered actor is required unconditionally, whether or not a level is declared.
 *
 * @param requires - Declared requirements, if any.
 * @returns Reason the run must be skipped, or null when it can proceed.
 */
export function evaluateRequirements(requires: Nillable<ICheckRequirements>): Nillable<TLabel> {
  if ($isNil(registry.actor)) {
    return "actor is not registered, load a save first";
  }

  const requiredLevel: Nillable<TName> = requires?.level;

  if ($isNotNil(requiredLevel) && level.name() !== requiredLevel) {
    return `requires level '${requiredLevel}', current is '${level.name()}'`;
  }

  return null;
}

/**
 * Collect the progression requirements the world does not currently satisfy.
 *
 * @param requires - Declared requirements, if any.
 * @returns Messages for every unmet requirement, empty when the flow can start.
 */
export function evaluateStateRequirements(requires: Nillable<ICheckRequirements>): LuaArray<TLabel> {
  const unmet: LuaArray<TLabel> = new LuaTable();

  if ($isNil(requires?.state)) {
    return unmet;
  }

  for (const requirement of requires!.state!) {
    const [isCompleted, caught] = pcall(() => requirement.holds());

    if (!isCompleted) {
      table.insert(unmet, `${requirement.missing} (precondition aborted -> ${tostring(caught)})`);
    } else if (caught !== true) {
      table.insert(unmet, requirement.missing);
    }
  }

  return unmet;
}

/**
 * Echo the outcome of a run to the console and log.
 *
 * @param result - Result of the run.
 * @param duration - How long the run took, in milliseconds.
 */
export function reportOutcome(result: ICheckResult, duration: TDuration): void {
  if ($isNotNil(result.skipReason)) {
    report("%s: SKIP | %s", result.name, result.skipReason);

    return;
  }

  const failuresCount: TCount = result.failures.length();

  for (const [index, failure] of result.failures) {
    if (index > CONSOLE_FAILURE_LIMIT) {
      report("%s: ... %s more failure(s), see xrf_checks.log", result.name, failuresCount - CONSOLE_FAILURE_LIMIT);
      break;
    }

    report("%s: FAIL %s | %s", result.name, failure.assertion, failure.detail);
  }

  report(
    "%s: %s | steps %s, checked %s, failed %s, took %s ms",
    result.name,
    result.outcome,
    result.steps,
    result.checked,
    failuresCount,
    duration
  );
}
