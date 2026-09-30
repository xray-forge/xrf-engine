import { TName } from "xray16/lib";
import { $fromArray } from "xray16/macros";

import { zoneNames } from "@/engine/constants/zone_names";

export const sleepConfig = {
  SLEEP_ZONES: $fromArray<TName>([
    zoneNames.zat_a2_sr_sleep,
    zoneNames.jup_a6_sr_sleep,
    zoneNames.pri_a16_sr_sleep,
    zoneNames.actor_surge_hide_2,
  ]),
};
