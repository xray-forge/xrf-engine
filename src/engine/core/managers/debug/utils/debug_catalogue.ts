import { game } from "xray16";
import { LuaArray, Nillable, TLabel, TName, TSection } from "xray16/lib";
import { $isNil } from "xray16/macros";

import { SYSTEM_INI } from "@/engine/core/database";
import { readIniString } from "@/engine/core/ini";
import { EDebugSpawnKind, IDebugSpawnEntry } from "@/engine/core/managers/debug/debug_types";
import { debugConfig } from "@/engine/core/managers/debug/DebugConfig";

/**
 * Spawnable sections grouped by kind.
 */
export type TDebugCatalogue = LuaTable<EDebugSpawnKind, LuaArray<IDebugSpawnEntry>>;

/**
 * @param kind - Spawn kind.
 * @returns Whether sections of the kind are inventory items rather than creatures or squads.
 */
export function isDebugItemKind(kind: EDebugSpawnKind): boolean {
  return kind !== EDebugSpawnKind.MONSTERS && kind !== EDebugSpawnKind.STALKERS && kind !== EDebugSpawnKind.SQUADS;
}

/**
 * Tell what a section spawns as, leaving out sections that are only bases for others or that belong to the story.
 *
 * @param section - Section of `system.ini`.
 * @returns Spawn kind of the section, `null` when the debugger does not spawn it.
 */
export function getDebugSpawnKind(section: TSection): Nillable<EDebugSpawnKind> {
  const configClass: Nillable<TName> = readIniString(SYSTEM_INI, section, "class");
  const kind: Nillable<EDebugSpawnKind> = $isNil(configClass) ? null : debugConfig.SPAWN_KIND_BY_CLASS.get(configClass);

  if ($isNil(kind)) {
    return null;
  }

  // Items without an inventory name or a model are the bases items inherit from, such as `helmet`.
  if (isDebugItemKind(kind)) {
    return SYSTEM_INI.line_exist(section, "inv_name") && SYSTEM_INI.line_exist(section, "visual") ? kind : null;
  }

  // A second story object of the same id breaks the story, and squads without members are bases.
  if (SYSTEM_INI.line_exist(section, "story_id")) {
    return null;
  }

  return kind !== EDebugSpawnKind.SQUADS || SYSTEM_INI.line_exist(section, "npc") ? kind : null;
}

/**
 * Collect every spawnable section of `system.ini` in one pass, grouped by kind and sorted by name.
 *
 * @returns Spawnable sections grouped by kind.
 */
export function buildDebugCatalogue(): TDebugCatalogue {
  const catalogue: TDebugCatalogue = new LuaTable();

  for (const [, kind] of pairs(EDebugSpawnKind)) {
    catalogue.set(kind, new LuaTable());
  }

  SYSTEM_INI.section_for_each((section: TSection) => {
    const kind: Nillable<EDebugSpawnKind> = getDebugSpawnKind(section);

    if ($isNil(kind)) {
      return;
    }

    const label: TLabel = isDebugItemKind(kind)
      ? game.translate_string(readIniString(SYSTEM_INI, section, "inv_name", false, null, section))
      : section;
    const entries: LuaArray<IDebugSpawnEntry> = catalogue.get(kind);

    entries.set(entries.length() + 1, { section, kind, label, search: string.lower(`${section} ${label}`) });
  });

  for (const [, entries] of catalogue) {
    table.sort(entries, (first, second) => first.label < second.label);
  }

  return catalogue;
}
