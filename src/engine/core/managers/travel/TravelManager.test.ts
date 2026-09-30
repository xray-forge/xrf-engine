import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { clsid, level, time_global } from "xray16";
import { GameObject, ServerCreatureObject, ServerGroupObject, ServerSmartZoneObject } from "xray16/alias";
import { AnyObject, TRUE } from "xray16/lib";
import {
  MockAlifeHumanStalker,
  MockAlifeObject,
  MockAlifeOnlineOfflineGroup,
  MockAlifeSimulator,
  MockAlifeSmartZone,
  MockGameObject,
  MockPatrol,
  MockPhraseDialog,
  MockPhraseScript,
  MockVector,
} from "xray16/mocks";

import { postProcessors } from "@/engine/constants/animation";
import { getManager, registerSimulator } from "@/engine/core/database";
import { parseConditionsList } from "@/engine/core/ini";
import { ActorInputManager, EActorControlHandle } from "@/engine/core/managers/actor";
import { EGameEvent, EventsManager } from "@/engine/core/managers/events";
import { simulationConfig } from "@/engine/core/managers/simulation/SimulationConfig";
import { surgeConfig } from "@/engine/core/managers/surge/SurgeConfig";
import { travelConfig } from "@/engine/core/managers/travel/TravelConfig";
import { TravelManager } from "@/engine/core/managers/travel/TravelManager";
import { getTravelPriceForSquad } from "@/engine/core/managers/travel/utils";
import { SmartTerrain } from "@/engine/core/objects/smart_terrain";
import { Squad } from "@/engine/core/objects/squad";
import { ESquadActionType } from "@/engine/core/objects/squad/squad_types";
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

  it("should correctly initialize travel dialog phrases", () => {
    const manager: TravelManager = getManager(TravelManager);
    const dialog: MockPhraseDialog = MockPhraseDialog.create();

    manager.initialize();
    manager.initializeTravellerDialog(MockPhraseDialog.mock(dialog));

    expect(dialog.list).toEqual({
      "0": {
        goodwillLevel: -10000,
        id: "0",
        prevPhraseId: "",
        script: MockPhraseScript.mock({
          actions: [],
          preconditions: [],
          text: null,
        }),
        text: "dm_traveler_what_are_you_doing",
      },
      "1": {
        goodwillLevel: -10000,
        id: "1",
        prevPhraseId: "0",
        script: MockPhraseScript.mock({
          actions: [],
          preconditions: [],
          text: "travel_callbacks.get_squad_current_action_description",
        }),
        text: "if you see this - this is bad",
      },
      "1000": {
        goodwillLevel: -10000,
        id: "1000",
        prevPhraseId: "121",
        script: MockPhraseScript.mock({
          actions: [],
          preconditions: ["travel_callbacks.can_negotiate_travel_to_smart"],
          text: null,
        }),
        text: "translated_st_zat_a2_name.",
      },
      "1000_1": {
        goodwillLevel: -10000,
        id: "1000_1",
        prevPhraseId: "1000",
        script: MockPhraseScript.mock({
          actions: [],
          preconditions: [],
          text: "travel_callbacks.get_travel_cost",
        }),
        text: "if you see this - this is bad",
      },
      "1000_11": {
        goodwillLevel: -10000,
        id: "1000_11",
        prevPhraseId: "1000_1",
        script: MockPhraseScript.mock({
          actions: ["travel_callbacks.on_travel_to_specific_smart_with_squad"],
          preconditions: ["travel_callbacks.is_enough_money_to_travel"],
          text: null,
        }),
        text: "dm_traveler_actor_agree",
      },
      "1000_13": {
        goodwillLevel: -10000,
        id: "1000_13",
        prevPhraseId: "1000_1",
        script: MockPhraseScript.mock({
          actions: [],
          preconditions: ["travel_callbacks.is_not_enough_money_to_travel"],
          text: null,
        }),
        text: "dm_traveler_actor_has_no_money",
      },
      "1000_14": {
        goodwillLevel: -10000,
        id: "1000_14",
        prevPhraseId: "1000_1",
        script: MockPhraseScript.mock({
          actions: [],
          preconditions: [],
          text: null,
        }),
        text: "dm_traveler_actor_refuse",
      },
      "1001": {
        goodwillLevel: -10000,
        id: "1001",
        prevPhraseId: "121",
        script: MockPhraseScript.mock({
          actions: [],
          preconditions: ["travel_callbacks.can_negotiate_travel_to_smart"],
          text: null,
        }),
        text: "translated_st_zat_b55_name.",
      },
      "1001_1": {
        goodwillLevel: -10000,
        id: "1001_1",
        prevPhraseId: "1001",
        script: MockPhraseScript.mock({
          actions: [],
          preconditions: [],
          text: "travel_callbacks.get_travel_cost",
        }),
        text: "if you see this - this is bad",
      },
      "1001_11": {
        goodwillLevel: -10000,
        id: "1001_11",
        prevPhraseId: "1001_1",
        script: MockPhraseScript.mock({
          actions: ["travel_callbacks.on_travel_to_specific_smart_with_squad"],
          preconditions: ["travel_callbacks.is_enough_money_to_travel"],
          text: null,
        }),
        text: "dm_traveler_actor_agree",
      },
      "1001_13": {
        goodwillLevel: -10000,
        id: "1001_13",
        prevPhraseId: "1001_1",
        script: MockPhraseScript.mock({
          actions: [],
          preconditions: ["travel_callbacks.is_not_enough_money_to_travel"],
          text: null,
        }),
        text: "dm_traveler_actor_has_no_money",
      },
      "1001_14": {
        goodwillLevel: -10000,
        id: "1001_14",
        prevPhraseId: "1001_1",
        script: MockPhraseScript.mock({
          actions: [],
          preconditions: [],
          text: null,
        }),
        text: "dm_traveler_actor_refuse",
      },
      "1002": {
        goodwillLevel: -10000,
        id: "1002",
        prevPhraseId: "121",
        script: MockPhraseScript.mock({
          actions: [],
          preconditions: ["travel_callbacks.can_negotiate_travel_to_smart"],
          text: null,
        }),
        text: "translated_st_zat_b100_name.",
      },
      "1002_1": {
        goodwillLevel: -10000,
        id: "1002_1",
        prevPhraseId: "1002",
        script: MockPhraseScript.mock({
          actions: [],
          preconditions: [],
          text: "travel_callbacks.get_travel_cost",
        }),
        text: "if you see this - this is bad",
      },
      "1002_11": {
        goodwillLevel: -10000,
        id: "1002_11",
        prevPhraseId: "1002_1",
        script: MockPhraseScript.mock({
          actions: ["travel_callbacks.on_travel_to_specific_smart_with_squad"],
          preconditions: ["travel_callbacks.is_enough_money_to_travel"],
          text: null,
        }),
        text: "dm_traveler_actor_agree",
      },
      "1002_13": {
        goodwillLevel: -10000,
        id: "1002_13",
        prevPhraseId: "1002_1",
        script: MockPhraseScript.mock({
          actions: [],
          preconditions: ["travel_callbacks.is_not_enough_money_to_travel"],
          text: null,
        }),
        text: "dm_traveler_actor_has_no_money",
      },
      "1002_14": {
        goodwillLevel: -10000,
        id: "1002_14",
        prevPhraseId: "1002_1",
        script: MockPhraseScript.mock({
          actions: [],
          preconditions: [],
          text: null,
        }),
        text: "dm_traveler_actor_refuse",
      },
      "11": {
        goodwillLevel: -10000,
        id: "11",
        prevPhraseId: "1",
        script: MockPhraseScript.mock({
          actions: [],
          preconditions: ["travel_callbacks.can_actor_move_with_squad"],
          text: null,
        }),
        text: "dm_traveler_can_i_go_with_you",
      },
      "111": {
        goodwillLevel: -10000,
        id: "111",
        prevPhraseId: "11",
        script: MockPhraseScript.mock({
          actions: [],
          preconditions: ["travel_callbacks.can_squad_take_actor"],
          text: null,
        }),
        text: "dm_traveler_stalker_actor_companion_yes",
      },
      "1111": {
        goodwillLevel: -10000,
        id: "1111",
        prevPhraseId: "111",
        script: MockPhraseScript.mock({
          actions: ["travel_callbacks.on_travel_together_with_squad"],
          preconditions: [],
          text: null,
        }),
        text: "dm_traveler_actor_go_with_squad",
      },
      "1112": {
        goodwillLevel: -10000,
        id: "1112",
        prevPhraseId: "111",
        script: MockPhraseScript.mock({
          actions: [],
          preconditions: [],
          text: null,
        }),
        text: "dm_traveler_actor_dont_go_with_squad",
      },
      "112": {
        goodwillLevel: -10000,
        id: "112",
        prevPhraseId: "11",
        script: MockPhraseScript.mock({
          actions: [],
          preconditions: ["travel_callbacks.cannot_squad_take_actor"],
          text: null,
        }),
        text: "dm_traveler_stalker_actor_companion_no",
      },
      "12": {
        goodwillLevel: -10000,
        id: "12",
        prevPhraseId: "1",
        script: MockPhraseScript.mock({
          actions: [],
          preconditions: [],
          text: null,
        }),
        text: "dm_traveler_take_me_to",
      },
      "121": {
        goodwillLevel: -10000,
        id: "121",
        prevPhraseId: "12",
        script: MockPhraseScript.mock({
          actions: [],
          preconditions: ["travel_callbacks.can_squad_travel"],
          text: null,
        }),
        text: "dm_traveler_stalker_where_do_you_want",
      },
      "1211": {
        goodwillLevel: -10000,
        id: "1211",
        prevPhraseId: "121",
        script: MockPhraseScript.mock({
          actions: [],
          preconditions: [],
          text: null,
        }),
        text: "dm_traveler_actor_refuse",
      },
      "122": {
        goodwillLevel: -10000,
        id: "122",
        prevPhraseId: "12",
        script: MockPhraseScript.mock({
          actions: [],
          preconditions: ["travel_callbacks.cannot_squad_travel"],
          text: null,
        }),
        text: "dm_traveler_stalker_i_cant_travel",
      },
      "13": {
        goodwillLevel: -10000,
        id: "13",
        prevPhraseId: "1",
        script: MockPhraseScript.mock({
          actions: [],
          preconditions: [],
          text: null,
        }),
        text: "dm_traveler_bye",
      },
    });
  });

  it("should correctly check if can use travel dialogs", () => {
    const manager: TravelManager = getManager(TravelManager);
    const squad: ServerGroupObject = MockAlifeOnlineOfflineGroup.mock();
    const zone: ServerSmartZoneObject = MockAlifeSmartZone.mock({ name: "jup_b41" });
    const serverObject: ServerCreatureObject = MockAlifeHumanStalker.mock();
    const object: GameObject = MockGameObject.mock({ id: serverObject.id });
    const actor: GameObject = MockGameObject.mockActor();

    expect(manager.canStartTravelingDialogs(actor, MockGameObject.mock())).toBe(false);

    serverObject.group_id = squad.id;

    squad.commander_id = () => object.id();
    object.character_community = <T>() => "stalker" as T;
    expect(manager.canStartTravelingDialogs(actor, object)).toBe(true);

    squad.commander_id = () => -1;
    expect(manager.canStartTravelingDialogs(actor, object)).toBe(false);

    squad.commander_id = () => object.id();
    object.character_community = <T>() => "bandit" as T;
    expect(manager.canStartTravelingDialogs(actor, object)).toBe(false);

    object.character_community = <T>() => "army" as T;
    expect(manager.canStartTravelingDialogs(actor, object)).toBe(false);

    object.character_community = <T>() => "freedom" as T;
    expect(manager.canStartTravelingDialogs(actor, object)).toBe(true);

    serverObject.m_smart_terrain_id = zone.id;
    expect(manager.canStartTravelingDialogs(actor, object)).toBe(false);

    zone.name = <T>() => "random_smart" as T;
    expect(manager.canStartTravelingDialogs(actor, object)).toBe(true);
  });

  it("should determine whether a squad is moving and can take the actor to a smart terrain", () => {
    const manager: TravelManager = getManager(TravelManager);
    const squad: Squad = MockAlifeOnlineOfflineGroup.mock() as Squad;
    const serverObject: ServerCreatureObject = MockAlifeHumanStalker.mock({ groupId: squad.id });
    const object: GameObject = MockGameObject.mock({ id: serverObject.id });
    const actor: GameObject = MockGameObject.mockActor();
    const terrain: SmartTerrain = MockAlifeObject.mock({ clsid: clsid.smart_terrain }) as SmartTerrain;

    MockAlifeSimulator.addToRegistry(serverObject);
    MockAlifeSimulator.addToRegistry(squad);
    MockAlifeSimulator.addToRegistry(terrain);

    expect(manager.canActorMoveWithSquad(actor, object)).toBe(false);
    expect(manager.canSquadTakeActor(object, actor)).toBe(false);

    squad.currentAction = { type: ESquadActionType.REACH_TARGET } as Squad["currentAction"];
    squad.assignedTargetId = terrain.id;

    expect(manager.canActorMoveWithSquad(actor, object)).toBe(true);
    expect(manager.canSquadTakeActor(object, actor)).toBe(true);
  });

  it("should describe a squad action and evaluate reachable travel destinations", () => {
    const manager: TravelManager = getManager(TravelManager);
    const squad: Squad = MockAlifeOnlineOfflineGroup.mock({ gameVertexId: 100 }) as Squad;
    const serverObject: ServerCreatureObject = MockAlifeHumanStalker.mock({ groupId: squad.id });
    const object: GameObject = MockGameObject.mock({ id: serverObject.id });
    const terrain: SmartTerrain = MockAlifeObject.mock({
      clsid: clsid.smart_terrain,
      gameVertexId: 101,
    }) as SmartTerrain;
    const descriptor = travelConfig.TRAVEL_DESCRIPTORS_BY_NAME.get("zat_stalker_base_smart");

    MockAlifeSimulator.addToRegistry(serverObject);
    MockAlifeSimulator.addToRegistry(squad);
    MockAlifeSimulator.addToRegistry(terrain);
    squad.currentAction = { type: ESquadActionType.REACH_TARGET } as Squad["currentAction"];
    squad.assignedTargetId = terrain.id;
    terrain.name = <T>() => "zat_a1" as T;
    MockVector.DEFAULT_DISTANCE = 100;
    simulationConfig.TERRAINS.set("zat_stalker_base_smart", terrain);

    expect(manager.getSquadCurrentActionDescription(MockGameObject.mockActor(), object)).toBe("st_stalker_zat_a1");
    expect(manager.isSmartAvailableToReach("zat_stalker_base_smart", descriptor, squad)).toBe(true);
    expect(manager.isSmartAvailableToReach("zat_stalker_base_smart", { ...descriptor, level: "pripyat" }, squad)).toBe(
      false
    );

    simulationConfig.TERRAINS.delete("zat_stalker_base_smart");
  });

  it("should check squad travel and phrase negotiation through the shared route policy", () => {
    const manager: TravelManager = getManager(TravelManager);
    const squad: Squad = MockAlifeOnlineOfflineGroup.mock() as Squad;
    const serverObject: ServerCreatureObject = MockAlifeHumanStalker.mock({ groupId: squad.id });
    const object: GameObject = MockGameObject.mock({ id: serverObject.id });
    const actor: GameObject = MockGameObject.mockActor();

    MockAlifeSimulator.addToRegistry(serverObject);
    MockAlifeSimulator.addToRegistry(squad);
    jest.spyOn(manager, "isSmartAvailableToReach").mockReturnValue(true);

    expect(manager.canSquadTravel(object, actor, "12", "121")).toBe(true);
    expect(manager.canNegotiateTravelToSmart(actor, object, "121", "12", "1000")).toBe(true);
    expect(manager.canNegotiateTravelToSmart(actor, MockGameObject.mock(), "121", "12", "1000")).toBe(false);
  });

  it("should build travel cost labels and compare the actor money with the route price", () => {
    const { actorGameObject } = mockRegisteredActor();
    const manager: TravelManager = getManager(TravelManager);

    jest.spyOn(manager, "getTravelPriceByObjectPhrase").mockReturnValue(500);
    jest.spyOn(actorGameObject, "money").mockImplementation(() => 499);

    expect(manager.getTravelCostLabel(actorGameObject, MockGameObject.mock(), "1000", "1000_1")).toBe(
      "translated_dm_traveler_travel_cost 500."
    );
    expect(manager.isEnoughMoneyToTravel(actorGameObject, MockGameObject.mock(), "1000", "1000_11")).toBe(false);

    jest.spyOn(actorGameObject, "money").mockImplementation(() => 500);
    expect(manager.isEnoughMoneyToTravel(actorGameObject, MockGameObject.mock(), "1000", "1000_11")).toBe(true);
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
      assignedSquadsCount: 0,
    });
    MockVector.DEFAULT_DISTANCE = 100;

    manager.onTravelToSpecificSmartWithSquad(actorGameObject, object, "1000", "1000_11");

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
    expect(surgeConfig.IS_TIME_FORWARDED).toBe(true);

    manager.update();

    // The actor is teleported once per travel.
    expect(actorGameObject.set_actor_position).toHaveBeenCalledTimes(1);

    surgeConfig.IS_TIME_FORWARDED = false;

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

    manager.onTravelTogetherWithSquad(actorGameObject, object, "111", "1111");

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

  it("should reject traveler dialog phrases of unknown routes", () => {
    const manager: TravelManager = getManager(TravelManager);

    expect(() => manager.getTravelPriceByObjectPhrase(MockGameObject.mock(), "9999_1")).toThrow(
      "Error in travel manager, not available smart name: '9999_1'."
    );
  });

  it("should calculate dialog price from the same squad travel distance used for charging", () => {
    const manager: TravelManager = getManager(TravelManager);
    const squad: ServerGroupObject = MockAlifeOnlineOfflineGroup.mock();
    const serverObject: ServerCreatureObject = MockAlifeHumanStalker.mock();
    const object: GameObject = MockGameObject.mock({ id: serverObject.id });
    const terrain: ServerSmartZoneObject = MockAlifeSmartZone.mock();

    serverObject.group_id = squad.id;
    MockAlifeSimulator.addToRegistry(serverObject);
    MockAlifeSimulator.addToRegistry(squad);
    simulationConfig.TERRAINS.set("zat_stalker_base_smart", terrain as SmartTerrain);

    expect(manager.getTravelPriceByObjectPhrase(object, "1000_1")).toBe(
      getTravelPriceForSquad(squad as Squad, terrain as SmartTerrain)
    );

    simulationConfig.TERRAINS.delete("zat_stalker_base_smart");
  });

  it("should correctly handle debug dump event", () => {
    const manager: TravelManager = getManager(TravelManager);
    const data: AnyObject = {};

    EventsManager.emitEvent(EGameEvent.DUMP_LUA_DATA, data);

    expect(data).toEqual({ TravelManager: expect.any(Object) });
    expect(manager.onDebugDump({})).toEqual({ TravelManager: expect.any(Object) });
  });
});
