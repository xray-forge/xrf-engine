import { Nillable, TName } from "xray16/lib";
import { $isNil, $isNotNil } from "xray16/macros";

import { expectEqual, report, requires, step } from "@/engine/checks/framework";
import { checkTaskText, teleportToStoryObject } from "@/engine/checks/framework/world";
import { infoPortions } from "@/engine/constants/info_portions";
import { storyIds } from "@/engine/constants/story_ids";
import { taskIds } from "@/engine/constants/task_ids";
import { taskConfig } from "@/engine/core/managers/tasks/TaskConfig";
import { TaskObject } from "@/engine/core/managers/tasks/TaskObject";
import { hasInfoPortion } from "@/engine/core/utils/info_portion";

const TASK_ID: TName = taskIds.zat_b100_guide_maps;
const GUIDE_STORY_ID: TName = storyIds.zat_b215_stalker_guide_zaton;

/**
 * Zaton b100 maps for the guide: the Skat-2 search turns up maps of the area between Zaton and Jupiter, a loner
 * points at Pilot, the guide who walks stalkers between Skadovsk and Yanov, and he takes the maps once he has told the
 * actor where he guides to.
 */
requires({
  level: "zaton",
  state: [
    {
      holds: (): boolean => !hasInfoPortion(infoPortions.zat_b215_gave_maps),
      missing: "the guide already has the maps - load a save from before they were handed over",
    },
  ],
});

step("1 - maps found, task in the log", {
  reached: (): boolean =>
    hasInfoPortion(infoPortions.zat_b100_guide_maps_gived) && $isNotNil(taskConfig.ACTIVE_TASKS.get(TASK_ID)),
  verify: (): void => {
    if (!hasInfoPortion(infoPortions.zat_b100_guide_need_maps)) {
      const task: Nillable<TaskObject> = checkTaskText(TASK_ID, "before anyone names the guide");

      expectEqual(task?.currentTitle, "zat_b100_guide_maps_01_name", "title asking who needs the maps");
    }
  },
  handOff: "search the Skat-2 wreck - quests_zat_b100 - and 'zat_b100_heli_2_cat' hands the task out after the scene",
});

step("2 - a loner named the guide", {
  reached: (): boolean =>
    hasInfoPortion(infoPortions.zat_b100_guide_need_maps) || hasInfoPortion(infoPortions.zat_b215_gave_maps),
  verify: (): void => {
    if (hasInfoPortion(infoPortions.zat_b215_gave_maps)) {
      return;
    }

    const task: Nillable<TaskObject> = checkTaskText(TASK_ID, "with the guide named");

    expectEqual(task?.currentTitle, "zat_b100_guide_maps_02_name", "title sending the actor to the guide");
  },
  handOff:
    "ask any loner a question - 'Who could be interested in maps of the area between Zaton and Jupiter?'. " +
    "Optional: the guide takes the maps without it",
});

step("3 - the guide asked where he leads", {
  reached: (): boolean =>
    hasInfoPortion(infoPortions.zat_b215_asked_about_locations) || hasInfoPortion(infoPortions.zat_b215_gave_maps),
  travel: (): void => void teleportToStoryObject(GUIDE_STORY_ID, 2),
  handOff: "ask Pilot, the guide in Skadovsk, where he can take you - his maps dialog opens only after that",
});

step("4 - maps handed to the guide, task closed", {
  reached: (): boolean =>
    hasInfoPortion(infoPortions.zat_b215_gave_maps) && $isNil(taskConfig.ACTIVE_TASKS.get(TASK_ID)),
  travel: (): void => void teleportToStoryObject(GUIDE_STORY_ID, 2),
  verify: (): void => {
    report("'%s' declares no reward_money and no on_complete", TASK_ID);
  },
  handOff: "offer the guide the maps of the area between Zaton and Jupiter",
});
