import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { clsid, patrol } from "xray16";
import { GameObject, Patrol, ServerCreatureObject } from "xray16/alias";
import { TNumberId } from "xray16/lib";
import { $fromArray } from "xray16/macros";
import { MockAlifeHumanStalker, MockAlifeSimulator, MockGameObject, MockIniFile } from "xray16/mocks";
import { resetFunctionMock } from "xray16/testing/utils";

import { communities } from "@/engine/constants/communities";
import { getManager, registerObject, registerSimulator, registry, SYSTEM_INI } from "@/engine/core/database";
import { EGameEvent, EventsManager } from "@/engine/core/managers/events";
import { updateSquadMapSpot } from "@/engine/core/managers/map/utils";
import { simulationConfig } from "@/engine/core/managers/simulation/SimulationConfig";
import { getSimulationSquads } from "@/engine/core/managers/simulation/utils/simulation_data";
import { destroySimulationData } from "@/engine/core/managers/simulation/utils/simulation_initialization";
import {
  assignSimulationSquadToTerrain,
  createSimulationSquad,
  createSimulationSquadMembers,
  registerSimulationSquad,
  releaseSimulationSquad,
  setupSimulationObjectSquadAndGroup,
  unRegisterSimulationSquad,
} from "@/engine/core/managers/simulation/utils/simulation_squads";
import { registerSimulationTerrain } from "@/engine/core/managers/simulation/utils/simulation_terrains";
import { SmartTerrain } from "@/engine/core/objects/smart_terrain";
import { Squad } from "@/engine/core/objects/squad";
import { mockRegisteredActor, MockSmartTerrain, MockSquad, resetRegistry } from "@/fixtures/engine";

jest.mock("@/engine/core/managers/map/utils/map_spot_squad");

describe("registerSimulationSquad / unRegisterSimulationSquad", () => {
  beforeEach(() => {
    resetRegistry();
    registerSimulator();
    destroySimulationData();
  });

  it("should correctly register and unregister squads", () => {
    mockRegisteredActor();

    expect(getSimulationSquads().length()).toBe(0);

    const first: Squad = MockSquad.mockRegistered();
    const second: Squad = MockSquad.mockRegistered();
    const squads: LuaTable<TNumberId, Squad> = getSimulationSquads();

    expect(squads.length()).toBe(2);
    expect(squads.get(first.id)).toBe(first);
    expect(squads.get(second.id)).toBe(second);

    unRegisterSimulationSquad(first);

    expect(squads.length()).toBe(1);
    expect(squads.get(second.id)).toBe(second);

    unRegisterSimulationSquad(second);

    expect(squads.length()).toBe(0);

    registerSimulationSquad(first);

    expect(squads.length()).toBe(1);
    expect(squads.get(first.id)).toBe(first);
  });

  it("should remove queued assignments when a squad is reassigned or unregistered", () => {
    const first: Squad = MockSquad.mock();
    const second: Squad = MockSquad.mock();

    assignSimulationSquadToTerrain(first, 100);
    assignSimulationSquadToTerrain(first, 200);
    simulationConfig.TEMPORARY_ASSIGNED_SQUADS.set(300, $fromArray([first, second]));

    expect(simulationConfig.TEMPORARY_ASSIGNED_SQUADS).toEqualLuaTables({
      200: [first],
      300: [first, second],
    });

    unRegisterSimulationSquad(first);

    expect(simulationConfig.TEMPORARY_ASSIGNED_SQUADS).toEqualLuaTables({
      300: [second],
    });

    assignSimulationSquadToTerrain(second, null);

    expect(simulationConfig.TEMPORARY_ASSIGNED_SQUADS).toEqualLuaTables({});
  });
});

describe("createSimulationSquad", () => {
  beforeEach(() => {
    resetRegistry();
    registerSimulator();
    destroySimulationData();
    mockRegisteredActor();
    resetFunctionMock(updateSquadMapSpot);
  });

  it("should correctly create squads for terrains", () => {
    const terrain: SmartTerrain = MockSmartTerrain.mock();

    registerSimulationTerrain(terrain);
    (SYSTEM_INI as unknown as MockIniFile).data["test_spawn_squad"] = {
      faction: communities.stalker,
      npc: "test_stalker",
    };

    const squad: MockSquad = MockSquad.mock({ section: "test_spawn_squad" });

    jest.spyOn(registry.simulator, "create").mockImplementation(() => squad);
    jest.spyOn(squad, "addMember").mockImplementation(jest.fn(() => null as unknown as ServerCreatureObject));

    expect(createSimulationSquad(terrain, "test_spawn_squad")).toBe(squad);
    expect(registry.simulator.create).toHaveBeenCalledWith(
      "test_spawn_squad",
      terrain.position,
      terrain.m_level_vertex_id,
      terrain.m_game_vertex_id
    );
    expect(squad.addMember).toHaveBeenCalledWith(
      "test_stalker",
      terrain.position,
      terrain.m_level_vertex_id,
      terrain.m_game_vertex_id
    );
    expect(squad.assignedTerrainId).toBe(terrain.id);
    expect(simulationConfig.TERRAIN_DESCRIPTORS.get(terrain.id).assignedSquads.get(squad.id)).toBe(squad);
  });
});

describe("createSimulationSquadMembers", () => {
  beforeEach(() => {
    resetRegistry();
    registerSimulator();
    mockRegisteredActor();
    resetFunctionMock(updateSquadMapSpot);
  });

  it("should correctly fail when have no squad members sections exist", () => {
    (SYSTEM_INI as unknown as MockIniFile).data["test_squad_without_members"] = {
      faction: communities.stalker,
    };

    const squad: MockSquad = MockSquad.mock({ section: "test_squad_without_members" });
    const terrain: MockSmartTerrain = MockSmartTerrain.mock();

    expect(() => createSimulationSquadMembers(squad, terrain)).toThrow(
      "Unexpected attempt to spawn an empty squad 'test_squad_without_members'."
    );
  });

  it("should correctly spawn with few member options and smart terrain target", () => {
    (SYSTEM_INI as unknown as MockIniFile).data["test_squad_without_members"] = {
      faction: communities.stalker,
      npc: "variantA, variantB",
    };

    const squad: MockSquad = MockSquad.mock({ section: "test_squad_without_members" });
    const terrain: MockSmartTerrain = MockSmartTerrain.mock();

    jest.spyOn(squad, "addMember").mockImplementation(jest.fn(() => null as unknown as ServerCreatureObject));

    createSimulationSquadMembers(squad, terrain);

    expect(squad.assignedTerrainId).toBe(terrain.id);
    expect(updateSquadMapSpot).toHaveBeenCalledWith(squad);
    expect(squad.addMember).toHaveBeenCalledTimes(2);
    expect(squad.addMember).toHaveBeenCalledWith(
      "variantA",
      terrain.position,
      terrain.m_level_vertex_id,
      terrain.m_game_vertex_id
    );
    expect(squad.addMember).toHaveBeenCalledWith(
      "variantB",
      terrain.position,
      terrain.m_level_vertex_id,
      terrain.m_game_vertex_id
    );
  });

  it("should correctly spawn with custom respawn point name", () => {
    (SYSTEM_INI as unknown as MockIniFile).data["test_squad_without_members"] = {
      faction: communities.stalker,
      npc: "variantA, variantB",
      spawn_point: "",
    };

    const squad: MockSquad = MockSquad.mock({ section: "test_squad_without_members" });
    const terrain: MockSmartTerrain = MockSmartTerrain.mock();

    terrain.spawnPointName = "test-wp";

    const spawnPatrol: Patrol = new patrol("test-wp");

    jest.spyOn(squad, "addMember").mockImplementation(jest.fn(() => null as unknown as ServerCreatureObject));

    createSimulationSquadMembers(squad, terrain);

    expect(squad.assignedTerrainId).toBe(terrain.id);
    expect(updateSquadMapSpot).toHaveBeenCalledWith(squad);
    expect(squad.addMember).toHaveBeenCalledTimes(2);
    expect(squad.addMember).toHaveBeenCalledWith(
      "variantA",
      spawnPatrol.point(0),
      spawnPatrol.level_vertex_id(0),
      spawnPatrol.game_vertex_id(0)
    );
    expect(squad.addMember).toHaveBeenCalledWith(
      "variantB",
      spawnPatrol.point(0),
      spawnPatrol.level_vertex_id(0),
      spawnPatrol.game_vertex_id(0)
    );
  });

  it("should correctly spawn with custom ini spawn point name", () => {
    (SYSTEM_INI as unknown as MockIniFile).data["test_squad_without_members"] = {
      faction: communities.stalker,
      npc: "variantA, variantB",
      spawn_point: "test-wp",
    };

    const squad: MockSquad = MockSquad.mock({ section: "test_squad_without_members" });
    const terrain: MockSmartTerrain = MockSmartTerrain.mock();

    const spawnPatrol: Patrol = new patrol("test-wp");

    jest.spyOn(squad, "addMember").mockImplementation(jest.fn(() => null as unknown as ServerCreatureObject));

    createSimulationSquadMembers(squad, terrain);

    expect(squad.assignedTerrainId).toBe(terrain.id);
    expect(updateSquadMapSpot).toHaveBeenCalledWith(squad);
    expect(squad.addMember).toHaveBeenCalledTimes(2);
    expect(squad.addMember).toHaveBeenCalledWith(
      "variantA",
      spawnPatrol.point(0),
      spawnPatrol.level_vertex_id(0),
      spawnPatrol.game_vertex_id(0)
    );
    expect(squad.addMember).toHaveBeenCalledWith(
      "variantB",
      spawnPatrol.point(0),
      spawnPatrol.level_vertex_id(0),
      spawnPatrol.game_vertex_id(0)
    );
  });

  it("should correctly spawn with random spawn config", () => {
    (SYSTEM_INI as unknown as MockIniFile).data["test_squad_without_members"] = {
      faction: communities.stalker,
      npc: "variantA, variantB",
      npc_random: "variantC, variantD",
      npc_in_squad: "1, 1",
    };

    const squad: MockSquad = MockSquad.mock({ section: "test_squad_without_members" });
    const terrain: MockSmartTerrain = MockSmartTerrain.mock();

    jest.spyOn(squad, "addMember").mockImplementation(jest.fn(() => null as unknown as ServerCreatureObject));

    createSimulationSquadMembers(squad, terrain);

    expect(squad.assignedTerrainId).toBe(terrain.id);
    expect(updateSquadMapSpot).toHaveBeenCalledWith(squad);
    expect(squad.addMember).toHaveBeenCalledTimes(3);
    expect(squad.addMember).toHaveBeenCalledWith(
      "variantA",
      terrain.position,
      terrain.m_level_vertex_id,
      terrain.m_game_vertex_id
    );
    expect(squad.addMember).toHaveBeenCalledWith(
      "variantB",
      terrain.position,
      terrain.m_level_vertex_id,
      terrain.m_game_vertex_id
    );
    expect(squad.addMember).toHaveBeenCalledWith(
      expect.stringMatching(/variantC|variantD/),
      terrain.position,
      terrain.m_level_vertex_id,
      terrain.m_game_vertex_id
    );
  });

  it("should fail if min > max for random sapwn", () => {
    (SYSTEM_INI as unknown as MockIniFile).data["test_squad_without_members"] = {
      faction: communities.stalker,
      npc: "variantA, variantB",
      npc_random: "variantC, variantD",
      npc_in_squad: "2, 1",
    };

    const squad: MockSquad = MockSquad.mock({ section: "test_squad_without_members" });
    const terrain: MockSmartTerrain = MockSmartTerrain.mock();

    jest.spyOn(squad, "addMember").mockImplementation(jest.fn(() => null as unknown as ServerCreatureObject));

    expect(() => createSimulationSquadMembers(squad, terrain)).toThrow(
      "When spawning squad min count can't be greater then max count in 'test_squad_without_members'."
    );
  });
});

describe("releaseSimulationSquad", () => {
  beforeEach(() => {
    resetRegistry();
    registerSimulator();
    destroySimulationData();
    mockRegisteredActor();
  });

  it("should correctly release squads", () => {
    const terrain: SmartTerrain = MockSmartTerrain.mock();
    const squad: MockSquad = MockSquad.mock();
    const first: ServerCreatureObject = MockAlifeHumanStalker.mock();
    const second: ServerCreatureObject = MockAlifeHumanStalker.mock();

    registerSimulationTerrain(terrain);
    MockAlifeSimulator.addToRegistry(first);
    MockAlifeSimulator.addToRegistry(second);
    squad.mockAddMember(first);
    squad.mockAddMember(second);
    assignSimulationSquadToTerrain(squad, terrain.id);
    jest.spyOn(squad, "onReleased");

    releaseSimulationSquad(squad);

    expect(squad.assignedTerrainId).toBeNull();
    expect(squad.npc_count()).toBe(0);
    expect(registry.simulator.release).toHaveBeenCalledWith(first, true);
    expect(registry.simulator.release).toHaveBeenCalledWith(second, true);
    expect(squad.onReleased).toHaveBeenCalledTimes(1);
  });
});

describe("setupSimulationObjectSquadAndGroup", () => {
  beforeEach(() => {
    resetRegistry();
    registerSimulator();
    destroySimulationData();
    mockRegisteredActor();
  });

  it("should correctly setup objects", () => {
    const terrain: SmartTerrain = MockSmartTerrain.mock();
    const squad: MockSquad = MockSquad.mock();
    const object: ServerCreatureObject = MockAlifeHumanStalker.mock();

    terrain.squadId = 404;
    squad.assignedTerrainId = terrain.id;
    object.group_id = squad.id;
    jest.spyOn(terrain, "clsid").mockImplementation(() => clsid.smart_terrain);
    simulationConfig.GROUP_ID_BY_LEVEL_NAME.set("zaton", 777);
    MockAlifeSimulator.addToRegistry(terrain);
    MockAlifeSimulator.addToRegistry(squad);
    MockAlifeSimulator.addToRegistry(object);

    setupSimulationObjectSquadAndGroup(object);

    expect(object.squad).toBe(404);
    expect(object.group).toBe(777);
  });

  it("should change the team of online objects once with their final squad and group", () => {
    const terrain: SmartTerrain = MockSmartTerrain.mock();
    const squad: MockSquad = MockSquad.mock();
    const object: ServerCreatureObject = MockAlifeHumanStalker.mock();
    const gameObject: GameObject = MockGameObject.mock({ id: object.id });

    registerObject(gameObject);
    terrain.squadId = 404;
    squad.assignedTerrainId = terrain.id;
    object.group_id = squad.id;
    jest.spyOn(terrain, "clsid").mockImplementation(() => clsid.smart_terrain);
    simulationConfig.GROUP_ID_BY_LEVEL_NAME.set("zaton", 777);
    MockAlifeSimulator.addToRegistry(terrain);
    MockAlifeSimulator.addToRegistry(squad);
    MockAlifeSimulator.addToRegistry(object);

    setupSimulationObjectSquadAndGroup(object);

    expect(gameObject.change_team).toHaveBeenCalledTimes(1);
    expect(gameObject.change_team).toHaveBeenCalledWith(object.team, 404, 777);
  });

  it("should set no terrain squad for objects without a squad", () => {
    const object: ServerCreatureObject = MockAlifeHumanStalker.mock();

    object.squad = 404;
    simulationConfig.GROUP_ID_BY_LEVEL_NAME.set("zaton", 777);
    MockAlifeSimulator.addToRegistry(object);

    setupSimulationObjectSquadAndGroup(object);

    expect(object.squad).toBe(0);
    expect(object.group).toBe(777);
  });
});

describe("assignSimulationSquadToTerrain", () => {
  beforeEach(() => {
    resetRegistry();
    registerSimulator();
    destroySimulationData();
    mockRegisteredActor();
  });

  it("should correctly assign terrains for squads", () => {
    const firstTerrain: SmartTerrain = MockSmartTerrain.mock("first_terrain");
    const secondTerrain: SmartTerrain = MockSmartTerrain.mock("second_terrain");
    const squad: MockSquad = MockSquad.mock();

    registerSimulationTerrain(firstTerrain);
    registerSimulationTerrain(secondTerrain);

    assignSimulationSquadToTerrain(squad, firstTerrain.id);

    expect(squad.assignedTerrainId).toBe(firstTerrain.id);
    expect(simulationConfig.TERRAIN_DESCRIPTORS.get(firstTerrain.id).assignedSquads.get(squad.id)).toBe(squad);

    assignSimulationSquadToTerrain(squad, secondTerrain.id);

    expect(simulationConfig.TERRAIN_DESCRIPTORS.get(firstTerrain.id).assignedSquads.has(squad.id)).toBe(false);
    expect(simulationConfig.TERRAIN_DESCRIPTORS.get(secondTerrain.id).assignedSquads.get(squad.id)).toBe(squad);

    assignSimulationSquadToTerrain(squad, null);

    expect(squad.assignedTerrainId).toBeNull();
    expect(simulationConfig.TERRAIN_DESCRIPTORS.get(secondTerrain.id).assignedSquads.has(squad.id)).toBe(false);
  });

  it("should emit each change of the squad's terrain", () => {
    const terrain: SmartTerrain = MockSmartTerrain.mock("first_terrain");
    const squad: MockSquad = MockSquad.mock();
    const onAssigned = jest.fn();

    registerSimulationTerrain(terrain);
    getManager(EventsManager).registerCallback(EGameEvent.SQUAD_TERRAIN_ASSIGNED, onAssigned);

    assignSimulationSquadToTerrain(squad, terrain.id);
    assignSimulationSquadToTerrain(squad, terrain.id);
    assignSimulationSquadToTerrain(squad, null);

    expect(onAssigned).toHaveBeenCalledTimes(2);
    expect(onAssigned).toHaveBeenNthCalledWith(1, squad, terrain.id, null);
    expect(onAssigned).toHaveBeenNthCalledWith(2, squad, null, terrain.id);
  });
});
