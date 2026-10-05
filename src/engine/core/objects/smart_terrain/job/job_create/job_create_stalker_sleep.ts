import { level } from "xray16";
import { StringBuilder, TIndex, TName } from "xray16/lib";
import { $isNotNil } from "xray16/macros";

import { jobPreconditionSleep } from "@/engine/core/objects/smart_terrain/job/job_precondition";
import { EJobPathType, EJobType, TSmartTerrainJobsList } from "@/engine/core/objects/smart_terrain/job/job_types";
import type { SmartTerrain } from "@/engine/core/objects/smart_terrain/SmartTerrain";
import { smartTerrainConfig } from "@/engine/core/objects/smart_terrain/SmartTerrainConfig";
import { isPatrolInRestrictor } from "@/engine/core/utils/patrol";

/**
 * Create sleep jobs for stalkers in smart terrain.
 *
 * @param terrain - Smart terrain to create default animpoint jobs for.
 * @param jobs - List of smart terrain jobs to insert into.
 * @param builder - Builder of large ltx file.
 * @returns Cover jobs list and updated string builder.
 */
export function createStalkerSleepJobs(
  terrain: SmartTerrain,
  jobs: TSmartTerrainJobsList,
  builder: StringBuilder
): LuaMultiReturn<[TSmartTerrainJobsList, StringBuilder]> {
  const terrainName: TName = terrain.name();

  let index: TIndex = 1;

  while (level.patrol_path_exists(string.format("%s_sleep_%s", terrainName, index))) {
    const patrolName: TName = string.format("%s_sleep_%s", terrainName, index);

    table.insert(jobs, {
      type: EJobType.SLEEP,
      isMonsterJob: false,
      priority: smartTerrainConfig.JOBS.STALKER_SLEEP.PRIORITY,
      section: string.format("logic@%s", patrolName),
      pathType: EJobPathType.PATH,
      preconditionParameters: { wayName: patrolName },
      preconditionFunction: jobPreconditionSleep,
    });

    builder.append(
      string.format(
        `[logic@%s]
active = sleeper@%s
[sleeper@%s]
path_main = sleep_%s
`,
        patrolName,
        patrolName,
        patrolName,
        index
      )
    );

    if ($isNotNil(terrain.safeRestrictor) && isPatrolInRestrictor(terrain.safeRestrictor, patrolName)) {
      builder.append("invulnerable = {=npc_in_zone(smart.safe_restr)} true\n");
    }

    if ($isNotNil(terrain.defendRestrictor)) {
      builder.append(string.format("out_restr = %s\n", terrain.defendRestrictor));
    }

    if (
      terrain.terrainControl &&
      $isNotNil(terrain.terrainControl.ignoreZone) &&
      isPatrolInRestrictor(terrain.terrainControl.ignoreZone, patrolName)
    ) {
      builder.append(
        `combat_ignore_cond = {=npc_in_zone(smart.base_on_actor_control.ignore_zone)} true
combat_ignore_keep_when_attacked = true
`
      );
    }

    index += 1;
  }

  return $multi(jobs, builder);
}
