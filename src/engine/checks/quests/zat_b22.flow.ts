import { Nillable, TCount, TLabel, TName } from "xray16/lib";
import { $isNil } from "xray16/macros";

import { expectEqual, report, requires, step } from "@/engine/checks/framework";
import { isStageCurrent, isStagePassed } from "@/engine/checks/framework/stages";
import {
  checkTaskText,
  expectActorMoneyGained,
  rememberActorMoney,
  teleportToServerObject,
  teleportToStoryObject,
} from "@/engine/checks/framework/world";
import { infoPortions, TInfoPortion } from "@/engine/constants/info_portions";
import { storyIds } from "@/engine/constants/story_ids";
import { taskIds } from "@/engine/constants/task_ids";
import { taskConfig } from "@/engine/core/managers/tasks/TaskConfig";
import { TaskObject } from "@/engine/core/managers/tasks/TaskObject";
import { hasInfoPortion } from "@/engine/core/utils/info_portion";

const TASK_ID: TName = taskIds.zat_b38_disappearance_stalkers;
const BARMAN_STORY_ID: TName = storyIds.zat_a2_stalker_barmen;
const TASK_REWARD: TCount = 10_000;
const MONEY_BEFORE_KEY: TName = "xrf_b22_money";

/**
 * Portions the task moves through, in order. Walking straight into Tremor's hideout skips the ones before it.
 */
const STAGES: Array<TInfoPortion> = [
  infoPortions.zat_b38_disappearance_stalkers_meet_cop_24h_past_give,
  infoPortions.zat_b38_disappearance_stalkers_find_out_where_is_cop_give,
  infoPortions.zat_b38_disappearance_stalkers_find_cop_near_port_krans_give,
  infoPortions.zat_b38_disappearance_stalkers_deal_with_medic_give,
  infoPortions.zat_b38_disappearance_stalkers_tell_barmen_about_medic_give,
  infoPortions.zat_b22_barmen_gave_reward,
];

/**
 * Check the missing stalkers task names the stage it is at, while it still is.
 *
 * @param stage - Portion of the stage.
 * @param title - Title key the stage shows.
 */
function expectStageTitle(stage: TInfoPortion, title: TLabel): void {
  if (!isStageCurrent(STAGES, stage)) {
    return;
  }

  const task: Nillable<TaskObject> = checkTaskText(TASK_ID, string.format("at '%s'", stage));

  expectEqual(task?.currentTitle, title, string.format("title at '%s'", stage));
}

/**
 * Zaton b38 missing stalkers, the second half: a day after the lair Grouse misses the meeting in Skadovsk, the barman
 * passes on his message about the dock cranes, and the trail ends at Tremor, the Skadovsk medic, who is the killer.
 * Hearing his confession or taking his pda off his body is what the barman pays 10000 for.
 *
 * The first half, the escort through the lair, is quests_zat_b38.
 */
requires({
  level: "zaton",
  state: [
    {
      holds: (): boolean => hasInfoPortion(infoPortions.zat_b38_cop_passed_away),
      missing: "Grouse has not gone his own way after the lair yet - walk quests_zat_b38 first",
    },
    {
      holds: (): boolean => !hasInfoPortion(infoPortions.zat_b22_barmen_gave_reward),
      missing: "the barman already paid for the story - load a save from before it",
    },
  ],
});

step("1 - a day after the lair", {
  reached: (): boolean => isStagePassed(STAGES, infoPortions.zat_b38_disappearance_stalkers_meet_cop_24h_past_give),
  verify: (): void =>
    expectStageTitle(
      infoPortions.zat_b38_disappearance_stalkers_meet_cop_24h_past_give,
      "zat_b38_disappearance_stalkers_meet_cop_24h_past_name"
    ),
  handOff:
    "come back to Skadovsk - 'zat_b22_logic' moves Tremor home only while he is online there - then let a game " +
    "day pass, sleeping counts, and it sends the actor to meet Grouse",
});

step("2 - Grouse missed in Skadovsk", {
  reached: (): boolean => isStagePassed(STAGES, infoPortions.zat_b38_disappearance_stalkers_find_out_where_is_cop_give),
  travel: (): void => void teleportToServerObject("zat_b22_stalker_cop_place"),
  verify: (): void =>
    expectStageTitle(
      infoPortions.zat_b38_disappearance_stalkers_find_out_where_is_cop_give,
      "zat_b38_disappearance_stalkers_find_out_where_is_cop_name"
    ),
  handOff: "go to Grouse's spot in Skadovsk and find it empty",
});

step("3 - the barman passed on Grouse's message", {
  reached: (): boolean =>
    isStagePassed(STAGES, infoPortions.zat_b38_disappearance_stalkers_find_cop_near_port_krans_give),
  travel: (): void => void teleportToStoryObject(BARMAN_STORY_ID, 2),
  verify: (): void =>
    expectStageTitle(
      infoPortions.zat_b38_disappearance_stalkers_find_cop_near_port_krans_give,
      "zat_b38_disappearance_stalkers_find_cop_near_port_krans_name"
    ),
  handOff: "tell the barman you were to meet Grouse - he passes on a message about the dock cranes",
});

step("4 - Tremor's hideout entered", {
  reached: (): boolean => isStagePassed(STAGES, infoPortions.zat_b38_disappearance_stalkers_deal_with_medic_give),
  travel: (): void => void teleportToServerObject("zat_b22_medic_physic_door"),
  verify: (): void => {
    if (!hasInfoPortion(infoPortions.zat_b22_can_go_in)) {
      report("the door never unlocked on the message, so the hideout was entered another way");
    }
  },
  handOff:
    "go to the house by the dock cranes, open the door once Grouse's message is passed on and step inside, " +
    "where Tremor waits",
});

step("5 - Tremor dealt with", {
  reached: (): boolean =>
    isStagePassed(STAGES, infoPortions.zat_b38_disappearance_stalkers_tell_barmen_about_medic_give),
  verify: (): void => {
    report(
      "settled by: %s",
      hasInfoPortion(infoPortions.zat_b22_stalker_vampire_story)
        ? "his story, heard from him or read from his pda"
        : "his death, with no story heard"
    );
  },
  handOff: "hear Tremor out - he confesses and kills himself - or kill him and take his pda off the body as proof",
});

step("6 - the barman paid for the story", {
  reached: (): boolean => hasInfoPortion(infoPortions.zat_b22_barmen_gave_reward),
  travel: (): void => {
    rememberActorMoney(MONEY_BEFORE_KEY);
    void teleportToStoryObject(BARMAN_STORY_ID, 2);
  },
  verify: (): void => {
    if (!hasInfoPortion(infoPortions.zat_b22_stalker_vampire_story)) {
      report("the barman wanted proof, so the story was paid for with Tremor's pda");
    }
  },
  handOff:
    "tell the barman Tremor killed Grouse. Without Tremor's story he wants proof - bring Tremor's pda from his body",
});

step("7 - task completed, reward_money paid", {
  reached: (): boolean =>
    hasInfoPortion(infoPortions.zat_b22_barmen_gave_reward) && $isNil(taskConfig.ACTIVE_TASKS.get(TASK_ID)),
  verify: (): void => {
    // The task manager pays reward_money as it completes the task, on its next update after the barman's dialog.
    expectActorMoneyGained(MONEY_BEFORE_KEY, TASK_REWARD, "reward_money paid");

    report("'%s' completion raises loner goodwill by 200 and gives two hiding places", TASK_ID);
  },
  handOff: "nothing to do, the task manager completes the task on its next update",
});
