import { ini_file } from "xray16";
import { IniFile } from "xray16/alias";
import { TName } from "xray16/lib";
import { $fromObject } from "xray16/macros";

import { communities, TCommunity } from "@/engine/constants/communities";
import { readIniNumber, readIniSectionAsStringMap } from "@/engine/core/ini";
import { readIniTravelDialogs } from "@/engine/core/managers/travel/utils/travel_init";

export const TRAVEL_CONFIG_LTX: IniFile = new ini_file("managers\\travel_manager.ltx");
const [DESCRIPTORS_BY_NAME, DESCRIPTORS_BY_PHRASE] = readIniTravelDialogs(TRAVEL_CONFIG_LTX);

export const travelConfig = {
  // Distance considered too close to travel with group of stalkers.
  TRAVEL_DISTANCE_MIN_THRESHOLD: readIniNumber(TRAVEL_CONFIG_LTX, "config", "travel_distance_min_threshold", false, 50),
  // Duration to delay UI visibility after fast travel.
  TRAVEL_TELEPORT_DELAY: readIniNumber(TRAVEL_CONFIG_LTX, "config", "travel_teleport_delay", false, 3_000),
  TRAVEL_RESOLVE_DELAY: readIniNumber(TRAVEL_CONFIG_LTX, "config", "travel_resolve_delay", false, 6_000),
  TRAVEL_FADE_PP_EFFECTOR_ID: 613,
  // List of travel paths / dialogs.
  TRAVEL_LOCATIONS: readIniSectionAsStringMap(TRAVEL_CONFIG_LTX, "locations"),
  TRAVEL_DESCRIPTORS_BY_NAME: DESCRIPTORS_BY_NAME,
  TRAVEL_DESCRIPTORS_BY_PHRASE: DESCRIPTORS_BY_PHRASE,
  // Communities that traveler texts name differently, like `dm_duty_doing_nothing_1` for `dolg`.
  // todo: Probably revisit duty/dolg naming.
  TEXT_COMMUNITIES: $fromObject({ [communities.dolg]: "duty" }) as LuaTable<TCommunity, TName>,
};
