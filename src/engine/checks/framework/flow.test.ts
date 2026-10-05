import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { level } from "xray16";
import { ACTOR_ID, createVector, LuaArray, TCount, TIndex, TName } from "xray16/lib";
import { replaceFunctionMock } from "xray16/testing/utils";

import { ICheckRequirements, ICheckResult } from "@/engine/checks/framework/core";
import { IFlowStep, IFlowStepBody, IRegistration, markLevelJump } from "@/engine/checks/framework/dsl";
import { runFlow } from "@/engine/checks/framework/flow";
import { EFlowOutcome, EFlowTravel } from "@/engine/checks/framework/result_types";
import { getManager, getPortableStoreValue, registry, setPortableStoreValue } from "@/engine/core/database";
import { EActorControlHandle, EActorControlPolicy } from "@/engine/core/managers/actor/actor_input_types";
import { ActorInputManager } from "@/engine/core/managers/actor/ActorInputManager";
import { EGameEvent, EventsManager } from "@/engine/core/managers/events";
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

    expect(result.outcome).toBe(EFlowOutcome.SKIP);
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

    expect(result.outcome).toBe(EFlowOutcome.BLOCKED);
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
    expect(result.outcome).toBe(EFlowOutcome.WAITING);
    expect(result.travel).toBe(EFlowTravel.NONE);
    expect(result.steps).toBe(2);
    expect(result.failures.length()).toBe(0);
    expect(result.position).toBe(2);
    expect(result.stepNames.length()).toBe(3);
    expect(result.waiting).toEqual({ position: 3, name: "step 3", handOff: undefined });
  });

  it("should tell the player in a tip unless the caller asks for a quiet run", () => {
    const eventsManager: EventsManager = getManager(EventsManager);

    jest.spyOn(eventsManager, "emitEvent");

    runFlow(FLOW_NAME, mockRegistration([{ reached: () => false }]), true, false);

    expect(eventsManager.emitEvent).not.toHaveBeenCalledWith(EGameEvent.NOTIFICATION, expect.anything());

    runFlow(FLOW_NAME, mockRegistration([{ reached: () => false }]));

    expect(eventsManager.emitEvent).toHaveBeenCalledWith(EGameEvent.NOTIFICATION, expect.anything());
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

    const result: ICheckResult = runFlow(
      FLOW_NAME,
      mockRegistration([
        {
          travel: () => {
            order.push("travel");
            registry.actor.set_actor_position(createVector(10, 0, 0));
          },
          reached: () => {
            order.push("reached");

            return false;
          },
        },
      ])
    );

    expect(order).toEqual(["reached", "travel", "reached"]);
    expect(result.outcome).toBe(EFlowOutcome.WAITING);
    expect(result.travel).toBe(EFlowTravel.ON_LEVEL);
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

  it("should not travel while a scene holds the actor", () => {
    const travel = jest.fn();
    const manager: ActorInputManager = getManager(ActorInputManager);

    manager.acquireControl(EActorControlHandle.SCRIPT_UI, "script-ui", EActorControlPolicy.FULL_UI);

    expect(runFlow(FLOW_NAME, mockRegistration([{ travel, reached: () => false }])).travel).toBe(EFlowTravel.NONE);
    expect(travel).not.toHaveBeenCalled();

    manager.releaseControl(EActorControlHandle.SCRIPT_UI);
    runFlow(FLOW_NAME, mockRegistration([{ travel, reached: () => false }]));

    expect(travel).toHaveBeenCalledTimes(1);
  });

  it("should not count a travel that left the actor where it was, such as one its destination refused", () => {
    const travel = jest.fn();
    const result: ICheckResult = runFlow(FLOW_NAME, mockRegistration([{ travel, reached: () => false }]));

    expect(travel).toHaveBeenCalledTimes(1);
    expect(result.travel).toBe(EFlowTravel.NONE);
  });

  it("should leave the actor where it is when the caller polls a walk it already moved", () => {
    const travel = jest.fn();
    const result: ICheckResult = runFlow(FLOW_NAME, mockRegistration([{ travel, reached: () => false }]), false);

    expect(travel).not.toHaveBeenCalled();
    expect(result.travel).toBe(EFlowTravel.NONE);
    expect(result.outcome).toBe(EFlowOutcome.WAITING);
  });

  it("should answer a travel that jumped to another level", () => {
    const result: ICheckResult = runFlow(
      FLOW_NAME,
      mockRegistration([{ travel: markLevelJump, reached: () => false }])
    );

    expect(result.travel).toBe(EFlowTravel.TO_LEVEL);
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

    expect(runFlow(FLOW_NAME, mockRegistration([{ reached }])).outcome).toBe(EFlowOutcome.COMPLETE);
    expect(reached).not.toHaveBeenCalled();
    expect(readConfirmed()).toBe(1);
  });

  it("should fail a flow that registered no steps", () => {
    const result: ICheckResult = runFlow(FLOW_NAME, mockRegistration([]));

    expect(result.outcome).toBe(EFlowOutcome.FAIL);
    expect(result.failures.length()).toBe(1);
    expect(result.failures.get(1).assertion).toBe("flow");
  });
});
