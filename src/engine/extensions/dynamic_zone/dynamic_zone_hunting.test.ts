import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { TName, TRate } from "xray16/lib";
import { $fromObject } from "xray16/macros";

import { registerSimulator } from "@/engine/core/database";
import { assignSimulationSquadToTerrain, destroySimulationData } from "@/engine/core/managers/simulation/utils";
import { SmartTerrain } from "@/engine/core/objects/smart_terrain";
import { resetPositionCache } from "@/engine/core/utils/position";
import {
  createDynamicZoneHunting,
  DYNAMIC_ZONE_BASE_PROTECTION,
  getDynamicZoneHuntingRejection,
  IDynamicZoneHunting,
} from "@/engine/extensions/dynamic_zone/dynamic_zone_hunting";
import { mockRegisteredActor, MockSmartTerrain, MockSquad, resetRegistry } from "@/fixtures/engine";

/**
 * @returns Base smart terrain registered in the simulation.
 */
function mockBase(): SmartTerrain {
  const base: SmartTerrain = MockSmartTerrain.mockRegistered("test_base");

  base.simulationProperties = $fromObject<TName, TRate>({ base: 1 });

  return base;
}

beforeEach(() => {
  resetRegistry();
  registerSimulator();
  mockRegisteredActor();
  destroySimulationData();
  resetPositionCache();
});

describe("createDynamicZoneHunting", () => {
  it("should keep the protection radius squared, collecting bases on first use", () => {
    expect(
      createDynamicZoneHunting({
        respawnIdle: 86_400,
        respawnIdleByTerrain: new LuaTable(),
        stalkerRespawnFactor: 0.5,
        monsterRespawnFactor: 0.75,
        baseProtectionRadius: 150,
      })
    ).toEqual({ baseProtectionRadiusSqr: 22_500, baseTerrains: null });
  });
});

describe("getDynamicZoneHuntingRejection", () => {
  it("should leave targets other than squads to other rules", () => {
    const hunting: IDynamicZoneHunting = { baseProtectionRadiusSqr: 22_500, baseTerrains: null };

    mockBase();

    expect(getDynamicZoneHuntingRejection.call(hunting, mockBase(), MockSquad.mock())).toBeNull();
    expect(hunting.baseTerrains).toBeNull();
  });

  it("should protect a squad assigned to a base, or standing near one on its level", () => {
    const hunting: IDynamicZoneHunting = { baseProtectionRadiusSqr: 22_500, baseTerrains: null };
    const base: SmartTerrain = mockBase();
    const hunter: MockSquad = MockSquad.mock();
    const resident: MockSquad = MockSquad.mock();
    const passer: MockSquad = MockSquad.mock();

    MockSmartTerrain.mockRegistered("test_other");
    assignSimulationSquadToTerrain(resident, base.id);

    const distance = jest.spyOn(passer.position, "distance_to_sqr").mockImplementation(() => 22_500);

    expect(getDynamicZoneHuntingRejection.call(hunting, resident, hunter)).toBe(DYNAMIC_ZONE_BASE_PROTECTION);
    expect(getDynamicZoneHuntingRejection.call(hunting, passer, hunter)).toBe(DYNAMIC_ZONE_BASE_PROTECTION);
    expect(hunting.baseTerrains).toEqualLuaArrays([base]);

    distance.mockImplementation(() => 22_501);

    expect(getDynamicZoneHuntingRejection.call(hunting, passer, hunter)).toBeNull();

    distance.mockImplementation(() => 0);
    passer.mockSetGameVertexId(330);

    expect(getDynamicZoneHuntingRejection.call(hunting, passer, hunter)).toBeNull();
  });
});
