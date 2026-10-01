import { beforeEach, describe, expect, it } from "@jest/globals";
import { GameObject, ServerCreatureObject } from "xray16/alias";
import {
  MockAlifeHumanStalker,
  MockAlifeOnlineOfflineGroup,
  MockAlifeSimulator,
  MockAlifeSmartZone,
  MockGameObject,
  MockVector,
} from "xray16/mocks";

import { registerSimulator } from "@/engine/core/database";
import { simulationConfig } from "@/engine/core/managers/simulation/SimulationConfig";
import {
  getTravelPriceByDistance,
  getTravelPriceByPhrase,
  getTravelPriceForSquad,
} from "@/engine/core/managers/travel/utils/travel_price";
import { SmartTerrain } from "@/engine/core/objects/smart_terrain";
import { Squad } from "@/engine/core/objects/squad";
import { resetRegistry } from "@/fixtures/engine";

describe("getTravelPriceByDistance", () => {
  it("should round each travel distance up to the next fifty currency units", () => {
    expect(getTravelPriceByDistance(10)).toBe(50);
    expect(getTravelPriceByDistance(100)).toBe(100);
    expect(getTravelPriceByDistance(500)).toBe(500);
    expect(getTravelPriceByDistance(750)).toBe(750);
    expect(getTravelPriceByDistance(1500)).toBe(1500);
  });
});

describe("getTravelPriceForSquad", () => {
  beforeEach(() => {
    resetRegistry();
  });

  it("should calculate price from the squad and terrain server distance", () => {
    const squad: Squad = MockAlifeOnlineOfflineGroup.mock({ gameVertexId: 100 }) as Squad;
    const terrain: SmartTerrain = MockAlifeSmartZone.mock({ gameVertexId: 101 }) as SmartTerrain;

    MockVector.DEFAULT_DISTANCE = 510;

    expect(getTravelPriceForSquad(squad, terrain)).toBe(550);
  });
});

describe("getTravelPriceByPhrase", () => {
  beforeEach(() => {
    resetRegistry();
    registerSimulator();
  });

  it("should calculate dialog price from the same squad travel distance used for charging", () => {
    const squad: Squad = MockAlifeOnlineOfflineGroup.mock() as Squad;
    const serverObject: ServerCreatureObject = MockAlifeHumanStalker.mock({ groupId: squad.id });
    const object: GameObject = MockGameObject.mock({ id: serverObject.id });
    const terrain: SmartTerrain = MockAlifeSmartZone.mock() as SmartTerrain;

    MockAlifeSimulator.addToRegistry(serverObject);
    MockAlifeSimulator.addToRegistry(squad);
    simulationConfig.TERRAINS.set("zat_stalker_base_smart", terrain);

    expect(getTravelPriceByPhrase(object, "1000_1")).toBe(getTravelPriceForSquad(squad, terrain));

    simulationConfig.TERRAINS.delete("zat_stalker_base_smart");
  });

  it("should reject traveler dialog phrases of unknown routes", () => {
    expect(() => getTravelPriceByPhrase(MockGameObject.mock(), "9999_1")).toThrow(
      "Error in travel manager, not available smart name: '9999_1'."
    );
  });
});
