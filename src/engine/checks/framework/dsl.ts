import { abort, AnyCallable, LuaArray, Nillable, TLabel } from "xray16/lib";
import { $isNil } from "xray16/macros";

import { CheckContext, ICheckRequirements } from "@/engine/checks/framework/core";
import { EFlowTravel } from "@/engine/checks/framework/result_types";

/**
 * One step of a flow.
 *
 * A step is a point of progression the world either has reached or has not. It never makes itself
 * true: `reached` observes, `verify` asserts what the configs promise once it is, and `handOff` says
 * what to go and do while it is not. Nothing here writes quest state.
 */
export interface IFlowStepBody {
  /** Whether this step's outcome exists in the world. */
  reached: (this: void) => boolean;
  /** Getting the actor somewhere it can see the step happen. Teleports only. */
  travel?: (this: void) => void;
  /** Assertions that must hold once the step is reached. */
  verify?: (this: void) => void;
  /** What the operator is expected to do while this step is not reached yet. */
  handOff?: TLabel;
}

/**
 * A registered flow step, which is its body plus the name it reports under.
 */
export interface IFlowStep extends IFlowStepBody {
  name: TLabel;
}

/**
 * Everything a source file registered while it was being required.
 */
export interface IRegistration {
  requirements: Nillable<ICheckRequirements>;
  steps: LuaArray<IFlowStep>;
}

/**
 * @returns An empty registration buffer.
 */
function createRegistration(): IRegistration {
  return {
    requirements: null,
    steps: new LuaTable(),
  };
}

/**
 * What the file currently being required has declared so far.
 */
let pending: IRegistration = createRegistration();

/**
 * Invocation assertions are recorded against, set by the runner for the duration of a body.
 */
let current: Nillable<CheckContext> = null;

/**
 * Declare what the world must provide before this flow is worth running.
 *
 * Last call wins, so a file cannot end up with two conflicting sets of requirements.
 *
 * @param requirements - Level and progression the walk starts from.
 */
export function requires(requirements: ICheckRequirements): void {
  pending.requirements = requirements;
}

/**
 * Register one step of a flow, in the order the chain reaches them.
 *
 * @param name - The point of progression this step observes.
 * @param body - Lifecycle of the step.
 */
export function step(name: TLabel, body: IFlowStepBody): void {
  table.insert(pending.steps, {
    name: name,
    reached: body.reached,
    travel: body.travel,
    verify: body.verify,
    handOff: body.handOff,
  });
}

/**
 * Hand the runner everything the file registered, and empty the buffer.
 *
 * Draining means a module required twice without being cleared cannot register its steps twice.
 *
 * @returns What the file declared.
 */
export function drainRegistration(): IRegistration {
  const drained: IRegistration = pending;

  pending = createRegistration();

  return drained;
}

/**
 * Make an invocation the target of the free assertion functions.
 *
 * @param context - Invocation to record against.
 */
export function setCurrentContext(context: CheckContext): void {
  current = context;
}

/**
 * Stop recording assertions, so a stray call after a run is an abort rather than a silent write.
 */
export function clearCurrentContext(): void {
  current = null;
}

/**
 * @param assertion - Assertion being attempted, named in the abort message.
 * @returns The invocation currently being recorded against.
 */
function requireCurrentContext(assertion: TLabel): CheckContext {
  if ($isNil(current)) {
    abort(
      "checks: '%s' was asserted outside a running step. " +
        "Assertions and the helpers that make them only work inside step() bodies.",
      assertion
    );
  }

  return current as CheckContext;
}

/**
 * Record that a step's travel started a jump to another level, which the invocation answers with.
 */
export function markLevelJump(): void {
  requireCurrentContext("level jump").travel = EFlowTravel.TO_LEVEL;
}

/**
 * Assert a condition, recording a failure instead of throwing when it does not hold.
 *
 * @param condition - Result of the assertion.
 * @param assertion - Short label of what was being verified.
 * @param detail - Context needed to locate the problem.
 */
export function expect(condition: boolean, assertion: TLabel, detail: TLabel): void {
  requireCurrentContext(assertion).expect(condition, assertion, detail);
}

/**
 * Assert that a value matches the expected one.
 *
 * @param actual - Value produced by the code under check.
 * @param expected - Value the code is expected to produce.
 * @param assertion - Short label of what was being verified.
 */
export function expectEqual(actual: unknown, expected: unknown, assertion: TLabel): void {
  requireCurrentContext(assertion).expectEqual(actual, expected, assertion);
}

/**
 * Run a callable and record a failure when it aborts, instead of letting the abort kill the run.
 *
 * @param callable - Function to protect.
 * @param assertion - Short label of what was being verified.
 * @param detail - Context needed to locate the problem.
 * @returns Whether the call completed without error.
 */
export function expectNoThrow(callable: AnyCallable, assertion: TLabel, detail: TLabel): boolean {
  return requireCurrentContext(assertion).expectNoThrow(callable, assertion, detail);
}

/**
 * Record a failed assertion directly, for cases with nothing boolean to evaluate.
 *
 * @param assertion - Short label of what was being verified.
 * @param detail - Context needed to locate the problem.
 */
export function fail(assertion: TLabel, detail: TLabel): void {
  requireCurrentContext(assertion).fail(assertion, detail);
}
