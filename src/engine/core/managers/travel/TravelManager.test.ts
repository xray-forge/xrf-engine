import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { clsid, level, time_global } from "xray16";
import { GameObject, ServerCreatureObject } from "xray16/alias";
import { AnyObject, TRUE } from "xray16/lib";
import {
  MockAlifeHumanStalker,
  MockAlifeObject,
  MockAlifeOnlineOfflineGroup,
  MockAlifeSimulator,
  MockGameObject,
  MockPatrol,
  MockVector,
} from "xray16/mocks";

import { postProcessors } from "@/engine/constants/animation";
import { getManager, registerSimulator } from "@/engine/core/database";
import { parseConditionsList } from "@/engine/core/ini";
import { ActorInputManager, EActorControlHandle } from "@/engine/core/managers/actor";
import { EGameEvent, EventsManager } from "@/engine/core/managers/events";
import { simulationConfig } from "@/engine/core/managers/simulation/SimulationConfig";
import { travelConfig } from "@/engine/core/managers/travel/TravelConfig";
import { TravelManager } from "@/engine/core/managers/travel/TravelManager";
import { SmartTerrain } from "@/engine/core/objects/smart_terrain";
import { Squad } from "@/engine/core/objects/squad";
import { mockRegisteredActor, resetRegistry } from "@/fixtures/engine";

describe("TravelManager", () => {
  beforeEach(() => {
    resetRegistry();
    registerSimulator();
  });

  it("should correctly initialize callbacks", () => {
    const eventsManager: EventsManager = getManager(EventsManager);
    const manager: TravelManager = getManager(TravelManager);

    manager.initialize();

    expect(eventsManager.getSubscribersCount()).toBe(2);
    expect(eventsManager.getEventSubscribersCount(EGameEvent.DUMP_LUA_DATA)).toBe(1);
    expect(eventsManager.getEventSubscribersCount(EGameEvent.ACTOR_UPDATE)).toBe(1);

    manager.destroy();

    expect(eventsManager.getSubscribersCount()).toBe(0);
  });

  it("should correctly have correct configuration", () => {
    expect(travelConfig.TRAVEL_DISTANCE_MIN_THRESHOLD).toBe(50);
    expect(travelConfig.TRAVEL_TELEPORT_DELAY).toBe(3000);
    expect(travelConfig.TRAVEL_RESOLVE_DELAY).toBe(6000);

    expect(travelConfig.TRAVEL_LOCATIONS).toEqualLuaTables({
      zat_a1: "st_stalker_zat_a1",
      zat_sim_1: "st_stalker_zat_sim_1",
      zat_sim_2: "st_stalker_zat_sim_2",
    });
    expect(travelConfig.TRAVEL_DESCRIPTORS_BY_NAME).toEqualLuaTables({
      zat_b100: {
        condlist: parseConditionsList(TRUE),
        level: "zaton",
        name: "st_zat_b100_name",
        phraseId: "1002",
      },
      zat_b55: {
        condlist: parseConditionsList(TRUE),
        level: "zaton",
        name: "st_zat_b55_name",
        phraseId: "1001",
      },
      zat_stalker_base_smart: {
        condlist: parseConditionsList(TRUE),
        name: "st_zat_a2_name",
        level: "zaton",
        phraseId: "1000",
      },
    });
    expect(travelConfig.TRAVEL_DESCRIPTORS_BY_PHRASE).toEqualLuaTables({
      "1000": "zat_stalker_base_smart",
      "1001": "zat_b55",
      "1002": "zat_b100",
    });
  });

  it("should correctly initialize and destroy", () => {
    const manager: TravelManager = getManager(TravelManager);

    manager.initialize();

    expect(manager.activeTravel).toBeNull();
  });

  it("should start a paid travel to the selected smart terrain", () => {
    const { actorGameObject } = mockRegisteredActor();
    const manager: TravelManager = getManager(TravelManager);
    const squad: Squad = MockAlifeOnlineOfflineGroup.mock({ gameVertexId: 100 }) as Squad;
    const serverObject: ServerCreatureObject = MockAlifeHumanStalker.mock({ groupId: squad.id });
    const object: GameObject = MockGameObject.mock({ id: serverObject.id });
    const terrain: SmartTerrain = MockAlifeObject.mock({
      clsid: clsid.smart_terrain,
      gameVertexId: 101,
    }) as SmartTerrain;

    terrain.travelerActorPointName = "test_actor_path";
    terrain.travelerSquadPointName = "test_squad_path";
    MockAlifeSimulator.addToRegistry(serverObject);
    MockAlifeSimulator.addToRegistry(squad);
    simulationConfig.TERRAINS.set("zat_stalker_base_smart", terrain);
    simulationConfig.TERRAIN_DESCRIPTORS.set(terrain.id, {
      terrain: terrain,
      assignedSquads: new LuaTable(),
    });
    MockVector.DEFAULT_DISTANCE = 100;

    jest.spyOn(EventsManager, "emitEvent");

    manager.onTravelToSpecificSmartWithSquad(object, "1000_11");

    expect(object.stop_talk).toHaveBeenCalledTimes(1);
    expect(actorGameObject.give_money).toHaveBeenCalledWith(-100);
    expect(level.add_pp_effector).toHaveBeenCalledWith(
      postProcessors.fade_in_out,
      travelConfig.TRAVEL_FADE_PP_EFFECTOR_ID,
      false
    );
    expect(manager.activeTravel).toEqual({
      squad,
      terrainId: terrain.id,
      distance: 100,
      actorPath: "test_actor_path",
      squadPath: "test_squad_path",
      startedAt: expect.any(Number),
      isTeleported: false,
    });

    MockPatrol.setup({
      test_actor_path: {
        points: [
          { name: "actor-start", gvid: 100, lvid: 100, position: MockVector.create(0, 0, 0) },
          { name: "actor-end", gvid: 101, lvid: 101, position: MockVector.create(1, 0, 0) },
        ],
      },
      test_squad_path: {
        points: [{ name: "squad-start", gvid: 100, lvid: 100, position: MockVector.create(0, 0, 0) }],
      },
    });
    (time_global as unknown as jest.Mock).mockReturnValue(
      manager.activeTravel!.startedAt + travelConfig.TRAVEL_TELEPORT_DELAY
    );
    manager.update();

    expect(manager.activeTravel?.isTeleported).toBe(true);
    expect(actorGameObject.set_actor_position).toHaveBeenCalledTimes(1);
    // 100 units of distance take 10 game minutes.
    expect(level.change_game_time).toHaveBeenCalledWith(0, 0, 10);
    expect(EventsManager.emitEvent).toHaveBeenCalledWith(EGameEvent.GAME_TIME_FORWARDED);

    manager.update();

    // The actor is teleported once per travel.
    expect(actorGameObject.set_actor_position).toHaveBeenCalledTimes(1);

    simulationConfig.TERRAINS.delete("zat_stalker_base_smart");
    simulationConfig.TERRAIN_DESCRIPTORS.delete(terrain.id);
  });

  it("should start a free travel to the squad assigned smart terrain", () => {
    const { actorGameObject } = mockRegisteredActor();
    const manager: TravelManager = getManager(TravelManager);
    const squad: Squad = MockAlifeOnlineOfflineGroup.mock({ gameVertexId: 100 }) as Squad;
    const serverObject: ServerCreatureObject = MockAlifeHumanStalker.mock({ groupId: squad.id });
    const object: GameObject = MockGameObject.mock({ id: serverObject.id });
    const terrain: SmartTerrain = MockAlifeObject.mock({
      clsid: clsid.smart_terrain,
      gameVertexId: 101,
    }) as SmartTerrain;

    terrain.travelerActorPointName = "test_actor_path";
    terrain.travelerSquadPointName = "test_squad_path";
    squad.assignedTargetId = terrain.id;
    MockAlifeSimulator.addToRegistry(serverObject);
    MockAlifeSimulator.addToRegistry(squad);
    MockAlifeSimulator.addToRegistry(terrain);
    MockVector.DEFAULT_DISTANCE = 100;

    manager.onTravelTogetherWithSquad(object);

    expect(object.stop_talk).toHaveBeenCalledTimes(1);
    expect(actorGameObject.give_money).not.toHaveBeenCalled();
    expect(manager.activeTravel?.squad).toBe(squad);
    expect(manager.activeTravel?.terrainId).toBe(terrain.id);
  });

  it("should resolve active travel after the configured delay", () => {
    mockRegisteredActor();

    const manager: TravelManager = getManager(TravelManager);
    const input: ActorInputManager = getManager(ActorInputManager);

    manager.activeTravel = {
      squad: MockAlifeOnlineOfflineGroup.mock() as Squad,
      terrainId: 1,
      distance: 100,
      actorPath: "test_actor_path",
      squadPath: "test_squad_path",
      startedAt: 0,
      isTeleported: true,
    };
    (time_global as unknown as jest.Mock).mockReturnValue(travelConfig.TRAVEL_RESOLVE_DELAY);
    jest.spyOn(input, "releaseControl");

    manager.update();

    expect(manager.activeTravel).toBeNull();
    expect(input.releaseControl).toHaveBeenCalledWith(EActorControlHandle.TRAVEL);
  });

  it("should correctly handle debug dump event", () => {
    const manager: TravelManager = getManager(TravelManager);
    const data: AnyObject = {};

    EventsManager.emitEvent(EGameEvent.DUMP_LUA_DATA, data);

    expect(data).toEqual({ TravelManager: expect.any(Object) });
    expect(manager.onDebugDump({})).toEqual({ TravelManager: expect.any(Object) });
  });
});
