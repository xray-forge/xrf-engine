import { level } from "xray16";
import { TName } from "xray16/lib";
import { $isNil, $isNotNil } from "xray16/macros";

import { expect, report, requires, step } from "@/engine/checks/framework";
import { expectTaskTitleAtStage, isStagePassed } from "@/engine/checks/framework/stages";
import {
  expectActorMoneyGained,
  rememberActorMoney,
  skipJupiterArrival,
  teleportToStoryObject,
  teleportToZone,
} from "@/engine/checks/framework/world";
import { infoPortions, TInfoPortion } from "@/engine/constants/info_portions";
import { weapons } from "@/engine/constants/items/weapons";
import { levels } from "@/engine/constants/levels";
import { storyIds } from "@/engine/constants/story_ids";
import { taskIds } from "@/engine/constants/task_ids";
import { zoneNames } from "@/engine/constants/zone_names";
import { taskConfig } from "@/engine/core/managers/tasks/TaskConfig";
import { hasInfoPortion } from "@/engine/core/utils/info_portion";
import { actorHasItem } from "@/engine/core/utils/item";

const TASK_ID: TName = taskIds.zat_b106_hunt_himera;
const GONTA_STORY_ID: TName = storyIds.zat_b106_stalker_gonta;
const MONEY_BEFORE_KEY: TName = "xrf_b106_money";

/**
 * Portions the hunt moves through, in order. Gonta falling skips his whispers, and walking off after the kill skips
 * the talk with him.
 */
const STAGES: Array<TInfoPortion> = [
  infoPortions.zat_b106_gonta_greeting,
  infoPortions.zat_b106_gonta_accept_actor,
  infoPortions.zat_b106_start_hunt,
  infoPortions.zat_b106_forwarding,
  infoPortions.zat_b106_ahtung,
  infoPortions.zat_b106_chimera_dead,
  infoPortions.zat_b106_chimera_dead_reward,
  infoPortions.zat_b106_stalker_gonta_after_fight_done,
  infoPortions.zat_b106_hunt_finish,
  infoPortions.jup_b220_trapper_zaton_chimera_hunted_told,
];

/**
 * Zaton b106 chimera hunt: Gonta, once the actor has earned his trust, takes him along at night to the chimera's lair
 * with Garmata and Crab. The chimera has to take a hit from the actor, and the trapper in Yanov pays for it, more for
 * a single head shot.
 *
 * Gonta's other task, finding Soroka, is quests_zat_b106_soroka.
 */
requires({
  state: [
    {
      holds: (): boolean => !hasInfoPortion(infoPortions.zat_b106_fail),
      missing: "the hunt already failed - load a save from before it",
    },
    {
      holds: (): boolean => !hasInfoPortion(infoPortions.jup_b220_trapper_zaton_chimera_hunted_told),
      missing: "the trapper already paid for the chimera - load a save from before it",
    },
  ],
});

step("1 - Gonta met in Skadovsk", {
  reached: (): boolean => isStagePassed(STAGES, infoPortions.zat_b106_gonta_greeting),
  travel: (): void => void teleportToZone(zoneNames.zat_b106_sr_infirmary),
  handOff:
    "walk into the Skadovsk infirmary, where Gonta argues with Garmata, and talk to him once he settles at his spot",
});

step("2 - Gonta takes the actor on", {
  reached: (): boolean => isStagePassed(STAGES, infoPortions.zat_b106_gonta_accept_actor),
  travel: (): void => void teleportToStoryObject(GONTA_STORY_ID, 2),
  verify: (): void => {
    if (hasInfoPortion(infoPortions.zat_b106_found_soroka_done)) {
      report("earned by: news of Soroka");
    } else if (hasInfoPortion(infoPortions.zat_b22_stalker_vampire_done)) {
      report("earned by: Tremor's story");
    } else {
      report("earned by: the trapper's word about the chimera");
    }
  },
  handOff:
    "earn Gonta's trust - hear his chimera story and tell him Tremor's, bring him news of Soroka, or ask the trapper " +
    "in Yanov about chimeras first - then he asks the actor along",
});

step("3 - hunt task in the log", {
  reached: (): boolean =>
    $isNotNil(taskConfig.ACTIVE_TASKS.get(TASK_ID)) || isStagePassed(STAGES, infoPortions.zat_b106_start_hunt),
  verify: (): void =>
    expectTaskTitleAtStage(
      TASK_ID,
      STAGES,
      infoPortions.zat_b106_gonta_accept_actor,
      "zat_b106_meet_with_gonta_at_night_name"
    ),
  handOff: "nothing to do, 'zat_b106_sr_quest_line' gives the task on its next update",
});

step("4 - hunt started at night", {
  reached: (): boolean => isStagePassed(STAGES, infoPortions.zat_b106_start_hunt),
  travel: (): void => void teleportToStoryObject(GONTA_STORY_ID, 2),
  verify: (): void =>
    expectTaskTitleAtStage(TASK_ID, STAGES, infoPortions.zat_b106_start_hunt, "zat_b106_meet_with_gonta_at_night_name"),
  handOff: "ask Gonta to set off between 02:45 and 05:00, outside a surge - sleep until then",
});

step("5 - Gonta leads off at the lair", {
  reached: (): boolean => isStagePassed(STAGES, infoPortions.zat_b106_forwarding),
  verify: (): void =>
    expectTaskTitleAtStage(TASK_ID, STAGES, infoPortions.zat_b106_forwarding, "zat_b106_find_chimera_name"),
  handOff:
    "nothing to do - the screen fades, the hunters and the actor arrive at the lair, and Gonta whispers once he sees " +
    "the actor",
});

step("6 - the chimera roused", {
  reached: (): boolean => isStagePassed(STAGES, infoPortions.zat_b106_ahtung),
  verify: (): void =>
    expectTaskTitleAtStage(TASK_ID, STAGES, infoPortions.zat_b106_ahtung, "zat_b106_kill_chimera_name"),
  handOff: "follow Gonta through the lair - he opens fire once he sees the chimera, unless the actor shoots first",
});

step("7 - the chimera dead, hit by the actor", {
  reached: (): boolean => isStagePassed(STAGES, infoPortions.zat_b106_chimera_dead),
  verify: (): void => {
    expect(
      hasInfoPortion(infoPortions.zat_b108_actor_damaged_chimera),
      "actor hit the chimera",
      "the hunters pay only for a chimera the actor hit - otherwise they refuse and the task fails"
    );
    report("killed by: %s", hasInfoPortion(infoPortions.zat_b106_one_hit) ? "a single head shot" : "a fight");
  },
  handOff: "kill the chimera, hitting it at least once yourself - one head shot kills it outright",
});

step("8 - the hunt counted as the actor's", {
  reached: (): boolean => isStagePassed(STAGES, infoPortions.zat_b106_chimera_dead_reward),
  verify: (): void =>
    expectTaskTitleAtStage(TASK_ID, STAGES, infoPortions.zat_b106_chimera_dead_reward, "zat_b106_receipt_reward_name"),
  handOff: "wait by Gonta, or Garmata if Gonta fell, until he praises the hunt",
});

step("9 - the hunters thanked", {
  reached: (): boolean => isStagePassed(STAGES, infoPortions.zat_b106_stalker_gonta_after_fight_done),
  travel: (): void => void teleportToStoryObject(GONTA_STORY_ID, 2),
  verify: (): void => {
    // Gonta hands over his shotgun unless Garmata fell and the chimera took more than one shot; Garmata, talking in
    // his place, has nothing to give.
    const isShotgunGiven: boolean =
      !hasInfoPortion(infoPortions.zat_b106_gonta_dead) &&
      (hasInfoPortion(infoPortions.zat_b106_one_hit) || !hasInfoPortion(infoPortions.zat_b106_garmata_dead));

    if (isShotgunGiven) {
      expect(actorHasItem(weapons.wpn_spas12), "Gonta's shotgun carried", "Gonta gives his SPAS-12 after the hunt");
    }
  },
  handOff: "talk to Gonta after the hunt - he gives his shotgun and offers to head back to Skadovsk",
});

step("10 - the hunt over", {
  reached: (): boolean => isStagePassed(STAGES, infoPortions.zat_b106_hunt_finish),
  handOff: "take Gonta's offer to head back, which fades to Skadovsk, or walk 140 m away from him",
});

step("11 - the trapper paid for the chimera", {
  reached: (): boolean => hasInfoPortion(infoPortions.jup_b220_trapper_zaton_chimera_hunted_told),
  travel: (): void => {
    rememberActorMoney(MONEY_BEFORE_KEY);

    if (level.name() !== levels.jupiter) {
      skipJupiterArrival();
    }

    void teleportToStoryObject(storyIds.jup_b220_trapper, 2);
  },
  verify: (): void =>
    expectActorMoneyGained(
      MONEY_BEFORE_KEY,
      hasInfoPortion(infoPortions.zat_b106_one_hit) ? 3_000 : 2_000,
      "zat_b106_trapper_reward paid"
    ),
  handOff:
    "tell the trapper in Yanov the Zaton chimera is dead - from Zaton the flow first jumps to Jupiter, and the next " +
    "run brings you to him",
});

step("12 - task completed", {
  reached: (): boolean =>
    hasInfoPortion(infoPortions.jup_b220_trapper_zaton_chimera_hunted_told) &&
    $isNil(taskConfig.ACTIVE_TASKS.get(TASK_ID)),
  handOff: "nothing to do, the task manager completes the task on its next update",
});
