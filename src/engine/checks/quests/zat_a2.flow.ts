import { TName } from "xray16/lib";
import { $isNil, $isNotNil } from "xray16/macros";

import { requires, step } from "@/engine/checks/framework";
import { isStagePassed } from "@/engine/checks/framework/stages";
import { checkTaskText, teleportToZone } from "@/engine/checks/framework/world";
import { infoPortions, TInfoPortion } from "@/engine/constants/info_portions";
import { taskIds } from "@/engine/constants/task_ids";
import { zoneNames } from "@/engine/constants/zone_names";
import { taskConfig } from "@/engine/core/managers/tasks/TaskConfig";
import { hasInfoPortion } from "@/engine/core/utils/info_portion";

const TASK_ID: TName = taskIds.zat_a2_reach_base;

/**
 * Portions the arrival moves through, in order. Walking into Skadovsk without asking sets all of them at once.
 */
const STAGES: Array<TInfoPortion> = [
  infoPortions.about_skadovsk_dialog_done,
  infoPortions.zat_a2_reach_base,
  infoPortions.zat_a2_reached_skadovsk,
];

/**
 * Zaton a2 safe place: a new arrival asks any loner or bandit where to stay, is pointed to the Skadovsk, and the task
 * closes on boarding the ship.
 */
requires({
  level: "zaton",
  state: [
    {
      holds: (): boolean => !hasInfoPortion(infoPortions.zat_a2_reached_skadovsk),
      missing: "the actor already reached the Skadovsk - load a save from before it",
    },
  ],
});

step("1 - asked about the Skadovsk", {
  reached: (): boolean => isStagePassed(STAGES, infoPortions.about_skadovsk_dialog_done),
  handOff: "ask any loner or bandit on Zaton about a safe place - they point to the Skadovsk",
});

step("2 - task in the log", {
  reached: (): boolean =>
    $isNotNil(taskConfig.ACTIVE_TASKS.get(TASK_ID)) || isStagePassed(STAGES, infoPortions.zat_a2_reached_skadovsk),
  verify: (): void => void checkTaskText(TASK_ID, "on the way to the Skadovsk"),
  handOff: "nothing to do, 'zat_a1_logic' gives the task on its next update",
});

step("3 - the Skadovsk reached", {
  reached: (): boolean => isStagePassed(STAGES, infoPortions.zat_a2_reached_skadovsk),
  travel: (): void => void teleportToZone(zoneNames.zat_a2_sr_noweap),
  handOff: "board the Skadovsk",
});

step("4 - task completed", {
  reached: (): boolean =>
    hasInfoPortion(infoPortions.zat_a2_reached_skadovsk) && $isNil(taskConfig.ACTIVE_TASKS.get(TASK_ID)),
  handOff: "nothing to do, the task manager completes the task on its next update",
});
