import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { game, time_global } from "xray16";
import { GameObject, ServerCreatureObject, ServerHumanObject, Time } from "xray16/alias";
import { AnyObject, createTime, MAX_ALIFE_ID, TNumberId } from "xray16/lib";
import { MockAlifeHumanStalker, MockCTime, MockGameObject, MockVector } from "xray16/mocks";
import { replaceFunctionMock } from "xray16/testing/utils";

import { communities } from "@/engine/constants/communities";
import { getManager, registerObject, registerSimulator, registry } from "@/engine/core/database";
import { forgeConfig } from "@/engine/core/database/forge_config";
import { EGameEvent, EventsManager } from "@/engine/core/managers/events";
import { updateTerrainMapSpot } from "@/engine/core/managers/map/utils";
import { simulationActivities } from "@/engine/core/managers/simulation/activity/simulation_activities";
import { ESimulationTerrainRole } from "@/engine/core/managers/simulation/types";
import { IObjectJobState, SmartTerrain } from "@/engine/core/objects/smart_terrain";
import { createObjectJobDescriptor, updateTerrainJobs } from "@/engine/core/objects/smart_terrain/job";
import { smartTerrainConfig } from "@/engine/core/objects/smart_terrain/SmartTerrainConfig";
import {
  canRespawnSmartTerrainSquad,
  respawnSmartTerrainSquad,
} from "@/engine/core/objects/smart_terrain/spawn/smart_terrain_spawn";
import { Squad } from "@/engine/core/objects/squad";
import { initializeObjectSchemeLogic } from "@/engine/core/schemes/runtime";
import { ESchemeType } from "@/engine/core/schemes/types";
import { turnOffSmartTerrainCampfires, turnOnTerrainCampfires } from "@/engine/core/utils/smart_terrain";
import { mockRegisteredActor, MockSmartTerrain, MockSquad, resetRegistry } from "@/fixtures/engine";

jest.mock("@/engine/core/managers/map/utils", () => ({
  ...jest.requireActual<AnyObject>("@/engine/core/managers/map/utils"),
  updateTerrainMapSpot: jest.fn(),
}));

jest.mock("@/engine/core/objects/smart_terrain/spawn/smart_terrain_spawn", () => ({
  ...jest.requireActual<AnyObject>("@/engine/core/objects/smart_terrain/spawn/smart_terrain_spawn"),
  canRespawnSmartTerrainSquad: jest.fn(() => false),
  respawnSmartTerrainSquad: jest.fn(),
}));

jest.mock("@/engine/core/utils/smart_terrain", () => ({
  ...jest.requireActual<AnyObject>("@/engine/core/utils/smart_terrain"),
  turnOffSmartTerrainCampfires: jest.fn(),
  turnOnTerrainCampfires: jest.fn(),
  updateTerrainAlarmStatus: jest.fn(),
}));

jest.mock("@/engine/core/objects/smart_terrain/job", () => ({
  ...jest.requireActual<AnyObject>("@/engine/core/objects/smart_terrain/job"),
  updateTerrainJobs: jest.fn(() => false),
}));

jest.mock("@/engine/core/schemes/runtime", () => ({
  ...jest.requireActual<AnyObject>("@/engine/core/schemes/runtime"),
  initializeObjectSchemeLogic: jest.fn(),
}));

describe("SmartTerrain update cycle", () => {
  beforeEach(() => {
    resetRegistry();
    registerSimulator();
    mockRegisteredActor();

    replaceFunctionMock(time_global, () => 10_000);
    replaceFunctionMock(canRespawnSmartTerrainSquad, () => false);
    replaceFunctionMock(updateTerrainJobs, () => false);
    replaceFunctionMock(game.get_game_time, () => MockCTime.mock(2012, 6, 12, 20, 15, 30, 200));
  });

  it("should track the nearest terrain and emit an event when it changes", () => {
    const eventsManager: EventsManager = getManager(EventsManager);
    const terrain: SmartTerrain = MockSmartTerrain.mockRegistered();
    const onNearestChanged = jest.fn();

    eventsManager.registerCallback(EGameEvent.SMART_TERRAIN_NEAREST_CHANGED, onNearestChanged);

    registry.actorServer.position = MockVector.mock(0, 0, 0);
    terrain.position = MockVector.mock(0, 0, 0);

    registry.smartTerrainNearest.id = null;
    registry.smartTerrainNearest.distanceSqr = Infinity;

    terrain.update();

    expect(registry.smartTerrainNearest.id).toBe(terrain.id);
    expect(onNearestChanged).toHaveBeenCalledWith(terrain, registry.smartTerrainNearest.distanceSqr);
  });

  it("should refresh the distance of the already nearest terrain without re-emitting", () => {
    const eventsManager: EventsManager = getManager(EventsManager);
    const terrain: SmartTerrain = MockSmartTerrain.mockRegistered();
    const onNearestChanged = jest.fn();

    eventsManager.registerCallback(EGameEvent.SMART_TERRAIN_NEAREST_CHANGED, onNearestChanged);

    registry.actorServer.position = MockVector.mock(0, 0, 0);
    terrain.position = MockVector.mock(0, 0, 0);

    jest.spyOn(terrain.position, "distance_to_sqr").mockImplementation(() => 42);

    registry.smartTerrainNearest.id = terrain.id;
    registry.smartTerrainNearest.distanceSqr = 500;

    terrain.update();

    expect(registry.smartTerrainNearest.distanceSqr).toBe(42);
    expect(onNearestChanged).toHaveBeenCalledTimes(0);
  });

  it("should update the map spot when debug simulation display is enabled", () => {
    const terrain: SmartTerrain = MockSmartTerrain.mockRegistered();
    const isSimulationEnabled: boolean = forgeConfig.DEBUG.IS_SIMULATION_ENABLED;

    forgeConfig.DEBUG.IS_SIMULATION_ENABLED = true;
    (updateTerrainMapSpot as jest.Mock).mockClear();

    try {
      terrain.update();

      expect(updateTerrainMapSpot).toHaveBeenCalledWith(terrain);
    } finally {
      forgeConfig.DEBUG.IS_SIMULATION_ENABLED = isSimulationEnabled;
    }
  });

  it("should respawn squads when respawn conditions are met", () => {
    const terrain: SmartTerrain = MockSmartTerrain.mockRegistered();

    replaceFunctionMock(canRespawnSmartTerrainSquad, () => true);

    terrain.nextCheckAt = -1;
    terrain.update();

    expect(canRespawnSmartTerrainSquad).toHaveBeenCalledWith(terrain, expect.anything());
    expect(respawnSmartTerrainSquad).toHaveBeenCalledWith(terrain);
  });

  it("should check squad respawn only on the throttled part of the update", () => {
    const terrain: SmartTerrain = MockSmartTerrain.mockRegistered();

    replaceFunctionMock(canRespawnSmartTerrainSquad, () => true);

    terrain.nextCheckAt = 20_000;
    terrain.update();

    expect(canRespawnSmartTerrainSquad).not.toHaveBeenCalled();
    expect(respawnSmartTerrainSquad).not.toHaveBeenCalled();
  });

  it("should skip the throttled part of the update until the check timestamp is reached", () => {
    const terrain: SmartTerrain = MockSmartTerrain.mockRegistered();

    terrain.nextCheckAt = 20_000;

    terrain.update();

    expect(updateTerrainJobs).toHaveBeenCalledTimes(0);
    expect(turnOnTerrainCampfires).toHaveBeenCalledTimes(0);
  });

  it("should turn campfires on and off following the working objects", () => {
    const terrain: SmartTerrain = MockSmartTerrain.mockRegistered();
    const object: ServerHumanObject = MockAlifeHumanStalker.mock();
    const descriptor: IObjectJobState = createObjectJobDescriptor(object);

    descriptor.job = { section: "logic@test" } as never;
    terrain.objectJobDescriptors.set(object.id, descriptor);

    terrain.nextCheckAt = -1;
    terrain.areCampfiresOn = false;

    terrain.update();

    expect(turnOnTerrainCampfires).toHaveBeenCalledWith(terrain);

    terrain.areCampfiresOn = true;
    terrain.objectJobDescriptors = new LuaTable();
    terrain.nextCheckAt = -1;

    terrain.update();

    expect(turnOffSmartTerrainCampfires).toHaveBeenCalledWith(terrain);
  });

  it("should scale the next check delay with the distance to the actor", () => {
    const terrain: SmartTerrain = MockSmartTerrain.mockRegistered();

    terrain.nextCheckAt = -1;
    terrain.position = MockVector.mock(0, 0, 0);

    jest.spyOn(registry.actor, "position").mockImplementation(() => MockVector.mock(0, 0, 0));

    terrain.update();

    // Minimal idle time is applied for a co-located actor.
    expect(terrain.nextCheckAt).toBe(10_060);
  });

  it("should fall back to a short delay when the actor is not spawned yet", () => {
    const terrain: SmartTerrain = MockSmartTerrain.mockRegistered();

    terrain.nextCheckAt = -1;
    registry.actor = null as never;

    terrain.update();

    expect(terrain.nextCheckAt).toBe(10_010);
  });

  it("should drop expired job dead times", () => {
    const terrain: SmartTerrain = MockSmartTerrain.mockRegistered();
    const fresh: Time = createTime(2012, 6, 12, 20, 15, 30, 200);
    const expired: Time = createTime(2012, 6, 12, 10, 15, 30, 200);
    const now: Time = createTime(2012, 6, 12, 20, 15, 30, 200);

    terrain.nextCheckAt = -1;
    terrain.jobDeadTimeById.set(1, fresh);
    terrain.jobDeadTimeById.set(2, expired);

    // The elapsed time is measured on the current game time, against each stored death timestamp.
    jest
      .spyOn(now, "diffSec")
      .mockImplementation((time) => (time === expired ? smartTerrainConfig.DEATH_IDLE_TIME + 1 : 0));

    replaceFunctionMock(game.get_game_time, () => now);

    terrain.update();

    expect(terrain.jobDeadTimeById.has(1)).toBe(true);
    expect(terrain.jobDeadTimeById.has(2)).toBe(false);
  });

  it("should schedule the next jobs update only when jobs were re-evaluated", () => {
    const terrain: SmartTerrain = MockSmartTerrain.mockRegistered();

    terrain.nextCheckAt = -1;
    terrain.nextJobsUpdateAt = -1;

    replaceFunctionMock(updateTerrainJobs, () => false);
    terrain.update();

    expect(terrain.nextJobsUpdateAt).toBe(-1);

    terrain.nextCheckAt = -1;
    replaceFunctionMock(updateTerrainJobs, () => true);
    terrain.update();

    expect(terrain.nextJobsUpdateAt).toBe(10_000 + smartTerrainConfig.JOBS_UPDATE_INTERVAL);
  });

  it("should update terrain control when it is configured", () => {
    const terrain: SmartTerrain = MockSmartTerrain.mockRegistered();

    terrain.nextCheckAt = -1;

    const terrainControl = { update: jest.fn() };

    terrain.terrainControl = terrainControl as never;

    terrain.update();

    expect(terrainControl.update).toHaveBeenCalledTimes(1);
  });
});

describe("SmartTerrain load-time object relinking", () => {
  beforeEach(() => {
    resetRegistry();
    registerSimulator();
    mockRegisteredActor();
  });

  it("should relink arriving objects and drop the missing ones", () => {
    const terrain: SmartTerrain = MockSmartTerrain.mockRegistered();
    const object: ServerCreatureObject = MockAlifeHumanStalker.mock();
    const missingId: TNumberId = MAX_ALIFE_ID - 1;

    terrain.arrivingObjects.set(object.id, false as unknown as ServerCreatureObject);
    terrain.arrivingObjects.set(missingId, false as unknown as ServerCreatureObject);

    terrain.initializeObjectsAfterLoad();

    expect(terrain.arrivingObjects.get(object.id)).toBe(object);
    expect(terrain.arrivingObjects.has(missingId)).toBe(false);
  });

  it("should rebuild job descriptors and re-attach known jobs", () => {
    const terrain: SmartTerrain = MockSmartTerrain.mockRegistered();
    const object: ServerHumanObject = MockAlifeHumanStalker.mock();

    terrain.objectJobDescriptors.set(object.id, {
      jobPriority: 15,
      jobId: 1,
      isBegun: true,
      desiredJob: "logic@test_desired",
    } as IObjectJobState);

    terrain.jobs.set(1, { section: "logic@test_job" } as never);

    terrain.initializeObjectsAfterLoad();

    const descriptor: IObjectJobState = terrain.objectJobDescriptors.get(object.id);

    expect(descriptor.jobPriority).toBe(15);
    expect(descriptor.jobId).toBe(1);
    expect(descriptor.isBegun).toBe(true);
    expect(descriptor.desiredJob).toBe("logic@test_desired");
    expect(descriptor.job).toBe(terrain.jobs.get(1));
    expect(terrain.jobs.get(1).objectId).toBe(object.id);
    expect(terrain.objectByJobSection.get("logic@test_job")).toBe(object.id);
  });

  it("should discard job descriptors of objects that no longer exist", () => {
    const terrain: SmartTerrain = MockSmartTerrain.mockRegistered();
    const missingId: TNumberId = MAX_ALIFE_ID - 1;

    terrain.objectJobDescriptors.set(missingId, { jobId: 1, jobPriority: 5 } as IObjectJobState);

    terrain.initializeObjectsAfterLoad();

    expect(terrain.objectJobDescriptors.has(missingId)).toBe(false);
  });

  it("should leave descriptors without a matching job unlinked", () => {
    const terrain: SmartTerrain = MockSmartTerrain.mockRegistered();
    const object: ServerHumanObject = MockAlifeHumanStalker.mock();

    terrain.objectJobDescriptors.set(object.id, {
      jobPriority: 10,
      jobId: 404,
      isBegun: false,
      desiredJob: "nil",
    } as IObjectJobState);

    terrain.initializeObjectsAfterLoad();

    expect(terrain.objectJobDescriptors.get(object.id).job).toBeNull();
    expect(terrain.objectByJobSection.length()).toBe(0);
  });
});

describe("SmartTerrain object registration", () => {
  beforeEach(() => {
    resetRegistry();
    registerSimulator();
    mockRegisteredActor();
  });

  it("unregister_npc should unlink the assigned job and reset object logic", () => {
    const terrain: SmartTerrain = MockSmartTerrain.mockRegistered();
    const object: ServerHumanObject = MockAlifeHumanStalker.mock();
    const gameObject: GameObject = MockGameObject.mock({ id: object.id });

    registerObject(gameObject);

    terrain.stayingObjectsCount = 3;
    terrain.objectJobDescriptors.set(object.id, createObjectJobDescriptor(object));

    terrain.unregister_npc(object);

    expect(terrain.stayingObjectsCount).toBe(2);
    expect(terrain.objectJobDescriptors.has(object.id)).toBe(false);
    expect(object.clear_smart_terrain).toHaveBeenCalledTimes(1);
    expect(initializeObjectSchemeLogic).toHaveBeenCalledWith(
      gameObject,
      registry.objects.get(object.id),
      false,
      ESchemeType.STALKER
    );
  });

  it("unregister_npc should drop objects that were still arriving", () => {
    const terrain: SmartTerrain = MockSmartTerrain.mockRegistered();
    const object: ServerHumanObject = MockAlifeHumanStalker.mock();

    terrain.stayingObjectsCount = 1;
    terrain.arrivingObjects.set(object.id, object);

    terrain.unregister_npc(object);

    expect(terrain.stayingObjectsCount).toBe(0);
    expect(terrain.arrivingObjects.has(object.id)).toBe(false);
    expect(object.clear_smart_terrain).toHaveBeenCalledTimes(1);
  });

  it("unregister_npc should abort for objects it does not know about", () => {
    const terrain: SmartTerrain = MockSmartTerrain.mockRegistered();
    const object: ServerHumanObject = MockAlifeHumanStalker.mock();

    expect(() => terrain.unregister_npc(object)).toThrow("this.npc_info[obj.id] = null");
  });

  it("task should return the terrain task while the object is arriving", () => {
    const terrain: SmartTerrain = MockSmartTerrain.mockRegistered();
    const object: ServerHumanObject = MockAlifeHumanStalker.mock();

    terrain.arrivingObjects.set(object.id, object);

    expect(terrain.task(object)).toBe(terrain.smartTerrainAlifeTask);
  });

  it("task should return the assigned job task once the object arrived", () => {
    const terrain: SmartTerrain = MockSmartTerrain.mockRegistered();
    const object: ServerHumanObject = MockAlifeHumanStalker.mock();
    const descriptor: IObjectJobState = createObjectJobDescriptor(object);
    const alifeTask: unknown = { id: "job-task" };

    descriptor.job = { alifeTask } as never;
    terrain.objectJobDescriptors.set(object.id, descriptor);

    expect(terrain.task(object)).toBe(alifeTask);
  });

  it("task should be null when the arrived object has no job", () => {
    const terrain: SmartTerrain = MockSmartTerrain.mockRegistered();
    const object: ServerHumanObject = MockAlifeHumanStalker.mock();

    terrain.objectJobDescriptors.set(object.id, createObjectJobDescriptor(object));

    expect(terrain.task(object)).toBeUndefined();
  });
});

describe("SmartTerrain simulation targeting", () => {
  beforeEach(() => {
    resetRegistry();
    registerSimulator();
    mockRegisteredActor();
  });

  it("should never be a target for respawn-only terrains", () => {
    const terrain: SmartTerrain = MockSmartTerrain.mockRegistered();
    const squad: Squad = MockSquad.mockRegistered();

    terrain.isRespawnOnlySmart = true;

    expect(terrain.isValidSimulationTarget(squad)).toBe(false);
  });

  it("should reject squads once the population limit is reached", () => {
    const terrain: SmartTerrain = MockSmartTerrain.mockRegistered();
    const squad: Squad = MockSquad.mockRegistered();

    terrain.maxStayingSquadsCount = 0;

    expect(terrain.isValidSimulationTarget(squad)).toBe(false);

    // Population decrease is estimated for the squad that is leaving the terrain.
    terrain.maxStayingSquadsCount = -1;

    expect(terrain.isValidSimulationTarget(squad, true)).toBe(false);
  });

  it("should reject factions without simulation activity descriptors", () => {
    const terrain: SmartTerrain = MockSmartTerrain.mockRegistered();
    const squad: Squad = MockSquad.mockRegistered();

    terrain.maxStayingSquadsCount = 10;
    squad.faction = "unknown_faction" as never;

    expect(terrain.isValidSimulationTarget(squad)).toBe(false);
  });

  it("should accept a squad matching one of the terrain simulation roles", () => {
    const terrain: SmartTerrain = MockSmartTerrain.mockRegistered();
    const squad: Squad = MockSquad.mockRegistered();

    terrain.maxStayingSquadsCount = 10;
    squad.faction = communities.stalker;

    const descriptor: AnyObject = simulationActivities.get(communities.stalker) as unknown as AnyObject;

    expect(descriptor.smart).toBeDefined();

    // No role is set on the terrain, so none of the role checks can pass.
    terrain.simulationProperties = new LuaTable();
    expect(terrain.isValidSimulationTarget(squad)).toBe(false);

    for (const role of [
      ESimulationTerrainRole.RESOURCE,
      ESimulationTerrainRole.BASE,
      ESimulationTerrainRole.LAIR,
      ESimulationTerrainRole.TERRITORY,
      ESimulationTerrainRole.SURGE,
    ]) {
      terrain.simulationProperties = new LuaTable();
      terrain.simulationProperties.set(role, 1);

      const check: unknown = descriptor.smart[role];

      // Only roles the stalker faction actually declares can resolve to a positive check.
      expect(terrain.isValidSimulationTarget(squad)).toBe(
        typeof check === "function" && (check as (a: Squad, b: SmartTerrain) => boolean)(squad, terrain)
      );
    }
  });

  it("should treat always-arrived squads as reached", () => {
    const terrain: SmartTerrain = MockSmartTerrain.mockRegistered();
    const squad: Squad = MockSquad.mockRegistered();

    squad.isAlwaysArrived = true;

    expect(terrain.isReachedBySimulationObject(squad)).toBe(true);
  });

  it("should compare the squad distance against the arrival distance", () => {
    const terrain: SmartTerrain = MockSmartTerrain.mockRegistered();
    const squad: Squad = MockSquad.mockRegistered();

    terrain.arrivalDistance = 10;
    terrain.position = MockVector.mock(0, 0, 0);
    squad.position = MockVector.mock(0, 0, 0);

    jest.spyOn(squad.position, "distance_to_sqr").mockImplementation(() => 25);

    expect(terrain.isReachedBySimulationObject(squad)).toBe(true);

    jest.spyOn(squad.position, "distance_to_sqr").mockImplementation(() => 1_000);

    expect(terrain.isReachedBySimulationObject(squad)).toBe(false);
  });

  it("should reject squads from another level", () => {
    const terrain: SmartTerrain = MockSmartTerrain.mockRegistered();
    const squad: MockSquad = MockSquad.createRegistered();

    squad.mockSetGameVertexId(terrain.m_game_vertex_id + 5_000);

    // Level ids are resolved through the game graph and memoized per vertex.
    registry.cache.gameVertexLevelIds.set(terrain.m_game_vertex_id, 1);
    registry.cache.gameVertexLevelIds.set(squad.m_game_vertex_id, 2);

    expect(terrain.isReachedBySimulationObject(squad)).toBe(false);
  });

  it("should expose its cached alife task", () => {
    const terrain: SmartTerrain = MockSmartTerrain.mockRegistered();

    expect(terrain.getSimulationTask()).toBe(terrain.smartTerrainAlifeTask);
  });
});
