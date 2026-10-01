import { $fromArray } from "xray16/macros";

import { artefacts, TArtefact } from "@/engine/constants/items/artefacts";

export const achievementsConfig = {
  // Artefacts to collect for the seeker achievement, every artefact that is not a quest one, as in vanilla.
  // todo: Probably compose from system ltx and avoid hardcode.
  SEEKER_ARTEFACTS: $fromArray<TArtefact>([
    artefacts.af_baloon,
    artefacts.af_blood,
    artefacts.af_cristall,
    artefacts.af_cristall_flower,
    artefacts.af_dummy_battery,
    artefacts.af_dummy_dummy,
    artefacts.af_dummy_glassbeads,
    artefacts.af_electra_flash,
    artefacts.af_electra_moonlight,
    artefacts.af_electra_sparkler,
    artefacts.af_eye,
    artefacts.af_fire,
    artefacts.af_fireball,
    artefacts.af_fuzz_kolobok,
    artefacts.af_glass,
    artefacts.af_gold_fish,
    artefacts.af_gravi,
    artefacts.af_ice,
    artefacts.af_medusa,
    artefacts.af_mincer_meat,
    artefacts.af_night_star,
    artefacts.af_soul,
    artefacts.af_vyvert,
  ]),
};
