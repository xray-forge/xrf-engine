import { clsid } from "xray16";
import { TClassId } from "xray16/alias";
import { PartialRecord, TName } from "xray16/lib";
import { $fromObject } from "xray16/macros";

import { TWeapon, weapons } from "@/engine/constants/items/weapons";

export const statisticsConfig = {
  // Monster kinds shown as the best killed monster, by monster class.
  MONSTER_KINDS: {
    [clsid.bloodsucker_s]: "bloodsucker",
    [clsid.boar_s]: "boar",
    [clsid.burer_s]: "burer",
    [clsid.chimera_s]: "chimera",
    [clsid.controller_s]: "controller",
    [clsid.dog_s]: "dog",
    [clsid.flesh_s]: "flesh",
    [clsid.gigant_s]: "gigant",
    [clsid.poltergeist_s]: "poltergeist",
    [clsid.psy_dog_s]: "psy_dog",
    [clsid.pseudodog_s]: "pseudodog",
    [clsid.snork_s]: "snork",
    [clsid.tushkano_s]: "tushkano",
  } as PartialRecord<TClassId, TName>,
  // Weapon kinds counted for the favorite weapon, by a word of their sections, with the section each kind shows as.
  // todo: Probably compose based on system ltx sections.
  WEAPON_KINDS: $fromObject<TName, TWeapon>({
    abakan: weapons.wpn_abakan,
    ak74: weapons.wpn_ak74,
    ak74u: weapons.wpn_ak74u,
    beretta: weapons.wpn_beretta,
    bm16: weapons.wpn_bm16,
    colt1911: weapons.wpn_colt1911,
    desert: weapons.wpn_desert_eagle,
    f1: weapons.grenade_f1,
    fn2000: weapons.wpn_fn2000,
    fort: weapons.wpn_fort,
    g36: weapons.wpn_g36,
    gauss: weapons.wpn_gauss,
    groza: weapons.wpn_groza,
    hpsa: weapons.wpn_hpsa,
    knife: weapons.wpn_knife,
    l85: weapons.wpn_l85,
    lr300: weapons.wpn_lr300,
    mp5: weapons.wpn_mp5,
    pb: weapons.wpn_pb,
    pkm: weapons.wpn_pkm,
    pm: weapons.wpn_pm,
    protecta: weapons.wpn_protecta,
    rg: weapons["wpn_rg-6"],
    rgd5: weapons.grenade_rgd5,
    rpg7: weapons.wpn_rpg7,
    sig220: weapons.wpn_sig220,
    sig550: weapons.wpn_sig550,
    spas12: weapons.wpn_spas12,
    svd: weapons.wpn_svd,
    svu: weapons.wpn_svu,
    toz34: weapons.wpn_toz34,
    usp: weapons.wpn_usp,
    val: weapons.wpn_val,
    vintorez: weapons.wpn_vintorez,
    walther: weapons.wpn_walther,
    wincheaster1300: weapons.wpn_wincheaster1300,
  }),
};
