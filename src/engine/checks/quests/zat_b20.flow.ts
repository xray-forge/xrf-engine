import { TName } from "xray16/lib";
import { $isNil, $isNotNil } from "xray16/macros";

import { report, requires, step } from "@/engine/checks/framework";
import { checkTaskText, teleportToStoryObject, teleportToZone } from "@/engine/checks/framework/world";
import { infoPortions } from "@/engine/constants/info_portions";
import { storyIds } from "@/engine/constants/story_ids";
import { taskIds } from "@/engine/constants/task_ids";
import { zoneNames } from "@/engine/constants/zone_names";
import { taskConfig } from "@/engine/core/managers/tasks/TaskConfig";
import { hasInfoPortion } from "@/engine/core/utils/info_portion";

const TASK_ID: TName = taskIds.zat_b20_plateau_way;
const NOAH_STORY_ID: TName = storyIds.zat_b18_noah;

/**
 * Whether the actor learned the way, from Noah's scene or from his pda.
 *
 * @returns Whether the teleport is known.
 */
function isWayKnown(): boolean {
  return (
    hasInfoPortion(infoPortions.zat_b20_plateau_way_known) || hasInfoPortion(infoPortions.zat_b20_plateau_way_done)
  );
}

/**
 * Zaton b20 way to the plateau where Skat-3 went down: Noah leads the actor to the teleport by the burnt farmstead
 * and jumps through it, and crossing after him lands the actor on the plateau. With Noah dead, his pda tells the way.
 *
 * Searching Skat-3 retires the quest line, so the flow needs the wreck unsearched.
 */
requires({
  level: "zaton",
  state: [
    {
      holds: (): boolean => !hasInfoPortion(infoPortions.zat_b20_plateau_way_done),
      missing: "the teleport has already been crossed - load a save from before it",
    },
    {
      holds: (): boolean => !hasInfoPortion(infoPortions.zat_b28_heli_3_searched),
      missing: "Skat-3 is searched, which retires 'zat_b20_sr_quest_line' - load a save from before the search",
    },
  ],
});

step("1 - task in the log", {
  reached: (): boolean =>
    $isNotNil(taskConfig.ACTIVE_TASKS.get(TASK_ID)) || hasInfoPortion(infoPortions.zat_b20_plateau_way_done),
  travel: (): void => void teleportToStoryObject(NOAH_STORY_ID, 2),
  verify: (): void => void checkTaskText(TASK_ID, "once the way is asked about"),
  handOff:
    "ask Noah about the crashed helicopters and how to get to the plateau - or ask a loner, buy the tip from Owl, " +
    "or come within 65 m of the plateau",
});

step("2 - Noah agreed to lead the way", {
  reached: (): boolean => hasInfoPortion(infoPortions.zat_b20_plateau_way_go) || isWayKnown(),
  travel: (): void => void teleportToStoryObject(NOAH_STORY_ID, 2),
  verify: (): void => {
    if (!hasInfoPortion(infoPortions.zat_b20_plateau_way_go)) {
      report("Noah never agreed, so the way came from his pda");
    }
  },
  handOff: "ask Noah how to get to the plateau and say 'Let's go'. With Noah dead, take the pda off his body instead",
});

step("3 - teleport shown", {
  reached: isWayKnown,
  verify: (): void => void checkTaskText(TASK_ID, "with the teleport known"),
  handOff:
    "watch the scene: Noah walks to the burnt farmstead and jumps through the teleport. With his pda, come within " +
    "30 m of the teleport instead",
});

step("4 - teleport crossed, task closed", {
  reached: (): boolean =>
    hasInfoPortion(infoPortions.zat_b20_plateau_way_done) && $isNil(taskConfig.ACTIVE_TASKS.get(TASK_ID)),
  // Into the anomaly itself, which throws the actor onto the plateau as walking into it does.
  travel: (): void => void teleportToZone(zoneNames.zat_b20_teleport),
  verify: (): void => {
    report("'%s' declares no reward; landing in 'zat_b20_sr_actor_cross_the_teleport' completes it", TASK_ID);
  },
  handOff: "walk into the teleport by the burnt farmstead",
});
