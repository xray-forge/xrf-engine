import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { TDuration, TName } from "xray16/lib";
import { $fromArray, $fromObject } from "xray16/macros";

import { parseConditionsList } from "@/engine/core/ini";
import { SmartTerrain } from "@/engine/core/objects/smart_terrain";
import { IDynamicZoneConfig } from "@/engine/extensions/dynamic_zone/dynamic_zone_config";
import {
  getDynamicZoneRespawnIdle,
  getDynamicZoneRespawnLimit,
  scaleDynamicZoneRespawnLimit,
} from "@/engine/extensions/dynamic_zone/dynamic_zone_respawn";
import { MockSmartTerrain, resetRegistry } from "@/fixtures/engine";

const config: IDynamicZoneConfig = {
  respawnIdle: 86_400,
  respawnIdleByTerrain: $fromObject<TName, TDuration>({ test_hub: 7_200 }),
  stalkerRespawnFactor: 0.5,
  monsterRespawnFactor: 0.75,
};

beforeEach(() => {
  resetRegistry();
});

describe("getDynamicZoneRespawnIdle", () => {
  it("should give a terrain's own wait where the config has one, the default otherwise", () => {
    expect(getDynamicZoneRespawnIdle.call(config, 1_000, MockSmartTerrain.mock("test_hub"))).toBe(7_200);
    expect(getDynamicZoneRespawnIdle.call(config, 1_000, MockSmartTerrain.mock("test_other"))).toBe(86_400);
  });
});

describe("getDynamicZoneRespawnLimit", () => {
  it("should scale by the monster factor for monster squads and the stalker factor for others", () => {
    const terrain: SmartTerrain = MockSmartTerrain.mock("test_terrain");

    terrain.spawnSquadsConfiguration.set("spawn_monsters", {
      num: parseConditionsList("4"),
      squads: $fromArray(["simulation_boar"]),
    });
    terrain.spawnSquadsConfiguration.set("spawn_stalkers", {
      num: parseConditionsList("4"),
      squads: $fromArray(["stalker_sim_squad_novice"]),
    });

    expect(getDynamicZoneRespawnLimit.call(config, 4, terrain, "spawn_monsters", false)).toBe(3);
    expect(getDynamicZoneRespawnLimit.call(config, 4, terrain, "spawn_stalkers", false)).toBe(2);
  });
});

describe("scaleDynamicZoneRespawnLimit", () => {
  it("should round half up, and make a share of one squad a chance only when the terrain tries to respawn", () => {
    expect(scaleDynamicZoneRespawnLimit(4, 0.75, true)).toBe(3);
    expect(scaleDynamicZoneRespawnLimit(3, 0.5, true)).toBe(2);
    expect(scaleDynamicZoneRespawnLimit(0, 0.5, true)).toBe(0);
    expect(scaleDynamicZoneRespawnLimit(1, 0.5, false)).toBe(1);

    jest.spyOn(math, "random").mockImplementation(() => 0.4);
    expect(scaleDynamicZoneRespawnLimit(1, 0.5, true)).toBe(1);

    jest.spyOn(math, "random").mockImplementation(() => 0.6);
    expect(scaleDynamicZoneRespawnLimit(1, 0.5, true)).toBe(0);
  });
});
