import { level } from "xray16";
import { TLabel, TName } from "xray16/lib";
import { $isNil } from "xray16/macros";

import { requires, step } from "@/engine/checks/framework";
import { checkTaskText, holdInZone, teleportToZone } from "@/engine/checks/framework/world";
import { infoPortions } from "@/engine/constants/info_portions";
import { levels } from "@/engine/constants/levels";
import { taskIds } from "@/engine/constants/task_ids";
import { zoneNames } from "@/engine/constants/zone_names";
import { taskConfig } from "@/engine/core/managers/tasks/TaskConfig";
import { hasInfoPortion } from "@/engine/core/utils/info_portion";

const TASK_ID: TName = taskIds.pas_b400_pripyat;

/**
 * A stretch of the underground between two gates.
 */
interface IUndergroundStage {
  /** Where the stage runs, as the step names it. */
  label: TLabel;
  /** Portion `pas_b400_sr_control` sets once the stage is behind the actor. */
  done: TName;
  /** Restrictor past the stage's gate, where the actor's arrival closes the stage. */
  next: TName;
  /** Whether that restrictor hangs in a ladder shaft, so the actor has to be held in it. */
  isInShaft?: boolean;
}

/**
 * The underground in the order the group walks it, from the elevator the descent ends at to the Pripyat exit.
 */
const STAGES: Array<IUndergroundStage> = [
  { label: "elevator", done: infoPortions.pas_b400_elevator_done, next: zoneNames.pas_b400_sr_track_1 },
  { label: "track", done: infoPortions.pas_b400_track_done, next: zoneNames.pas_b400_sr_downstairs_1 },
  { label: "downstairs", done: infoPortions.pas_b400_downstairs_done, next: zoneNames.pas_b400_sr_tunnel_1 },
  { label: "tunnel", done: infoPortions.pas_b400_tunnel_done, next: zoneNames.pas_b400_sr_hall_1 },
  { label: "hall", done: infoPortions.pas_b400_hall_done, next: zoneNames.pas_b400_sr_way_1 },
  { label: "way", done: infoPortions.pas_b400_way_done, next: zoneNames.pas_b400_sr_canalisation_1 },
  { label: "canalisation", done: infoPortions.pas_b400_done, next: zoneNames.pas_b400_sr_exit, isInShaft: true },
];

/**
 * Jupiter underground pas_b400: Zulus's group goes down at the Jupiter plant and walks the underground to Pripyat,
 * gate by gate, through monsters and the Monolith.
 *
 * `pas_b400_sr_control` closes each stage once the actor stands in the first restrictor past its gate, so travel puts
 * the actor there and leaves the gates, the fights and the squad behind.
 */
requires({
  state: [
    {
      holds: (): boolean => hasInfoPortion(infoPortions.jup_b218_gather_squad_complete),
      missing: "the group has not set off yet - walk the 'jup_b218' flow",
    },
    {
      holds: (): boolean => !hasInfoPortion(infoPortions.pas_b400_done),
      missing: "the group is already out of the underground - load a save from before it",
    },
  ],
});

step("1 - underground task in the log", {
  reached: (): boolean => hasInfoPortion(infoPortions.pas_b400_task_given),
  verify: (): void => void checkTaskText(TASK_ID, "at the elevator"),
  handOff:
    "nothing to do, 'jup_b219_sr_control' plays the descent once the group sets off and moves the actor into the " +
    "underground, where 'pas_b400_sr_control' hands out the task",
});

STAGES.forEach((stage, index) => {
  step(`${index + 2} - ${stage.label} crossed`, {
    reached: (): boolean => hasInfoPortion(stage.done),
    travel: (): void => void (stage.isInShaft ? holdInZone(stage.next) : teleportToZone(stage.next)),
    verify: (): void => void checkTaskText(TASK_ID, `past the ${stage.label}`),
    handOff: `nothing to do, 'pas_b400_sr_control' closes the stage once the actor stands in '${stage.next}'`,
  });
});

step(`${STAGES.length + 2} - out in Pripyat, task closed`, {
  reached: (): boolean => level.name() === levels.pripyat && $isNil(taskConfig.ACTIVE_TASKS.get(TASK_ID)),
  handOff:
    "nothing to do, 'pas_b400_sr_control' moves the actor into the Pripyat level changer 25 s after the exit, and " +
    "the task closes on arrival",
});
