import { beforeEach, describe, expect, it } from "@jest/globals";

import { infoPortions } from "@/engine/constants/info_portions";
import { outroConditions } from "@/engine/core/managers/outro/utils/outro_conditions";
import { giveInfoPortion } from "@/engine/core/utils/info_portion";
import { mockRegisteredActor, resetRegistry } from "@/fixtures/engine";

describe("outroConditions", () => {
  beforeEach(() => {
    resetRegistry();
    mockRegisteredActor();
  });

  it("should correctly check skadovsk condition", () => {
    expect(outroConditions.skadovsk_bad_cond()).toBe(false);
    expect(outroConditions.skadovsk_good_cond()).toBe(false);
    expect(outroConditions.skadovsk_neutral_cond()).toBe(true);

    giveInfoPortion(infoPortions.kingpin_gained);
    expect(outroConditions.skadovsk_bad_cond()).toBe(true);
    expect(outroConditions.skadovsk_neutral_cond()).toBe(false);

    giveInfoPortion(infoPortions.one_of_the_lads_gained);
    expect(outroConditions.skadovsk_good_cond()).toBe(true);
    expect(outroConditions.skadovsk_neutral_cond()).toBe(false);
  });

  it("should hide the neutral skadovsk slide when the actor only became one of the lads", () => {
    giveInfoPortion(infoPortions.one_of_the_lads_gained);

    expect(outroConditions.skadovsk_neutral_cond()).toBe(false);
  });

  it("should correctly check bloodsuckers condition", () => {
    expect(outroConditions.bloodsucker_live_cond()).toBe(true);
    expect(outroConditions.bloodsucker_dead_cond()).toBe(false);

    giveInfoPortion(infoPortions.zat_b57_bloodsucker_lair_clear);

    expect(outroConditions.bloodsucker_live_cond()).toBe(false);
    expect(outroConditions.bloodsucker_dead_cond()).toBe(true);
  });

  it("should correctly check yanov factions condition", () => {
    expect(outroConditions.dolg_die_cond()).toBe(false);
    expect(outroConditions.freedom_die_cond()).toBe(false);
    expect(outroConditions.dolg_n_freedom_cond()).toBe(true);

    giveInfoPortion(infoPortions.sim_freedom_help_harder);

    expect(outroConditions.dolg_die_cond()).toBe(true);
    expect(outroConditions.freedom_die_cond()).toBe(false);
    expect(outroConditions.dolg_n_freedom_cond()).toBe(false);

    giveInfoPortion(infoPortions.sim_duty_help_harder);

    expect(outroConditions.dolg_die_cond()).toBe(true);
    expect(outroConditions.freedom_die_cond()).toBe(true);
    expect(outroConditions.dolg_n_freedom_cond()).toBe(false);
  });

  it("should correctly check scientist condition", () => {
    expect(outroConditions.scientist_good_cond()).toBe(false);
    expect(outroConditions.scientist_bad_cond()).toBe(true);

    giveInfoPortion(infoPortions.research_man_gained);

    expect(outroConditions.scientist_good_cond()).toBe(true);
    expect(outroConditions.scientist_bad_cond()).toBe(false);
  });

  it("should correctly check garik condition", () => {
    expect(outroConditions.garik_good_cond()).toBe(false);
    expect(outroConditions.garik_bad_cond()).toBe(true);

    giveInfoPortion(infoPortions.pri_a28_army_leaved_alive);

    expect(outroConditions.garik_good_cond()).toBe(true);
    expect(outroConditions.garik_bad_cond()).toBe(false);
  });

  it("should correctly check oasis condition", () => {
    expect(outroConditions.oasis_cond()).toBe(false);

    giveInfoPortion(infoPortions.jup_b16_oasis_artefact_to_scientist);

    expect(outroConditions.oasis_cond()).toBe(true);
  });

  it("should correctly check mercs condition", () => {
    expect(outroConditions.mercenarys_cond()).toBe(false);

    giveInfoPortion(infoPortions.pri_b35_task_running);

    expect(outroConditions.mercenarys_cond()).toBe(true);
  });

  it("should correctly check yanov monsters condition", () => {
    expect(outroConditions.yanov_good_cond()).toBe(false);
    expect(outroConditions.yanov_bad_cond()).toBe(true);

    giveInfoPortion(infoPortions.mutant_hunter_achievement_gained);

    expect(outroConditions.yanov_good_cond()).toBe(true);
    expect(outroConditions.yanov_bad_cond()).toBe(false);
  });

  it("should correctly check zulus condition", () => {
    expect(outroConditions.zuluz_good_cond()).toBe(false);
    expect(outroConditions.zuluz_bad_cond()).toBe(true);

    giveInfoPortion(infoPortions.pri_b301_save_zulus_complete);

    expect(outroConditions.zuluz_good_cond()).toBe(true);
    expect(outroConditions.zuluz_bad_cond()).toBe(false);
  });

  it("should correctly check vano condition", () => {
    expect(outroConditions.vano_good_cond()).toBe(false);
    expect(outroConditions.vano_bad_cond()).toBe(false);

    giveInfoPortion(infoPortions.jup_a10_vano_agree_go_und);

    expect(outroConditions.vano_good_cond()).toBe(false);
    expect(outroConditions.vano_bad_cond()).toBe(true);

    giveInfoPortion(infoPortions.pri_a16_vano_was_alive_when_removed);

    expect(outroConditions.vano_good_cond()).toBe(true);
    expect(outroConditions.vano_bad_cond()).toBe(false);
  });

  it("should correctly check brodyaga condition", () => {
    expect(outroConditions.brodyaga_good_cond()).toBe(false);
    expect(outroConditions.brodyaga_bad_cond()).toBe(false);

    giveInfoPortion(infoPortions.jup_b218_monolith_hired);

    expect(outroConditions.brodyaga_good_cond()).toBe(false);
    expect(outroConditions.brodyaga_bad_cond()).toBe(true);

    giveInfoPortion(infoPortions.pri_a16_wanderer_was_alive_when_removed);

    expect(outroConditions.brodyaga_good_cond()).toBe(true);
    expect(outroConditions.brodyaga_bad_cond()).toBe(false);
  });

  it("should correctly check sokolov condition", () => {
    expect(outroConditions.sokolov_good_cond()).toBe(false);
    expect(outroConditions.sokolov_bad_cond()).toBe(false);

    giveInfoPortion(infoPortions.jup_b218_soldier_hired);

    expect(outroConditions.sokolov_good_cond()).toBe(false);
    expect(outroConditions.sokolov_bad_cond()).toBe(true);

    giveInfoPortion(infoPortions.pri_a28_sokolov_left_alive);

    expect(outroConditions.sokolov_good_cond()).toBe(true);
    expect(outroConditions.sokolov_bad_cond()).toBe(false);
  });

  it("should correctly check sich condition", () => {
    expect(outroConditions.sich_cond()).toBe(false);

    giveInfoPortion(infoPortions.balance_advocate_gained);

    expect(outroConditions.sich_cond()).toBe(true);
  });

  it("should correctly check noah condition", () => {
    expect(outroConditions.noahs_ark_cond()).toBe(false);

    giveInfoPortion(infoPortions.zat_b18_noah_met);

    expect(outroConditions.noahs_ark_cond()).toBe(true);

    giveInfoPortion(infoPortions.zat_b18_noah_dead);

    expect(outroConditions.noahs_ark_cond()).toBe(false);
  });

  it("should correctly check kardan condition", () => {
    expect(outroConditions.kardan_good_cond()).toBe(false);
    expect(outroConditions.kardan_bad_cond()).toBe(true);

    giveInfoPortion(infoPortions.zat_b44_tech_buddies_both_told);

    expect(outroConditions.kardan_good_cond()).toBe(true);
    expect(outroConditions.kardan_bad_cond()).toBe(false);
  });

  it("should correctly check strelok condition", () => {
    expect(outroConditions.strelok_live_cond()).toBe(true);
    expect(outroConditions.strelok_die_cond()).toBe(false);

    giveInfoPortion(infoPortions.pri_a28_strelok_dead);

    expect(outroConditions.strelok_live_cond()).toBe(false);
    expect(outroConditions.strelok_die_cond()).toBe(true);
  });

  it("should correctly check kovalski condition", () => {
    expect(outroConditions.kovalski_live_cond()).toBe(true);
    expect(outroConditions.kovalski_die_cond()).toBe(false);

    giveInfoPortion(infoPortions.pri_a28_koval_dead);

    expect(outroConditions.kovalski_live_cond()).toBe(false);
    expect(outroConditions.kovalski_die_cond()).toBe(true);
  });
});
