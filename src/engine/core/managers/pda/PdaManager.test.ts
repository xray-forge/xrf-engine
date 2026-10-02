import { describe, expect, it } from "@jest/globals";

import { weapons } from "@/engine/constants/items/weapons";
import { getManager } from "@/engine/core/database";
import { EPdaStatSection } from "@/engine/core/managers/pda/pda_types";
import { PdaManager } from "@/engine/core/managers/pda/PdaManager";
import { StatisticsManager } from "@/engine/core/managers/statistics";

describe("PdaManager", () => {
  it("should correctly get stat by section", () => {
    const manager: PdaManager = getManager(PdaManager);

    expect(manager.getStatisticsLabel(EPdaStatSection.TIME_IN_ZONE)).toBe("00:00:00");
    expect(manager.getStatisticsLabel(EPdaStatSection.SURGES)).toBe("0");
    expect(manager.getStatisticsLabel(EPdaStatSection.COMPLETED_QUESTS)).toBe("0");
    expect(manager.getStatisticsLabel(EPdaStatSection.KILLED_MONSTERS)).toBe("0");
    expect(manager.getStatisticsLabel(EPdaStatSection.KILLED_STALKERS)).toBe("0");
    expect(manager.getStatisticsLabel(EPdaStatSection.ARTEFACTS_FOUND)).toBe("0");
    expect(manager.getStatisticsLabel(EPdaStatSection.SECRETS_FOUND)).toBe("0");
    expect(manager.getStatisticsLabel("unknown" as unknown as EPdaStatSection)).toBe("");

    const statisticsManager: StatisticsManager = getManager(StatisticsManager);

    statisticsManager.actorStatistics.surgesCount = 5;
    statisticsManager.actorStatistics.completedTasksCount = 7;
    statisticsManager.actorStatistics.killedMonstersCount = 9;
    statisticsManager.actorStatistics.killedStalkersCount = 11;
    statisticsManager.actorStatistics.collectedArtefactsCount = 13;
    statisticsManager.actorStatistics.collectedTreasuresCount = 15;

    expect(manager.getStatisticsLabel(EPdaStatSection.TIME_IN_ZONE)).toBe("00:00:00");
    expect(manager.getStatisticsLabel(EPdaStatSection.SURGES)).toBe("5");
    expect(manager.getStatisticsLabel(EPdaStatSection.COMPLETED_QUESTS)).toBe("7");
    expect(manager.getStatisticsLabel(EPdaStatSection.KILLED_MONSTERS)).toBe("9");
    expect(manager.getStatisticsLabel(EPdaStatSection.KILLED_STALKERS)).toBe("11");
    expect(manager.getStatisticsLabel(EPdaStatSection.ARTEFACTS_FOUND)).toBe("13");
    expect(manager.getStatisticsLabel(EPdaStatSection.SECRETS_FOUND)).toBe("15");
  });

  it("should correctly get best killed monster display background", () => {
    const manager: PdaManager = getManager(PdaManager);

    expect(manager.getMonsterBackground()).toBe("");

    getManager(StatisticsManager).actorStatistics.bestKilledMonster = "burer";
    expect(manager.getMonsterBackground()).toBe("ui_inGame2_Burer");

    getManager(StatisticsManager).actorStatistics.bestKilledMonster = "dog";
    expect(manager.getMonsterBackground()).toBe("ui_inGame2_Blind_Dog");

    getManager(StatisticsManager).actorStatistics.bestKilledMonster = "none";
    expect(manager.getMonsterBackground()).toBe("");
  });

  it("should correctly get favorite weapon", () => {
    const manager: PdaManager = getManager(PdaManager);

    expect(manager.getFavoriteWeapon()).toBe(weapons.wpn_knife);

    getManager(StatisticsManager).actorStatistics.favoriteWeapon = weapons.wpn_desert_eagle;

    expect(manager.getFavoriteWeapon()).toBe(weapons.wpn_desert_eagle);
  });

  it("should correctly fill faction state", () => {
    const manager: PdaManager = getManager(PdaManager);

    expect(manager.fillFactionState({})).toEqual({
      actor_goodwill: 3000,
      bonus: 0,
      icon: "ui_inGame2_hint_wnd_bar",
      icon_big: "logos_big_empty",
      location: "a",
      member_count: 0,
      name: "ui_inGame2_hint_wnd_bar",
      power: 0,
      resource: 0,
      target: "translated_ui_st_no_faction",
      target_desc: "aaa",
      war_state1: "a",
      war_state2: "3",
      war_state3: "33",
      war_state4: "23",
      war_state5: "5",
      war_state_hint1: "1",
      war_state_hint2: "2",
      war_state_hint3: "",
      war_state_hint4: "",
      war_state_hint5: "5",
    });
  });
});
