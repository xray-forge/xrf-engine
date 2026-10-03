import { Nillable, TName } from "xray16/lib";
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
import { storyIds } from "@/engine/constants/story_ids";
import { taskIds } from "@/engine/constants/task_ids";
import { zoneNames } from "@/engine/constants/zone_names";
import { taskConfig } from "@/engine/core/managers/tasks/TaskConfig";
import { TaskObject } from "@/engine/core/managers/tasks/TaskObject";
import { hasInfoPortion } from "@/engine/core/utils/info_portion";

const SEARCH_TASK_ID: TName = taskIds.jup_a9_way_to_pripyat_search;
const GAS_TASK_ID: TName = taskIds.jup_a9_way_to_pripyat_gas_info;
const POWER_TASK_ID: TName = taskIds.jup_a9_way_to_pripyat_power_info;
const TECH_TASK_ID: TName = taskIds.jup_a9_way_to_pripyat_tech;

/**
 * Go to a document of the first expedition, lying loose about the Jupiter plant, from another level too.
 *
 * @param storyId - Story id of the document.
 */
function travelToDocument(storyId: TName): void {
  skipJupiterArrival();
  void teleportToStoryObject(storyId, 1);
}

/**
 * Go inside the restrictor that plays a main document's reading scene, as it starts only with the actor inside.
 *
 * @param storyId - Story id of the document, for the level jump from another level.
 * @param zoneName - Restrictor around the document.
 */
function travelToReadingScene(storyId: TName, zoneName: TName): void {
  if (!teleportToZone(zoneName)) {
    travelToDocument(storyId);
  }
}

/**
 * Jupiter a9 way to Pripyat: once Skat-3's evacuation lead and Skat-1's records meet, follow the first expedition's
 * documents through the Jupiter plant, read the three that matter, and bring them to Azot.
 *
 * Reading the gas or power documents before the way documents fails the search task, so this follows the search.
 */
requires({
  state: [
    {
      holds: (): boolean => !hasInfoPortion(infoPortions.jup_a9_tech_way_info),
      missing: "Azot has already read the documents - load a save from before it",
    },
  ],
});

step("1 - search task in the log", {
  reached: (): boolean =>
    $isNotNil(taskConfig.ACTIVE_TASKS.get(SEARCH_TASK_ID)) || hasInfoPortion(infoPortions.jup_a9_way_info),
  verify: (): void => void checkTaskText(SEARCH_TASK_ID, "before any document is found"),
  handOff:
    "search Skat-3 and have Azot decrypt Skat-1's black box - 'zat_b107_logic' gives the search once " +
    "'zat_b107_evacuation_info_full' is set",
});

step("2 - evacuation document taken", {
  reached: (): boolean => hasInfoPortion(infoPortions.jup_a9_evacuation_info_taked),
  travel: (): void => travelToDocument(storyIds.jup_a9_evacuation_info),
  verify: (): void => void checkTaskText(SEARCH_TASK_ID, "pointing at the meeting document"),
  handOff: "pick up the evacuation document",
});

step("3 - meeting document taken", {
  reached: (): boolean => hasInfoPortion(infoPortions.jup_a9_meeting_info_taked),
  travel: (): void => travelToDocument(storyIds.jup_a9_meeting_info),
  verify: (): void => void checkTaskText(SEARCH_TASK_ID, "pointing at the losses document"),
  handOff: "pick up the meeting document",
});

step("4 - losses document taken", {
  reached: (): boolean => hasInfoPortion(infoPortions.jup_a9_losses_info_taked),
  travel: (): void => travelToDocument(storyIds.jup_a9_losses_info),
  verify: (): void => void checkTaskText(SEARCH_TASK_ID, "pointing at the delivery document"),
  handOff: "pick up the losses document",
});

step("5 - delivery document taken", {
  reached: (): boolean => hasInfoPortion(infoPortions.jup_a9_delivery_info_taked),
  travel: (): void => travelToDocument(storyIds.jup_a9_delivery_info),
  verify: (): void => void checkTaskText(SEARCH_TASK_ID, "pointing at the way document"),
  handOff: "pick up the delivery document",
});

step("6 - way document read", {
  reached: (): boolean => hasInfoPortion(infoPortions.jup_a9_way_info),
  travel: (): void => travelToReadingScene(storyIds.jup_a9_way_info, zoneNames.jup_a9_cam_1),
  verify: (): void => {
    expect($isNil(settleTask(SEARCH_TASK_ID)), "search closed", `'${SEARCH_TASK_ID}' is still in the log`);

    for (const taskId of [GAS_TASK_ID, POWER_TASK_ID]) {
      const task: Nillable<TaskObject> = taskConfig.ACTIVE_TASKS.get(taskId);

      expect(
        $isNotNil(task) || hasInfoPortion(infoPortions.jup_a9_actor_found_main_documents),
        `'${taskId}' handed out`,
        "'jup_a9_logic' gives the gas and power tasks once the way document is read first"
      );
    }
  },
  handOff: "pick up the way document - carrying it inside 'jup_a9_cam_1' around it plays the reading scene",
});

step("7 - gas document read", {
  reached: (): boolean => hasInfoPortion(infoPortions.jup_a9_conservation_info),
  travel: (): void => travelToReadingScene(storyIds.jup_a9_conservation_info, zoneNames.jup_a9_cam_2),
  verify: (): void => {
    expect($isNil(settleTask(GAS_TASK_ID)), "gas task closed", `'${GAS_TASK_ID}' is still in the log`);
  },
  handOff: "pick up the gas document - carrying it inside 'jup_a9_cam_2' around it plays the reading scene",
});

step("8 - power document read", {
  reached: (): boolean => hasInfoPortion(infoPortions.jup_a9_power_info),
  travel: (): void => travelToReadingScene(storyIds.jup_a9_power_info, zoneNames.jup_a9_cam_3),
  verify: (): void => {
    expect($isNil(settleTask(POWER_TASK_ID)), "power task closed", `'${POWER_TASK_ID}' is still in the log`);
  },
  handOff: "pick up the power document - carrying it inside 'jup_a9_cam_3' around it plays the reading scene",
});

step("9 - all three read, Azot's task handed out", {
  reached: (): boolean =>
    hasInfoPortion(infoPortions.jup_a9_actor_found_main_documents) &&
    ($isNotNil(taskConfig.ACTIVE_TASKS.get(TECH_TASK_ID)) || hasInfoPortion(infoPortions.jup_a9_tech_way_info)),
  verify: (): void => void checkTaskText(TECH_TASK_ID, "with the documents in hand"),
  handOff: "nothing to do, 'jup_a9_logic' hands out the task once all three are read",
});

step("10 - Azot read the way to Pripyat", {
  reached: (): boolean => hasInfoPortion(infoPortions.jup_a9_tech_way_info),
  travel: (): void => {
    skipJupiterArrival();
    void teleportToStoryObject(storyIds.jup_b217_stalker_tech);
  },
  verify: (): void => {
    expect($isNil(settleTask(TECH_TASK_ID)), "Azot's task closed", `'${TECH_TASK_ID}' is still in the log`);
    expect(
      $isNotNil(taskConfig.ACTIVE_TASKS.get(taskIds.jup_b218_pripyat_group)) ||
        hasInfoPortion(infoPortions.jup_b218_gather_squad_complete),
      "Pripyat group task handed out",
      "'jup_b15_logic' gives 'jup_b218_pripyat_group' once 'jup_a9_tech_way_info' is set"
    );
  },
  handOff: "give Azot the three documents, the 'jup_b217_stalker_tech_main_info' dialog",
});
