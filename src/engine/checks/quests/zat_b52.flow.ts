import { GameObject } from "xray16/alias";
import { ACTOR_ID, createVector, Nillable, TCount, TIndex, TLabel, TName, TSection } from "xray16/lib";
import { $isNil, $isNotNil } from "xray16/macros";

import { expect, expectEqual, report, requires, step } from "@/engine/checks/framework";
import {
  checkTaskText,
  skipJupiterArrival,
  teleportToPatrol,
  teleportToPoint,
  teleportToStoryObject,
  teleportToZone,
} from "@/engine/checks/framework/world";
import { teleportToNimble } from "@/engine/checks/quests/zaton_places";
import { infoPortions } from "@/engine/constants/info_portions";
import { nimbleWeapons } from "@/engine/constants/items/weapons";
import { levels } from "@/engine/constants/levels";
import { patrolPaths } from "@/engine/constants/patrol_paths";
import { storyIds } from "@/engine/constants/story_ids";
import { taskIds } from "@/engine/constants/task_ids";
import { zoneNames } from "@/engine/constants/zone_names";
import {
  getPortableStoreValue,
  getServerObjectByStoryId,
  registry,
  setPortableStoreValue,
} from "@/engine/core/database";
import { taskConfig } from "@/engine/core/managers/tasks/TaskConfig";
import { TaskObject } from "@/engine/core/managers/tasks/TaskObject";
import { Squad } from "@/engine/core/objects/squad";
import { hasInfoPortion } from "@/engine/core/utils/info_portion";
import { isAnySquadMemberEnemyToActor } from "@/engine/core/utils/relation";
import { giveMoneyToActor } from "@/engine/core/utils/reward";

const TASK_ID: TName = taskIds.zat_b52_reputation;

const SNAG_STORY_ID: TName = storyIds.zat_b33_stalker_snag;
const NIMBLE_STORY_ID: TName = storyIds.zat_a2_stalker_nimble_id;
const SNAG_PLACE_ZONE: TName = zoneNames.zat_b52_snag_place;
const PORT_CRANES_ZONE: TName = zoneNames.zat_b52_snag_port_cranes;
const SUBSTATION_ZONE: TName = zoneNames.jup_b202_logic;
const BANDIT_LEADER_STORY_ID: TName = storyIds.port_bandit_1_leader_id;
const BANDITS_SQUAD_STORY_ID: TName = storyIds.zat_b52_port_bandits;
const JUPITER_SNAG_STORY_ID: TName = storyIds.jup_b202_stalker_snag;
const YANOV_TECH_STORY_ID: TName = storyIds.jup_b217_stalker_tech;
const JUPITER_BANDIT_STORY_ID: TName = storyIds.jup_b202_bandit;
const ACTOR_STASH_STORY_ID: TName = storyIds.jup_b202_actor_treasure;

const FIND_SNAG_TITLE: TLabel = "zat_b52_reputation_find_snag_name";
const PDA_DESCRIPTION: TLabel = "zat_b52_reputation_find_snag_text_5";

const ORDER_MONEY_KEY: TName = "xrf_b52_order_money";

/**
 * Which of Nimble's weapons the actor is carrying in a weapon slot.
 *
 * @returns Section of the slotted weapon, or null when there is none.
 */
function resolveActiveNimbleWeapon(): Nillable<TSection> {
  for (const slot of $range(2, 3)) {
    const item: Nillable<GameObject> = registry.actor.item_in_slot(slot as TIndex);

    if ($isNotNil(item) && nimbleWeapons[item!.section()]) {
      return item!.section();
    }
  }

  return null;
}

/**
 * Put enough money in the actor's pocket to place that order, at most once per save.
 */
function grantOrderMoneyOnce(): void {
  if (getPortableStoreValue<TCount>(ACTOR_ID, ORDER_MONEY_KEY, 0) > 0) {
    return;
  }

  const nimbleOrderPrepay: TCount = 1_400;
  const nimbleOrderCost: TCount = 2_800;
  const amount: TCount = nimbleOrderPrepay + nimbleOrderCost;

  giveMoneyToActor(amount);
  setPortableStoreValue<TCount>(ACTOR_ID, ORDER_MONEY_KEY, amount);
  report("handed the actor %s to order a gun from Nimble, once for this save", amount);
}

/**
 * How the meeting with the port bandits ended, if it has.
 *
 * @returns What settled the meeting, or null while it is still open.
 */
function resolveBanditOutcome(): Nillable<TLabel> {
  if (hasInfoPortion(infoPortions.zat_b52_robbery_done)) {
    return "they were paid off";
  } else if (hasInfoPortion(infoPortions.zat_b52_robbery_no)) {
    return "they were refused";
  } else if (hasInfoPortion(infoPortions.zat_b52_bandit_leader_is_dead)) {
    return "their leader was killed";
  } else if (hasInfoPortion(infoPortions.zat_b52_actor_has_port_bandits_pda)) {
    return "the leader's pda was looted";
  }

  const squad: Nillable<Squad> = getServerObjectByStoryId(BANDITS_SQUAD_STORY_ID);

  if (squad && isAnySquadMemberEnemyToActor(squad)) {
    return "they turned hostile";
  }

  return null;
}

/**
 * Zaton b52 reputation chain, watched along the trail the quest lays: Snag recognises one of Nimble's
 * guns, Nimble talks himself clear, Snag disappears, and the search runs from his spot in Skadovsk out
 * to the dock cranes, through the port bandits and finally over to Jupiter.
 *
 * Only the b33 Zaporozhets task opens this, and only the b202 stash theft on Jupiter closes it, so both
 * ends of the chain sit outside this flow.
 */
requires({
  state: [
    {
      holds: (): boolean =>
        !hasInfoPortion(infoPortions.jup_b202_snag_on_jup_founded) &&
        !hasInfoPortion(infoPortions.zat_b52_snag_is_dead),
      missing: "Snag has already been found or killed, so this chain is finished - load a save from before it",
    },
    {
      holds: (): boolean =>
        hasInfoPortion(infoPortions.zat_b52_reputation_task_open) || hasInfoPortion(infoPortions.zat_b33_refuse_task),
      missing:
        "Snag ignores the weapon until the b33 Zaporozhets task is settled - hand the package in, turn the job down, " +
        "or pay Cardan to cut the container open first",
    },
  ],
});

step("1 - one of Nimble's weapons in a slot", {
  reached: (): boolean =>
    $isNotNil(resolveActiveNimbleWeapon()) || hasInfoPortion(infoPortions.zat_b52_snag_know_weapon),
  travel: (): void => {
    teleportToNimble();
    grantOrderMoneyOnce();
  },
  verify: (): void => {
    const weapon: Nillable<TSection> = resolveActiveNimbleWeapon();

    report(
      $isNil(weapon)
        ? "no gun in the slots any more, so this step rests on 'zat_b52_snag_know_weapon' instead"
        : `slotted: ${tostring(weapon)}`
    );
  },
  handOff:
    "order a pistol from Nimble - category one - then sleep for 24h and come back for it. Put it in a weapon slot, " +
    "not the backpack",
});

step("2 - Snag recognised the Nimble weapon", {
  reached: (): boolean => hasInfoPortion(infoPortions.zat_b52_snag_know_weapon),
  // He opens the talk only within 5 m of an actor standing inside 'zat_b52_actor_restr', around his spot.
  travel: (): void => void teleportToStoryObject(SNAG_STORY_ID, 2),
  verify: (): void => {
    report(
      "my_gun dialog: %s",
      hasInfoPortion(infoPortions.zat_b33_stalker_snag_b52_my_gun_dialog_done)
        ? "seen through to an ending phrase"
        : "broken off before one, so it can still reopen"
    );
  },
  handOff:
    "carry one of Nimble's weapons in a weapon slot and walk up to Snag in Skadovsk, inside 'zat_b52_actor_restr'",
});

step("3 - Nimble cleared his name", {
  reached: (): boolean => hasInfoPortion(infoPortions.zat_b52_nimble_clear),
  travel: (): void => void teleportToNimble(),
  verify: (): void => {
    expect(
      hasInfoPortion(infoPortions.zat_b51_stalker_nimble_b52_about_gun_questions_dialog_done),
      "dialog closed with its portion pair",
      "all three phrases that give 'zat_b52_nimble_clear' also give " +
        "'zat_b51_stalker_nimble_b52_about_gun_questions_dialog_done', which is what stops the dialog reopening"
    );
  },
  handOff: "ask Nimble about the gun, in Skadovsk",
});

step("4 - reputation task handed out", {
  reached: (): boolean =>
    hasInfoPortion(infoPortions.zat_b52_reputation_give) && $isNotNil(taskConfig.ACTIVE_TASKS.get(TASK_ID)),
  verify: (): void => {
    const task: Nillable<TaskObject> = checkTaskText(TASK_ID, "once the task is handed out");

    expectEqual(task?.state, null, "state with no branch satisfied");

    expect(
      hasInfoPortion(infoPortions.zat_b52_port_bandits_spawn),
      "port bandits spawned",
      "expected 'zat_b52_port_bandits_spawn', which is what guards create_squad(zat_b52_port_bandits:zat_b52)"
    );
    expect(
      $isNotNil(getServerObjectByStoryId(BANDITS_SQUAD_STORY_ID)),
      "port bandits squad registered",
      `nothing is registered under story id '${BANDITS_SQUAD_STORY_ID}'`
    );
    expect(
      $isNil(getServerObjectByStoryId(SNAG_STORY_ID)),
      "Snag removed from Skadovsk",
      `'${SNAG_STORY_ID}' is still registered - his animpoint destroys him on its next update, so this can only ` +
        "fail if he never went online while the portion was set"
    );
  },
  handOff: "stay on Zaton a moment, the b52 quest line restrictor hands the task out on its next update",
});

step("5 - Snag is gone from his spot", {
  reached: (): boolean => hasInfoPortion(infoPortions.zat_b52_snag_no_place),
  travel: (): void => {
    if (!teleportToZone(SNAG_PLACE_ZONE)) {
      void teleportToStoryObject(NIMBLE_STORY_ID);
    }
  },
  verify: (): void => {
    checkTaskText(TASK_ID, "with his spot found empty");
  },
  handOff: "walk into the 'zat_b52_snag_place' zone, where Snag used to sit",
});

step("6 - told where Snag went", {
  reached: (): boolean => hasInfoPortion(infoPortions.zat_b52_snag_port_cranes),
  travel: (): void => void teleportToPatrol(patrolPaths.zat_b29_actor_base_walk, patrolPaths.zat_b29_actor_base_look),
  verify: (): void => {
    function resolveCranesInformant(): Nillable<TLabel> {
      if (hasInfoPortion(infoPortions.zat_a2_stalker_barmen_b52_about_snag)) {
        return "the Skadovsk barman";
      } else if (hasInfoPortion(infoPortions.zat_b7_bandit_boss_sultan_b52_about_snag)) {
        return "Sultan";
      } else if (hasInfoPortion(infoPortions.zat_b38_stalker_cop_b52_about_snag)) {
        return "Cop";
      }

      return null;
    }

    const informant: Nillable<TLabel> = resolveCranesInformant();

    report(
      $isNil(informant)
        ? "no 'about snag' portion is set, so the lead came from outside the three dialogs that give it"
        : `pointed at the dock cranes by ${tostring(informant)}`
    );

    const task: Nillable<TaskObject> = checkTaskText(TASK_ID, "with the cranes as the lead");

    expectEqual(task?.currentTitle, FIND_SNAG_TITLE, "title switched to the find branch");
  },
  handOff: "ask the Skadovsk barman, Sultan or Cop where Snag went",
});

step("7 - the cranes are empty", {
  reached: (): boolean => hasInfoPortion(infoPortions.zat_b52_snag_no_port_cranes),
  travel: (): void => {
    if (!teleportToZone(PORT_CRANES_ZONE)) {
      void teleportToStoryObject(BANDIT_LEADER_STORY_ID);
    }
  },
  verify: (): void => {
    checkTaskText(TASK_ID, "with the cranes searched");
  },
  handOff: "walk into the 'zat_b52_snag_port_cranes' zone by the dock cranes",
});

step("8 - settled with the port bandits", {
  reached: (): boolean => $isNotNil(resolveBanditOutcome()),
  travel: (): void => void teleportToStoryObject(BANDIT_LEADER_STORY_ID),
  verify: (): void => {
    report("settled by: %s", tostring(resolveBanditOutcome()));

    if (hasInfoPortion(infoPortions.zat_b52_robbery_done)) {
      expect(
        hasInfoPortion(infoPortions.zat_b52_snag_jupiter),
        "paying hands over the Jupiter lead",
        "both phrases that give 'zat_b52_robbery_done' also give 'zat_b52_snag_jupiter'"
      );
    }

    const task: Nillable<TaskObject> = checkTaskText(TASK_ID, "with the bandits dealt with");

    if (hasInfoPortion(infoPortions.zat_b52_actor_has_port_bandits_pda)) {
      expectEqual(task?.currentDescription, PDA_DESCRIPTION, "the pda branch wins the description");
    } else if (!hasInfoPortion(infoPortions.zat_b52_snag_jupiter)) {
      report("no lead came out of this, so the task can only close by running into Snag through the b202 chain");
    }
  },
  handOff: "the bandits wait by the cranes - pay them off, refuse and fight it out, or kill the leader for his pda",
});

step("9 - Snag turned up on Jupiter", {
  reached: (): boolean =>
    hasInfoPortion(infoPortions.jup_b202_snag_on_jup_founded) || hasInfoPortion(infoPortions.zat_b52_snag_is_dead),
  travel: (): void => {
    skipJupiterArrival();

    if (!teleportToStoryObject(JUPITER_SNAG_STORY_ID)) {
      void teleportToStoryObject(YANOV_TECH_STORY_ID);
    }
  },
  verify: (): void => {
    report(
      "closed by: %s",
      hasInfoPortion(infoPortions.jup_b202_snag_on_jup_founded) ? "talking to him at the substation" : "his death"
    );
  },
  handOff:
    "Snag fled to Jupiter. Phrase 0 of his dialog gives the portion that closes this, so finding him at Yanov and " +
    "opening your mouth is enough - the b202 chain below is what he is actually there for. Killing him instead " +
    "closes this the other way",
});

step("10 - task closed out", {
  reached: (): boolean =>
    (hasInfoPortion(infoPortions.jup_b202_snag_on_jup_founded) || hasInfoPortion(infoPortions.zat_b52_snag_is_dead)) &&
    $isNil(taskConfig.ACTIVE_TASKS.get(TASK_ID)),
  verify: (): void => {
    report("'%s' declares no reward_money and no on_complete, so closing it changes nothing else", TASK_ID);
  },
  handOff: "nothing to do, the task manager deactivates it on its next update",
});

step("11 - the stash was robbed", {
  reached: (): boolean => hasInfoPortion(infoPortions.jup_b52_actor_items_can_be_stolen),
  travel: (): void => void teleportToStoryObject(ACTOR_STASH_STORY_ID),
  verify: (): void => {
    report(
      "the theft: %s",
      hasInfoPortion(infoPortions.jup_b202_actor_items_stolen)
        ? "found out, so the b202 task is in the log"
        : "not noticed yet, the box has to be opened to see it bare"
    );
  },
  handOff:
    "leave your kit in the Yanov box, then walk 200 m off, sleep, or take the guide to Zaton - the box empties " +
    "behind your back. Open it to notice",
});

step("12 - Snag run to ground at the substation", {
  reached: (): boolean => hasInfoPortion(infoPortions.jup_b202_actor_find_snag),
  travel: (): void => {
    if (!teleportToZone(SUBSTATION_ZONE)) {
      void teleportToStoryObject(ACTOR_STASH_STORY_ID);
    }
  },
  verify: (): void => {
    report(
      "the bandit standing over him: %s",
      $isNotNil(getServerObjectByStoryId(JUPITER_BANDIT_STORY_ID)) ? "still registered" : "gone"
    );
    report("Snag: %s", hasInfoPortion(infoPortions.jup_b202_actor_spare_snag) ? "given a medkit" : "left wounded");
  },
  handOff:
    "walk into the b202 restrictor at the substation to find him wounded, with a bandit over him. A medkit buys the " +
    "story out of him",
});

step("13 - stolen kit taken back out of the chest", {
  reached: (): boolean => hasInfoPortion(infoPortions.jup_b202_actor_items_returned),
  travel: (): void => void teleportToPoint("Snag's chest", levels.jupiter, createVector(73.378, -0.763, 332.596)),
  verify: (): void => {
    if (!hasInfoPortion(infoPortions.jup_b202_actor_spare_snag)) {
      report("taking the kit back kills a wounded Snag outright, which is what his own logic does on this portion");
    }
  },
  handOff: "open Snag's chest beside him and take your things back",
});
