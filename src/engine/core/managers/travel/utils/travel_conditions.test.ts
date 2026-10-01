import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { clsid } from "xray16";
import { GameObject, ServerCreatureObject, ServerGroupObject, ServerSmartZoneObject } from "xray16/alias";
import {
  MockAlifeHumanStalker,
  MockAlifeObject,
  MockAlifeOnlineOfflineGroup,
  MockAlifeSimulator,
  MockAlifeSmartZone,
  MockGameObject,
  MockVector,
} from "xray16/mocks";

import { registerSimulator } from "@/engine/core/database";
import { simulationConfig } from "@/engine/core/managers/simulation/SimulationConfig";
import {
  canActorMoveWithSquad,
  canNegotiateTravelToSmart,
  canSquadTakeActor,
  canSquadTravel,
  canStartTravelingDialogs,
  isEnoughMoneyToTravel,
} from "@/engine/core/managers/travel/utils/travel_conditions";
import { SmartTerrain } from "@/engine/core/objects/smart_terrain";
import { Squad } from "@/engine/core/objects/squad";
import { ESquadActionType } from "@/engine/core/objects/squad/squad_types";
import { mockRegisteredActor, resetRegistry } from "@/fixtures/engine";

describe("travel_conditions", () => {
  beforeEach(() => {
    resetRegistry();
    registerSimulator();
  });

  function mockSquadMember(): { object: GameObject; squad: Squad } {
    const squad: Squad = MockAlifeOnlineOfflineGroup.mock({ gameVertexId: 100 }) as Squad;
    const serverObject: ServerCreatureObject = MockAlifeHumanStalker.mock({ groupId: squad.id });
    const object: GameObject = MockGameObject.mock({ id: serverObject.id });

    MockAlifeSimulator.addToRegistry(serverObject);
    MockAlifeSimulator.addToRegistry(squad);

    return { object, squad };
  }

  it("should check if can use travel dialogs", () => {
    const squad: ServerGroupObject = MockAlifeOnlineOfflineGroup.mock();
    const zone: ServerSmartZoneObject = MockAlifeSmartZone.mock({ name: "jup_b41" });
    const serverObject: ServerCreatureObject = MockAlifeHumanStalker.mock();
    const object: GameObject = MockGameObject.mock({ id: serverObject.id });

    expect(canStartTravelingDialogs(MockGameObject.mock())).toBe(false);

    serverObject.group_id = squad.id;

    squad.commander_id = () => object.id();
    object.character_community = <T>() => "stalker" as T;
    expect(canStartTravelingDialogs(object)).toBe(true);

    squad.commander_id = () => -1;
    expect(canStartTravelingDialogs(object)).toBe(false);

    squad.commander_id = () => object.id();
    object.character_community = <T>() => "bandit" as T;
    expect(canStartTravelingDialogs(object)).toBe(false);

    object.character_community = <T>() => "army" as T;
    expect(canStartTravelingDialogs(object)).toBe(false);

    object.character_community = <T>() => "freedom" as T;
    expect(canStartTravelingDialogs(object)).toBe(true);

    serverObject.m_smart_terrain_id = zone.id;
    expect(canStartTravelingDialogs(object)).toBe(false);

    zone.name = <T>() => "random_smart" as T;
    expect(canStartTravelingDialogs(object)).toBe(true);
  });

  it("should determine whether a squad is moving and can take the actor to a smart terrain", () => {
    const { object, squad } = mockSquadMember();
    const terrain: SmartTerrain = MockAlifeObject.mock({ clsid: clsid.smart_terrain }) as SmartTerrain;

    MockAlifeSimulator.addToRegistry(terrain);

    expect(canActorMoveWithSquad(object)).toBe(false);
    expect(canSquadTakeActor(object)).toBe(false);

    squad.currentAction = { type: ESquadActionType.REACH_TARGET } as Squad["currentAction"];
    squad.assignedTargetId = terrain.id;

    expect(canActorMoveWithSquad(object)).toBe(true);
    expect(canSquadTakeActor(object)).toBe(true);
  });

  it("should check squad travel and phrase negotiation by the route availability", () => {
    mockRegisteredActor();

    const { object } = mockSquadMember();
    const terrain: SmartTerrain = MockAlifeSmartZone.mock({ gameVertexId: 101 }) as SmartTerrain;

    expect(canSquadTravel(MockGameObject.mock())).toBe(false);
    expect(canNegotiateTravelToSmart(MockGameObject.mock(), "1000")).toBe(false);

    simulationConfig.TERRAINS.set("zat_stalker_base_smart", terrain);
    simulationConfig.TERRAINS.set("zat_b55", terrain);
    simulationConfig.TERRAINS.set("zat_b100", terrain);
    MockVector.DEFAULT_DISTANCE = 100;

    expect(canSquadTravel(object)).toBe(true);
    expect(canNegotiateTravelToSmart(object, "1000")).toBe(true);

    // Too close to travel, on another vertex as distances are memoized by vertex pair.
    const closeTerrain: SmartTerrain = MockAlifeSmartZone.mock({ gameVertexId: 102 }) as SmartTerrain;

    simulationConfig.TERRAINS.set("zat_stalker_base_smart", closeTerrain);
    simulationConfig.TERRAINS.set("zat_b55", closeTerrain);
    simulationConfig.TERRAINS.set("zat_b100", closeTerrain);
    MockVector.DEFAULT_DISTANCE = 10;

    expect(canSquadTravel(object)).toBe(false);
    expect(canNegotiateTravelToSmart(object, "1000")).toBe(false);

    simulationConfig.TERRAINS.delete("zat_stalker_base_smart");
    simulationConfig.TERRAINS.delete("zat_b55");
    simulationConfig.TERRAINS.delete("zat_b100");
  });

  it("should compare the actor money with the route price", () => {
    const { actorGameObject } = mockRegisteredActor();
    const { object } = mockSquadMember();

    simulationConfig.TERRAINS.set("zat_stalker_base_smart", MockAlifeSmartZone.mock() as SmartTerrain);
    MockVector.DEFAULT_DISTANCE = 480;

    jest.spyOn(actorGameObject, "money").mockImplementation(() => 499);
    expect(isEnoughMoneyToTravel(object, "1000_11")).toBe(false);

    jest.spyOn(actorGameObject, "money").mockImplementation(() => 500);
    expect(isEnoughMoneyToTravel(object, "1000_11")).toBe(true);

    simulationConfig.TERRAINS.delete("zat_stalker_base_smart");
  });
});
