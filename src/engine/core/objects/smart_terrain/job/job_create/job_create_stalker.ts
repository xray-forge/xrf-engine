import { StringBuilder } from "xray16/lib";

/* eslint max-len: 0 */

import type { SmartTerrain } from "@/engine/core/objects/smart_terrain";
import { createStalkerAnimpointJobs } from "@/engine/core/objects/smart_terrain/job/job_create/job_create_stalker_animpoint";
import { createStalkerCamperJobs } from "@/engine/core/objects/smart_terrain/job/job_create/job_create_stalker_camper";
import { createStalkerCollectorJobs } from "@/engine/core/objects/smart_terrain/job/job_create/job_create_stalker_collector";
import { createStalkerGuardJobs } from "@/engine/core/objects/smart_terrain/job/job_create/job_create_stalker_guard";
import { createStalkerPatrolJobs } from "@/engine/core/objects/smart_terrain/job/job_create/job_create_stalker_patrol";
import { createStalkerPointJobs } from "@/engine/core/objects/smart_terrain/job/job_create/job_create_stalker_point";
import { createStalkerSleepJobs } from "@/engine/core/objects/smart_terrain/job/job_create/job_create_stalker_sleep";
import { createStalkerSniperJobs } from "@/engine/core/objects/smart_terrain/job/job_create/job_create_stalker_sniper";
import { createStalkerSurgeJobs } from "@/engine/core/objects/smart_terrain/job/job_create/job_create_stalker_surge";
import { createStalkerWalkerJobs } from "@/engine/core/objects/smart_terrain/job/job_create/job_create_stalker_walker";
import { TSmartTerrainJobsList } from "@/engine/core/objects/smart_terrain/job/job_types";

/**
 * Create list of jobs for stalkers in smart terrain.
 *
 * @param terrain - Smart terrain to create default animpoint jobs for.
 * @param jobs - List of smart terrain jobs to insert into.
 * @param builder - Builder of large ltx file.
 * @returns Cover jobs list and updated string builder.
 */
export function createStalkerJobs(
  terrain: SmartTerrain,
  jobs: TSmartTerrainJobsList,
  builder: StringBuilder
): LuaMultiReturn<[TSmartTerrainJobsList, StringBuilder]> {
  builder.append(`[meet@generic_lager]
close_distance = {=is_wounded} 0, 2
close_anim = {=is_wounded} nil, {!is_squad_commander} nil, {=actor_has_weapon} threat_na, talk_default
close_snd_hello = {=is_wounded} nil, {!is_squad_commander} nil, {=actor_enemy} nil, {=actor_has_weapon} meet_hide_weapon, meet_hello
close_snd_bye = nil
close_victim = {=is_wounded} nil, {!is_squad_commander} nil, actor
far_distance = 0
far_anim = nil
far_snd = nil
far_victim = nil
use = {=is_wounded} false, {!is_squad_commander} false, {=actor_enemy} false, {=has_enemy} false, {=actor_has_weapon} false, {=dist_to_actor_le(3)} true, false
snd_on_use = {=is_wounded} nil, {=actor_enemy} nil, {!is_squad_commander} meet_use_no_talk_leader, {=actor_has_weapon} meet_use_no_weapon, {=has_enemy} meet_use_no_fight, nil
meet_dialog = nil
abuse = {=has_enemy} false, true
trade_enable = true
allow_break = true
use_text = nil
[meet@generic_animpoint]
close_distance = 0
close_anim = nil
close_snd_hello = nil
close_snd_bye = nil
close_victim = nil
far_distance = 0
far_anim = nil
far_snd = nil
far_victim = nil
use = {=is_wounded} false, {!is_squad_commander} false, {=actor_enemy} false, {=has_enemy} false, {=actor_has_weapon} false, {=dist_to_actor_le(3)} true, false
snd_on_use = {=is_wounded} nil, {=actor_enemy} nil, {!is_squad_commander} meet_use_no_talk_leader, {=actor_has_weapon} meet_use_no_weapon, {=has_enemy} meet_use_no_fight, nil
meet_dialog = nil
abuse = {=has_enemy} false, true
trade_enable = true
allow_break = true
meet_on_talking = false
use_text = nil
`);

  createStalkerSurgeJobs(terrain, jobs, builder);
  createStalkerCamperJobs(terrain, jobs, builder);
  createStalkerSniperJobs(terrain, jobs, builder);
  createStalkerCollectorJobs(terrain, jobs, builder);
  createStalkerGuardJobs(terrain, jobs, builder);
  createStalkerPatrolJobs(terrain, jobs, builder);
  createStalkerWalkerJobs(terrain, jobs, builder);
  createStalkerAnimpointJobs(terrain, jobs, builder);
  createStalkerSleepJobs(terrain, jobs, builder);
  createStalkerPointJobs(terrain, jobs, builder);

  return $multi(jobs, builder);
}
