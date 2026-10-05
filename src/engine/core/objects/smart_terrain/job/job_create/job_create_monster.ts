import { StringBuilder, TName } from "xray16/lib";
import { $isNotNil } from "xray16/macros";

import type { SmartTerrain } from "@/engine/core/objects/smart_terrain";
import { EJobPathType, EJobType, TSmartTerrainJobsList } from "@/engine/core/objects/smart_terrain/job/job_types";
import { smartTerrainConfig } from "@/engine/core/objects/smart_terrain/SmartTerrainConfig";

/**
 * Create list of default smart terrain jobs for monsters.
 * Usually it assigns monster home for some point.
 *
 * @param terrain - Terrain to create jobs for.
 * @param jobsList - List of jobs to insert into.
 * @param stringBuilder - Builder of large strings to inject LTX.
 * @returns Jobs descriptor and ltx config text for matching jobs.
 */
export function createMonsterJobs(
  terrain: SmartTerrain,
  jobsList: TSmartTerrainJobsList,
  stringBuilder: StringBuilder
): LuaMultiReturn<[TSmartTerrainJobsList, StringBuilder]> {
  const terrainName: TName = terrain.name();

  // ===================================================================================================================
  // = Mob home
  // ===================================================================================================================

  for (const it of $range(1, smartTerrainConfig.JOBS.MOB_HOME.COUNT)) {
    const patrolName: TName = string.format("%s_home_%s", terrainName, it);

    table.insert(jobsList, {
      type: EJobType.MONSTER_HOME,
      isMonsterJob: true,
      priority: smartTerrainConfig.JOBS.MOB_HOME.PRIORITY,
      section: string.format("logic@%s", patrolName),
      pathType: EJobPathType.POINT,
    });

    stringBuilder.append(
      string.format(
        `[logic@%s]
active = mob_home@%s
[mob_home@%s]
gulag_point = true
home_min_radius = %s
home_mid_radius = %s
home_max_radius = %s
`,
        patrolName,
        patrolName,
        patrolName,
        smartTerrainConfig.JOBS.MOB_HOME.MIN_RADIUS,
        smartTerrainConfig.JOBS.MOB_HOME.MID_RADIUS,
        smartTerrainConfig.JOBS.MOB_HOME.MAX_RADIUS
      )
    );

    if ($isNotNil(terrain.defendRestrictor)) {
      stringBuilder.append(string.format("out_restr = %s\n", terrain.defendRestrictor));
    }
  }

  return $multi(jobsList, stringBuilder);
}
