import { StringBuilder, TName } from "xray16/lib";
import { $isNotNil } from "xray16/macros";

import { EJobPathType, EJobType, TSmartTerrainJobsList } from "@/engine/core/objects/smart_terrain/job/job_types";
import type { SmartTerrain } from "@/engine/core/objects/smart_terrain/SmartTerrain";
import { smartTerrainConfig } from "@/engine/core/objects/smart_terrain/SmartTerrainConfig";

/**
 * Create point jobs for stalkers in smart terrain.
 *
 * @param terrain - Smart terrain to create default animpoint jobs for.
 * @param jobs - List of smart terrain jobs to insert into.
 * @param builder - Builder of large ltx file.
 * @returns Cover jobs list and updated string builder.
 */
export function createStalkerPointJobs(
  terrain: SmartTerrain,
  jobs: TSmartTerrainJobsList,
  builder: StringBuilder
): LuaMultiReturn<[TSmartTerrainJobsList, StringBuilder]> {
  const terrainName: TName = terrain.name();

  for (const index of $range(1, smartTerrainConfig.JOBS.STALKER_POINT.COUNT)) {
    const patrolName: TName = string.format("%s_point_%s", terrainName, index);

    table.insert(jobs, {
      type: EJobType.POINT,
      isMonsterJob: false,
      priority: smartTerrainConfig.JOBS.STALKER_POINT.PRIORITY,
      section: string.format("logic@%s", patrolName),
      pathType: EJobPathType.POINT,
    });

    builder.append(
      string.format(
        `[logic@%s]
active = cover@%s
[cover@%s]
meet = meet@generic_lager
smart = %s
radius_min = %s
radius_max = %s
use_attack_direction = false
anim = {!npc_community(zombied)} sit, guard
`,
        patrolName,
        patrolName,
        patrolName,
        terrainName,
        smartTerrainConfig.JOBS.STALKER_POINT.MIN_RADIUS,
        smartTerrainConfig.JOBS.STALKER_POINT.MAX_RADIUS
      )
    );

    if ($isNotNil(terrain.defendRestrictor)) {
      builder.append(string.format("out_restr = %s\n", terrain.defendRestrictor));
    }

    if (terrain.terrainControl && $isNotNil(terrain.terrainControl.ignoreZone)) {
      // todo: Probably smart.base_on_actor_control.ignore_zone should be injected? Original issue.
      builder.append(
        `combat_ignore_cond = {=npc_in_zone(smart.base_on_actor_control.ignore_zone)} true
combat_ignore_keep_when_attacked = true
`
      );
    }
  }

  return $multi(jobs, builder);
}
