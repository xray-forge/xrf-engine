import { CALifeSmartTerrainTask, game_graph, level } from "xray16";
import { IniFile } from "xray16/alias";
import { abort, Nillable, StringBuilder, TName, TNumberId, TSection } from "xray16/lib";
import { $filename } from "xray16/macros";

import { loadDynamicIniFile } from "@/engine/core/database/ini";
import { registry } from "@/engine/core/database/registry";
import type { SmartCover } from "@/engine/core/objects/smart_cover";
import { createExclusiveJobs } from "@/engine/core/objects/smart_terrain/job/job_create/job_create_exclusive";
import { createMonsterJobs } from "@/engine/core/objects/smart_terrain/job/job_create/job_create_monster";
import { createStalkerJobs } from "@/engine/core/objects/smart_terrain/job/job_create/job_create_stalker";
import {
  EJobPathType,
  ISmartTerrainJobDescriptor,
  PATH_FIELDS,
  TSmartTerrainJobsList,
} from "@/engine/core/objects/smart_terrain/job/job_types";
import type { SmartTerrain } from "@/engine/core/objects/smart_terrain/SmartTerrain";
import { LuaLogger } from "@/engine/core/utils/logging";

const logger: LuaLogger = new LuaLogger($filename, { file: "job" });

/**
 * Create jobs for smart terrain.
 * Generate jobs for stalkers and monsters based on available configuration and data.
 *
 * Following types are created:
 * - Monster jobs
 * - Stalker jobs
 * - Exclusive jobs.
 *
 * @param terrain - Smart terrain to generate for.
 * @returns Array of job descriptors and ltx configuration text.
 */
export function createTerrainJobs(terrain: SmartTerrain): LuaMultiReturn<[TSmartTerrainJobsList, IniFile, TName]> {
  logger.info("Create jobs for smart terrain: %s", terrain.name());

  const builder: StringBuilder = new StringBuilder();
  const jobs: TSmartTerrainJobsList = new LuaTable();

  // Exclusive jobs for smart terrain.
  createExclusiveJobs(terrain, jobs);

  // Stalkers part.
  createStalkerJobs(terrain, jobs, builder);

  // Monsters part.
  createMonsterJobs(terrain, jobs, builder);

  const [jobsConfig, jobsConfigName] = loadDynamicIniFile(terrain.name(), builder.build());

  for (const [, job] of jobs) {
    const section: TSection = job.section;
    const ltx: IniFile = job.iniFile || jobsConfig;

    if (!ltx.line_exist(section, "active")) {
      abort("Smart terrain '%s', ltx='%s' no 'active' section %s", terrain.name(), jobsConfigName, section);
    }

    const activeSection: TSection = ltx.r_string(section, "active");

    switch (job.pathType) {
      case EJobPathType.PATH: {
        let pathField: string = "";

        for (const [, possiblePathField] of PATH_FIELDS) {
          if (ltx.line_exist(activeSection, possiblePathField)) {
            pathField = possiblePathField;
            break;
          }
        }

        let pathName: TName = string.format("%s_%s", terrain.name(), ltx.r_string(activeSection, pathField));

        // todo: enum.
        if (pathField === "center_point") {
          if (level.patrol_path_exists(string.format("%s_task", pathName))) {
            pathName = string.format("%s_task", pathName);
          }
        }

        job.alifeTask = new CALifeSmartTerrainTask(pathName);

        break;
      }

      case EJobPathType.SMART_COVER: {
        const smartCoverName: TName = ltx.r_string(activeSection, "cover_name");
        const smartCover: Nillable<SmartCover> = registry.smartCovers.get(smartCoverName);

        if (!smartCover) {
          abort(
            "There is an exclusive job with wrong smart cover name '%s' in smart terrain '%s'.",
            tostring(smartCoverName),
            terrain.name()
          );
        }

        job.alifeTask = new CALifeSmartTerrainTask(smartCover.m_game_vertex_id, smartCover.m_level_vertex_id);

        break;
      }

      case EJobPathType.POINT: {
        job.alifeTask = terrain.smartTerrainAlifeTask as CALifeSmartTerrainTask;

        break;
      }
    }

    job.gameVertexId = job.alifeTask.game_vertex_id();
    job.levelId = game_graph().vertex(job.gameVertexId).level_id();
    job.position = job.alifeTask.position();
  }

  // Sort tasks by priority.
  table.sort(jobs, (a: ISmartTerrainJobDescriptor, b: ISmartTerrainJobDescriptor) => a.priority > b.priority);

  // Create matching IDs links.
  let id: TNumberId = 1;

  for (const [, jobDescriptor] of jobs) {
    jobDescriptor.id = id;
    id += 1;
  }

  return $multi(jobs, jobsConfig, jobsConfigName);
}
