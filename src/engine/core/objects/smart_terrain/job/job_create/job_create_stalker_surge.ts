import { level } from "xray16";
import { StringBuilder, TIndex, TName } from "xray16/lib";
import { $isNotNil } from "xray16/macros";

import { jobPreconditionSurge } from "@/engine/core/objects/smart_terrain/job/job_precondition";
import { EJobPathType, EJobType, TSmartTerrainJobsList } from "@/engine/core/objects/smart_terrain/job/job_types";
import { type SmartTerrain } from "@/engine/core/objects/smart_terrain/SmartTerrain";
import { smartTerrainConfig } from "@/engine/core/objects/smart_terrain/SmartTerrainConfig";
import { isPatrolInRestrictor } from "@/engine/core/utils/patrol";

/**
 * Create surge jobs for stalkers in smart terrain.
 *
 * @param terrain - Smart terrain to create default animpoint jobs for.
 * @param jobs - List of smart terrain jobs to insert into.
 * @param builder - Builder of large ltx file.
 * @returns Cover jobs list and updated string builder.
 */
export function createStalkerSurgeJobs(
  terrain: SmartTerrain,
  jobs: TSmartTerrainJobsList,
  builder: StringBuilder
): LuaMultiReturn<[TSmartTerrainJobsList, StringBuilder]> {
  const smartTerrainName: TName = terrain.name();

  let index: TIndex = 1;

  while (level.patrol_path_exists(string.format("%s_surge_%s_walk", smartTerrainName, index))) {
    const patrolName: TName = string.format("%s_surge_%s_walk", smartTerrainName, index);

    table.insert(jobs, {
      type: EJobType.SURGE,
      isMonsterJob: false,
      priority: smartTerrainConfig.JOBS.STALKER_SURGE.PRIORITY,
      section: string.format("logic@%s", patrolName),
      pathType: EJobPathType.PATH,
      preconditionParameters: {},
      preconditionFunction: jobPreconditionSurge,
    });

    builder.append(
      string.format(
        `[logic@%s]
active = walker@%s
[walker@%s]
sound_idle = state
use_camp = true
meet = meet@generic_lager
path_walk = surge_%s_walk
def_state_standing = guard
def_state_moving = patrol
`,
        patrolName,
        patrolName,
        patrolName,
        index
      )
    );

    // Add linked look patrols.
    if (level.patrol_path_exists(string.format("%s_surge_%s_look", smartTerrainName, index))) {
      builder.append(string.format("path_look = surge_%s_look\n", index));
    }

    // Check for defend position restrictions.
    if ($isNotNil(terrain.defendRestrictor)) {
      builder.append(string.format("out_restr = %s\n", terrain.defendRestrictor));
    }

    // Check for combat ignore restrictions.
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
