import { level } from "xray16";
import { StringBuilder, TIndex, TName } from "xray16/lib";
import { $isNotNil } from "xray16/macros";

import {
  jobPreconditionGuard,
  jobPreconditionGuardFollower,
} from "@/engine/core/objects/smart_terrain/job/job_precondition";
import { EJobPathType, EJobType, TSmartTerrainJobsList } from "@/engine/core/objects/smart_terrain/job/job_types";
import type { SmartTerrain } from "@/engine/core/objects/smart_terrain/SmartTerrain";
import { smartTerrainConfig } from "@/engine/core/objects/smart_terrain/SmartTerrainConfig";
import { isPatrolInRestrictor } from "@/engine/core/utils/patrol";

/**
 * Create guard jobs for stalkers in smart terrain.
 *
 * @param terrain - Smart terrain to create default animpoint jobs for.
 * @param jobs - List of smart terrain jobs to insert into.
 * @param builder - Builder of large ltx file.
 * @returns Cover jobs list and updated string builder.
 */
export function createStalkerGuardJobs(
  terrain: SmartTerrain,
  jobs: TSmartTerrainJobsList,
  builder: StringBuilder
): LuaMultiReturn<[TSmartTerrainJobsList, StringBuilder]> {
  const terrainName: TName = terrain.name();

  let index: TIndex = 1;

  while (level.patrol_path_exists(string.format("%s_guard_%s_walk", terrainName, index))) {
    const patrolName: TName = string.format("%s_guard_%s_walk", terrainName, index);

    table.insert(jobs, {
      type: EJobType.GUARD,
      priority: smartTerrainConfig.JOBS.STALKER_GUARD.PRIORITY,
      section: string.format("logic@%s", patrolName),
      pathType: EJobPathType.PATH,
      isMonsterJob: false,
      preconditionParameters: {
        wayName: patrolName,
      },
      preconditionFunction: jobPreconditionGuard,
    });

    builder.append(
      string.format(
        `[logic@%s]
active = walker@%s
[walker@%s]
meet = meet@generic_lager
path_walk = guard_%s_walk
path_look = guard_%s_look
`,
        patrolName,
        patrolName,
        patrolName,
        index,
        index
      )
    );

    if ($isNotNil(terrain.safeRestrictor) && isPatrolInRestrictor(terrain.safeRestrictor, patrolName)) {
      builder.append("invulnerable = {=npc_in_zone(smart.safe_restr)} true\n");
    }

    if ($isNotNil(terrain.defendRestrictor)) {
      builder.append(string.format("out_restr = %s\n", terrain.defendRestrictor));
    }

    builder.append(
      string.format(
        `[walker1@%s]
meet = meet@generic_lager
path_walk = guard_%s_walk
path_look = guard_%s_look
def_state_standing = wait_na
on_info = {!is_obj_on_job(logic@follower_%s:3)} walker@%s
on_info2 = {=distance_to_obj_on_job_le(logic@follower_%s:3)} remark@%s
`,
        patrolName,
        index,
        index,
        patrolName,
        patrolName,
        patrolName,
        patrolName
      )
    );

    if ($isNotNil(terrain.safeRestrictor) && isPatrolInRestrictor(terrain.safeRestrictor, patrolName)) {
      builder.append("invulnerable = {=npc_in_zone(smart.safe_restr)} true\n");
    }

    if ($isNotNil(terrain.defendRestrictor)) {
      builder.append(string.format("out_restr = %s\n", terrain.defendRestrictor));
    }

    builder.append(
      string.format(
        `[remark@%s]
anim = wait_na
target = logic@follower_%s
`,
        patrolName,
        patrolName
      )
    );

    if ($isNotNil(terrain.defendRestrictor)) {
      builder.append(string.format("out_restr = %s\n", terrain.defendRestrictor));
    }

    table.insert(jobs, {
      type: EJobType.GUARD_FOLLOWER,
      priority: smartTerrainConfig.JOBS.STALKER_GUARD.PRIORITY_FOLLOWER,
      section: string.format("logic@follower_%s", patrolName),
      pathType: EJobPathType.PATH,
      isMonsterJob: false,
      preconditionParameters: { nextDesiredJob: string.format("logic@%s", patrolName) },
      preconditionFunction: jobPreconditionGuardFollower,
    });

    builder.append(
      string.format(
        `[logic@follower_%s]
active = walker@follow_%s
[walker@follow_%s]
meet = meet@generic_lager
path_walk = guard_%s_walk
path_look = guard_%s_look
on_info = {=distance_to_obj_on_job_le(logic@%s:3)} remark@follower_%s
`,
        patrolName,
        patrolName,
        patrolName,
        index,
        index,
        patrolName,
        patrolName
      )
    );

    if ($isNotNil(terrain.defendRestrictor)) {
      builder.append(string.format("out_restr = %s\n", terrain.defendRestrictor));
    }

    builder.append(
      string.format(
        `[remark@follower_%s]
anim = wait_na
target = logic@%s
on_timer = 2000 | %%=switch_to_desired_job%%
`,
        patrolName,
        patrolName
      )
    );

    if ($isNotNil(terrain.defendRestrictor)) {
      builder.append(string.format("out_restr = %s\n", terrain.defendRestrictor));
    }

    index += 1;
  }

  return $multi(jobs, builder);
}
