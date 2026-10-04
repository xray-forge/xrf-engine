/* eslint sort-keys-fix/sort-keys-fix: "error" */

import { TName } from "xray16/lib";

/**
 * Zone object names used by actor effects.
 *
 * @virtual
 */
export const zoneNames = {
  actor_surge_hide_2: "actor_surge_hide_2",
  jup_a6_sr_no_assault: "jup_a6_sr_no_assault",
  jup_a6_sr_sleep: "jup_a6_sr_sleep",
  jup_a9_cam_1: "jup_a9_cam_1",
  jup_a9_cam_2: "jup_a9_cam_2",
  jup_a9_cam_3: "jup_a9_cam_3",
  jup_b10_ufo_restrictor: "jup_b10_ufo_restrictor",
  jup_b202_logic: "jup_b202_logic",
  jup_b206_sr_quest_line: "jup_b206_sr_quest_line",
  jup_b209_hypotheses: "jup_b209_hypotheses",
  jup_b41_sr_light: "jup_b41_sr_light",
  jup_b41_sr_no_assault: "jup_b41_sr_no_assault",
  jup_b8_heli_4: "jup_b8_heli_4",
  jup_b9_heli_1: "jup_b9_heli_1",
  pas_b400_sr_canalisation_1: "pas_b400_sr_canalisation_1",
  pas_b400_sr_downstairs_1: "pas_b400_sr_downstairs_1",
  pas_b400_sr_exit: "pas_b400_sr_exit",
  pas_b400_sr_hall_1: "pas_b400_sr_hall_1",
  pas_b400_sr_switcher: "pas_b400_sr_switcher",
  pas_b400_sr_track_1: "pas_b400_sr_track_1",
  pas_b400_sr_tunnel_1: "pas_b400_sr_tunnel_1",
  pas_b400_sr_way_1: "pas_b400_sr_way_1",
  pri_a16_sr_sleep: "pri_a16_sr_sleep",
  pri_a18_use_idol_restrictor: "pri_a18_use_idol_restrictor",
  pri_b306_sr_generator: "pri_b306_sr_generator",
  zat_a2_sr_no_assault: "zat_a2_sr_no_assault",
  zat_a2_sr_sleep: "zat_a2_sr_sleep",
  zat_b100_heli_2: "zat_b100_heli_2",
  zat_b101_heli_5: "zat_b101_heli_5",
  zat_b20_sr_actor_cross_the_teleport: "zat_b20_sr_actor_cross_the_teleport",
  zat_b20_teleport: "zat_b20_teleport",
  zat_b28_heli_3: "zat_b28_heli_3",
  zat_b29_sr_1: "zat_b29_sr_1",
  zat_b29_sr_2: "zat_b29_sr_2",
  zat_b29_sr_3: "zat_b29_sr_3",
  zat_b29_sr_4: "zat_b29_sr_4",
  zat_b29_sr_5: "zat_b29_sr_5",
  zat_b33_tutor: "zat_b33_tutor",
  zat_b52_snag_place: "zat_b52_snag_place",
  zat_b52_snag_port_cranes: "zat_b52_snag_port_cranes",
} as const;

export type TZoneNames = typeof zoneNames;

export type TZoneName = TZoneNames[keyof TZoneNames];

/**
 * Get the zone name for a Jupiter b32 scanner placement index.
 */
export function getJupB32ScannerPlacementZoneName(index: number): TName {
  return "jup_b32_sr_scanner_place_" + index;
}
