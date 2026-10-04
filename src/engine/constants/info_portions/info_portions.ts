/* eslint sort-keys-fix/sort-keys-fix: "error" */

import { jupiterInfoPortions } from "@/engine/constants/info_portions/jupiter_info_portions";
import { pripyatInfoPortions } from "@/engine/constants/info_portions/pripyat_info_portions";
import { zatonInfoPortions } from "@/engine/constants/info_portions/zaton_info_portions";

// todo: Probably separate for quests and generic collections.
// todo: Probably do nested objects to store quest infos in one pack.

/**
 * List of in-game infos set/checked with game logic.
 *
 * @inline
 */
export const infoPortions = {
  ...jupiterInfoPortions,
  ...pripyatInfoPortions,
  ...zatonInfoPortions,
  actor_information_dealer: "actor_information_dealer",
  actor_is_sleeping: "actor_is_sleeping",
  actor_marked_by_zone_3_times: "actor_marked_by_zone_3_times",
  actor_was_in_many_bad_places: "actor_was_in_many_bad_places",
  actor_wealthy: "actor_wealthy",
  anabiotic_in_process: "anabiotic_in_process",
  balance_advocate_gained: "balance_advocate_gained",
  battle_systems_master_achievement_gained: "battle_systems_master_achievement_gained",
  detective_achievement_gained: "detective_achievement_gained",
  device_flash_snag_sold: "device_flash_snag_sold",
  device_pda_port_bandit_leader_sold: "device_pda_port_bandit_leader_sold",
  diplomat_achievement_gained: "diplomat_achievement_gained",
  herald_of_justice_achievement_gained: "herald_of_justice_achievement_gained",
  high_tech_master_achievement_gained: "high_tech_master_achievement_gained",
  info_up_a_novice_outfit: "info_up_a_novice_outfit",
  info_up_ab_pkm: "info_up_ab_pkm",
  info_up_ab_svu: "info_up_ab_svu",
  info_up_abcd_pkm: "info_up_abcd_pkm",
  info_up_abcd_svu: "info_up_abcd_svu",
  info_up_ac_ak74u: "info_up_ac_ak74u",
  info_up_ac_desert_eagle: "info_up_ac_desert_eagle",
  info_up_ac_mp5: "info_up_ac_mp5",
  info_up_ac_spas12: "info_up_ac_spas12",
  info_up_ac_wincheaster1300: "info_up_ac_wincheaster1300",
  info_up_aceg_scientific_outfit: "info_up_aceg_scientific_outfit",
  info_up_bd_desert_eagle: "info_up_bd_desert_eagle",
  info_up_bd_mp5: "info_up_bd_mp5",
  info_up_bd_wincheaster1300: "info_up_bd_wincheaster1300",
  info_up_bdfh_scientific_outfit: "info_up_bdfh_scientific_outfit",
  info_up_cd_pkm: "info_up_cd_pkm",
  info_up_cd_svu: "info_up_cd_svu",
  info_up_fh_scientific_outfit: "info_up_fh_scientific_outfit",
  keeper_of_secrets_achievement_gained: "keeper_of_secrets_achievement_gained",
  kingpin_gained: "kingpin_gained",
  leader_achievement_gained: "leader_achievement_gained",
  mutant_hunter_achievement_gained: "mutant_hunter_achievement_gained",
  one_of_the_lads_gained: "one_of_the_lads_gained",
  pas_b400_done: "pas_b400_done",
  pas_b400_downstairs_done: "pas_b400_downstairs_done",
  pas_b400_elevator_done: "pas_b400_elevator_done",
  pas_b400_hall_done: "pas_b400_hall_done",
  pas_b400_sokolov_dead: "pas_b400_sokolov_dead",
  pas_b400_switcher_use: "pas_b400_switcher_use",
  pas_b400_task_given: "pas_b400_task_given",
  pas_b400_track_done: "pas_b400_track_done",
  pas_b400_tunnel_done: "pas_b400_tunnel_done",
  pas_b400_way_done: "pas_b400_way_done",
  pioneer_achievement_gained: "pioneer_achievement_gained",
  research_man_gained: "research_man_gained",
  sim_bandit_attack_harder: "sim_bandit_attack_harder",
  sim_duty_help_harder: "sim_duty_help_harder",
  sim_freedom_help_harder: "sim_freedom_help_harder",
  sim_stalker_help_harder: "sim_stalker_help_harder",
  skilled_stalker_achievement_gained: "skilled_stalker_achievement_gained",
  sleep_active: "sleep_active",
  stalkers_toolkit_dialog: "stalkers_toolkit_dialog",
  tutorial_sleep: "tutorial_sleep",
} as const;

export type TInfoPortions = typeof infoPortions;

export type TInfoPortion = TInfoPortions[keyof TInfoPortions];
