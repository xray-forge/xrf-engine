import { TName } from "xray16/lib";
import { $isNil, $isNotNil } from "xray16/macros";

import { expect, report, requires, step } from "@/engine/checks/framework";
import {
  checkTaskText,
  skipJupiterArrival,
  teleportToPatrol,
  teleportToStoryObject,
} from "@/engine/checks/framework/world";
import { infoPortions } from "@/engine/constants/info_portions";
import { questItems } from "@/engine/constants/items/quest_items";
import { patrolPaths } from "@/engine/constants/patrol_paths";
import { storyIds } from "@/engine/constants/story_ids";
import { taskIds } from "@/engine/constants/task_ids";
import { taskConfig } from "@/engine/core/managers/tasks/TaskConfig";
import { hasInfoPortion } from "@/engine/core/utils/info_portion";
import { actorHasItem } from "@/engine/core/utils/item";

const TASK_ID: TName = taskIds.jup_b9_heli_1_crash;

/**
 * Go to Azot at Yanov, from another level too.
 */
function travelToAzot(): void {
  skipJupiterArrival();
  void teleportToStoryObject(storyIds.jup_b217_stalker_tech);
}

/**
 * Jupiter b9 Skat-1 crash site: search the wreck for its black box, hand it to Azot at Yanov, wait out the decryption,
 * pay him to play the records, and hear what they hold.
 */
requires({
  state: [
    {
      holds: (): boolean => !hasInfoPortion(infoPortions.jup_b9_blackbox_decrypted),
      missing: "Skat-1's black box is already decrypted - load a save from before it",
    },
  ],
});

step("1 - task in the log", {
  reached: (): boolean => $isNotNil(taskConfig.ACTIVE_TASKS.get(TASK_ID)),
  verify: (): void => void checkTaskText(TASK_ID, "before the search"),
  handOff: "start a new game - 'zat_b101_logic' hands out all five helicopter tasks once the intro screen clears",
});

step("2 - search started at the wreck", {
  reached: (): boolean => hasInfoPortion(infoPortions.jup_b9_heli_1_searching),
  // The cutscene's own spot by the wreck, on the ground inside its restrictor. From another level the jump lands at
  // Yanov, and the next run brings the actor to the wreck.
  travel: (): void => {
    if (!teleportToPatrol(patrolPaths.jup_b9_actor_visual_stalker_walk, patrolPaths.jup_b9_actor_visual_stalker_look)) {
      skipJupiterArrival();
      void teleportToStoryObject(storyIds.jup_a6_spot);
    }
  },
  handOff: "press use when the search prompt shows inside the wreck's restrictor",
});

step("3 - wreck searched and its black box taken", {
  reached: (): boolean => hasInfoPortion(infoPortions.jup_b9_heli_1_searched),
  verify: (): void => {
    expect(
      actorHasItem(questItems.jup_b9_blackbox) || hasInfoPortion(infoPortions.jup_b9_blackbox_decrypting),
      "black box accounted for",
      "the cutscene's end in 'jup_b9_logic' gives 'jup_b9_blackbox' with 'jup_b9_heli_1_searched'"
    );
    checkTaskText(TASK_ID, "with the black box found");
  },
  handOff: "watch the cutscene, 'jup_b9_logic' hands over the black box as it ends",
});

step("4 - black box handed to Azot", {
  reached: (): boolean => hasInfoPortion(infoPortions.jup_b9_blackbox_decrypting),
  travel: travelToAzot,
  verify: (): void => {
    expect(!actorHasItem(questItems.jup_b9_blackbox), "black box handed over", "the actor still carries it");
    checkTaskText(TASK_ID, "while it is decrypted");
  },
  handOff: "give Azot the black box at Yanov, the 'jup_b217_stalker_tech_blackbox' dialog",
});

step("5 - decryption finished", {
  reached: (): boolean => hasInfoPortion(infoPortions.jup_b9_blackbox_decrypted_time),
  verify: (): void => void checkTaskText(TASK_ID, "once the decryption time passed"),
  handOff: "wait or sleep - 'jup_b9_logic' finishes the decryption on a game timer",
});

step("6 - records played", {
  reached: (): boolean => hasInfoPortion(infoPortions.jup_b9_blackbox_records_end),
  travel: travelToAzot,
  handOff:
    "pay Azot to play the records, in the 'jup_b217_stalker_tech_blackbox_start' dialog, and listen until they end",
});

step("7 - black box decrypted and the task closed", {
  reached: (): boolean =>
    hasInfoPortion(infoPortions.jup_b9_blackbox_decrypted) && $isNil(taskConfig.ACTIVE_TASKS.get(TASK_ID)),
  travel: travelToAzot,
  verify: (): void => {
    report(
      "Zaton leads: %s",
      hasInfoPortion(infoPortions.zat_a2_stalker_barmen_evacuation_asked)
        ? "followed before the decryption"
        : "still open, so the decryption fails them"
    );
  },
  handOff: "talk to Azot again after the records, the 'jup_b217_stalker_tech_blackbox_start' dialog",
});
