import { TCount, TName } from "xray16/lib";
import { $isNil } from "xray16/macros";

import { expect, report, requires, step } from "@/engine/checks/framework";
import { isStagePassed } from "@/engine/checks/framework/stages";
import {
  checkTaskText,
  expectActorMoneyGained,
  rememberActorMoney,
  teleportToServerObject,
  teleportToStoryObject,
} from "@/engine/checks/framework/world";
import { infoPortions, TInfoPortion } from "@/engine/constants/info_portions";
import { questItems } from "@/engine/constants/items/quest_items";
import { storyIds } from "@/engine/constants/story_ids";
import { taskIds } from "@/engine/constants/task_ids";
import { taskConfig } from "@/engine/core/managers/tasks/TaskConfig";
import { hasInfoPortion } from "@/engine/core/utils/info_portion";
import { actorHasItem } from "@/engine/core/utils/item";

const TASK_ID: TName = taskIds.zat_b38_den_of_the_bloodsucker_inform_stalkers;
const BARMAN_STORY_ID: TName = storyIds.zat_a2_stalker_barmen;
const TASK_REWARD: TCount = 5_000;
const MONEY_BEFORE_KEY: TName = "xrf_b57_money";

/**
 * Portions the den task moves through on the gas route, in order. Owl's tip is optional and killing the nine
 * sleepers skips the gas altogether.
 */
const STAGES: Array<TInfoPortion> = [
  infoPortions.zat_b57_den_of_the_bloodsucker_search_gas_give,
  infoPortions.zat_b57_nimble_talk_about_gas,
  infoPortions.zat_b12_find_the_way_to_open,
  infoPortions.zat_b12_find_keys_and_open,
  infoPortions.zat_b12_actor_have_keys,
  infoPortions.zat_b57_actor_has_gas,
  infoPortions.zat_b57_den_of_the_bloodsucker_twist_vintil_give,
  infoPortions.zat_b57_den_of_the_bloodsucker_wait_destroy_give,
  infoPortions.zat_b57_den_of_the_bloodsucker_tell_stalkers_about_destroy_lair_give,
  infoPortions.zat_b38_den_of_the_bloodsucker_complete,
];

/**
 * Zaton b57 den of the bloodsuckers, given as Grouse leaves the lair: the barman wants it gassed, Owl knows the gas
 * sits in the locked container at the b12 bunker, its two keys lie in two boxes nearby, and the gas goes into the
 * lair's ventilation. Killing the nine sleepers outright closes the task the same way.
 */
requires({
  level: "zaton",
  state: [
    {
      holds: (): boolean => hasInfoPortion(infoPortions.zat_b38_den_of_the_bloodsucker_inform_stalkers_give_task),
      missing: "the den task is not given yet - Grouse hands it out on the way out of the lair, see quests_zat_b38",
    },
    {
      holds: (): boolean => !hasInfoPortion(infoPortions.zat_b38_den_of_the_bloodsucker_complete),
      missing: "the barman already paid for the den - load a save from before it",
    },
  ],
});

step("1 - the barman wants the lair gassed", {
  reached: (): boolean => isStagePassed(STAGES, infoPortions.zat_b57_den_of_the_bloodsucker_search_gas_give),
  travel: (): void => void teleportToStoryObject(BARMAN_STORY_ID, 2),
  verify: (): void => void checkTaskText(TASK_ID, "with the gas to find"),
  handOff: "tell the barman about the bloodsucker lair - he wants it gassed",
});

step("2 - Owl told where the gas is", {
  reached: (): boolean => isStagePassed(STAGES, infoPortions.zat_b57_nimble_talk_about_gas),
  travel: (): void => void teleportToStoryObject(storyIds.zat_b30_owl_stalker_trader_id, 2),
  handOff: "buy the tip about gas from Owl. Optional: the container can be found without it",
});

step("3 - the container found locked", {
  reached: (): boolean => isStagePassed(STAGES, infoPortions.zat_b12_find_the_way_to_open),
  travel: (): void => void teleportToServerObject("zat_b12_container"),
  handOff: "try to open the container in the b12 bunker - it has two locks",
});

step("4 - the bunker's documents read", {
  reached: (): boolean => isStagePassed(STAGES, infoPortions.zat_b12_find_keys_and_open),
  travel: (): void => void teleportToServerObject("zaton_zat_b12_documents_2"),
  handOff: "pick up the documents by the container - they say where the keys are",
});

step("5 - both keys found", {
  reached: (): boolean => isStagePassed(STAGES, infoPortions.zat_b12_actor_have_keys),
  travel: (): void =>
    void teleportToServerObject(actorHasItem(questItems.zat_b12_key_1) ? "zat_b12_key_2_box" : "zat_b12_key_1_box"),
  handOff: "take the keys from the two boxes the documents name",
});

step("6 - gas taken from the container", {
  reached: (): boolean => isStagePassed(STAGES, infoPortions.zat_b57_actor_has_gas),
  travel: (): void => void teleportToServerObject("zat_b12_container"),
  handOff: "open both locks of the container and take the gas cylinder",
});

step("7 - gas placed in the lair", {
  reached: (): boolean => isStagePassed(STAGES, infoPortions.zat_b57_den_of_the_bloodsucker_twist_vintil_give),
  travel: (): void => void teleportToServerObject("zat_b57_gas_actor"),
  handOff: "carry the cylinder into the lair's ventilation room and use the stand to fit it",
});

step("8 - valve turned", {
  reached: (): boolean => isStagePassed(STAGES, infoPortions.zat_b57_den_of_the_bloodsucker_wait_destroy_give),
  handOff: "turn the valve next to the fitted cylinder",
});

step("9 - the sleepers dead", {
  reached: (): boolean =>
    isStagePassed(STAGES, infoPortions.zat_b57_den_of_the_bloodsucker_tell_stalkers_about_destroy_lair_give),
  verify: (): void => {
    report(
      "cleared by: %s",
      hasInfoPortion(infoPortions.zat_b57_den_of_the_bloodsucker_wait_destroy_give) ? "the gas" : "killing all nine"
    );
  },
  handOff: "wait outside for the gas to finish the sleepers - or kill all nine yourself",
});

step("10 - the barman paid, task completed", {
  reached: (): boolean =>
    hasInfoPortion(infoPortions.zat_b38_den_of_the_bloodsucker_complete) &&
    $isNil(taskConfig.ACTIVE_TASKS.get(TASK_ID)),
  travel: (): void => {
    rememberActorMoney(MONEY_BEFORE_KEY);
    void teleportToStoryObject(BARMAN_STORY_ID, 2);
  },
  verify: (): void => {
    expect(
      hasInfoPortion(infoPortions.zat_b57_bloodsucker_lair_clear),
      "on_complete applied",
      "expected on_complete to give 'zat_b57_bloodsucker_lair_clear'"
    );
    // The task manager pays reward_money as it completes the task, on its next update after the barman's dialog.
    expectActorMoneyGained(MONEY_BEFORE_KEY, TASK_REWARD, "reward_money paid");
  },
  handOff: "tell the barman the lair is destroyed",
});
