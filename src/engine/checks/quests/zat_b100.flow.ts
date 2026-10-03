import { TName } from "xray16/lib";
import { $isNil, $isNotNil } from "xray16/macros";

import { expect, requires, step } from "@/engine/checks/framework";
import { checkTaskText, teleportToZone } from "@/engine/checks/framework/world";
import { infoPortions } from "@/engine/constants/info_portions";
import { taskIds } from "@/engine/constants/task_ids";
import { zoneNames } from "@/engine/constants/zone_names";
import { taskConfig } from "@/engine/core/managers/tasks/TaskConfig";
import { hasInfoPortion } from "@/engine/core/utils/info_portion";

const TASK_ID: TName = taskIds.zat_b100_heli_2_crash;
const MAPS_TASK_ID: TName = taskIds.zat_b100_guide_maps;

/**
 * Zaton b100 Skat-2 crash site: walk into the wreck's restrictor, search it, watch the cutscene, and the task closes
 * while the maps task opens.
 */
requires({
  level: "zaton",
  state: [
    {
      holds: (): boolean => !hasInfoPortion(infoPortions.zat_b100_heli_2_searched),
      missing: "Skat-2 has already been searched - load a save from before it",
    },
  ],
});

step("1 - task in the log", {
  reached: (): boolean => $isNotNil(taskConfig.ACTIVE_TASKS.get(TASK_ID)),
  verify: (): void => void checkTaskText(TASK_ID, "before the search"),
  handOff: "start a new game - 'zat_b101_logic' hands out all five helicopter tasks once the intro screen clears",
});

step("2 - search started at the wreck", {
  reached: (): boolean => hasInfoPortion(infoPortions.zat_b100_heli_2_searching),
  travel: (): void => void teleportToZone(zoneNames.zat_b100_heli_2),
  handOff: "press use when the search prompt shows inside the wreck's restrictor",
});

step("3 - wreck searched", {
  reached: (): boolean => hasInfoPortion(infoPortions.zat_b100_heli_2_searched),
  handOff: "watch the cutscene, 'zat_b100_heli_2_cat' marks the wreck searched when its sound ends",
});

step("4 - task closed and the maps task handed out", {
  reached: (): boolean =>
    hasInfoPortion(infoPortions.zat_b100_heli_2_searched) && $isNil(taskConfig.ACTIVE_TASKS.get(TASK_ID)),
  verify: (): void => {
    expect(
      $isNotNil(taskConfig.ACTIVE_TASKS.get(MAPS_TASK_ID)),
      "maps task in the log",
      `expected the cutscene's end in 'zat_b100_heli_2_cat' to give '${MAPS_TASK_ID}'`
    );
    checkTaskText(MAPS_TASK_ID, "once the wreck is searched");
  },
  handOff: "wait for the screen to clear - the cutscene's restrictor hands out the maps task as it fades back in",
});
