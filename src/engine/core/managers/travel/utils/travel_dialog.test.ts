import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { clsid, game } from "xray16";
import { GameObject, ServerCreatureObject } from "xray16/alias";
import {
  MockAlifeHumanStalker,
  MockAlifeObject,
  MockAlifeOnlineOfflineGroup,
  MockAlifeSimulator,
  MockAlifeSmartZone,
  MockGameObject,
  MockPhraseDialog,
  MockPhraseScript,
  MockVector,
} from "xray16/mocks";

import { registerSimulator } from "@/engine/core/database";
import { simulationConfig } from "@/engine/core/managers/simulation/SimulationConfig";
import {
  getSquadActionDescription,
  getTravelCostLabel,
  initializeTravellerDialog,
} from "@/engine/core/managers/travel/utils/travel_dialog";
import { SmartTerrain } from "@/engine/core/objects/smart_terrain";
import { Squad } from "@/engine/core/objects/squad";
import { ESquadActionType } from "@/engine/core/objects/squad/squad_types";
import { resetRegistry } from "@/fixtures/engine";

describe("initializeTravellerDialog", () => {
  beforeEach(() => {
    resetRegistry();
  });

  it("should correctly initialize travel dialog phrases", () => {
    const dialog: MockPhraseDialog = MockPhraseDialog.create();

    initializeTravellerDialog(MockPhraseDialog.mock(dialog));

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
});

describe("getSquadActionDescription", () => {
  beforeEach(() => {
    resetRegistry();
    registerSimulator();
  });

  function mockTraveler(community: string): { object: GameObject; squad: Squad } {
    const squad: Squad = MockAlifeOnlineOfflineGroup.mock() as Squad;
    const serverObject: ServerCreatureObject = MockAlifeHumanStalker.mock({ groupId: squad.id });
    const object: GameObject = MockGameObject.mock({ id: serverObject.id });

    MockAlifeSimulator.addToRegistry(serverObject);
    MockAlifeSimulator.addToRegistry(squad);
    object.character_community = <T>() => community as T;

    return { object, squad };
  }

  it("should describe a squad heading to a smart terrain", () => {
    const { object, squad } = mockTraveler("stalker");
    const terrain: SmartTerrain = MockAlifeObject.mock({ clsid: clsid.smart_terrain }) as SmartTerrain;

    MockAlifeSimulator.addToRegistry(terrain);
    squad.currentAction = { type: ESquadActionType.REACH_TARGET } as Squad["currentAction"];
    squad.assignedTargetId = terrain.id;
    terrain.name = <T>() => "zat_a1" as T;

    expect(getSquadActionDescription(object)).toBe("st_stalker_zat_a1");
  });

  it("should describe an idle squad with its community text", () => {
    const { object } = mockTraveler("dolg");

    jest.spyOn(math, "random").mockImplementation(() => 1);

    expect(getSquadActionDescription(object)).toBe("dm_duty_doing_nothing_1");
  });

  it("should describe a squad chasing another one with the communities of both", () => {
    const { object, squad } = mockTraveler("dolg");
    const target: Squad = MockAlifeOnlineOfflineGroup.mock() as Squad;

    target.faction = "freedom";
    MockAlifeSimulator.addToRegistry(target);
    squad.currentAction = { type: ESquadActionType.REACH_TARGET } as Squad["currentAction"];
    squad.assignedTargetId = target.id;

    expect(getSquadActionDescription(object)).toBe("dm_duty_chasing_squad_freedom");

    target.faction = "monster_predatory_day";

    expect(getSquadActionDescription(object)).toBe("dm_duty_chasing_squad_monster");
  });

  it("should fall back to the stalker text when the community text is not written", () => {
    const { object, squad } = mockTraveler("freedom");
    const target: Squad = MockAlifeOnlineOfflineGroup.mock() as Squad;

    target.faction = "zombied";
    MockAlifeSimulator.addToRegistry(target);
    squad.currentAction = { type: ESquadActionType.REACH_TARGET } as Squad["currentAction"];
    squad.assignedTargetId = target.id;
    jest.spyOn(game, "translate_string").mockImplementationOnce((text: string) => text);

    expect(getSquadActionDescription(object)).toBe("dm_stalker_chasing_squad_zombied");
  });
});

describe("getTravelCostLabel", () => {
  beforeEach(() => {
    resetRegistry();
    registerSimulator();
  });

  it("should label the price of the phrase route", () => {
    const squad: Squad = MockAlifeOnlineOfflineGroup.mock() as Squad;
    const serverObject: ServerCreatureObject = MockAlifeHumanStalker.mock({ groupId: squad.id });
    const object: GameObject = MockGameObject.mock({ id: serverObject.id });
    const terrain: SmartTerrain = MockAlifeSmartZone.mock() as SmartTerrain;

    MockAlifeSimulator.addToRegistry(serverObject);
    MockAlifeSimulator.addToRegistry(squad);
    simulationConfig.TERRAINS.set("zat_stalker_base_smart", terrain);
    MockVector.DEFAULT_DISTANCE = 480;

    expect(getTravelCostLabel(object, "1000_1")).toBe("translated_dm_traveler_travel_cost 500.");

    simulationConfig.TERRAINS.delete("zat_stalker_base_smart");
  });
});
