import { TName } from "xray16/lib";
import { $isNil, $isNotNil } from "xray16/macros";

import { report, requires, step } from "@/engine/checks/framework";
import { checkTaskText, teleportToZone } from "@/engine/checks/framework/world";
import { infoPortions } from "@/engine/constants/info_portions";
import { taskIds } from "@/engine/constants/task_ids";
import { zoneNames } from "@/engine/constants/zone_names";
import { taskConfig } from "@/engine/core/managers/tasks/TaskConfig";
import { hasInfoPortion } from "@/engine/core/utils/info_portion";

const TASK_ID: TName = taskIds.zat_b28_heli_3_crash;

/**
 * Zaton b28 Skat-3 crash site, the helicopter task a new game starts with active: walk into the wreck's restrictor,
 * search it, watch the cutscene, and the task closes.
 */
requires({
  level: "zaton",
  state: [
    {
      holds: (): boolean => !hasInfoPortion(infoPortions.zat_b28_heli_3_searched),
      missing: "Skat-3 has already been searched - load a save from before it",
    },
  ],
});

step("1 - task in the log", {
  reached: (): boolean => $isNotNil(taskConfig.ACTIVE_TASKS.get(TASK_ID)),
  verify: (): void => void checkTaskText(TASK_ID, "before the search"),
  handOff: "start a new game - 'zat_b101_logic' hands out all five helicopter tasks once the intro screen clears",
});

step("2 - search started at the wreck", {
  reached: (): boolean => hasInfoPortion(infoPortions.zat_b28_heli_3_searching),
  travel: (): void => void teleportToZone(zoneNames.zat_b28_heli_3),
  handOff: "press use when the search prompt shows inside the wreck's restrictor",
});

step("3 - wreck searched", {
  reached: (): boolean => hasInfoPortion(infoPortions.zat_b28_heli_3_searched),
  handOff: "watch the cutscene, 'zat_b28_logic' marks the wreck searched as it ends",
});

step("4 - task closed", {
  reached: (): boolean =>
    hasInfoPortion(infoPortions.zat_b28_heli_3_searched) && $isNil(taskConfig.ACTIVE_TASKS.get(TASK_ID)),
  verify: (): void => {
    report("'%s' closes on the search alone and pays no reward_money", TASK_ID);
  },
  handOff: "nothing to do, the task manager completes it on its next update",
});
