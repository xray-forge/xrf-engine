import { createVector, LuaArray, TNumberId } from "xray16/lib";
import { $fromArray, $fromObject } from "xray16/macros";

import { EPatrolFormation } from "@/engine/core/ai/patrol";
import type { IReachTaskFormationSlot } from "@/engine/core/schemes/stalker/reach_task/reach_task_types";
import type { ReachTaskPatrolController } from "@/engine/core/schemes/stalker/reach_task/ReachTaskPatrolController";

export const reachTaskConfig = {
  // Period of reach task update throttling.
  PATROL_UPDATE_PERIOD: 1000,
  // todo: Delete patrol managers when finalize actions and no participants registered.
  PATROLS: new LuaTable<TNumberId, ReachTaskPatrolController>(),
  FORMATIONS: $fromObject<Partial<Record<EPatrolFormation, LuaArray<IReachTaskFormationSlot>>>>({
    [EPatrolFormation.BACK]: $fromArray<IReachTaskFormationSlot>([
      { dir: createVector(0.7, 0, -0.5), dist: 1.2 },
      { dir: createVector(-0.7, 0, -0.5), dist: 1.2 },
      { dir: createVector(0.4, 0, -1), dist: 2.4 },
      { dir: createVector(-0.4, 0, -1), dist: 2.4 },
      { dir: createVector(0.7, 0, -1), dist: 3.6 },
      { dir: createVector(-0.7, 0, -1), dist: 3.6 },
      { dir: createVector(0.7, 0, -1), dist: 4.8 },
      { dir: createVector(-0.7, 0, -1), dist: 4.8 },
      { dir: createVector(0.7, 0, -1), dist: 6 },
      { dir: createVector(-0.7, 0, -1), dist: 6 },
      { dir: createVector(0.7, 0, -1), dist: 7.2 },
      { dir: createVector(-0.7, 0, -1), dist: 7.2 },
      { dir: createVector(0.7, 0, -1), dist: 8.4 },
      { dir: createVector(-0.7, 0, -1), dist: 8.4 },
      { dir: createVector(0.7, 0, -1), dist: 9.6 },
      { dir: createVector(-0.7, 0, -1), dist: 9.6 },
    ]),
  }),
};
