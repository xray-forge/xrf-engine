import { Nillable, TLabel, TName } from "xray16/lib";
import { $isNotNil } from "xray16/macros";

import { expect, expectEqual, requires, step } from "@/engine/checks/framework";
import { checkTaskText, teleportToZone } from "@/engine/checks/framework/world";
import { infoPortions } from "@/engine/constants/info_portions";
import { taskIds } from "@/engine/constants/task_ids";
import { zoneNames } from "@/engine/constants/zone_names";
import { taskConfig } from "@/engine/core/managers/tasks/TaskConfig";
import { TaskObject } from "@/engine/core/managers/tasks/TaskObject";
import { hasInfoPortion } from "@/engine/core/utils/info_portion";

const TASK_ID: TName = taskIds.zat_b101_heli_5_crash;

const ONE_HELI_TITLE: TLabel = "zat_b101_heli_5_crash_name_02";
const BOTH_HELI_TITLE: TLabel = "zat_b101_heli_5_crash_name_03";

/**
 * Zaton b101 Skat-5 crash site: walk into the wreck's restrictor, search it and watch the cutscene. The task stays in
 * the log, retitled after what the search found, until the Pripyat chain closes it.
 */
requires({
  level: "zaton",
  state: [
    {
      holds: (): boolean => !hasInfoPortion(infoPortions.zat_b101_heli_5_searched),
      missing: "Skat-5 has already been searched - load a save from before it",
    },
  ],
});

step("1 - task in the log", {
  reached: (): boolean => $isNotNil(taskConfig.ACTIVE_TASKS.get(TASK_ID)),
  verify: (): void => void checkTaskText(TASK_ID, "before the search"),
  handOff: "start a new game - 'zat_b101_logic' hands out all five helicopter tasks once the intro screen clears",
});

step("2 - search started at the wreck", {
  reached: (): boolean => hasInfoPortion(infoPortions.zat_b101_heli_5_searching),
  travel: (): void => void teleportToZone(zoneNames.zat_b101_heli_5),
  handOff: "press use when the search prompt shows inside the wreck's restrictor",
});

step("3 - wreck searched", {
  reached: (): boolean => hasInfoPortion(infoPortions.zat_b101_heli_5_searched),
  handOff: "watch the cutscene, 'zat_b101_logic' marks the wreck searched as it fades out",
});

step("4 - task retitled after the search", {
  reached: (): boolean =>
    hasInfoPortion(infoPortions.zat_b101_one_heli_info) || hasInfoPortion(infoPortions.zat_b101_both_heli_info),
  verify: (): void => {
    const task: Nillable<TaskObject> = checkTaskText(TASK_ID, "after the search");

    expect(
      $isNotNil(task),
      "task still in the log",
      `'${TASK_ID}' completes only on 'pri_b305_actor_wondered_done', in Pripyat`
    );

    if (hasInfoPortion(infoPortions.zat_b101_both_heli_info)) {
      expectEqual(task?.currentTitle, BOTH_HELI_TITLE, "title for both helicopters found");
    } else if (!hasInfoPortion(infoPortions.jup_b8_heli_4_searching)) {
      expectEqual(task?.currentTitle, ONE_HELI_TITLE, "title for one helicopter found");
    }
  },
  handOff: "nothing to do, 'zat_b101_jup_b8_logic_all' notes the find once the cutscene's sound starts",
});
