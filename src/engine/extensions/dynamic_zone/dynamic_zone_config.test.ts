import { describe, expect, it } from "@jest/globals";
import { MockIniFile } from "xray16/mocks";

import { readDynamicZoneConfig } from "@/engine/extensions/dynamic_zone/dynamic_zone_config";

describe("readDynamicZoneConfig", () => {
  it("should read the settings, with defaults for those the file leaves out", () => {
    expect(readDynamicZoneConfig(MockIniFile.mock("empty.ltx", {}))).toEqualLuaTables({
      respawnIdle: 86_400,
      respawnIdleByTerrain: {},
      stalkerRespawnFactor: 0.5,
      monsterRespawnFactor: 0.75,
      baseProtectionRadius: 75,
    });

    expect(
      readDynamicZoneConfig(
        MockIniFile.mock("main.ltx", {
          respawn: { idle: 3_600 },
          respawn_idle: { zat_stalker_base_smart: 7_200, zat_sim_29: 172_800 },
          population: { stalker_factor: 0.25, monster_factor: 1 },
          hunting: { base_protection_radius: 50 },
        })
      )
    ).toEqualLuaTables({
      respawnIdle: 3_600,
      respawnIdleByTerrain: { zat_stalker_base_smart: 7_200, zat_sim_29: 172_800 },
      stalkerRespawnFactor: 0.25,
      monsterRespawnFactor: 1,
      baseProtectionRadius: 50,
    });
  });

  it("should refuse a terrain's respawn wait that is not a number", () => {
    expect(() => readDynamicZoneConfig(MockIniFile.mock("main.ltx", { respawn_idle: { zat_b55: "7200s" } }))).toThrow();
  });
});
