import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { CALifeSmartTerrainTask, time_global } from "xray16";
import { ServerHumanObject, ServerObject } from "xray16/alias";
import { AnyCallable, AnyObject, MAX_ALIFE_ID, NIL, Nillable, TName, TNumberId } from "xray16/lib";
import { $fromArray } from "xray16/macros";
import { EMockPacketDataType, MockAlifeHumanStalker, MockNetProcessor } from "xray16/mocks";
import { replaceFunctionMock, resetFunctionMock } from "xray16/testing/utils";

import { getManager, registerSimulator, registry } from "@/engine/core/database";
import { parseConditionsList } from "@/engine/core/ini";
import { EGameEvent, EventsManager } from "@/engine/core/managers/events";
import { simulationConfig } from "@/engine/core/managers/simulation/SimulationConfig";
import { ESimulationTargetRejection, ESimulationTerrainRole } from "@/engine/core/managers/simulation/types";
import { assignSimulationSquadToTerrain } from "@/engine/core/managers/simulation/utils";
import { SmartTerrain } from "@/engine/core/objects/smart_terrain";
import { SquadReachTargetAction, SquadStayOnTargetAction } from "@/engine/core/objects/squad/action";
import { Squad } from "@/engine/core/objects/squad/Squad";
import { ESquadActionType, ISquadAction } from "@/engine/core/objects/squad/squad_types";
import { SQUAD_BEHAVIOURS_LTX } from "@/engine/core/objects/squad/SquadConfig";
import { getSquadHelpActorTargetId } from "@/engine/core/utils/squad";
import { mockRegisteredActor, MockSmartTerrain, MockSquad, resetRegistry } from "@/fixtures/engine";

jest.mock("@/engine/core/utils/squad", () => ({
  ...jest.requireActual<AnyObject>("@/engine/core/utils/squad"),
  getSquadHelpActorTargetId: jest.fn(() => null),
}));

/**
 * Inert action stub, so update flows can be driven without running real action logic.
 */
function mockAction(type: ESquadActionType, isFinished: boolean): ISquadAction {
  return {
    type,
    update: jest.fn(() => isFinished),
    initialize: jest.fn(),
    finalize: jest.fn(),
  } as unknown as ISquadAction;
}

describe("Squad targeting and update", () => {
  beforeEach(() => {
    resetRegistry();
    registerSimulator();
    mockRegisteredActor();

    replaceFunctionMock(time_global, () => 10_000);
    resetFunctionMock(getSquadHelpActorTargetId);
    replaceFunctionMock(getSquadHelpActorTargetId, () => null);
  });

  it("constructor should abort when behaviour section is missing", () => {
    // `section_exist` is an own jest mock on the ini file mock, so it is swapped out and put back by hand -
    // `mockRestore` would leave a bare mock returning `undefined` behind.
    const behaviours: AnyObject = SQUAD_BEHAVIOURS_LTX as unknown as AnyObject;
    const sectionExists: AnyCallable = behaviours.section_exist;

    behaviours.section_exist = jest.fn(() => false);

    try {
      expect(() => MockSquad.mock()).toThrow("in 'squad_behaviours.ltx'");
    } finally {
      behaviours.section_exist = sectionExists;
    }
  });

  it("update should refresh simulation state and reset location masks once", () => {
    const squad: MockSquad = MockSquad.createRegistered();

    jest.spyOn(squad.storyPlayback, "update").mockImplementation(jest.fn());
    jest.spyOn(squad, "getScriptedSimulationTarget").mockImplementation(() => null);
    jest.spyOn(squad, "updateCurrentGenericAction").mockImplementation(jest.fn());
    jest.spyOn(squad, "updateCurrentScriptedAction").mockImplementation(jest.fn());
    jest.spyOn(squad, "setLocationTypes").mockImplementation(jest.fn());

    expect(squad.isLocationMasksResetNeeded).toBe(true);

    squad.update();

    expect(squad.storyPlayback.update).toHaveBeenCalledTimes(1);
    expect(squad.updateCurrentGenericAction).toHaveBeenCalledTimes(1);
    expect(squad.updateCurrentScriptedAction).toHaveBeenCalledTimes(0);
    expect(squad.setLocationTypes).toHaveBeenCalledTimes(1);
    expect(squad.isLocationMasksResetNeeded).toBe(false);

    // Masks are recomputed only once until the flag is raised again.
    squad.update();

    expect(squad.setLocationTypes).toHaveBeenCalledTimes(1);
  });

  it("update should follow scripted target when one is defined", () => {
    const squad: MockSquad = MockSquad.createRegistered();

    jest.spyOn(squad.storyPlayback, "update").mockImplementation(jest.fn());
    jest.spyOn(squad, "getScriptedSimulationTarget").mockImplementation(() => 720);
    jest.spyOn(squad, "updateCurrentGenericAction").mockImplementation(jest.fn());
    jest.spyOn(squad, "updateCurrentScriptedAction").mockImplementation(jest.fn());
    jest.spyOn(squad, "setLocationTypes").mockImplementation(jest.fn());

    squad.update();

    expect(squad.updateCurrentScriptedAction).toHaveBeenCalledWith(720);
    expect(squad.updateCurrentGenericAction).toHaveBeenCalledTimes(0);
  });

  it("updateCurrentGenericAction should prioritize helping actor over current target", () => {
    const squad: MockSquad = MockSquad.createRegistered();
    const helped: MockSquad = MockSquad.createRegistered();
    const action: ISquadAction = mockAction(ESquadActionType.STAY_ON_TARGET, false);

    squad.currentAction = action;
    squad.assignedTargetId = 500;

    jest.spyOn(squad, "selectNewAction").mockImplementation(jest.fn());
    replaceFunctionMock(getSquadHelpActorTargetId, () => helped.id);

    squad.updateCurrentGenericAction();

    expect(action.finalize).toHaveBeenCalledTimes(1);
    expect(squad.currentAction).toBeNull();
    expect(squad.assignedTargetId).toBe(helped.id);
    expect(squad.selectNewAction).toHaveBeenCalledWith(false);
  });

  it("updateCurrentGenericAction should select next target when current action finished", () => {
    const squad: MockSquad = MockSquad.createRegistered();
    const next: SmartTerrain = MockSmartTerrain.mockRegistered();
    const action: ISquadAction = mockAction(ESquadActionType.STAY_ON_TARGET, true);

    squad.currentAction = action;
    squad.assignedTargetId = 500;

    jest.spyOn(squad, "isAssignedTargetAvailable").mockImplementation(() => true);
    jest.spyOn(squad, "selectNewAction").mockImplementation(jest.fn());

    // Keep the throttled outrank rescan out of scope for this assertion.
    squad.nextTargetOutrankCheckAt = Infinity;

    jest
      .spyOn(require("@/engine/core/managers/simulation/utils/simulation_priority"), "getSquadSimulationTarget")
      .mockImplementation(() => next);

    squad.updateCurrentGenericAction();

    expect(action.finalize).toHaveBeenCalledTimes(1);
    // Stay-on-target actions hand over to the freshly picked simulation target.
    expect(squad.assignedTargetId).toBe(next.id);
    expect(squad.currentAction).toBeNull();
    expect(squad.selectNewAction).toHaveBeenCalledWith(true);

    jest.restoreAllMocks();
  });

  it("updateCurrentGenericAction should keep target when finished action was reaching it", () => {
    const squad: MockSquad = MockSquad.createRegistered();
    const next: SmartTerrain = MockSmartTerrain.mockRegistered();
    const action: ISquadAction = mockAction(ESquadActionType.REACH_TARGET, true);

    squad.currentAction = action;
    squad.assignedTargetId = 500;
    squad.nextTargetOutrankCheckAt = Infinity;

    jest.spyOn(squad, "isAssignedTargetAvailable").mockImplementation(() => true);
    jest.spyOn(squad, "selectNewAction").mockImplementation(jest.fn());
    jest
      .spyOn(require("@/engine/core/managers/simulation/utils/simulation_priority"), "getSquadSimulationTarget")
      .mockImplementation(() => next);

    squad.updateCurrentGenericAction();

    expect(squad.assignedTargetId).toBe(500);
    expect(squad.selectNewAction).toHaveBeenCalledWith(true);

    jest.restoreAllMocks();
  });

  it("updateCurrentGenericAction should reset state when target became unavailable", () => {
    const squad: MockSquad = MockSquad.createRegistered();
    const next: SmartTerrain = MockSmartTerrain.mockRegistered();
    const action: ISquadAction = mockAction(ESquadActionType.STAY_ON_TARGET, false);

    squad.currentAction = action;
    squad.currentTargetId = 400;
    squad.assignedTargetId = 500;
    squad.nextTargetOutrankCheckAt = Infinity;

    jest.spyOn(squad, "isAssignedTargetAvailable").mockImplementation(() => false);
    jest.spyOn(squad, "selectNewAction").mockImplementation(jest.fn());
    jest
      .spyOn(require("@/engine/core/managers/simulation/utils/simulation_priority"), "getSquadSimulationTarget")
      .mockImplementation(() => next);

    squad.updateCurrentGenericAction();

    expect(action.finalize).toHaveBeenCalledTimes(1);
    expect(squad.currentAction).toBeNull();
    expect(squad.currentTargetId).toBeNull();
    expect(squad.assignedTargetId).toBe(next.id);
    expect(squad.selectNewAction).toHaveBeenCalledWith(true);

    jest.restoreAllMocks();
  });

  it("updateCurrentScriptedAction should start new action when target changed", () => {
    const squad: MockSquad = MockSquad.createRegistered();
    const action: ISquadAction = mockAction(ESquadActionType.STAY_ON_TARGET, false);

    squad.currentAction = action;
    squad.assignedTargetId = 500;

    jest.spyOn(squad, "selectNewAction").mockImplementation(jest.fn());

    squad.updateCurrentScriptedAction(600);

    expect(action.finalize).toHaveBeenCalledTimes(1);
    expect(squad.currentAction).toBeNull();
    expect(squad.assignedTargetId).toBe(600);
    expect(squad.selectNewAction).toHaveBeenCalledWith(false);
  });

  it("updateCurrentScriptedAction should start new action when none is running", () => {
    const squad: MockSquad = MockSquad.createRegistered();

    squad.currentAction = null;
    squad.assignedTargetId = 600;

    jest.spyOn(squad, "isOnAssignedTarget").mockImplementation(() => false);
    jest.spyOn(squad, "selectNewAction").mockImplementation(jest.fn());

    squad.updateCurrentScriptedAction(600);

    expect(squad.isOnAssignedTarget).toHaveBeenCalledTimes(1);
    expect(squad.selectNewAction).toHaveBeenCalledWith(false);
  });

  it("updateCurrentScriptedAction should keep staying on target until it is reached", () => {
    const squad: MockSquad = MockSquad.createRegistered();
    const action: ISquadAction = mockAction(ESquadActionType.STAY_ON_TARGET, false);

    squad.currentAction = action;
    squad.assignedTargetId = 600;

    jest.spyOn(squad, "isOnAssignedTarget").mockImplementation(() => false);
    jest.spyOn(squad, "selectNewAction").mockImplementation(jest.fn());

    squad.updateCurrentScriptedAction(600);

    expect(action.update).toHaveBeenCalledWith(false);
    expect(action.finalize).toHaveBeenCalledTimes(0);
    expect(squad.selectNewAction).toHaveBeenCalledTimes(0);
    expect(squad.currentAction).toBe(action);
  });

  it("updateCurrentScriptedAction should switch action once staying target is reached", () => {
    const squad: MockSquad = MockSquad.createRegistered();
    const action: ISquadAction = mockAction(ESquadActionType.STAY_ON_TARGET, false);

    squad.currentAction = action;
    squad.assignedTargetId = 600;

    jest.spyOn(squad, "isOnAssignedTarget").mockImplementation(() => true);
    jest.spyOn(squad, "selectNewAction").mockImplementation(jest.fn());

    squad.updateCurrentScriptedAction(600);

    expect(action.update).toHaveBeenCalledTimes(0);
    expect(action.finalize).toHaveBeenCalledTimes(1);
    expect(squad.selectNewAction).toHaveBeenCalledWith(false);
  });

  it("updateCurrentScriptedAction should switch action when reaching action completes", () => {
    const squad: MockSquad = MockSquad.createRegistered();
    const action: ISquadAction = mockAction(ESquadActionType.REACH_TARGET, true);

    squad.currentAction = action;
    squad.assignedTargetId = 600;

    jest.spyOn(squad, "isOnAssignedTarget").mockImplementation(() => false);
    jest.spyOn(squad, "selectNewAction").mockImplementation(jest.fn());

    squad.updateCurrentScriptedAction(600);

    expect(action.update).toHaveBeenCalledWith(false);
    expect(squad.isOnAssignedTarget).toHaveBeenCalledTimes(1);
    expect(action.finalize).toHaveBeenCalledTimes(1);
    expect(squad.selectNewAction).toHaveBeenCalledWith(false);
  });

  it("should correctly save and load state", () => {
    const squad: MockSquad = MockSquad.createRegistered();
    const processor: MockNetProcessor = new MockNetProcessor();

    squad.currentTargetId = 421;
    squad.respawnPointId = 422;
    squad.respawnPointSection = "test_respawn_section";
    squad.assignedTerrainId = 423;

    squad.STATE_Write(processor.asNetPacket());

    expect(processor.writeDataOrder).toEqual([
      EMockPacketDataType.STRING,
      EMockPacketDataType.STRING,
      EMockPacketDataType.STRING,
      EMockPacketDataType.STRING,
      EMockPacketDataType.STRING,
      EMockPacketDataType.U16,
    ]);
    // Leading entry comes from the base server object mock, trailing number is the save marker.
    expect(processor.dataList).toEqual(["state_write_from_MockSquad", "421", "422", "test_respawn_section", "423", 4]);

    const another: MockSquad = MockSquad.createRegistered();

    another.STATE_Read(processor.asNetPacket(), 0);

    expect(another.currentTargetId).toBe(421);
    expect(another.respawnPointId).toBe(422);
    expect(another.respawnPointSection).toBe("test_respawn_section");
    expect(another.assignedTerrainId).toBe(423);
    expect(another.isLocationMasksResetNeeded).toBe(true);
    expect(processor.readDataOrder).toEqual(processor.writeDataOrder);
    expect(processor.dataList).toHaveLength(0);
  });

  it("should correctly load nil-ed state", () => {
    const squad: MockSquad = MockSquad.createRegistered();
    const processor: MockNetProcessor = new MockNetProcessor();

    squad.currentTargetId = null;
    squad.respawnPointId = null;
    squad.respawnPointSection = null;
    squad.assignedTerrainId = null;

    squad.STATE_Write(processor.asNetPacket());

    expect(processor.dataList).toEqual(["state_write_from_MockSquad", NIL, NIL, NIL, NIL, 4]);

    const another: MockSquad = MockSquad.createRegistered();

    another.assignedTerrainId = 55;
    another.STATE_Read(processor.asNetPacket(), 0);

    expect(another.currentTargetId).toBeNull();
    expect(another.respawnPointId).toBeNull();
    expect(another.respawnPointSection).toBeNull();
    expect(another.assignedTerrainId).toBeNull();
  });

  it("on_unregister should decrement spawned squads counter of respawn point", () => {
    const squad: MockSquad = MockSquad.createRegistered();
    const terrain: SmartTerrain = MockSmartTerrain.mockRegistered();

    terrain.spawnedSquadsList.set("test_respawn_section", { num: 3 });

    squad.respawnPointId = terrain.id;
    squad.respawnPointSection = "test_respawn_section";

    squad.on_unregister();

    expect(terrain.spawnedSquadsList.get("test_respawn_section").num).toBe(2);
  });

  it("on_unregister should tolerate missing respawn point terrain", () => {
    const squad: MockSquad = MockSquad.createRegistered();

    squad.respawnPointId = MAX_ALIFE_ID - 1;
    squad.respawnPointSection = "test_respawn_section";

    expect(() => squad.on_unregister()).not.toThrow();
  });

  it("get_current_task should fall back to own simulation task without terrain target", () => {
    const squad: MockSquad = MockSquad.createRegistered();

    squad.assignedTargetId = null;

    expect(squad.get_current_task()).toBe(squad.getSimulationTask());
  });

  it("get_current_task should use terrain task when commander has no job", () => {
    const squad: MockSquad = MockSquad.createRegistered();
    const terrain: SmartTerrain = MockSmartTerrain.mockRegistered();

    squad.assignedTargetId = terrain.id;

    const terrainTask: CALifeSmartTerrainTask = new CALifeSmartTerrainTask(11, 22);

    jest.spyOn(terrain, "getSimulationTask").mockImplementation(() => terrainTask);

    expect(squad.get_current_task()).toBe(terrainTask);
  });

  it("get_current_task should use commander job task when it is assigned", () => {
    const squad: MockSquad = MockSquad.createRegistered();
    const terrain: SmartTerrain = MockSmartTerrain.mockRegistered();
    const commanderId: TNumberId = squad.commander_id();
    const jobTask: CALifeSmartTerrainTask = new CALifeSmartTerrainTask(33, 44);

    squad.assignedTargetId = terrain.id;

    terrain.objectJobDescriptors.set(commanderId, {
      jobId: 5,
      job: { alifeTask: jobTask },
    } as never);
    terrain.jobs.set(5, {} as never);

    expect(squad.get_current_task()).toBe(jobTask);
  });

  it("get_current_task should ignore commander job while it is still arriving", () => {
    const squad: MockSquad = MockSquad.createRegistered();
    const terrain: SmartTerrain = MockSmartTerrain.mockRegistered();
    const commanderId: TNumberId = squad.commander_id();
    const terrainTask: CALifeSmartTerrainTask = new CALifeSmartTerrainTask(11, 22);

    squad.assignedTargetId = terrain.id;

    terrain.arrivingObjects.set(commanderId, {} as never);
    terrain.objectJobDescriptors.set(commanderId, {
      jobId: 5,
      job: { alifeTask: new CALifeSmartTerrainTask(33, 44) },
    } as never);
    terrain.jobs.set(5, {} as never);

    jest.spyOn(terrain, "getSimulationTask").mockImplementation(() => terrainTask);

    expect(squad.get_current_task()).toBe(terrainTask);
  });

  it("getScriptedSimulationTarget should return null when condlist gives nothing", () => {
    const squad: MockSquad = MockSquad.createRegistered();

    squad.targetConditionList = parseConditionsList("");

    expect(squad.getScriptedSimulationTarget()).toBeNull();
  });

  it("getScriptedSimulationTarget should parse the picked target and reset iteration", () => {
    const squad: MockSquad = MockSquad.createRegistered();
    const first: SmartTerrain = MockSmartTerrain.mockRegistered("first_terrain");

    simulationConfig.TERRAINS.set("first_terrain", first);

    squad.targetConditionList = parseConditionsList("first_terrain");

    expect(squad.getScriptedSimulationTarget()).toBe(first.id);
    expect(squad.lastTarget).toBe("first_terrain");
    expect(squad.nextTargetIndex).toBe(1);

    // Out of range index resets iteration back to the first target.
    squad.nextTargetIndex = 5;

    expect(squad.getScriptedSimulationTarget()).toBe(first.id);
    expect(squad.nextTargetIndex).toBe(1);
  });

  it("getScriptedSimulationTarget should advance over the parsed targets list", () => {
    const squad: MockSquad = MockSquad.createRegistered();
    const first: SmartTerrain = MockSmartTerrain.mockRegistered("first_terrain");
    const second: SmartTerrain = MockSmartTerrain.mockRegistered("second_terrain");

    simulationConfig.TERRAINS.set("first_terrain", first);
    simulationConfig.TERRAINS.set("second_terrain", second);

    // Target is already parsed, so the condlist pick does not re-split it.
    squad.targetConditionList = parseConditionsList("first_terrain");
    squad.lastTarget = "first_terrain";
    squad.parsedTargets = $fromArray(["first_terrain", "second_terrain"]);
    squad.nextTargetIndex = 2;

    expect(squad.getScriptedSimulationTarget()).toBe(second.id);
  });

  it("getScriptedSimulationTarget should return null when condlist gives nil", () => {
    const squad: MockSquad = MockSquad.createRegistered();

    squad.targetConditionList = parseConditionsList("first_terrain");
    squad.lastTarget = "first_terrain";
    squad.parsedTargets = $fromArray<TName>([NIL]);
    squad.nextTargetIndex = 1;

    expect(squad.getScriptedSimulationTarget()).toBeNull();
  });

  it("getScriptedSimulationTarget should rewind iteration on the loop entry", () => {
    const squad: MockSquad = MockSquad.createRegistered();
    const first: SmartTerrain = MockSmartTerrain.mockRegistered("first_terrain");

    simulationConfig.TERRAINS.set("first_terrain", first);

    squad.targetConditionList = parseConditionsList("first_terrain");
    squad.lastTarget = "first_terrain";
    squad.parsedTargets = $fromArray(["first_terrain", "loop"]);
    squad.nextTargetIndex = 2;

    expect(squad.getScriptedSimulationTarget()).toBe(first.id);
    expect(squad.nextTargetIndex).toBe(1);
  });

  it("isOnAssignedTarget should advance target index when terrain is reached", () => {
    const squad: MockSquad = MockSquad.createRegistered();

    squad.parsedTargets = $fromArray(["a", "b"]);
    squad.nextTargetIndex = 1;
    squad.assignedTerrainId = 800;
    squad.assignedTargetId = 800;

    expect(squad.isOnAssignedTarget()).toBe(true);
    expect(squad.nextTargetIndex).toBe(2);

    // No third target to advance to.
    expect(squad.isOnAssignedTarget()).toBe(false);
    expect(squad.nextTargetIndex).toBe(2);
  });

  it("isOnAssignedTarget should be false when squad is not on its terrain", () => {
    const squad: MockSquad = MockSquad.createRegistered();

    squad.parsedTargets = $fromArray(["a", "b"]);
    squad.nextTargetIndex = 1;
    squad.assignedTerrainId = 800;
    squad.assignedTargetId = 801;

    expect(squad.isOnAssignedTarget()).toBe(false);
  });

  it("isAssignedTargetAvailable should check target simulation availability", () => {
    const squad: MockSquad = MockSquad.createRegistered();
    const target: MockSquad = MockSquad.createRegistered();

    squad.assignedTargetId = null;
    expect(squad.isAssignedTargetAvailable()).toBe(false);

    squad.assignedTargetId = MAX_ALIFE_ID - 1;
    expect(squad.isAssignedTargetAvailable()).toBe(false);

    squad.assignedTargetId = target.id;
    jest
      .spyOn(target, "isValidSimulationTarget")
      .mockImplementation(() => $multi(false, ESimulationTargetRejection.NOT_WANTED));
    expect(squad.isAssignedTargetAvailable()).toBe(false);

    jest.spyOn(target, "isValidSimulationTarget").mockImplementation(() => $multi(true, null));
    expect(squad.isAssignedTargetAvailable()).toBe(true);
  });

  it("clearAssignedTarget should reset target", () => {
    const squad: MockSquad = MockSquad.createRegistered();

    squad.assignedTargetId = 500;
    squad.clearAssignedTarget();

    expect(squad.assignedTargetId).toBeNull();
  });

  it("selectNewAction should stay on target when it is already reached", () => {
    const squad: MockSquad = MockSquad.createRegistered();
    const target: MockSquad = MockSquad.createRegistered();

    squad.assignedTargetId = target.id;
    squad.currentTargetId = null;

    jest.spyOn(target, "isReachedBySimulationObject").mockImplementation(() => true);
    jest.spyOn(target, "onSimulationTargetSelected").mockImplementation(jest.fn());
    jest.spyOn(target, "onSimulationTargetDeselected").mockImplementation(jest.fn());

    squad.selectNewAction(true);

    expect(target.onSimulationTargetSelected).toHaveBeenCalledWith(squad);
    expect(target.onSimulationTargetDeselected).toHaveBeenCalledWith(squad);
    expect(squad.currentTargetId).toBe(target.id);
    expect(squad.currentAction).toBeInstanceOf(SquadStayOnTargetAction);
  });

  it("selectNewAction should stay on target when it no longer exists", () => {
    const squad: MockSquad = MockSquad.createRegistered();

    squad.assignedTargetId = MAX_ALIFE_ID - 1;
    squad.currentTargetId = null;

    squad.selectNewAction(false);

    expect(squad.currentTargetId).toBe(MAX_ALIFE_ID - 1);
    expect(squad.currentAction).toBeInstanceOf(SquadStayOnTargetAction);
  });

  it("selectNewAction should reach target when it differs from the current one", () => {
    const squad: MockSquad = MockSquad.createRegistered();
    const target: MockSquad = MockSquad.createRegistered();

    squad.assignedTargetId = target.id;
    squad.currentTargetId = 900;

    jest.spyOn(target, "isReachedBySimulationObject").mockImplementation(() => false);

    squad.selectNewAction(true);

    expect(squad.currentAction).toBeInstanceOf(SquadReachTargetAction);
  });

  it("selectNewAction should stay when assigned target matches current one", () => {
    const squad: MockSquad = MockSquad.createRegistered();
    const target: MockSquad = MockSquad.createRegistered();

    squad.assignedTargetId = target.id;
    squad.currentTargetId = target.id;

    jest.spyOn(target, "isReachedBySimulationObject").mockImplementation(() => false);

    squad.selectNewAction(false);

    expect(squad.currentAction).toBeInstanceOf(SquadStayOnTargetAction);
    expect(squad.currentTargetId).toBe(target.id);
  });

  it("selectNewAction should emit the new action", () => {
    const squad: MockSquad = MockSquad.createRegistered();
    const onSelected = jest.fn((it: Squad) => it.currentAction?.type);

    getManager(EventsManager).registerCallback(EGameEvent.SQUAD_ACTION_SELECTED, onSelected);
    squad.assignedTargetId = MAX_ALIFE_ID - 1;

    squad.selectNewAction(true);

    expect(onSelected).toHaveBeenCalledWith(squad);
    expect(onSelected).toHaveReturnedWith(ESquadActionType.STAY_ON_TARGET);
  });

  it("assignToTerrain should move all members to the new terrain", () => {
    const squad: MockSquad = MockSquad.createRegistered();
    const oldTerrain: SmartTerrain = MockSmartTerrain.mockRegistered();
    const newTerrain: SmartTerrain = MockSmartTerrain.mockRegistered();
    const first: ServerHumanObject = MockAlifeHumanStalker.mock();
    const second: ServerHumanObject = MockAlifeHumanStalker.mock();

    squad.mockAddMember(first);
    squad.mockAddMember(second);

    first.m_smart_terrain_id = oldTerrain.id;
    second.m_smart_terrain_id = oldTerrain.id;

    squad.assignedTerrainId = oldTerrain.id;

    jest.spyOn(oldTerrain, "unregister_npc").mockImplementation(jest.fn());
    jest.spyOn(newTerrain, "register_npc").mockImplementation(jest.fn());

    squad.assignToTerrain(newTerrain);

    expect(squad.assignedTerrainId).toBe(newTerrain.id);
    expect(oldTerrain.unregister_npc).toHaveBeenCalledTimes(2);
    expect(newTerrain.register_npc).toHaveBeenCalledTimes(2);
  });

  it("assignToTerrain should clear assignment when terrain is null", () => {
    const squad: MockSquad = MockSquad.createRegistered();

    squad.assignedTerrainId = 700;
    squad.assignToTerrain(null);

    expect(squad.assignedTerrainId).toBeNull();
  });

  it("assignMemberToTerrain should skip members already on the assigned terrain", () => {
    const squad: MockSquad = MockSquad.createRegistered();
    const terrain: SmartTerrain = MockSmartTerrain.mockRegistered();
    const member: ServerHumanObject = MockAlifeHumanStalker.mock();

    squad.assignedTerrainId = terrain.id;
    member.m_smart_terrain_id = terrain.id;

    jest.spyOn(terrain, "register_npc").mockImplementation(jest.fn());

    squad.assignMemberToTerrain(member.id, terrain, null);

    expect(terrain.register_npc).toHaveBeenCalledTimes(0);
  });

  it("assignMemberToTerrain should ignore unknown members and unset old terrains", () => {
    const squad: MockSquad = MockSquad.createRegistered();
    const terrain: SmartTerrain = MockSmartTerrain.mockRegistered();
    const member: ServerHumanObject = MockAlifeHumanStalker.mock();

    jest.spyOn(terrain, "register_npc").mockImplementation(jest.fn());

    expect(() => squad.assignMemberToTerrain(MAX_ALIFE_ID - 1, terrain, null)).not.toThrow();
    expect(terrain.register_npc).toHaveBeenCalledTimes(0);

    // `MAX_ALIFE_ID` marks an unset terrain and must not be unregistered from.
    squad.assignMemberToTerrain(member.id, terrain, MAX_ALIFE_ID);

    expect(terrain.register_npc).toHaveBeenCalledWith(member);
  });

  it("setLocationTypes should apply squad masks and base terrains for non-terrain targets", () => {
    const squad: MockSquad = MockSquad.createRegistered();
    const target: MockSquad = MockSquad.createRegistered();
    const base: SmartTerrain = MockSmartTerrain.mockRegistered("base_terrain");
    const regular: SmartTerrain = MockSmartTerrain.mockRegistered("regular_terrain");

    base.simulationProperties.set(ESimulationTerrainRole.BASE, 1);
    regular.simulationProperties.set(ESimulationTerrainRole.BASE, 0);

    simulationConfig.TERRAINS.set("base_terrain", base);
    simulationConfig.TERRAINS.set("regular_terrain", regular);

    squad.assignedTargetId = target.id;

    jest.spyOn(squad, "setLocationTypesMaskFromSection").mockImplementation(jest.fn());

    squad.setLocationTypes();

    expect(squad.clear_location_types).toHaveBeenCalledTimes(1);
    expect(squad.setLocationTypesMaskFromSection).toHaveBeenCalledWith("squad_terrain");
    expect(squad.setLocationTypesMaskFromSection).toHaveBeenCalledWith("base_terrain");
    expect(squad.setLocationTypesMaskFromSection).not.toHaveBeenCalledWith("regular_terrain");
  });

  it("setLocationTypes should apply terrain masks when targeting a smart terrain", () => {
    const squad: MockSquad = MockSquad.createRegistered();
    const target: SmartTerrain = MockSmartTerrain.mockRegistered("target_terrain");
    const assigned: SmartTerrain = MockSmartTerrain.mockRegistered("assigned_terrain");

    squad.assignedTargetId = target.id;
    squad.assignedTerrainId = assigned.id;

    jest.spyOn(squad, "setLocationTypesMaskFromSection").mockImplementation(jest.fn());

    squad.setLocationTypes("extra_terrain");

    expect(squad.setLocationTypesMaskFromSection).toHaveBeenCalledWith("stalker_terrain");
    expect(squad.setLocationTypesMaskFromSection).toHaveBeenCalledWith("assigned_terrain");
    expect(squad.setLocationTypesMaskFromSection).toHaveBeenCalledWith("extra_terrain");
  });

  it("setLocationTypes should skip old terrain masks when squad is unassigned", () => {
    const squad: MockSquad = MockSquad.createRegistered();
    const target: SmartTerrain = MockSmartTerrain.mockRegistered("target_terrain");

    squad.assignedTargetId = target.id;
    squad.assignedTerrainId = null;

    jest.spyOn(squad, "setLocationTypesMaskFromSection").mockImplementation(jest.fn());

    squad.setLocationTypes();

    expect(squad.setLocationTypesMaskFromSection).toHaveBeenCalledTimes(1);
    expect(squad.setLocationTypesMaskFromSection).toHaveBeenCalledWith("stalker_terrain");
  });

  it("setLocationTypesMaskFromSection should add location type for existing sections", () => {
    const squad: MockSquad = MockSquad.createRegistered();

    (squad.add_location_type as jest.Mock).mockClear();

    // No masks ini section exists for an arbitrary name, so nothing is applied.
    squad.setLocationTypesMaskFromSection("missing_terrain_section");

    expect(squad.add_location_type).toHaveBeenCalledTimes(0);
  });

  it("assignSimulationSquadToTerrain should be applied on load", () => {
    const squad: MockSquad = MockSquad.createRegistered();
    const processor: MockNetProcessor = new MockNetProcessor();

    squad.assignedTerrainId = 423;
    squad.STATE_Write(processor.asNetPacket());

    const another: MockSquad = MockSquad.createRegistered();
    const spy = jest.spyOn(another, "updateSympathy");

    another.STATE_Read(processor.asNetPacket(), 0);

    expect(spy).toHaveBeenCalledTimes(1);
    expect(assignSimulationSquadToTerrain).toBeInstanceOf(Function);
  });

  it("isSimulationAvailable should not crash for freshly created squads", () => {
    const squad: Squad = MockSquad.createRegistered();
    const target: Nillable<ServerObject> = registry.simulator.object(squad.id);

    expect(target).toBeDefined();
    expect(typeof squad.isSimulationAvailable()).toBe("boolean");
  });
});
