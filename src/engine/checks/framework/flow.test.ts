import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { level } from "xray16";
import { ACTOR_ID, LuaArray, TCount, TIndex, TName } from "xray16/lib";
import { replaceFunctionMock } from "xray16/testing/utils";

import { ICheckRequirements, ICheckResult } from "@/engine/checks/framework/core";
import { IFlowStep, IFlowStepBody, IRegistration } from "@/engine/checks/framework/dsl";
import { runFlow } from "@/engine/checks/framework/flow";
import { getPortableStoreValue, setPortableStoreValue } from "@/engine/core/database";
import { mockRegisteredActor, resetRegistry } from "@/fixtures/engine";

const FLOW_NAME: TName = "test_flow";

/**
 * @param steps - Step bodies, named by position.
 * @param requirements - Requirements the flow declares, if any.
 * @returns Registration as the runner receives it from a required source file.
 */
function mockRegistration(steps: Array<IFlowStepBody>, requirements: ICheckRequirements | null = null): IRegistration {
  const registered: LuaArray<IFlowStep> = new LuaTable();

  steps.forEach((body, index) => {
    registered.set(index + 1, { name: `step ${index + 1}`, ...body });
  });

  return { requirements: requirements, steps: registered };
}

/**
 * @returns How many steps the flow has confirmed so far.
 */
function readConfirmed(): TIndex {
  return getPortableStoreValue<TIndex>(ACTOR_ID, `xrf_flow_${FLOW_NAME}`, 0);
}

/**
 * @param position - Steps to mark as already confirmed.
 */
function writeConfirmed(position: TIndex): void {
  setPortableStoreValue<TIndex>(ACTOR_ID, `xrf_flow_${FLOW_NAME}`, position);
}

describe("runFlow", () => {
  beforeEach(() => {
    resetRegistry();
    mockRegisteredActor();
    replaceFunctionMock(level.name, () => "zaton");
  });

  it("should skip when the required level is not loaded", () => {
    const reached = jest.fn(() => true);
    const result: ICheckResult = runFlow(FLOW_NAME, mockRegistration([{ reached }], { level: "jupiter" }));

    expect(result.skipReason).toBe("requires level 'jupiter', current is 'zaton'");
    expect(reached).not.toHaveBeenCalled();
    expect(readConfirmed()).toBe(0);
  });

  it("should block a fresh walk when a state requirement is unmet, without observing anything", () => {
    const reached = jest.fn(() => true);
    const result: ICheckResult = runFlow(
      FLOW_NAME,
      mockRegistration([{ reached }], {
        state: [{ holds: () => false, missing: "walk the other flow first" }],
      })
    );

    expect(result.skipReason).toBeNull();
    expect(reached).not.toHaveBeenCalled();
    expect(readConfirmed()).toBe(0);
  });

  it("should not re-check state requirements once a walk is under way", () => {
    // The regression this guards: a requirement naming the same state as a later step's outcome would
    // otherwise block the flow out of its own final steps the moment that step became reachable.
    writeConfirmed(1);

    const reached = jest.fn(() => true);

    runFlow(
      FLOW_NAME,
      mockRegistration([{ reached: () => true }, { reached }], {
        state: [{ holds: () => false, missing: "would block a fresh walk" }],
      })
    );

    expect(reached).toHaveBeenCalled();
    expect(readConfirmed()).toBe(2);
  });

  it("should walk over reached steps, verify each, and stop at the first unreached one", () => {
    const verifyFirst = jest.fn();
    const verifySecond = jest.fn();
    const verifyThird = jest.fn();

    const result: ICheckResult = runFlow(
      FLOW_NAME,
      mockRegistration([
        { reached: () => true, verify: verifyFirst },
        { reached: () => true, verify: verifySecond },
        { reached: () => false, verify: verifyThird },
      ])
    );

    expect(verifyFirst).toHaveBeenCalled();
    expect(verifySecond).toHaveBeenCalled();
    expect(verifyThird).not.toHaveBeenCalled();
    expect(readConfirmed()).toBe(2);
    expect(result.steps).toBe(2);
    expect(result.failures.length()).toBe(0);
  });

  it("should count a confirmed step with no verify body", () => {
    // Both hooks are optional: such a step is a milestone that advances the walk and asserts nothing.
    const result: ICheckResult = runFlow(
      FLOW_NAME,
      mockRegistration([{ reached: () => true }, { reached: () => false }])
    );

    expect(result.steps).toBe(1);
    expect(readConfirmed()).toBe(1);
    expect(result.failures.length()).toBe(0);
  });

  it("should travel to a step not reached yet and test it again on arrival", () => {
    const order: Array<string> = [];

    runFlow(
      FLOW_NAME,
      mockRegistration([
        {
          travel: () => void order.push("travel"),
          reached: () => {
            order.push("reached");

            return false;
          },
        },
      ])
    );

    expect(order).toEqual(["reached", "travel", "reached"]);
  });

  it("should confirm a step that travelling reached", () => {
    let isArrived: boolean = false;
    const verify = jest.fn();

    const result: ICheckResult = runFlow(
      FLOW_NAME,
      mockRegistration([{ travel: () => void (isArrived = true), reached: () => isArrived, verify }])
    );

    expect(verify).toHaveBeenCalled();
    expect(readConfirmed()).toBe(1);
    expect(result.steps).toBe(1);
  });

  it("should not travel to a step the world has already reached", () => {
    const travelReached = jest.fn();
    const travelPending = jest.fn();

    runFlow(
      FLOW_NAME,
      mockRegistration([
        { travel: travelReached, reached: () => true },
        { travel: travelPending, reached: () => false },
      ])
    );

    expect(travelReached).not.toHaveBeenCalled();
    expect(travelPending).toHaveBeenCalledTimes(1);
  });

  it("should record a failure and advance when a later step is already reached", () => {
    const verifySkipped = jest.fn();
    const verifyLater = jest.fn();

    const result: ICheckResult = runFlow(
      FLOW_NAME,
      mockRegistration([
        { reached: () => false, verify: verifySkipped },
        { reached: () => true, verify: verifyLater },
      ])
    );

    expect(verifySkipped).not.toHaveBeenCalled();
    expect(verifyLater).toHaveBeenCalled();
    expect(readConfirmed()).toBe(2);
    expect(result.failures.length()).toBe(1);
    expect(result.failures.get(1).assertion).toBe("step 1 reachability");
  });

  it("should treat an aborting predicate as not reached and record it", () => {
    const result: ICheckResult = runFlow(
      FLOW_NAME,
      mockRegistration([
        {
          reached: () => {
            error("predicate blew up");

            return false;
          },
        },
      ])
    );

    expect(readConfirmed()).toBe(0);
    expect(result.failures.length()).toBe(1);
    expect(result.failures.get(1).assertion).toBe("step 1 reached");
  });

  it("should record an aborting verify without stopping the walk", () => {
    const result: ICheckResult = runFlow(
      FLOW_NAME,
      mockRegistration([
        {
          reached: () => true,
          verify: () => {
            error("assertion blew up");
          },
        },
        { reached: () => true },
      ])
    );

    expect(readConfirmed()).toBe(2);
    expect(result.failures.length()).toBe(1);
    expect(result.failures.get(1).assertion).toBe("step 1 verify");
  });

  it("should carry the failure tally across invocations of one walk", () => {
    const registration: IRegistration = mockRegistration([
      {
        reached: () => true,
        verify: () => {
          error("first invocation failure");
        },
      },
      { reached: () => true },
    ]);

    runFlow(FLOW_NAME, mockRegistration([registration.steps.get(1)]));

    const tally: TCount = getPortableStoreValue<TCount>(ACTOR_ID, `xrf_flow_${FLOW_NAME}_failures`, 0);

    expect(tally).toBe(1);
  });

  it("should report a completed walk as complete without re-observing it", () => {
    writeConfirmed(1);

    const reached = jest.fn(() => true);

    runFlow(FLOW_NAME, mockRegistration([{ reached }]));

    expect(reached).not.toHaveBeenCalled();
    expect(readConfirmed()).toBe(1);
  });

  it("should fail a flow that registered no steps", () => {
    const result: ICheckResult = runFlow(FLOW_NAME, mockRegistration([]));

    expect(result.failures.length()).toBe(1);
    expect(result.failures.get(1).assertion).toBe("flow");
  });
});
