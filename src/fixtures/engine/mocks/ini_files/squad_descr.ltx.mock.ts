const onlineOfflineGroup = {
  GroupControlSection: "spawn_group",
  class: "ON_OFF_S",
};

export const mockSquadDescription = {
  online_offline_group: {
    ...onlineOfflineGroup,
  },
  test_squad: {
    ...onlineOfflineGroup,
    faction: "stalker",
    npc: "test_npc_1, test_npc_2",
  },
  simulation_stalker: {
    ...onlineOfflineGroup,
    faction: "stalker",
    npc_random: "sim_default_stalker_0, sim_default_stalker_1, sim_default_stalker_2, sim_default_stalker_3",
    npc_in_squad: "2, 3",
  },
  simulation_stalker_squad: {
    ...onlineOfflineGroup,
    faction: "stalker",
    npc_random: "sim_default_stalker_0, sim_default_stalker_1, sim_default_stalker_2, sim_default_stalker_3",
    npc_in_squad: "2, 3",
  },
  stalker_sim_squad_novice: {
    ...onlineOfflineGroup,
    faction: "stalker",
    npc_random: "sim_default_stalker_0, sim_default_stalker_1, sim_default_stalker_2",
    npc_in_squad: "2, 3",
  },
  simulation_boar: {
    ...onlineOfflineGroup,
    faction: "monster_vegetarian",
    npc_random: "boar_normal, boar_strong",
    npc_in_squad: "1, 2",
  },
  simulation_bandit: {
    ...onlineOfflineGroup,
    faction: "bandit",
    npc_random: "sim_default_bandit_0, sim_default_bandit_1, sim_default_bandit_2, sim_default_bandit_3",
    npc_in_squad: "2, 3",
  },
  simulation_duty_1: {
    ...onlineOfflineGroup,
    faction: "dolg",
    npc_random: "sim_default_duty_0, sim_default_duty_1, sim_default_duty_1, sim_default_duty_2",
    npc_in_squad: "2, 3",
  },
  jup_a10_bandit_squad: {
    ...onlineOfflineGroup,
    faction: "bandit",
    npc: "sim_default_bandit_3, sim_default_bandit_2, sim_default_bandit_2",
    story_id: "jup_a10_bandit_squad",
  },
  zat_a2_stalker_nimble_squad: {
    ...onlineOfflineGroup,
    faction: "stalker",
    npc: "stalker_nimble",
    story_id: "stalker_nimble",
  },
  zat_b30_owl_stalker_trader_squad: {
    ...onlineOfflineGroup,
    faction: "stalker",
    npc: "stalker_owl",
    story_id: "stalker_owl",
  },
  zat_b7_bandit_boss_sultan_squad: {
    ...onlineOfflineGroup,
    faction: "bandit",
    npc: "boss_sultan",
    story_id: "boss_sultan",
  },
  jup_b6_scientist_group: {
    ...onlineOfflineGroup,
    faction: "science",
    npc: "scientist",
    story_id: "scientist",
  },
  jup_b43_stalker_assistant_squad: {
    ...onlineOfflineGroup,
    faction: "science",
    npc: "assistant",
    story_id: "assistant",
  },
  pri_a22_military_merkulov_squad: {
    ...onlineOfflineGroup,
    faction: "science",
    npc: "merkulov",
    story_id: "merkulov",
  },
  pri_a22_military_skelja_squad: {
    ...onlineOfflineGroup,
    faction: "science",
    npc: "skelja",
    story_id: "skelja",
  },
  pri_a22_military_yarmoshuk_squad: {
    ...onlineOfflineGroup,
    faction: "science",
    npc: "yarmoshuk",
    story_id: "yarmoshuk",
  },
};
