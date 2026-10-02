import { ammo } from "@/engine/constants/items/ammo";
import { questItems } from "@/engine/constants/items/quest_items";
import { weaponAddons, weapons } from "@/engine/constants/items/weapons";

export const mockWeaponLtx = {
  [questItems.pri_a17_gauss_rifle]: {
    cost: 25_000,
    no_repair: true,
    class: "WP_SVD",
  },
  [weapons.wpn_ak74]: {
    class: "WP_AK74",
    inv_name: "AK-74",
    strap_bone0: "some_bone",
  },
  [weapons.wpn_ak74u]: {
    class: "WP_AK74",
    ammo_class: "ammo_5.45x39_fmj, ammo_5.45x39_ap",
    cost: 4000,
    inv_name: "AK-74u",
    strap_bone0: "some_bone_u",
    upgrades:
      "up_gr_firstab_ak74u, up_gr_seconab_ak74u, up_gr_thirdab_ak74u, up_gr_fourtab_ak74u, " +
      "up_gr_fifthab_ak74u, up_gr_fifthcd_ak74u",
  },
  [weapons.wpn_svu]: {
    class: "WP_SVU",
    cost: 7000,
    strap_bone0: "some_bone",
  },
  [weapons.wpn_abakan]: {
    class: "WP_AK74",
    cost: 5000,
    strap_bone0: "some_bone",
  },
  [weaponAddons.wpn_addon_scope]: {
    class: "WP_SCOPE",
    cost: 2100,
  },
  [weapons.grenade_f1]: {
    class: "G_F1_S",
  },
  [ammo.ammo_9x18_pmm]: {
    class: "AMMO_S",
    box_size: 30,
  },
  [ammo["ammo_5.45x39_ap"]]: {
    class: "AMMO_S",
    box_size: 30,
  },
  ammo_9x39_ap: {
    class: "AMMO_S",
    box_size: 30,
  },
  "ammo_5.56x45_ap": {
    class: "AMMO_S",
    box_size: 30,
  },
  ammo_12x76_zhekan: {
    class: "AMMO_S",
    box_size: 20,
  },
  ammo_m209: {
    class: "S_M209",
    box_size: 1,
  },
  "ammo_og-7b": {
    class: "S_OG7B",
    box_size: 1,
  },
};
