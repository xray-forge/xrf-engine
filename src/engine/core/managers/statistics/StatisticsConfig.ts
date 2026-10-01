import { clsid } from "xray16";
import { TClassId } from "xray16/alias";
import { PartialRecord, TName } from "xray16/lib";

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
};
