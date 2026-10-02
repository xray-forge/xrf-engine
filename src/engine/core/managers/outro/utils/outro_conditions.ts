import { infoPortions } from "@/engine/constants/info_portions";
import { hasAtLeastOneInfoPortion, hasInfoPortion, hasInfoPortions } from "@/engine/core/utils/info_portion";

/**
 * Conditions of the outro slides, named as the outro tutorial checks them before showing each slide.
 */
export const outroConditions = {
  // -- 4a
  skadovsk_bad_cond: (): boolean => hasInfoPortion(infoPortions.kingpin_gained),
  // -- 4b
  skadovsk_good_cond: (): boolean => hasInfoPortion(infoPortions.one_of_the_lads_gained),
  // -- 4c
  skadovsk_neutral_cond: (): boolean =>
    !hasAtLeastOneInfoPortion([infoPortions.kingpin_gained, infoPortions.one_of_the_lads_gained]),
  // -- 5a
  bloodsucker_live_cond: (): boolean => !hasInfoPortion(infoPortions.zat_b57_bloodsucker_lair_clear),
  // -- 5b
  bloodsucker_dead_cond: (): boolean => hasInfoPortion(infoPortions.zat_b57_bloodsucker_lair_clear),
  // -- 6a
  dolg_die_cond: (): boolean => hasInfoPortion(infoPortions.sim_freedom_help_harder),
  // -- 6b
  freedom_die_cond: (): boolean => hasInfoPortion(infoPortions.sim_duty_help_harder),
  // -- 6c
  dolg_n_freedom_cond: (): boolean =>
    !hasAtLeastOneInfoPortion([infoPortions.sim_freedom_help_harder, infoPortions.sim_duty_help_harder]),
  // -- 7a
  scientist_good_cond: (): boolean => hasInfoPortion(infoPortions.research_man_gained),
  // -- 7b
  scientist_bad_cond: (): boolean => !hasInfoPortion(infoPortions.research_man_gained),
  // -- 8a
  garik_good_cond: (): boolean => hasInfoPortion(infoPortions.pri_a28_army_leaved_alive),
  // -- 8b
  garik_bad_cond: (): boolean => !hasInfoPortion(infoPortions.pri_a28_army_leaved_alive),
  // -- 9
  oasis_cond: (): boolean => hasInfoPortion(infoPortions.jup_b16_oasis_artefact_to_scientist),
  // -- 10
  mercenarys_cond: (): boolean => hasInfoPortion(infoPortions.pri_b35_task_running),
  // -- 11a
  yanov_good_cond: (): boolean => hasInfoPortion(infoPortions.mutant_hunter_achievement_gained),
  // -- 11b
  yanov_bad_cond: (): boolean => !hasInfoPortion(infoPortions.mutant_hunter_achievement_gained),
  // -- 12a
  zuluz_good_cond: (): boolean => hasInfoPortion(infoPortions.pri_b301_save_zulus_complete),
  // -- 12b
  zuluz_bad_cond: (): boolean => !hasInfoPortion(infoPortions.pri_b301_save_zulus_complete),
  // -- 13a
  vano_good_cond: (): boolean =>
    hasInfoPortions([infoPortions.jup_a10_vano_agree_go_und, infoPortions.pri_a16_vano_was_alive_when_removed]),
  // -- 13b
  vano_bad_cond: (): boolean =>
    hasInfoPortion(infoPortions.jup_a10_vano_agree_go_und) &&
    !hasInfoPortion(infoPortions.pri_a16_vano_was_alive_when_removed),
  // -- 14a
  brodyaga_good_cond: (): boolean =>
    hasInfoPortions([infoPortions.jup_b218_monolith_hired, infoPortions.pri_a16_wanderer_was_alive_when_removed]),
  // -- 14b
  brodyaga_bad_cond: (): boolean =>
    hasInfoPortion(infoPortions.jup_b218_monolith_hired) &&
    !hasInfoPortion(infoPortions.pri_a16_wanderer_was_alive_when_removed),
  // -- 15a
  sokolov_good_cond: (): boolean =>
    hasInfoPortions([infoPortions.jup_b218_soldier_hired, infoPortions.pri_a28_sokolov_left_alive]),
  // -- 15b
  sokolov_bad_cond: (): boolean =>
    hasInfoPortion(infoPortions.jup_b218_soldier_hired) && !hasInfoPortion(infoPortions.pri_a28_sokolov_left_alive),
  // -- 16
  sich_cond: (): boolean => hasInfoPortion(infoPortions.balance_advocate_gained),
  // -- 17
  noahs_ark_cond: (): boolean =>
    hasInfoPortion(infoPortions.zat_b18_noah_met) && !hasInfoPortion(infoPortions.zat_b18_noah_dead),
  // -- 18a
  kardan_good_cond: (): boolean => hasInfoPortion(infoPortions.zat_b44_tech_buddies_both_told),
  // -- 18b
  kardan_bad_cond: (): boolean => !hasInfoPortion(infoPortions.zat_b44_tech_buddies_both_told),
  // -- 19a
  strelok_live_cond: (): boolean => !hasInfoPortion(infoPortions.pri_a28_strelok_dead),
  // -- 19b
  strelok_die_cond: (): boolean => hasInfoPortion(infoPortions.pri_a28_strelok_dead),
  // -- 20a
  kovalski_live_cond: (): boolean => !hasInfoPortion(infoPortions.pri_a28_koval_dead),
  // -- 20b
  kovalski_die_cond: (): boolean => hasInfoPortion(infoPortions.pri_a28_koval_dead),
} as const;
