import { Nillable, TLabel, TName } from "xray16/lib";
import { $isNotNil } from "xray16/macros";

import { expectEqual, requires, step } from "@/engine/checks/framework";
import { checkTaskText, teleportToServerObject, teleportToStoryObject } from "@/engine/checks/framework/world";
import { infoPortions } from "@/engine/constants/info_portions";
import { storyIds } from "@/engine/constants/story_ids";
import { taskIds } from "@/engine/constants/task_ids";
import { taskConfig } from "@/engine/core/managers/tasks/TaskConfig";
import { TaskObject } from "@/engine/core/managers/tasks/TaskObject";
import { hasInfoPortion } from "@/engine/core/utils/info_portion";

const TASK_ID: TName = taskIds.zat_b38_disappearance_stalkers;
const DEN_TASK_ID: TName = taskIds.zat_b38_den_of_the_bloodsucker_inform_stalkers;
const COP_STORY_ID: TName = storyIds.zat_cop_id;

/**
 * Check the missing stalkers task names the stage it is at, while it still is: a walk run later verifies earlier
 * stages after the title has moved on.
 *
 * @param stage - Title key the stage shows.
 * @param when - What the stage is, for the report.
 * @param next - Info portion that moves the title past this stage.
 */
function expectTitle(stage: TLabel, when: TLabel, next: TName): void {
  if (hasInfoPortion(next)) {
    return;
  }

  const task: Nillable<TaskObject> = checkTaskText(TASK_ID, when);

  expectEqual(task?.currentTitle, stage, string.format("title %s", when));
}

/**
 * Zaton b38 missing stalkers, the first half: Cop sends the actor after Danila the hunter, whose trail leads to the
 * bloodsucker lair in the laboratory. Cop meets the actor there, they fight through the first hall, drop down the lift
 * shaft past the sleeping bloodsuckers and get out through the tunnel, after which Cop goes his own way.
 *
 * The task stays open: the second half, the medic in Skadovsk, is quests_zat_b22. Hitting Cop three times, leaving
 * him 150 m behind or leaving him a day fails it.
 */
requires({
  level: "zaton",
  state: [
    {
      holds: (): boolean => !hasInfoPortion(infoPortions.zat_b38_cop_passed_away),
      missing: "Cop has already gone his own way after the lair - load a save from before it, or walk quests_zat_b22",
    },
    {
      holds: (): boolean =>
        !hasInfoPortion(infoPortions.zat_b38_failed_getaway) && !hasInfoPortion(infoPortions.zat_b38_quest_failed),
      missing: "the escort already failed - Cop was abandoned or attacked - load a save from before it",
    },
  ],
});

step("1 - Cop's job taken", {
  reached: (): boolean => hasInfoPortion(infoPortions.zat_b38_disappearance_stalkers_find_to_be_missing_hunter_give),
  travel: (): void => void teleportToStoryObject(COP_STORY_ID, 2),
  handOff: "ask Cop in Skadovsk what kind of job he can offer and agree to look for the missing stalkers",
});

step("2 - task in the log", {
  reached: (): boolean =>
    hasInfoPortion(infoPortions.zat_b38_disappearance_stalkers_find_to_be_missing_hunter_give_task) &&
    $isNotNil(taskConfig.ACTIVE_TASKS.get(TASK_ID)),
  verify: (): void =>
    expectTitle(
      "zat_b38_disappearance_stalkers_find_to_be_missing_hunter_name",
      "sending the actor after the hunter",
      infoPortions.zat_b38_disappearance_stalkers_meet_ment_give
    ),
  handOff: "stay on Zaton a moment, 'zat_b38_quest_line' hands the task out on its next update",
});

step("3 - the hunter's trail followed", {
  reached: (): boolean => hasInfoPortion(infoPortions.zat_b38_lair_started),
  travel: (): void => void teleportToServerObject("zat_b38_hunter_point_zone"),
  handOff: "go to the spot Cop marked, where Danila the hunter was last seen",
});

step("4 - Cop called about the lair", {
  reached: (): boolean => hasInfoPortion(infoPortions.zat_b38_disappearance_stalkers_meet_ment_give),
  verify: (): void =>
    expectTitle(
      "zat_b38_disappearance_stalkers_meet_ment_name",
      "sending the actor to meet Cop",
      infoPortions.zat_b38_disappearance_stalkers_clean_den_of_the_bloodsucker_give
    ),
  handOff: "wait at the spot - about a game minute later Cop calls over the pda: he found the lair and waits there",
});

step("5 - met Cop in the lair", {
  reached: (): boolean => hasInfoPortion(infoPortions.zat_b38_disappearance_stalkers_clean_den_of_the_bloodsucker_give),
  travel: (): void => void teleportToStoryObject(COP_STORY_ID, 3),
  verify: (): void =>
    expectTitle(
      "zat_b38_disappearance_stalkers_clean_den_of_the_bloodsucker_name",
      "with the lair to clean",
      infoPortions.zat_b38_disappearance_stalkers_get_out_from_den_of_the_bloodsucker_give
    ),
  handOff: "come within 7 m of Cop in the laboratory's first hall; he talks the plan over",
});

step("6 - the hall's two bloodsuckers killed", {
  reached: (): boolean =>
    hasInfoPortion(infoPortions.zat_b38_bloodscuker_1_death) &&
    hasInfoPortion(infoPortions.zat_b38_bloodscuker_2_death),
  handOff: "follow Cop through the first hall and kill the two bloodsuckers that come at you",
});

step("7 - down the lift shaft", {
  reached: (): boolean => hasInfoPortion(infoPortions.zat_b38_underground_door_open),
  handOff: "follow Cop to the broken lift and jump down the shaft after him; he opens the basement door",
});

step("8 - sleeping bloodsuckers found", {
  reached: (): boolean =>
    hasInfoPortion(infoPortions.zat_b38_disappearance_stalkers_get_out_from_den_of_the_bloodsucker_give),
  verify: (): void =>
    expectTitle(
      "zat_b38_disappearance_stalkers_get_out_from_den_of_the_bloodsucker_name",
      "with the way out to find",
      infoPortions.zat_b38_disappearance_stalkers_meet_cop_later_give
    ),
  handOff: "sneak through the basement behind Cop until he spots the sleeping bloodsuckers - do not wake them",
});

step("9 - out of the den, den task in the log", {
  reached: (): boolean =>
    hasInfoPortion(infoPortions.zat_b38_den_of_the_bloodsucker_inform_stalkers_give_task) &&
    $isNotNil(taskConfig.ACTIVE_TASKS.get(DEN_TASK_ID)),
  verify: (): void => void checkTaskText(DEN_TASK_ID, "once Cop asks to tell the stalkers about the lair"),
  handOff: "follow Cop out through the tunnel; outside he asks you to tell the stalkers about the lair",
});

step("10 - Cop went his own way", {
  reached: (): boolean => hasInfoPortion(infoPortions.zat_b38_cop_passed_away),
  verify: (): void =>
    expectTitle(
      "zat_b38_disappearance_stalkers_meet_cop_later_name",
      "sending the actor to meet Cop later",
      infoPortions.zat_b38_disappearance_stalkers_meet_cop_24h_past_give
    ),
  handOff:
    "walk 100 m away from Cop while he is still around - a jump far off takes him offline and he never leaves - " +
    "or go to sleep. quests_zat_b22 picks the task up from there",
});
