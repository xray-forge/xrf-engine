import { PartialRecord, TName } from "xray16/lib";

import { monsters, TMonster } from "@/engine/constants/monsters";

/**
 * Map of icons to display in PDA for monsters.
 */
export const iconByKilledMonsters: PartialRecord<TMonster, TName> = {
  [monsters.bloodsucker_weak]: "ui_inGame2_Krovosos",
  [monsters.bloodsucker_normal]: "ui_inGame2_Krovosos_1",
  [monsters.bloodsucker_strong]: "ui_inGame2_Krovosos_2",
  [monsters.boar_weak]: "ui_inGame2_Kaban_1",
  [monsters.boar_strong]: "ui_inGame2_Kaban",
  [monsters.burer]: "ui_inGame2_Burer",
  [monsters.chimera]: "ui_inGame2_Himera",
  [monsters.controller]: "ui_inGame2_Controller",
  [monsters.dog]: "ui_inGame2_Blind_Dog",
  [monsters.flesh_weak]: "ui_inGame2_Flesh",
  [monsters.flesh_strong]: "ui_inGame2_Flesh_1",
  [monsters.gigant]: "ui_inGame2_Pseudo_Gigant",
  [monsters.poltergeist_tele]: "ui_inGame2_Poltergeyst",
  [monsters.poltergeist_flame]: "ui_inGame2_Poltergeist_1",
  [monsters.psy_dog_weak]: "ui_inGame2_PseudoDog_1",
  [monsters.psy_dog_strong]: "ui_inGame2_PseudoDog",
  [monsters.pseudodog_weak]: "ui_inGame2_PseudoDog_1",
  [monsters.pseudodog_strong]: "ui_inGame2_PseudoDog",
  [monsters.snork]: "ui_inGame2_Snork",
  [monsters.tushkano]: "ui_inGame2_Tushkan",
} as const;

/**
 * Section of PDA statistics layout.
 */
export const enum EPdaStatSection {
  // Time spent in the zone, filled by the engine itself for layouts with actor info as the ranking page has.
  TIME_IN_ZONE,
  SURGES,
  COMPLETED_QUESTS,
  KILLED_MONSTERS,
  KILLED_STALKERS,
  ARTEFACTS_FOUND,
  SECRETS_FOUND,
}
