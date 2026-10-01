import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { relation_registry } from "xray16";
import { ACTOR_ID, TName } from "xray16/lib";
import { $fromObject } from "xray16/macros";
import { MockGameObject } from "xray16/mocks";

import { communities } from "@/engine/constants/communities";
import { infoPortions, TInfoPortion } from "@/engine/constants/info_portions";
import { artefacts } from "@/engine/constants/items/artefacts";
import { getManager, registerActor, registry } from "@/engine/core/database";
import { EGameEvent, EventsManager } from "@/engine/core/managers/events";
import { ENotificationType, ITipNotification } from "@/engine/core/managers/notifications";
import { StatisticsManager } from "@/engine/core/managers/statistics";
import { achievementsConfig } from "@/engine/core/utils/achievements/achievements_config";
import { achievementsIcons } from "@/engine/core/utils/achievements/achievements_icons";
import {
  hasAchievedBalanceAdvocate,
  hasAchievedBattleSystemsMaster,
  hasAchievedDetective,
  hasAchievedDiplomat,
  hasAchievedFriendOfDuty,
  hasAchievedFriendOfFreedom,
  hasAchievedFriendOfStalkers,
  hasAchievedHeraldOfJustice,
  hasAchievedHighTechMaster,
  hasAchievedInformationDealer,
  hasAchievedKeeperOfSecrets,
  hasAchievedKingpin,
  hasAchievedLeader,
  hasAchievedMarkedByZone,
  hasAchievedMutantHunter,
  hasAchievedOneOfLads,
  hasAchievedPioneer,
  hasAchievedResearchMan,
  hasAchievedSeeker,
  hasAchievedSkilledStalker,
  hasAchievedWealthy,
} from "@/engine/core/utils/achievements/achievements_preconditions";
import { EAchievement } from "@/engine/core/utils/achievements/achievements_types";
import { disableInfoPortion, giveInfoPortion, hasInfoPortion } from "@/engine/core/utils/info_portion";
import { mockRegisteredActor, resetRegistry } from "@/fixtures/engine";

function mockNotificationListener(caption: string, sender: string): (notification: ITipNotification) => void {
  const eventsManager: EventsManager = getManager(EventsManager);

  const onNotification = jest.fn((notification: ITipNotification) => {
    expect(notification.type).toBe(ENotificationType.TIP);
    expect(notification.caption).toBe(caption);
    expect(notification.sender).toBe(sender);
  });

  eventsManager.registerCallback(EGameEvent.NOTIFICATION, onNotification);

  return onNotification;
}

function checkGenericAchievement({
  check,
  achievementInfo,
  requiredInfos,
  notificationIcon,
  notificationCaption,
}: {
  check: () => boolean;
  requiredInfos: Array<TInfoPortion>;
  notificationCaption: string;
  notificationIcon: string;
  achievementInfo: TInfoPortion;
}): void {
  const onNotification = mockNotificationListener(notificationCaption, notificationIcon);

  giveInfoPortion(achievementInfo);
  expect(check()).toBeTruthy();

  disableInfoPortion(achievementInfo);
  expect(check()).toBeFalsy();

  requiredInfos.forEach((it) => giveInfoPortion(it));

  expect(check()).toBeTruthy();
  expect(onNotification).toHaveBeenCalledTimes(1);
  expect(hasInfoPortion(achievementInfo)).toBeTruthy();
}

describe("hasAchievedPioneer precondition", () => {
  beforeEach(() => {
    resetRegistry();
    mockRegisteredActor();
  });

  it("should correctly check pioneer achievement", () => {
    checkGenericAchievement({
      check: hasAchievedPioneer,
      notificationCaption: "st_ach_pioneer",
      notificationIcon: achievementsIcons[EAchievement.PIONEER],
      achievementInfo: infoPortions.pioneer_achievement_gained,
      requiredInfos: [
        infoPortions.zat_b14_give_item_linker,
        infoPortions.jup_b1_complete_end,
        infoPortions.jup_b206_anomalous_grove_done,
      ],
    });
  });
});

describe("hasAchievedMutantHunter precondition", () => {
  beforeEach(() => {
    resetRegistry();
    mockRegisteredActor();
  });

  it("should correctly check mutant hunter achievement", () => {
    checkGenericAchievement({
      check: hasAchievedMutantHunter,
      notificationCaption: "st_ach_mutant_hunter",
      notificationIcon: achievementsIcons[EAchievement.MUTANT_HUNTER],
      achievementInfo: infoPortions.mutant_hunter_achievement_gained,
      requiredInfos: [
        infoPortions.jup_b208_burers_hunt_done,
        infoPortions.jup_b211_scene_done,
        infoPortions.jup_b212_jupiter_chimera_hunt_done,
      ],
    });
  });
});

describe("hasAchievedDetective precondition", () => {
  beforeEach(() => {
    resetRegistry();
    mockRegisteredActor();
  });

  it("should correctly check detective achievement", () => {
    checkGenericAchievement({
      check: hasAchievedDetective,
      notificationCaption: "st_ach_detective",
      notificationIcon: achievementsIcons[EAchievement.DETECTIVE],
      achievementInfo: infoPortions.detective_achievement_gained,
      requiredInfos: [infoPortions.zat_b22_barmen_gave_reward],
    });
  });
});

describe("hasAchievedOneOfLads precondition", () => {
  beforeEach(() => {
    resetRegistry();
    mockRegisteredActor();
  });

  it("should correctly check one of lads achievement", () => {
    checkGenericAchievement({
      check: hasAchievedOneOfLads,
      notificationCaption: "st_ach_one_of_the_lads",
      notificationIcon: achievementsIcons[EAchievement.ONE_OF_THE_LADS],
      achievementInfo: infoPortions.one_of_the_lads_gained,
      requiredInfos: [infoPortions.zat_b30_sultan_loose, infoPortions.zat_b7_actor_help_stalkers],
    });
  });
});

describe("hasAchievedKingpin precondition", () => {
  beforeEach(() => {
    resetRegistry();
    mockRegisteredActor();
  });

  it("should correctly check kingpin achievement", () => {
    checkGenericAchievement({
      check: hasAchievedKingpin,
      notificationCaption: "st_ach_kingpin",
      notificationIcon: achievementsIcons[EAchievement.KINGPIN],
      achievementInfo: infoPortions.kingpin_gained,
      requiredInfos: [infoPortions.zat_b30_barmen_under_sultan, infoPortions.zat_b7_actor_help_bandits],
    });
  });
});

describe("hasAchievedHeraldOfJustice precondition", () => {
  beforeEach(() => {
    resetRegistry();
    mockRegisteredActor();
  });

  it("should correctly check herald of justice achievement", () => {
    checkGenericAchievement({
      check: hasAchievedHeraldOfJustice,
      notificationCaption: "st_ach_herald_of_justice",
      notificationIcon: achievementsIcons[EAchievement.HERALD_OF_JUSTICE],
      achievementInfo: infoPortions.herald_of_justice_achievement_gained,
      requiredInfos: [
        infoPortions.jup_b25_flint_blame_done_to_duty,
        infoPortions.jup_b25_flint_blame_done_to_freedom,
        infoPortions.zat_b106_found_soroka_done,
      ],
    });
  });
});

describe("hasAchievedBattleSystemsMaster precondition", () => {
  beforeEach(() => {
    resetRegistry();
    mockRegisteredActor();
  });

  it("should correctly check battle systems master achievement", () => {
    checkGenericAchievement({
      check: hasAchievedBattleSystemsMaster,
      notificationCaption: "st_ach_battle_systems_master",
      notificationIcon: achievementsIcons[EAchievement.BATTLE_SYSTEMS_MASTER],
      achievementInfo: infoPortions.battle_systems_master_achievement_gained,
      requiredInfos: [infoPortions.zat_b3_all_instruments_brought],
    });
  });
});

describe("hasAchievedHighTechMaster precondition", () => {
  beforeEach(() => {
    resetRegistry();
    mockRegisteredActor();
  });

  it("should correctly check high tech master achievement", () => {
    checkGenericAchievement({
      check: hasAchievedHighTechMaster,
      notificationCaption: "st_ach_high_tech_master",
      notificationIcon: achievementsIcons[EAchievement.HIGH_TECH_MASTER],
      achievementInfo: infoPortions.high_tech_master_achievement_gained,
      requiredInfos: [
        infoPortions.jup_b217_tech_instrument_1_brought,
        infoPortions.jup_b217_tech_instrument_2_brought,
        infoPortions.jup_b217_tech_instrument_3_brought,
      ],
    });
  });
});

describe("hasAchievedSkilledStalker precondition", () => {
  beforeEach(() => {
    resetRegistry();
    mockRegisteredActor();
  });

  it("should correctly check skilled stalker achievement", () => {
    checkGenericAchievement({
      check: hasAchievedSkilledStalker,
      notificationCaption: "st_ach_skilled_stalker",
      notificationIcon: achievementsIcons[EAchievement.SKILLED_STALKER],
      achievementInfo: infoPortions.skilled_stalker_achievement_gained,
      requiredInfos: [infoPortions.actor_was_in_many_bad_places],
    });
  });
});

describe("hasAchievedLeader precondition", () => {
  beforeEach(() => {
    resetRegistry();
    mockRegisteredActor();
  });

  it("should correctly check leader achievement", () => {
    checkGenericAchievement({
      check: hasAchievedLeader,
      notificationCaption: "st_ach_leader",
      notificationIcon: achievementsIcons[EAchievement.LEADER],
      achievementInfo: infoPortions.leader_achievement_gained,
      requiredInfos: [
        infoPortions.jup_a10_vano_agree_go_und,
        infoPortions.jup_b218_soldier_hired,
        infoPortions.jup_b218_monolith_hired,
      ],
    });
  });
});

describe("hasAchievedDiplomat precondition", () => {
  beforeEach(() => {
    resetRegistry();
    mockRegisteredActor();
  });

  it("should correctly check diplomat achievement", () => {
    checkGenericAchievement({
      check: hasAchievedDiplomat,
      notificationCaption: "st_ach_diplomat",
      notificationIcon: achievementsIcons[EAchievement.DIPLOMAT],
      achievementInfo: infoPortions.diplomat_achievement_gained,
      requiredInfos: [infoPortions.jup_a12_wo_shooting, infoPortions.jup_a10_bandit_take_all_money],
    });

    expect(relation_registry.change_community_goodwill).toHaveBeenCalledTimes(4);

    registerActor(MockGameObject.mock());

    checkGenericAchievement({
      check: hasAchievedDiplomat,
      notificationCaption: "st_ach_diplomat",
      notificationIcon: achievementsIcons[EAchievement.DIPLOMAT],
      achievementInfo: infoPortions.diplomat_achievement_gained,
      requiredInfos: [infoPortions.jup_a12_wo_shooting, infoPortions.jup_a10_bandit_take_money],
    });

    expect(relation_registry.change_community_goodwill).toHaveBeenCalledTimes(8);
  });
});

describe("hasAchievedResearchMan precondition", () => {
  beforeEach(() => {
    resetRegistry();
    mockRegisteredActor();
  });

  it("should correctly check research man achievement", () => {
    checkGenericAchievement({
      check: () => hasAchievedResearchMan(),
      notificationCaption: "st_ach_research_man",
      notificationIcon: achievementsIcons[EAchievement.RESEARCH_MAN],
      achievementInfo: infoPortions.research_man_gained,
      requiredInfos: [
        infoPortions.jup_b16_task_done,
        infoPortions.jup_b1_task_done,
        infoPortions.jup_b46_task_done,
        infoPortions.jup_b47_task_end,
      ],
    });

    registerActor(MockGameObject.mock());

    checkGenericAchievement({
      check: () => hasAchievedResearchMan(),
      notificationCaption: "st_ach_research_man",
      notificationIcon: achievementsIcons[EAchievement.RESEARCH_MAN],
      achievementInfo: infoPortions.research_man_gained,
      requiredInfos: [
        infoPortions.jup_b32_task_done,
        infoPortions.jup_b6_task_done,
        infoPortions.jup_b206_task_done,
        infoPortions.jup_b209_task_done,
      ],
    });
  });
});

describe("hasAchievedFriendOfDuty precondition", () => {
  beforeEach(() => {
    resetRegistry();
    mockRegisteredActor();
  });

  it("should correctly check friends with duty achievement", () => {
    checkGenericAchievement({
      check: () => hasAchievedFriendOfDuty(),
      notificationCaption: "st_ach_friend_of_duty",
      notificationIcon: achievementsIcons[EAchievement.FRIEND_OF_DUTY],
      achievementInfo: infoPortions.sim_duty_help_harder,
      requiredInfos: [
        infoPortions.jup_b4_monolith_squad_in_duty,
        infoPortions.jup_b46_duty_founder_pda_to_duty,
        infoPortions.jup_b207_sell_dealers_pda_duty,
        infoPortions.jup_b25_flint_blame_done_to_duty,
      ],
    });
  });
});

describe("hasAchievedFriendOfFreedom precondition", () => {
  beforeEach(() => {
    resetRegistry();
    mockRegisteredActor();
  });

  it("should correctly check friends with freedom achievement", () => {
    checkGenericAchievement({
      check: () => hasAchievedFriendOfFreedom(),
      notificationCaption: "st_ach_friend_of_freedom",
      notificationIcon: achievementsIcons[EAchievement.FRIEND_OF_FREEDOM],
      achievementInfo: infoPortions.sim_freedom_help_harder,
      requiredInfos: [
        infoPortions.jup_b4_monolith_squad_in_freedom,
        infoPortions.jup_b46_duty_founder_pda_to_freedom,
        infoPortions.jup_b207_sell_dealers_pda_freedom,
        infoPortions.jup_b25_flint_blame_done_to_freedom,
      ],
    });
  });
});

describe("hasAchievedBalanceAdvocate precondition", () => {
  beforeEach(() => {
    resetRegistry();
    mockRegisteredActor();
  });

  it("should correctly check balance advocate achievement", () => {
    checkGenericAchievement({
      check: () => hasAchievedBalanceAdvocate(),
      notificationCaption: "st_ach_balance_advocate",
      notificationIcon: achievementsIcons[EAchievement.BALANCE_ADVOCATE],
      achievementInfo: infoPortions.balance_advocate_gained,
      requiredInfos: [
        infoPortions.jup_b46_duty_founder_pda_to_owl,
        infoPortions.jup_b207_dealers_pda_sold_owl,
        infoPortions.zat_b106_found_soroka_done,
      ],
    });
  });
});

describe("hasAchievedKeeperOfSecrets precondition", () => {
  beforeEach(() => {
    resetRegistry();
    mockRegisteredActor();
  });

  it("should correctly check keeper of secrets achievement", () => {
    checkGenericAchievement({
      check: () => hasAchievedKeeperOfSecrets(),
      notificationCaption: "st_ach_keeper_of_secrets",
      notificationIcon: achievementsIcons[EAchievement.KEEPER_OF_SECRETS],
      achievementInfo: infoPortions.keeper_of_secrets_achievement_gained,
      requiredInfos: [infoPortions.pri_b305_all_strelok_notes_given],
    });
  });
});

describe("hasAchievedInformationDealer precondition", () => {
  beforeEach(() => {
    resetRegistry();
    mockRegisteredActor();
  });

  it("should correctly check information dealer achievement", () => {
    checkGenericAchievement({
      check: () => hasAchievedInformationDealer(),
      notificationCaption: "st_ach_information_dealer",
      notificationIcon: achievementsIcons[EAchievement.INFORMATION_DEALER],
      achievementInfo: infoPortions.actor_information_dealer,
      requiredInfos: [
        infoPortions.zat_b40_pda_1_saled,
        infoPortions.zat_b40_pda_2_saled,
        infoPortions.jup_b46_duty_founder_pda_sold,
        infoPortions.jup_b207_merc_pda_with_contract_sold,
        infoPortions.jup_b207_dealers_pda_sold,
        infoPortions.jup_a9_evacuation_info_sold,
        infoPortions.jup_a9_meeting_info_sold,
        infoPortions.jup_a9_losses_info_sold,
        infoPortions.jup_a9_delivery_info_sold,
        infoPortions.zat_b12_documents_sold_1,
      ],
    });

    registerActor(MockGameObject.mock());

    checkGenericAchievement({
      check: () => hasAchievedInformationDealer(),
      notificationCaption: "st_ach_information_dealer",
      notificationIcon: achievementsIcons[EAchievement.INFORMATION_DEALER],
      achievementInfo: infoPortions.actor_information_dealer,
      requiredInfos: [
        infoPortions.jup_a9_meeting_info_sold,
        infoPortions.jup_a9_losses_info_sold,
        infoPortions.jup_a9_delivery_info_sold,
        infoPortions.zat_b12_documents_sold_1,
        infoPortions.zat_b12_documents_sold_2,
        infoPortions.zat_b12_documents_sold_3,
        infoPortions.zat_b40_notebook_saled,
        infoPortions.device_flash_snag_sold,
        infoPortions.device_pda_port_bandit_leader_sold,
        infoPortions.jup_b10_ufo_memory_2_sold,
      ],
    });
  });
});

describe("hasAchievedFriendOfStalkers precondition", () => {
  beforeEach(() => {
    resetRegistry();
    mockRegisteredActor();
  });

  it("should correctly check friend of stalkers achievement", () => {
    checkGenericAchievement({
      check: () => hasAchievedFriendOfStalkers(),
      notificationCaption: "st_ach_friend_of_stalkers",
      notificationIcon: achievementsIcons[EAchievement.FRIEND_OF_STALKERS],
      achievementInfo: infoPortions.sim_stalker_help_harder,
      requiredInfos: [
        infoPortions.jup_b220_trapper_zaton_chimera_hunted_told,
        infoPortions.jup_a12_stalker_prisoner_helped,
        infoPortions.jup_a10_vano_give_task_end,
        infoPortions.zat_b5_stalker_leader_end,
        infoPortions.zat_b7_task_end,
      ],
    });

    expect(relation_registry.change_community_goodwill).toHaveBeenCalledWith(communities.stalker, ACTOR_ID, 100);
  });
});

describe("hasAchievedWealthy precondition", () => {
  beforeEach(() => {
    resetRegistry();
    mockRegisteredActor();
  });

  it("should correctly check wealthy achievement", () => {
    const onNotification = mockNotificationListener("st_ach_wealthy", achievementsIcons[EAchievement.WEALTHY]);

    giveInfoPortion(infoPortions.actor_wealthy);
    expect(hasAchievedWealthy()).toBeTruthy();

    disableInfoPortion(infoPortions.actor_wealthy);
    expect(hasAchievedWealthy()).toBeFalsy();

    registry.actor.give_money(25_000);
    expect(hasAchievedWealthy()).toBeFalsy();

    registry.actor.give_money(75_000);
    expect(hasAchievedWealthy()).toBeTruthy();
    expect(onNotification).toHaveBeenCalledTimes(1);
    expect(hasInfoPortion(infoPortions.actor_wealthy)).toBeTruthy();
  });
});

describe("hasAchievedSeeker precondition", () => {
  beforeEach(() => {
    resetRegistry();
    mockRegisteredActor();
  });

  it("should correctly check seeker achievement", () => {
    const statisticsManager: StatisticsManager = getManager(StatisticsManager);
    const onNotification = mockNotificationListener("st_ach_seeker", achievementsIcons[EAchievement.SEEKER]);

    giveInfoPortion(infoPortions.sim_bandit_attack_harder);
    expect(hasAchievedSeeker()).toBeTruthy();

    disableInfoPortion(infoPortions.sim_bandit_attack_harder);

    getManager(StatisticsManager).actorStatistics.collectedArtefacts = $fromObject<TName, boolean>({
      [artefacts.af_baloon]: true,
      [artefacts.af_blood]: false,
    });

    expect(hasAchievedSeeker()).toBeFalsy();

    statisticsManager.actorStatistics.collectedArtefacts = new LuaTable();

    // Quest artefacts do not replace the ones to collect.
    for (const [, section] of achievementsConfig.SEEKER_ARTEFACTS) {
      if (section !== artefacts.af_ice) {
        statisticsManager.actorStatistics.collectedArtefacts.set(section, true);
      }
    }

    statisticsManager.actorStatistics.collectedArtefacts.set(artefacts.af_compass, true);
    statisticsManager.actorStatistics.collectedArtefacts.set(artefacts.af_oasis_heart, true);

    expect(hasAchievedSeeker()).toBeFalsy();
    expect(onNotification).not.toHaveBeenCalled();

    statisticsManager.actorStatistics.collectedArtefacts.set(artefacts.af_ice, true);

    expect(hasAchievedSeeker()).toBeTruthy();
    expect(onNotification).toHaveBeenCalledTimes(1);
    expect(hasInfoPortion(infoPortions.sim_bandit_attack_harder)).toBeTruthy();

    expect(relation_registry.change_community_goodwill).toHaveBeenCalledWith(communities.stalker, ACTOR_ID, 200);
  });
});

describe("hasAchievedMarkedByZone precondition", () => {
  beforeEach(() => {
    resetRegistry();
    mockRegisteredActor();
  });

  it("should correctly check marked by zone achievement", () => {
    const statisticsManager: StatisticsManager = getManager(StatisticsManager);
    const onNotification = mockNotificationListener(
      "st_ach_marked_by_zone",
      achievementsIcons[EAchievement.MARKED_BY_ZONE]
    );

    giveInfoPortion(infoPortions.actor_marked_by_zone_3_times);
    expect(hasAchievedMarkedByZone()).toBeTruthy();

    disableInfoPortion(infoPortions.actor_marked_by_zone_3_times);
    expect(hasAchievedMarkedByZone()).toBeFalsy();

    statisticsManager.onSurvivedSurgeWithAnabiotic();
    statisticsManager.onSurvivedSurgeWithAnabiotic();
    expect(hasAchievedMarkedByZone()).toBeFalsy();

    statisticsManager.onSurvivedSurgeWithAnabiotic();
    expect(hasAchievedMarkedByZone()).toBeTruthy();
    expect(onNotification).toHaveBeenCalledTimes(1);
    expect(hasInfoPortion(infoPortions.actor_marked_by_zone_3_times)).toBeTruthy();
  });
});
