import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { ServerHumanObject } from "xray16/alias";
import { LuaArray, TName, TRate } from "xray16/lib";
import { $fromObject } from "xray16/macros";
import { MockAlifeHumanStalker, MockCTime, MockVector } from "xray16/mocks";

import { registerSimulator, registry } from "@/engine/core/database";
import { IDebugField } from "@/engine/core/managers/debug/debug_types";
import {
  explainDebugSquadTargets,
  inspectDebugSquad,
  summarizeDebugSquad,
} from "@/engine/core/managers/debug/utils/debug_simulation_squad";
import { destroySimulationData, resetSimulationDataCache } from "@/engine/core/managers/simulation/utils";
import { SmartTerrain } from "@/engine/core/objects/smart_terrain";
import { Squad } from "@/engine/core/objects/squad";
import { SquadStayOnTargetAction } from "@/engine/core/objects/squad/action";
import { resetPositionCache } from "@/engine/core/utils/position";
import {
  getDebugFieldValues,
  mockRegisteredActor,
  MockSmartTerrain,
  MockSquad,
  resetRegistry,
} from "@/fixtures/engine";

/**
 * @param propertyRate - Rate of property `a` of the target.
 * @returns Squad every other squad may take as a target.
 */
function mockTargetSquad(propertyRate: TRate): Squad {
  const target: Squad = MockSquad.mock({ simulationProperties: $fromObject<TName, TRate>({ a: propertyRate }) });

  jest.spyOn(target, "isValidSimulationTarget").mockImplementation(() => $multi(true, null));
  registry.simulationObjects.set(target.id, target);

  return target;
}

beforeEach(() => {
  resetRegistry();
  registerSimulator();
  mockRegisteredActor();
  destroySimulationData();
  resetSimulationDataCache();
  resetPositionCache();

  MockVector.DEFAULT_DISTANCE = 20;
});

describe("inspectDebugSquad", () => {
  it("should describe a squad under simulation control, with its choices", () => {
    const squad: MockSquad = MockSquad.mockRegistered({
      behaviour: $fromObject<string, string>({ a: "1" }),
    }) as MockSquad;
    const member: ServerHumanObject = MockAlifeHumanStalker.mock({ health: 0.5 });
    const terrain: SmartTerrain = MockSmartTerrain.mockRegistered("test_smart");
    const action: SquadStayOnTargetAction = new SquadStayOnTargetAction(squad);
    const previousNow: MockCTime = MockCTime.nowTime;

    MockCTime.nowTime = MockCTime.create(2012, 6, 12, 10, 0, 0, 0);
    action.initialize();
    action.actionIdleTime = 90 * 60;
    MockCTime.nowTime = MockCTime.create(2012, 6, 12, 10, 10, 0, 0);

    squad.mockAddMember(member);
    squad.currentAction = action;
    squad.assignedTerrainId = terrain.id;
    mockTargetSquad(10);

    const fields: LuaArray<IDebugField> = inspectDebugSquad(squad);

    expect(getDebugFieldValues(fields, "control")).toEqual(["simulation"]);
    expect(getDebugFieldValues(fields, "action")).toEqual(["staying, 1h 20m left"]);
    expect(getDebugFieldValues(fields, "smart terrain")).toEqual([`test_smart (${terrain.id})`]);
    expect(getDebugFieldValues(fields, "member")).toEqual([`${member.name()}, 50%`]);
    expect(getDebugFieldValues(fields, "behaviour")).toEqual(["a 1"]);
    expect(getDebugFieldValues(fields, "choice 1")).toHaveLength(1);

    MockCTime.nowTime = previousNow;
  });

  it("should describe a scripted squad without choices", () => {
    const squad: Squad = MockSquad.mockRegistered();
    const terrain: SmartTerrain = MockSmartTerrain.mockRegistered("test_smart");

    jest.spyOn(squad, "getScriptedSimulationTarget").mockImplementation(() => terrain.id);
    mockTargetSquad(10);

    const fields: LuaArray<IDebugField> = inspectDebugSquad(squad);

    expect(getDebugFieldValues(fields, "control")).toEqual([`scripted, to test_smart (${terrain.id})`]);
    expect(getDebugFieldValues(fields, "choice 1")).toEqual([]);
  });
});

describe("explainDebugSquadTargets", () => {
  it("should break down the score of each choice", () => {
    const squad: Squad = MockSquad.mock({ behaviour: $fromObject<string, string>({ a: "1" }) });
    const target: Squad = mockTargetSquad(10);
    const fields: LuaArray<IDebugField> = new LuaTable();

    explainDebugSquadTargets(fields, squad);

    expect(getDebugFieldValues(fields, "choice 1")).toEqual([`${target.name()}: 13.65 = (3 + 10.00) x 1.050, 20 m`]);
  });

  it("should say when there is no choice, and why wanted terrains are rejected", () => {
    const squad: Squad = MockSquad.mock();
    const full: SmartTerrain = MockSmartTerrain.mockRegistered("full_smart");
    const unavailable: SmartTerrain = MockSmartTerrain.mockRegistered("unavailable_smart");
    const fields: LuaArray<IDebugField> = new LuaTable();

    full.simulationProperties = new LuaTable();
    unavailable.simulationProperties = new LuaTable();
    full.maxStayingSquadsCount = 0;
    registry.simulationObjects.delete(unavailable.id);

    explainDebugSquadTargets(fields, squad);

    expect(getDebugFieldValues(fields, "choices")).toEqual(["none, the squad stays on its terrain"]);
    expect(getDebugFieldValues(fields, "wants").sort()).toEqual([
      "full_smart: 3.15, full",
      "unavailable_smart: 3.15, simulation unavailable",
    ]);
  });
});

describe("summarizeDebugSquad", () => {
  it("should sum a squad up in a few rows", () => {
    const squad: MockSquad = MockSquad.mockRegistered() as MockSquad;
    const terrain: SmartTerrain = MockSmartTerrain.mockRegistered("test_smart");

    squad.assignedTargetId = terrain.id;
    squad.mockAddMember(MockAlifeHumanStalker.mock());

    const fields: LuaArray<IDebugField> = summarizeDebugSquad(squad);

    expect(getDebugFieldValues(fields, "target")).toEqual([`test_smart (${terrain.id})`]);
    expect(getDebugFieldValues(fields, "smart terrain")).toEqual([]);
    expect(getDebugFieldValues(fields, "members")).toEqual(["1"]);
    expect(fields.length()).toBeLessThanOrEqual(6);
  });
});
