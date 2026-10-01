import { IniFile } from "xray16/alias";
import { TCount, TName, TStringId } from "xray16/lib";

import { TLevel } from "@/engine/constants/levels";
import { parseConditionsList } from "@/engine/core/ini";
import { ITravelRouteDescriptor } from "@/engine/core/managers/travel/travel_types";

/**
 * Read list of travel routes descriptors / phrases configuration.
 *
 * @param ini - Target file to read from.
 * @returns Tuple with descriptors by name and names by dialog phrase id.
 */
export function readIniTravelDialogs(
  ini: IniFile
): LuaMultiReturn<[LuaTable<TName, ITravelRouteDescriptor>, LuaTable<TStringId, TName>]> {
  const travelDescriptorsByName: LuaTable<TName, ITravelRouteDescriptor> = new LuaTable();
  const travelDescriptorsByPhraseId: LuaTable<TStringId, TName> = new LuaTable();
  const count: TCount = ini.line_count("traveler");

  for (const index of $range(0, count - 1)) {
    const [, name] = ini.r_line("traveler", index, "", "");
    const phraseId: TStringId = tostring(1000 + index);

    travelDescriptorsByPhraseId.set(phraseId, name);

    travelDescriptorsByName.set(name, {
      phraseId: phraseId,
      name: ini.r_string(name, "name"),
      level: ini.r_string(name, "level") as TLevel,
      condlist: parseConditionsList(ini.r_string(name, "condlist")),
    });
  }

  return $multi(travelDescriptorsByName, travelDescriptorsByPhraseId);
}
