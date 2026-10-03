import { TName } from "xray16/lib";
import { $isNil, $isNotNil } from "xray16/macros";

import { expect, requires, step } from "@/engine/checks/framework";
import { checkTaskText, settleTask, skipJupiterArrival, teleportToStoryObject } from "@/engine/checks/framework/world";
import { infoPortions } from "@/engine/constants/info_portions";
import { storyIds } from "@/engine/constants/story_ids";
import { taskIds } from "@/engine/constants/task_ids";
import { taskConfig } from "@/engine/core/managers/tasks/TaskConfig";
import { hasInfoPortion } from "@/engine/core/utils/info_portion";

const TASK_ID: TName = taskIds.jup_b218_soldier;

/**
 * Go to Sokolov by the scientists' bunker, from another level too.
 */
function travelToSokolov(): void {
  skipJupiterArrival();
  void teleportToStoryObject(storyIds.pri_a15_sokolov, 2);
}

/**
 * Go to Zulus at Yanov, from another level too.
 */
function travelToZulus(): void {
  skipJupiterArrival();
  void teleportToStoryObject(storyIds.jup_b15_zulus, 2);
}

/**
 * Jupiter b218 soldier: recruit Sokolov, the first expedition's survivor, into Zulus's group. He needs a suit, which the
 * scientists make once the grove's plant is brought back (`jup_b206`).
 */
requires({
  state: [
    {
      holds: (): boolean => hasInfoPortion(infoPortions.jup_b218_pripyat_group_gathering),
      missing: "Zulus is not gathering a group yet - drink with him first, the 'jup_b218' flow",
    },
  ],
});

step("1 - Sokolov told his story", {
  reached: (): boolean => hasInfoPortion(infoPortions.pri_a15_sokolov_jupiter_told),
  travel: travelToSokolov,
  handOff: "ask Sokolov where he is from, then about Jupiter",
});

step("2 - Sokolov agreed to go", {
  reached: (): boolean =>
    hasInfoPortion(infoPortions.jup_b218_soldier_agreed) && $isNotNil(taskConfig.ACTIVE_TASKS.get(TASK_ID)),
  travel: travelToSokolov,
  verify: (): void => void checkTaskText(TASK_ID, "once he agreed"),
  handOff: "invite Sokolov into the group, the 'pri_a15_sokolov_pripyat_group' dialog",
});

step("3 - Sokolov asked for a suit", {
  reached: (): boolean => hasInfoPortion(infoPortions.jup_b218_soldier_need_outfit),
  travel: travelToSokolov,
  handOff: "ask Sokolov what he needs, the 'pri_a15_sokolov_need_outfit' dialog",
});

step("4 - suit arranged", {
  reached: (): boolean => hasInfoPortion(infoPortions.pri_a15_sokolov_arranged_outfit_told),
  travel: travelToSokolov,
  handOff:
    "bring the grove's plant to the biochemist, the 'jup_b206' flow, then tell Sokolov, the " +
    "'pri_a15_sokolov_arranged_outfit' dialog",
});

step("5 - Sokolov hired", {
  reached: (): boolean => hasInfoPortion(infoPortions.jup_b218_soldier_hired),
  travel: travelToSokolov,
  handOff: "send Sokolov to Zulus, the 'pri_a15_sokolov_goto_zulus' dialog",
});

step("6 - Sokolov with Zulus", {
  reached: (): boolean => hasInfoPortion(infoPortions.jup_b218_zulus_met_sokolov),
  handOff: "nothing to do, 'jup_b218_logic' brings him to Zulus in his suit and 'jup_b15_logic' counts him",
});

step("7 - Zulus took him in", {
  reached: (): boolean =>
    hasInfoPortion(infoPortions.jup_b15_zulus_group_soldier_start_told) && $isNil(taskConfig.ACTIVE_TASKS.get(TASK_ID)),
  travel: travelToZulus,
  verify: (): void => {
    expect($isNil(settleTask(TASK_ID)), "soldier task closed", `'${TASK_ID}' is still in the log`);
  },
  handOff: "talk to Zulus about the soldier, the 'jup_b15_zulus_group_soldier_start' dialog",
});
