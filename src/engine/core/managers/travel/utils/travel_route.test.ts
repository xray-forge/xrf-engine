import { beforeEach, describe, expect, it } from "@jest/globals";
import { MockAlifeOnlineOfflineGroup, MockAlifeSmartZone, MockVector } from "xray16/mocks";

import { registerSimulator } from "@/engine/core/database";
import { simulationConfig } from "@/engine/core/managers/simulation/SimulationConfig";
import { travelConfig } from "@/engine/core/managers/travel/TravelConfig";
import { getTravelRouteTerrainName, isTravelRouteAvailable } from "@/engine/core/managers/travel/utils/travel_route";
import { SmartTerrain } from "@/engine/core/objects/smart_terrain";
import { Squad } from "@/engine/core/objects/squad";
import { mockRegisteredActor, resetRegistry } from "@/fixtures/engine";

describe("getTravelRouteTerrainName", () => {
  it("should get the terrain of route phrases and of their answers", () => {
    expect(getTravelRouteTerrainName("1000")).toBe("zat_stalker_base_smart");
    expect(getTravelRouteTerrainName("1001_1")).toBe("zat_b55");
    expect(getTravelRouteTerrainName("1002_11")).toBe("zat_b100");
  });

  it("should reject traveler dialog phrases of unknown routes", () => {
    expect(() => getTravelRouteTerrainName("9999_1")).toThrow(
      "Error in travel manager, not available smart name: '9999_1'."
    );
  });
});

describe("isTravelRouteAvailable", () => {
  beforeEach(() => {
    resetRegistry();
    registerSimulator();
    mockRegisteredActor();
  });

  it("should check route level and distance", () => {
    const squad: Squad = MockAlifeOnlineOfflineGroup.mock({ gameVertexId: 100 }) as Squad;
    const terrain: SmartTerrain = MockAlifeSmartZone.mock({ gameVertexId: 101 }) as SmartTerrain;
    const descriptor = travelConfig.TRAVEL_DESCRIPTORS_BY_NAME.get("zat_stalker_base_smart");

    simulationConfig.TERRAINS.set("zat_stalker_base_smart", terrain);
    MockVector.DEFAULT_DISTANCE = 100;

    expect(isTravelRouteAvailable("zat_stalker_base_smart", descriptor, squad)).toBe(true);
    expect(isTravelRouteAvailable("zat_stalker_base_smart", { ...descriptor, level: "pripyat" }, squad)).toBe(false);

    // Distances are memoized by vertex pair, so a closer terrain sits on another vertex.
    simulationConfig.TERRAINS.set(
      "zat_stalker_base_smart",
      MockAlifeSmartZone.mock({ gameVertexId: 102 }) as SmartTerrain
    );
    MockVector.DEFAULT_DISTANCE = travelConfig.TRAVEL_DISTANCE_MIN_THRESHOLD;

    expect(isTravelRouteAvailable("zat_stalker_base_smart", descriptor, squad)).toBe(false);

    simulationConfig.TERRAINS.delete("zat_stalker_base_smart");
  });

  it("should reject routes to terrains missing from the simulation", () => {
    const squad: Squad = MockAlifeOnlineOfflineGroup.mock() as Squad;
    const descriptor = travelConfig.TRAVEL_DESCRIPTORS_BY_NAME.get("zat_b55");

    expect(() => isTravelRouteAvailable("zat_b55", descriptor, squad)).toThrow(
      "Error in travel manager. Smart terrain 'zat_b55' does not exist."
    );
  });
});
