import { IniFile } from "xray16/alias";
import { abort, Nillable, TCount, TDistance, TDuration, TName, TRate } from "xray16/lib";
import { $isNil } from "xray16/macros";

import { readIniNumber } from "@/engine/core/ini";

/**
 * Settings of the dynamic zone extension, read from its `main.ltx`.
 */
export interface IDynamicZoneConfig {
  // Game seconds a respawn point waits between respawn attempts.
  respawnIdle: TDuration;
  // Respawn wait of single smart terrains, by name.
  respawnIdleByTerrain: LuaTable<TName, TDuration>;
  // Factors scaling how many squads a respawn section may have alive.
  stalkerRespawnFactor: TRate;
  monsterRespawnFactor: TRate;
  // Distance from a base terrain within which squads are not hunted.
  baseProtectionRadius: TDistance;
}

/**
 * @param ini - The extension's `main.ltx`.
 * @returns Settings of the extension, its defaults where the file sets nothing.
 */
export function readDynamicZoneConfig(ini: IniFile): IDynamicZoneConfig {
  const respawnIdleByTerrain: LuaTable<TName, TDuration> = new LuaTable();

  if (ini.section_exist("respawn_idle")) {
    const count: TCount = ini.line_count("respawn_idle");

    for (const index of $range(0, count - 1)) {
      const [, terrain, value] = ini.r_line("respawn_idle", index, "", "");
      const idle: Nillable<TDuration> = tonumber(value);

      if ($isNil(idle)) {
        abort("Dynamic zone 'respawn_idle' of '%s' is not a number of game seconds: '%s'.", terrain, value);
      }

      respawnIdleByTerrain.set(terrain, idle);
    }
  }

  return {
    respawnIdle: readIniNumber(ini, "respawn", "idle", false, 86_400),
    respawnIdleByTerrain,
    stalkerRespawnFactor: readIniNumber(ini, "population", "stalker_factor", false, 0.5),
    monsterRespawnFactor: readIniNumber(ini, "population", "monster_factor", false, 0.75),
    baseProtectionRadius: readIniNumber(ini, "hunting", "base_protection_radius", false, 75),
  };
}
