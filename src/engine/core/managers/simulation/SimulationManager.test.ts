import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { actor_stats } from "xray16";
import { ACTOR_ID, AnyObject, TName, TNumberId } from "xray16/lib";
import { $fromObject } from "xray16/macros";
import { EMockPacketDataType, MockNetProcessor } from "xray16/mocks";

import { disposeManager, getManager, initializeManager, registerSimulator, registry } from "@/engine/core/database";
import { EGameEvent, EventsManager } from "@/engine/core/managers/events";
import { simulationConfig } from "@/engine/core/managers/simulation/SimulationConfig";
import { SimulationManager } from "@/engine/core/managers/simulation/SimulationManager";
import { ISmartTerrainDescriptor, TSimulationObject } from "@/engine/core/managers/simulation/types";
import { destroySimulationData } from "@/engine/core/managers/simulation/utils";
import { SmartTerrain } from "@/engine/core/objects/smart_terrain";
import { Squad } from "@/engine/core/objects/squad";
import { mockRegisteredActor, MockSmartTerrain, MockSquad, resetRegistry } from "@/fixtures/engine";

describe("SimulationManager", () => {
  beforeEach(() => {
    resetRegistry();
    destroySimulationData();

    registerSimulator();
    mockRegisteredActor();

    simulationConfig.IS_SIMULATION_INITIALIZED = false;
    simulationConfig.SMART_TERRAIN_DIRTY_JOBS_PER_SECOND = 960;
    simulationConfig.SMART_TERRAIN_DIRTY_JOBS_PER_FRAME = 16;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should have correct initial config", () => {
    expect(simulationConfig.VALID_SMART_TERRAINS_SIMULATION_ROLES).toEqualLuaTables({
      base: true,
      default: true,
      lair: true,
      resource: true,
      surge: true,
      territory: true,
    });
  });

  it("should correctly initialize", () => {
    const eventsManager: EventsManager = getManager(EventsManager);

    getManager(SimulationManager);

    expect(eventsManager.getSubscribersCount()).toBe(8);
    expect(eventsManager.getEventSubscribersCount(EGameEvent.DUMP_LUA_DATA)).toBe(1);
    expect(eventsManager.getEventSubscribersCount(EGameEvent.ACTOR_REGISTER)).toBe(1);
    expect(eventsManager.getEventSubscribersCount(EGameEvent.ACTOR_GO_OFFLINE)).toBe(1);
    expect(eventsManager.getEventSubscribersCount(EGameEvent.ACTOR_UPDATE)).toBe(1);
    expect(eventsManager.getEventSubscribersCount(EGameEvent.ACTOR_UPDATE_100)).toBe(1);
    expect(eventsManager.getEventSubscribersCount(EGameEvent.SMART_TERRAIN_REGISTER)).toBe(1);
    expect(eventsManager.getEventSubscribersCount(EGameEvent.SMART_TERRAIN_UNREGISTER)).toBe(1);
    expect(eventsManager.getEventSubscribersCount(EGameEvent.SMART_TERRAIN_JOBS_DIRTY)).toBe(1);

    disposeManager(SimulationManager);

    expect(eventsManager.getSubscribersCount()).toBe(0);
  });

  it("should refresh actor simulation availability on actor update", () => {
    getManager(SimulationManager);

    const actor: TSimulationObject = registry.actorServer as TSimulationObject;
    const isSimulationAvailable = jest.fn(() => true);

    actor.isSimulationAvailable = isSimulationAvailable;
    registry.simulationObjects.delete(actor.id);

    EventsManager.emitEvent(EGameEvent.ACTOR_UPDATE_100);

    expect(isSimulationAvailable).toHaveBeenCalledTimes(1);
    expect(registry.simulationObjects.get(actor.id)).toBe(actor);

    actor.isSimulationAvailable = jest.fn(() => false);

    EventsManager.emitEvent(EGameEvent.ACTOR_UPDATE_100);

    expect(registry.simulationObjects.has(actor.id)).toBe(false);
  });

  it("should correctly destroy values", () => {
    getManager(SimulationManager);

    simulationConfig.IS_SIMULATION_INITIALIZED = true;
    simulationConfig.TERRAINS = $fromObject<TName, SmartTerrain>({ a: MockSmartTerrain.mock() });
    simulationConfig.TERRAIN_DESCRIPTORS = $fromObject<TNumberId, ISmartTerrainDescriptor>({
      1: { terrain: MockSmartTerrain.mock(), assignedSquads: new LuaTable() },
    });
    simulationConfig.SQUADS = $fromObject<TNumberId, Squad>({ 1: MockSquad.mock() });

    disposeManager(SimulationManager);

    expect(simulationConfig.IS_SIMULATION_INITIALIZED).toBe(false);
    expect(simulationConfig.SQUADS).toEqualLuaTables({});
    expect(simulationConfig.TEMPORARY_ASSIGNED_SQUADS).toEqualLuaTables({});
    expect(simulationConfig.TERRAIN_DESCRIPTORS).toEqualLuaTables({});
    expect(simulationConfig.TERRAINS).toEqualLuaTables({});
  });

  it("should correctly initialize default simulation squads on actor register", () => {
    expect(simulationConfig.IS_SIMULATION_INITIALIZED).toBe(false);

    initializeManager(SimulationManager);

    MockSmartTerrain.mockRegistered("pri_a16");
    MockSmartTerrain.mockRegistered("zat_stalker_base_smart");
    MockSmartTerrain.mockRegistered("jup_b41");

    EventsManager.emitEvent(EGameEvent.ACTOR_REGISTER);

    expect(simulationConfig.IS_SIMULATION_INITIALIZED).toBe(true);
  });

  it("should correctly handle actor destroy", () => {
    getManager(SimulationManager);

    EventsManager.emitEvent(EGameEvent.ACTOR_GO_OFFLINE);

    expect(actor_stats.remove_from_ranking).toHaveBeenCalledTimes(1);
    expect(actor_stats.remove_from_ranking).toHaveBeenCalledWith(ACTOR_ID);
  });

  it("should correctly save and load data", () => {
    const manager: SimulationManager = getManager(SimulationManager);
    const processor: MockNetProcessor = new MockNetProcessor();

    simulationConfig.IS_SIMULATION_INITIALIZED = true;

    manager.save(processor.asNetPacket());

    expect(processor.writeDataOrder).toEqual([EMockPacketDataType.BOOLEAN]);
    expect(processor.dataList).toEqual([true]);

    disposeManager(SimulationManager);

    const newManager: SimulationManager = getManager(SimulationManager);

    newManager.load(processor.asNetReader());

    expect(processor.readDataOrder).toEqual(processor.writeDataOrder);
    expect(processor.dataList).toHaveLength(0);
    expect(simulationConfig.IS_SIMULATION_INITIALIZED).toBe(true);
  });

  it("should correctly handle debug dump event", () => {
    const manager: SimulationManager = getManager(SimulationManager);
    const data: AnyObject = {};

    EventsManager.emitEvent(EGameEvent.DUMP_LUA_DATA, data);

    expect(data).toEqual({ SimulationManager: expect.any(Object) });
    expect(manager.onDebugDump({})).toEqual({ SimulationManager: expect.any(Object) });
  });
});
