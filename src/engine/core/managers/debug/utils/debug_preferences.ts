import { getFS } from "xray16";
import { Nillable, TPath } from "xray16/lib";
import { $isNil } from "xray16/macros";

import { roots } from "@/engine/constants/roots";
import { EDebugTab, IDebugPreferences } from "@/engine/core/managers/debug/debug_types";
import { debugConfig } from "@/engine/core/managers/debug/DebugConfig";
import { loadObjectFromFile, saveObjectToFile } from "@/engine/core/utils/fs";

/**
 * @returns Preferences the debugger starts with when the install has none saved.
 */
export function createDebugPreferences(): IDebugPreferences {
  return { tab: debugConfig.DEFAULT_TAB };
}

/**
 * Read the debugger preferences of this install, falling back to the defaults for anything missing or unknown.
 *
 * @returns Debugger preferences.
 */
export function loadDebugPreferences(): IDebugPreferences {
  const preferences: IDebugPreferences = createDebugPreferences();
  const saved: Nillable<Partial<IDebugPreferences>> = loadObjectFromFile(
    getFS().update_path(roots.appDataRoot, debugConfig.PREFERENCES_FILE)
  );

  if ($isNil(saved)) {
    return preferences;
  }

  for (const [, tab] of pairs(EDebugTab)) {
    if (saved.tab === tab) {
      preferences.tab = tab;
    }
  }

  return preferences;
}

/**
 * Write the debugger preferences of this install.
 *
 * @param preferences - Debugger preferences.
 */
export function saveDebugPreferences(preferences: IDebugPreferences): void {
  const folder: TPath = getFS().update_path(roots.appDataRoot, "");

  saveObjectToFile(folder, debugConfig.PREFERENCES_FILE, preferences);
}
