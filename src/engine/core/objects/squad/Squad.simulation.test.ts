import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { CALifeSmartTerrainTask, level, time_global } from "xray16";
import { GameObject, ServerHumanObject } from "xray16/alias";
import { FALSE, TName, TRate, TRUE } from "xray16/lib";
import { $fromObject } from "xray16/macros";
import { MockAlifeHumanStalker, MockGameObject, MockIniFile } from "xray16/mocks";
import { replaceFunctionMock } from "xray16/testing/utils";

import { communities } from "@/engine/constants/communities";
import { smartTerrainNames } from "@/engine/constants/smart_terrain_names";
import { zoneNames } from "@/engine/constants/zone_names";
import { registerOfflineObject, registerSimulator, registerZone, registry } from "@/engine/core/database";
import { parseConditionsList } from "@/engine/core/ini";
import { simulationConfig } from "@/engine/core/managers/simulation/SimulationConfig";
import { ESimulationTargetRejection, ESimulationTerrainRole } from "@/engine/core/managers/simulation/types";
import { assignSimulationSquadToTerrain } from "@/engine/core/managers/simulation/utils";
import { ESmartTerrainStatus, SmartTerrain, SmartTerrainControl } from "@/engine/core/objects/smart_terrain";
import { Squad } from "@/engine/core/objects/squad";
import { ISquadAction } from "@/engine/core/objects/squad/squad_types";
import { mockRegisteredActor, MockSmartTerrain, MockSquad, resetRegistry } from "@/fixtures/engine";

describe("Squad server object", () => {
  beforeEach(() => {
    resetRegistry();
  });

  it("should correctly check if squad simulation is enabled by condlist", () => {
    const squad: MockSquad = MockSquad.mock();

    squad.isSimulationAvailableConditionList = parseConditionsList(TRUE);
    expect(squad.isSimulationAvailable()).toBe(true);

    squad.isSimulationAvailableConditionList = parseConditionsList(FALSE);
    expect(squad.isSimulationAvailable()).toBe(false);
  });

  it("should correctly check if squad simulation is enabled by no combat zone", () => {
    mockRegisteredActor();
    registerSimulator();

    const squad: MockSquad = MockSquad.mock();
    const terrain: MockSmartTerrain = MockSmartTerrain.mock();
    const zone: GameObject = MockGameObject.mock({ id: terrain.id });

    jest.spyOn(terrain, "name").mockImplementation(jest.fn(() => smartTerrainNames.zat_stalker_base_smart));
    jest.spyOn(zone, "name").mockImplementation(jest.fn(() => zoneNames.zat_a2_sr_no_assault));

    terrain.on_before_register();
    terrain.on_register();

    registerZone(zone);

    terrain.terrainControl = new SmartTerrainControl(
      terrain,
      MockIniFile.mock("test.ltx", {
        test_control: {
          noweap_zone: "no_weap_test",
          ignore_zone: "ignore_zone_test",
          alarm_start_sound: "start_sound.ogg",
          alarm_stop_sound: "stop_sound.ogg",
        },
      }),
      "test_control"
    );
    terrain.terrainControl.status = ESmartTerrainStatus.NORMAL;

    squad.isSimulationAvailableConditionList = parseConditionsList(TRUE);
    expect(squad.isSimulationAvailable()).toBe(true);

    jest.spyOn(zone, "inside").mockImplementation(() => true);
    expect(squad.isSimulationAvailable()).toBe(false);

    terrain.terrainControl.status = ESmartTerrainStatus.ALARM;
    expect(squad.isSimulationAvailable()).toBe(true);
  });

  it("should correctly check if squad simulation is enabled by assigned base smart terrain", () => {
    mockRegisteredActor();
    registerSimulator();

    const squad: MockSquad = MockSquad.mock();
    const terrain: MockSmartTerrain = MockSmartTerrain.mockRegistered();

    assignSimulationSquadToTerrain(squad, terrain.id);
    expect(squad.isSimulationAvailable()).toBe(true);

    terrain.simulationProperties.set(ESimulationTerrainRole.BASE, 1);
    expect(squad.isSimulationAvailable()).toBe(false);

    squad.assignedTerrainId = null;
    expect(squad.isSimulationAvailable()).toBe(true);
  });

  it("should say why another squad may not hunt it", () => {
    const squad: MockSquad = MockSquad.mock();
    const another: MockSquad = MockSquad.mock();

    expect(squad.isValidSimulationTarget(another)).toEqual([false, ESimulationTargetRejection.NO_FACTION_RULE]);

    another.faction = communities.stalker;
    squad.faction = communities.monster;

    expect(squad.isValidSimulationTarget(another)).toEqual([false, ESimulationTargetRejection.NO_FACTION_RULE]);

    another.faction = communities.dolg;
    squad.faction = communities.monster_predatory_day;

    jest.spyOn(level, "get_time_hours").mockImplementation(() => 7);
    expect(squad.isValidSimulationTarget(another)).toEqual([false, ESimulationTargetRejection.NOT_WANTED]);

    jest.spyOn(level, "get_time_hours").mockImplementation(() => 8);
    expect(squad.isValidSimulationTarget(another)).toEqual([true, null]);

    jest.spyOn(level, "get_time_hours").mockImplementation(() => 18);
    expect(squad.isValidSimulationTarget(another)).toEqual([true, null]);

    jest.spyOn(level, "get_time_hours").mockImplementation(() => 19);
    expect(squad.isValidSimulationTarget(another)).toEqual([false, ESimulationTargetRejection.NOT_WANTED]);
  });

  it("should correctly check if squad is reached", () => {
    const squad: MockSquad = MockSquad.mock();
    const another: MockSquad = MockSquad.mock();
    const stalker: ServerHumanObject = MockAlifeHumanStalker.mock();

    expect(squad.isReachedBySimulationObject(another)).toBe(true);

    squad.mockAddMember(stalker);

    expect(squad.isReachedBySimulationObject(another)).toBe(false);

    squad.mockRemoveMember(stalker);

    expect(squad.isReachedBySimulationObject(another)).toBe(true);
  });

  it("should correctly get simulation task", () => {
    const squad: MockSquad = MockSquad.mock();
    const task: CALifeSmartTerrainTask = squad.getSimulationTask();

    expect(task.level_vertex_id()).toBe(squad.m_level_vertex_id);
    expect(task.game_vertex_id()).toBe(squad.m_game_vertex_id);
  });

  it("should correctly handle simulation target selection", () => {
    const squad: MockSquad = MockSquad.mock();
    const another: MockSquad = MockSquad.mock();

    const first: ServerHumanObject = MockAlifeHumanStalker.mock();
    const second: ServerHumanObject = MockAlifeHumanStalker.mock();

    another.mockAddMember(first);
    another.mockAddMember(second);

    registerOfflineObject(first.id, { levelVertexId: 10, activeSection: "test_section" });
    registerOfflineObject(second.id, { levelVertexId: 11, activeSection: "test_section" });

    jest.spyOn(another, "setLocationTypes").mockImplementation(jest.fn());
    jest.spyOn(another, "assignToTerrain").mockImplementation(jest.fn());

    squad.onSimulationTargetSelected(another);

    expect(another.setLocationTypes).toHaveBeenCalledTimes(1);
    expect(another.assignToTerrain).toHaveBeenCalledWith(null);

    expect(table.size(registry.offlineObjects)).toBe(2);
    expect(registry.offlineObjects.get(first.id)).toEqual({
      levelVertexId: null,
      activeSection: null,
    });
    expect(registry.offlineObjects.get(second.id)).toEqual({
      levelVertexId: null,
      activeSection: null,
    });
  });

  it("should correctly handle simulation target deselection", () => {
    const squad: MockSquad = MockSquad.mock();
    const another: MockSquad = MockSquad.mock();

    expect(() => squad.onSimulationTargetDeselected(another)).not.toThrow();
  });

  it("should throttle the squad-target-outranks-terrain rescan with per-squad stagger", () => {
    mockRegisteredActor();
    registerSimulator();

    const terrain: SmartTerrain = MockSmartTerrain.mockRegistered();
    const squad: Squad = MockSquad.mockRegistered();
    const enemy: Squad = MockSquad.mockRegistered();

    // Enemy squad is a valid, positive-priority squad target on the same level.
    jest.spyOn(enemy, "isValidSimulationTarget").mockImplementation(() => $multi(true, null));
    squad.behaviour.set("a", "1");
    enemy.simulationProperties = $fromObject<TName, TRate>({ a: 10 });
    registry.simulationObjects.set(enemy.id, enemy);

    // Keep the action-update branch inert and selection side effects out of scope.
    jest.spyOn(squad, "selectNewAction").mockImplementation(jest.fn());
    jest.spyOn(squad, "isAssignedTargetAvailable").mockImplementation(() => true);
    squad.currentAction = { update: () => false, finalize: jest.fn() } as unknown as ISquadAction;

    replaceFunctionMock(time_global, () => 1_000);

    // First tick rescans and switches to the outranking squad target.
    squad.assignedTargetId = terrain.id;
    squad.updateCurrentGenericAction();

    expect(squad.assignedTargetId).toBe(enemy.id);
    expect(squad.nextTargetOutrankCheckAt).toBe(
      1_000 + simulationConfig.SQUAD_TARGET_OUTRANK_RECHECK_INTERVAL + (squad.id % 500)
    );

    // Within the throttle window the rescan is skipped.
    squad.assignedTargetId = terrain.id;
    squad.currentAction = { update: () => false, finalize: jest.fn() } as unknown as ISquadAction;
    squad.updateCurrentGenericAction();

    expect(squad.assignedTargetId).toBe(terrain.id);

    // After the interval passes the rescan resumes.
    replaceFunctionMock(time_global, () => 60_000);

    squad.currentAction = { update: () => false, finalize: jest.fn() } as unknown as ISquadAction;
    squad.updateCurrentGenericAction();

    expect(squad.assignedTargetId).toBe(enemy.id);
  });
});
