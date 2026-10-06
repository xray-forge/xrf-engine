import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { TName, TRate } from "xray16/lib";
import { $fromObject } from "xray16/macros";
import { MockAlifeObject, MockVector } from "xray16/mocks";

import { registerSimulator, registry } from "@/engine/core/database";
import {
  evaluateSimulationPriority,
  evaluateSimulationPriorityByDistance,
  evaluateSimulationPropertiesPriority,
  getSlicedSimulationTargets,
  getSquadSimulationTarget,
} from "@/engine/core/managers/simulation/utils/simulation_priority";
import { Squad } from "@/engine/core/objects/squad";
import { resetPositionCache } from "@/engine/core/utils/position";
import { MockSquad, resetRegistry } from "@/fixtures/engine";

describe("evaluateSimulationPriorityByDistance", () => {
  beforeEach(() => {
    registerSimulator();
  });

  it("should correctly evaluate priority by distance", () => {
    resetPositionCache();
    MockVector.DEFAULT_DISTANCE = 20;
    expect(evaluateSimulationPriorityByDistance(MockAlifeObject.mock(), MockAlifeObject.mock())).toBe(1.05);

    resetPositionCache();
    MockVector.DEFAULT_DISTANCE = 10;
    expect(evaluateSimulationPriorityByDistance(MockAlifeObject.mock(), MockAlifeObject.mock())).toBe(1.1);

    resetPositionCache();
    MockVector.DEFAULT_DISTANCE = 5;
    expect(evaluateSimulationPriorityByDistance(MockAlifeObject.mock(), MockAlifeObject.mock())).toBe(1.2);
  });
});

describe("evaluateSimulationPropertiesPriority", () => {
  it("should add each behaviour rate times the matching property to the base priority", () => {
    const squad: Squad = MockSquad.mock({ behaviour: $fromObject<string, string>({ a: "2", b: "3", c: "0.5" }) });
    const target: Squad = MockSquad.mock({ simulationProperties: $fromObject<TName, TRate>({ a: 4, c: 2, d: 10 }) });

    expect(evaluateSimulationPropertiesPriority(target, squad)).toBe(3 + 2 * 4 + 0.5 * 2);
    expect(evaluateSimulationPropertiesPriority(MockSquad.mock({ simulationProperties: new LuaTable() }), squad)).toBe(
      3
    );
  });
});

describe("evaluateSimulationPriority", () => {
  beforeEach(() => {
    registerSimulator();
  });

  it("should correctly evaluate priority", () => {
    resetPositionCache();
    MockVector.DEFAULT_DISTANCE = 20;

    const first: Squad = MockSquad.mock();
    const second: Squad = MockSquad.mock();
    const third: Squad = MockSquad.mock({
      behaviour: $fromObject<string, string>({ a: "5" }),
      simulationProperties: $fromObject<TName, TRate>({ a: 6 }),
    });
    const fourth: Squad = MockSquad.mock();

    jest.spyOn(first, "isValidSimulationTarget").mockImplementation(() => $multi(true, null));
    jest.spyOn(third, "isValidSimulationTarget").mockImplementation(() => $multi(true, null));

    expect(evaluateSimulationPriority(first, second)).toBe(13.65);

    resetPositionCache();
    MockVector.DEFAULT_DISTANCE = 10;

    expect(evaluateSimulationPriority(third, fourth)).toBe(29.700000000000003);
  });
});

function mockSimulationTargetSquad(propertyRate: TRate): Squad {
  const target: Squad = MockSquad.mock({
    simulationProperties: $fromObject<TName, TRate>({ a: propertyRate }),
  });

  jest.spyOn(target, "isValidSimulationTarget").mockImplementation(() => $multi(true, null));
  registry.simulationObjects.set(target.id, target);

  return target;
}

describe("getSlicedSimulationTargets", () => {
  beforeEach(() => {
    resetRegistry();
    registerSimulator();
    resetPositionCache();

    MockVector.DEFAULT_DISTANCE = 20;
  });

  it("should keep the highest priority targets ordered from the highest", () => {
    const squad: Squad = MockSquad.mock({ behaviour: $fromObject<string, string>({ a: "1" }) });

    registry.simulationObjects.set(squad.id, squad);

    const targets: Array<Squad> = [10, 20, 30, 40, 50, 60, 70].map((rate) => mockSimulationTargetSquad(rate));
    const result = getSlicedSimulationTargets(squad, 5);

    // The two lowest targets drop out, self squad is excluded.
    expect(result.length()).toBe(5);
    expect(result.get(1).priority).toBeCloseTo(76.65);
    expect(result.get(1).target).toBe(targets[6]);
    expect(result.get(2).priority).toBeCloseTo(66.15);
    expect(result.get(2).target).toBe(targets[5]);
    expect(result.get(3).priority).toBeCloseTo(55.65);
    expect(result.get(4).priority).toBeCloseTo(45.15);
    expect(result.get(5).priority).toBeCloseTo(34.65);
  });

  it("should not let a lower priority target replace higher ones", () => {
    const squad: Squad = MockSquad.mock({ behaviour: $fromObject<string, string>({ a: "1" }) });
    const targets: Array<Squad> = [10, 20, 30, 40, 50].map((rate) => mockSimulationTargetSquad(rate));

    mockSimulationTargetSquad(1);

    const result = getSlicedSimulationTargets(squad, 5);

    expect(result.length()).toBe(5);
    expect(result.get(1).target).toBe(targets[4]);
    expect(result.get(5).target).toBe(targets[0]);
    expect(result.get(5).priority).toBeCloseTo(13.65);
  });

  it("should order targets that come in any order", () => {
    const squad: Squad = MockSquad.mock({ behaviour: $fromObject<string, string>({ a: "1" }) });
    const targets: Array<Squad> = [40, 70, 10, 60, 20, 50, 30].map((rate) => mockSimulationTargetSquad(rate));
    const result = getSlicedSimulationTargets(squad, 5);

    expect(result.length()).toBe(5);
    expect(result.get(1).target).toBe(targets[1]);
    expect(result.get(2).target).toBe(targets[3]);
    expect(result.get(3).target).toBe(targets[5]);
    expect(result.get(4).target).toBe(targets[0]);
    expect(result.get(5).target).toBe(targets[6]);
  });

  it("should reuse the shared scratch buffer and trim stale records between calls", () => {
    const squad: Squad = MockSquad.mock({ behaviour: $fromObject<string, string>({ a: "1" }) });
    const targets: Array<Squad> = [10, 20, 30].map((rate) => mockSimulationTargetSquad(rate));
    const first = getSlicedSimulationTargets(squad, 5);

    expect(first.length()).toBe(3);

    // Same shared buffer instance is returned on every call.
    expect(getSlicedSimulationTargets(squad, 5)).toBe(first);

    // Shrinking candidate sets trim stale records from previous fills.
    registry.simulationObjects.delete(targets[1].id);
    registry.simulationObjects.delete(targets[2].id);

    const second = getSlicedSimulationTargets(squad, 5);

    expect(second).toBe(first);
    expect(second.length()).toBe(1);
    expect(second.get(1).target).toBe(targets[0]);
  });

  it("should reject off-level candidates before evaluating target validity", () => {
    const squad: Squad = MockSquad.mock({ behaviour: $fromObject<string, string>({ a: "1" }) });
    const offLevelTarget: Squad = MockSquad.mock({ simulationProperties: $fromObject<TName, TRate>({ a: 10 }) });

    (offLevelTarget as unknown as { m_game_vertex_id: number }).m_game_vertex_id = 330;

    const validitySpy = jest.spyOn(offLevelTarget, "isValidSimulationTarget");

    expect(evaluateSimulationPriority(offLevelTarget, squad)).toBe(0);
    expect(validitySpy).not.toHaveBeenCalled();
  });
});

describe("getSquadSimulationTarget", () => {
  beforeEach(() => {
    resetRegistry();
    registerSimulator();
    resetPositionCache();

    MockVector.DEFAULT_DISTANCE = 20;
  });

  it("should pick a random entry among sliced targets", () => {
    const squad: Squad = MockSquad.mock({ behaviour: $fromObject<string, string>({ a: "1" }) });
    const target: Squad = mockSimulationTargetSquad(10);
    const randomSpy = jest.spyOn(math, "random");

    randomSpy.mockReturnValueOnce(1);

    expect(getSquadSimulationTarget(squad)).toBe(target);

    randomSpy.mockRestore();
  });

  it("should fall back to self when no targets are available", () => {
    const squad: Squad = MockSquad.mock();

    expect(getSquadSimulationTarget(squad)).toBe(squad);
  });
});
