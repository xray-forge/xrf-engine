import { TName } from "xray16/lib";
import { $isNil, $isNotNil } from "xray16/macros";

import { expect, requires, step } from "@/engine/checks/framework";
import {
  checkTaskText,
  settleTask,
  skipJupiterArrival,
  teleportToStoryObject,
  teleportToZone,
} from "@/engine/checks/framework/world";
import { infoPortions } from "@/engine/constants/info_portions";
import { questItems } from "@/engine/constants/items/quest_items";
import { storyIds } from "@/engine/constants/story_ids";
import { taskIds } from "@/engine/constants/task_ids";
import { zoneNames } from "@/engine/constants/zone_names";
import { taskConfig } from "@/engine/core/managers/tasks/TaskConfig";
import { hasInfoPortion } from "@/engine/core/utils/info_portion";
import { actorHasItem } from "@/engine/core/utils/item";

const TASK_ID: TName = taskIds.jup_b206_anomalous_grove;

/**
 * Go to the biochemist in the scientists' bunker, from another level too.
 */
function travelToBiochemist(): void {
  skipJupiterArrival();
  void teleportToStoryObject(storyIds.jup_b6_scientist_biochemist);
}

/**
 * Jupiter b206 anomalous grove, the side quest that pays for Sokolov's suit: the biochemist sends the actor for a plant
 * in the grove, and his suit gets made once it is brought back.
 */
requires({
  state: [
    {
      holds: (): boolean => !hasInfoPortion(infoPortions.jup_b206_anomalous_grove_done),
      missing: "the plant has already been brought to the biochemist - load a save from before it",
    },
  ],
});

step("1 - grove task taken from the biochemist", {
  reached: (): boolean =>
    hasInfoPortion(infoPortions.jup_b206_anomalous_grove_started) && $isNotNil(taskConfig.ACTIVE_TASKS.get(TASK_ID)),
  travel: travelToBiochemist,
  verify: (): void => void checkTaskText(TASK_ID, "before the plant is found"),
  handOff:
    "once Sokolov asks for a suit, tell the biochemist, the 'jup_b6_scientist_biochemist_soldier_outfit' dialog, " +
    "then take the grove job, the 'jup_b6_scientist_biochemist_anomalous_grove' dialog",
});

step("2 - plant taken in the grove", {
  reached: (): boolean => hasInfoPortion(infoPortions.jup_b206_anomalous_grove_has_plant),
  travel: (): void => void teleportToZone(zoneNames.jup_b206_sr_quest_line),
  verify: (): void => {
    expect(
      actorHasItem(questItems.jup_b206_plant) || hasInfoPortion(infoPortions.jup_b206_anomalous_grove_done),
      "plant carried",
      "the use prompt in 'jup_b206_sr_quest_line' runs 'jup_b206_get_plant', which gives 'jup_b206_plant'"
    );
  },
  handOff: "press use when the prompt shows in the grove, 'jup_b206_sr_quest_line'",
});

step("3 - plant brought to the biochemist", {
  reached: (): boolean => hasInfoPortion(infoPortions.jup_b206_anomalous_grove_done),
  travel: travelToBiochemist,
  verify: (): void => {
    expect($isNil(settleTask(TASK_ID)), "grove task closed", `'${TASK_ID}' is still in the log`);
    expect(!actorHasItem(questItems.jup_b206_plant), "plant handed over", "the actor still carries it");
  },
  handOff: "give the biochemist the plant, the 'jup_b6_scientist_biochemist_anomalous_plant' dialog",
});
