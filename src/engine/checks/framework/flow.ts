import { time_global } from "xray16";
import { ACTOR_ID, LuaArray, Nillable, TCount, TIndex, TLabel, TName } from "xray16/lib";
import { $isNil, $isNotNil } from "xray16/macros";

import {
  CheckContext,
  ensureScriptLoggingEnabled,
  evaluateRequirements,
  evaluateStateRequirements,
  ICheckResult,
  notify,
  report,
  reportOutcome,
} from "@/engine/checks/framework/core";
import { clearCurrentContext, IFlowStep, IRegistration, setCurrentContext } from "@/engine/checks/framework/dsl";
import { getPortableStoreValue, setPortableStoreValue } from "@/engine/core/database";

/**
 * Prefix of the actor portable store key a flow keeps its progress under.
 */
const CURSOR_KEY_PREFIX: TName = "xrf_flow_";

/**
 * @param name - Flow name.
 * @returns Actor portable store key holding how far this flow has been confirmed.
 */
function resolveCursorKey(name: TName): TName {
  return `${CURSOR_KEY_PREFIX}${name}`;
}

/**
 * @param name - Flow name.
 * @returns Actor portable store key holding the failure tally of this walk.
 */
function resolveFailuresKey(name: TName): TName {
  return `${CURSOR_KEY_PREFIX}${name}_failures`;
}

/**
 * Read how many assertions have failed so far during this walk.
 *
 * @param name - Flow name.
 * @returns Failures recorded since the walk began.
 */
function readFailures(name: TName): TCount {
  return getPortableStoreValue<TCount>(ACTOR_ID, resolveFailuresKey(name), 0);
}

/**
 * Record the running failure tally of this walk.
 *
 * @param name - Flow name.
 * @param count - Total to store.
 */
function writeFailures(name: TName, count: TCount): void {
  setPortableStoreValue<TCount>(ACTOR_ID, resolveFailuresKey(name), count);
}

/**
 * Read how many steps of a flow have been confirmed.
 *
 * @param name - Flow name.
 * @returns Position of the last confirmed step, 0 when nothing has been.
 */
function readCursor(name: TName): TIndex {
  return getPortableStoreValue<TIndex>(ACTOR_ID, resolveCursorKey(name), 0);
}

/**
 * Record how many steps of a flow have been confirmed.
 *
 * @param name - Flow name.
 * @param position - Position to store.
 */
function writeCursor(name: TName, position: TIndex): void {
  setPortableStoreValue<TIndex>(ACTOR_ID, resolveCursorKey(name), position);
}

/**
 * Ask a step whether the world has reached it.
 *
 * A predicate that aborts is treated as not reached and recorded as a failure: the flow should stop
 * where it can no longer tell, rather than walk on past a step it never actually observed.
 *
 * @param context - Running flow context.
 * @param step - Step to test.
 * @param position - Position of the step, for failure reporting.
 * @returns Whether the step's outcome exists in the world.
 */
function isStepReached(context: CheckContext, step: IFlowStep, position: TIndex): boolean {
  const [isCompleted, caught] = pcall(() => step.reached());

  if (!isCompleted) {
    context.fail(`step ${position} reached`, `could not be evaluated -> ${tostring(caught)}`);

    return false;
  }

  return caught === true;
}

/**
 * Look past a step the world has not reached, for one it has.
 *
 * @param steps - Steps the flow registered.
 * @param position - Position to look past.
 * @returns Position of the first later step already reached, or 0 when there is none.
 */
function findReachedAfter(steps: LuaArray<IFlowStep>, position: TIndex): TIndex {
  for (const later of $range(position + 1, steps.length())) {
    const [isCompleted, caught] = pcall(() => steps.get(later).reached());

    if (isCompleted && caught === true) {
      return later;
    }
  }

  return 0;
}

/**
 * Verify a step that has been reached, in isolation from the rest of the walk.
 *
 * @param context - Running flow context.
 * @param step - Step to verify.
 * @param position - Position of the step, for failure reporting.
 */
function verifyStep(context: CheckContext, step: IFlowStep, position: TIndex): void {
  if ($isNil(step.verify)) {
    return;
  }

  const [isCompleted, caught] = pcall(() => step.verify!());

  if (!isCompleted) {
    context.fail(`step ${position} verify`, `aborted -> ${tostring(caught)}`);
  }
}

/**
 * Move the actor towards a step that is not reached yet, and test it again, since arriving can be what reaches it.
 *
 * @param context - Running flow context.
 * @param step - Step to travel to.
 * @param position - Position of the step, for reporting.
 * @param name - Flow name.
 * @param total - Count of steps, for reporting.
 * @returns Whether the step is reached after travelling.
 */
function travelToStep(context: CheckContext, step: IFlowStep, position: TIndex, name: TName, total: TCount): boolean {
  if ($isNil(step.travel)) {
    return false;
  }

  report("%s: step %s/%s '%s' travelling", name, position, total, step.name);

  const [isCompleted, caught] = pcall(() => step.travel!());

  if (!isCompleted) {
    context.fail(`step ${position} travel`, `aborted -> ${tostring(caught)}`);
  }

  // Silent, as the look past a step is: a predicate that aborts was already recorded before travelling.
  const [isEvaluated, isReached] = pcall(() => step.reached());

  return isEvaluated && isReached === true;
}

/**
 * Walk forward over everything the world has already reached, and report where it stops.
 *
 * @param context - Running flow context.
 * @param steps - Steps the flow registered.
 * @param name - Flow name.
 * @returns Headline verdict of this invocation.
 */
function observe(context: CheckContext, steps: LuaArray<IFlowStep>, name: TName): TLabel {
  const total: TCount = steps.length();

  if (total === 0) {
    context.fail("flow", "declares no steps");

    return "FAIL";
  }

  let confirmed: TIndex = readCursor(name);

  if (confirmed >= total) {
    report("%s: already complete, load a save from before the walk to observe it again", name);
    notify(`${name} is already complete - load an earlier save to watch it again`);

    return "COMPLETE";
  }

  for (const position of $range(confirmed + 1, total)) {
    const step: IFlowStep = steps.get(position);

    // Travel only towards a step the world has not reached: moving the actor for a reached one undoes whatever
    // moved it on, such as a scene teleporting it, and walking past several would teleport through all of them.
    if (!isStepReached(context, step, position) && !travelToStep(context, step, position, name, total)) {
      const overtaken: TIndex = findReachedAfter(steps, position);

      // A later step already reached is positive evidence the world moved past this one, so waiting on it
      // would stall the walk forever. Either the predicate cannot be satisfied - the state it names has no
      // setter, or it is transient and was missed - or the chain genuinely skipped it. All three are
      // findings, and all three are better reported and walked past than silently waited on.
      if (overtaken > 0) {
        context.fail(
          `step ${position} reachability`,
          `'${step.name}' is not reached but step ${overtaken} '${steps.get(overtaken).name}' is, so the walk ` +
            `advances past it - check that its predicate observes something the game actually sets`
        );

        report("%s: step %s/%s '%s' skipped, step %s is already reached", name, position, total, step.name, overtaken);
        writeCursor(name, position);

        continue;
      }

      report("%s: step %s/%s '%s' not reached yet", name, position, total, step.name);

      if ($isNotNil(step.handOff)) {
        report("%s: to reach it -> %s", name, step.handOff);
      }

      notify(
        $isNotNil(step.handOff)
          ? `${position}/${total} ${step.name} - to reach it: ${step.handOff}`
          : `${position}/${total} ${step.name} - not reached yet`
      );

      return "WAITING";
    }

    verifyStep(context, step, position);
    writeCursor(name, position);

    context.steps += 1;
    confirmed = position;
    report("%s: step %s/%s '%s' reached", name, position, total, step.name);
  }

  const walkFailures: TCount = readFailures(name) + context.failures.length();

  report("%s: last step reached, flow complete", name);
  notify(
    walkFailures === 0
      ? `${name} complete: ${total}/${total} steps, no failures`
      : `${name} complete: ${total}/${total} steps, ${walkFailures} failure(s) during the walk`
  );

  return "COMPLETE";
}

/**
 * Execute one invocation of a flow: observe how far the chain has got, and verify it.
 *
 * @param name - Flow name, single sourced from the generated launcher.
 * @param registration - What the flow source file declared while it was required.
 * @returns Result of the invocation.
 */
export function runFlow(name: TName, registration: IRegistration): ICheckResult {
  const context: CheckContext = new CheckContext(name);

  ensureScriptLoggingEnabled();
  report("%s: flow start", name);

  const startedAt: TCount = time_global();
  const skipReason: Nillable<TLabel> = evaluateRequirements(registration.requirements);

  const isStarting: boolean = readCursor(name) === 0;
  const blockers: LuaArray<TLabel> =
    $isNil(skipReason) && isStarting ? evaluateStateRequirements(registration.requirements) : new LuaTable();

  let verdict: TLabel = "SKIP";

  if ($isNotNil(skipReason)) {
    verdict = "SKIP";
  } else if (blockers.length() > 0) {
    verdict = "BLOCKED";

    for (const [, blocker] of blockers) {
      report("%s: blocked - %s", name, blocker);
    }

    notify(`${name} blocked: ${blockers.get(1)}`);
  } else {
    setCurrentContext(context);

    const [isCompleted, caught] = pcall(() => {
      verdict = observe(context, registration.steps, name);
    });

    clearCurrentContext();

    if (!isCompleted) {
      context.fail("flow", `aborted -> ${tostring(caught)}`);
      verdict = "FAIL";
    }
  }

  const result: ICheckResult = {
    name: name,
    steps: context.steps,
    checked: context.checked,
    failures: context.failures,
    skipReason: skipReason,
  };

  const failures: TCount = result.failures.length();
  const isObserving: boolean = $isNil(skipReason) && blockers.length() === 0;

  // The tally spans the whole walk, so a clean final invocation cannot pass off an earlier failure.
  const walkFailures: TCount = isObserving ? readFailures(name) + failures : readFailures(name);

  if (isObserving) {
    writeFailures(name, walkFailures);
  }

  let outcome: TLabel = failures === 0 ? verdict : "FAIL";

  if (outcome === "COMPLETE" && walkFailures > 0) {
    outcome = "FAIL";
  }

  report("%s: %s/%s step(s) confirmed", name, readCursor(name), registration.steps.length());
  reportOutcome(result, outcome, time_global() - startedAt);

  if (walkFailures > failures) {
    report("%s: %s failure(s) so far in this walk", name, walkFailures);
  }

  if ($isNotNil(skipReason)) {
    notify(`${name} skipped: ${skipReason}`);
  } else if (outcome === "FAIL") {
    notify(`${name} FAILED: ${failures} problem(s) here, ${walkFailures} in this walk`);
  }

  return result;
}
