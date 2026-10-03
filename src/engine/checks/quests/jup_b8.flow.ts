import { TName } from "xray16/lib";
import { $isNil, $isNotNil } from "xray16/macros";

import { requires, step } from "@/engine/checks/framework";
import {
  checkTaskText,
  skipJupiterArrival,
  teleportToPatrol,
  teleportToStoryObject,
} from "@/engine/checks/framework/world";
import { infoPortions } from "@/engine/constants/info_portions";
import { patrolPaths } from "@/engine/constants/patrol_paths";
import { storyIds } from "@/engine/constants/story_ids";
import { taskIds } from "@/engine/constants/task_ids";
import { taskConfig } from "@/engine/core/managers/tasks/TaskConfig";
import { hasInfoPortion } from "@/engine/core/utils/info_portion";

const TASK_ID: TName = taskIds.jup_b8_heli_4_crash;

/**
 * Jupiter b8 Skat-4 crash site: walk into the wreck's restrictor, search it and watch the cutscene. The task closes
 * once Skat-5 on Zaton is searched as well.
 */
requires({
  state: [
    {
      holds: (): boolean => !hasInfoPortion(infoPortions.jup_b8_heli_4_searched),
      missing: "Skat-4 has already been searched - load a save from before it",
    },
  ],
});

step("1 - task in the log", {
  reached: (): boolean => $isNotNil(taskConfig.ACTIVE_TASKS.get(TASK_ID)),
  verify: (): void => void checkTaskText(TASK_ID, "before the search"),
  handOff: "start a new game - 'zat_b101_logic' hands out all five helicopter tasks once the intro screen clears",
});

step("2 - search started at the wreck", {
  reached: (): boolean => hasInfoPortion(infoPortions.jup_b8_heli_4_searching),
  // The cutscene's own spot by the wreck, as the restrictor's centre lies inside the wreck's hull. From another level
  // the jump lands at Yanov, and the next run brings the actor to the wreck.
  travel: (): void => {
    if (!teleportToPatrol(patrolPaths.jup_b8_actor_visual_stalker_walk, patrolPaths.jup_b8_actor_visual_stalker_look)) {
      skipJupiterArrival();
      void teleportToStoryObject(storyIds.jup_a6_spot);
    }
  },
  handOff: "press use when the search prompt shows inside the wreck's restrictor",
});

step("3 - wreck searched", {
  reached: (): boolean => hasInfoPortion(infoPortions.jup_b8_heli_4_searched),
  handOff: "watch the cutscene, 'jup_b8_logik' marks the wreck searched as it fades out",
});

step("4 - task closed with both helicopters' findings", {
  reached: (): boolean =>
    hasInfoPortion(infoPortions.jup_b8_heli_4_searched) && $isNil(taskConfig.ACTIVE_TASKS.get(TASK_ID)),
  handOff:
    "search Skat-5 on Zaton too, if not done - the task closes once 'zat_b101_jup_b8_logic_all' sets " +
    "'zat_b101_both_heli_info'",
});
