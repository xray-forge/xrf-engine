import { getFS } from "xray16";
import { LuaArray, Nillable, TPath, TSection } from "xray16/lib";
import { $isNil } from "xray16/macros";

import { roots } from "@/engine/constants/roots";
import { SYSTEM_INI } from "@/engine/core/database";
import {
  EDebugOverlaySlot,
  EDebugOverlayView,
  EDebugQuestView,
  EDebugSimulationView,
  EDebugSpawnDestination,
  EDebugSpawnKind,
  EDebugTab,
  EDebugWorldView,
  IDebugPreferences,
  IDebugSavedPosition,
} from "@/engine/core/managers/debug/debug_types";
import { debugConfig } from "@/engine/core/managers/debug/DebugConfig";
import { loadObjectFromFile, saveObjectToFile } from "@/engine/core/utils/fs";

/**
 * @returns Preferences the debugger starts with when the install has none saved.
 */
export function createDebugPreferences(): IDebugPreferences {
  return {
    tab: debugConfig.DEFAULT_TAB,
    spawnKind: EDebugSpawnKind.WEAPONS,
    spawnDestination: EDebugSpawnDestination.INVENTORY,
    recentSpawns: new LuaTable(),
    worldView: EDebugWorldView.SMART_TERRAINS,
    simulationView: EDebugSimulationView.SQUADS,
    savedPositions: new LuaTable(),
    questView: EDebugQuestView.TASKS,
    consoleHistory: new LuaTable(),
    isOverlayEnabled: false,
    overlayViews: {
      [EDebugOverlaySlot.TOP_RIGHT]: EDebugOverlayView.TARGET,
      [EDebugOverlaySlot.MIDDLE_LEFT]: EDebugOverlayView.FLOW,
      [EDebugOverlaySlot.MIDDLE_RIGHT]: EDebugOverlayView.ACTOR,
    },
  };
}

/**
 * @param values - Enumeration values.
 * @param value - Value read from the file.
 * @param fallback - Value to use when the read one is not among the values.
 * @returns The read value when it is valid, the fallback otherwise.
 */
function readEnumValue<T extends string>(values: Record<string, T>, value: unknown, fallback: T): T {
  for (const [, it] of pairs(values)) {
    if (it === value) {
      return it;
    }
  }

  return fallback;
}

/**
 * Read the debugger preferences of this install, falling back to the defaults for anything missing or unknown, such as
 * a tab or a section a later build no longer has.
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

  preferences.tab = readEnumValue(EDebugTab, saved.tab, preferences.tab);
  preferences.spawnKind = readEnumValue(EDebugSpawnKind, saved.spawnKind, preferences.spawnKind);
  preferences.spawnDestination = readEnumValue(
    EDebugSpawnDestination,
    saved.spawnDestination,
    preferences.spawnDestination
  );

  const recentSpawns: Nillable<LuaArray<TSection>> = saved.recentSpawns;

  if (type(recentSpawns) === "table") {
    for (const index of $range(1, recentSpawns!.length())) {
      const section: TSection = recentSpawns!.get(index);

      if (type(section) === "string" && SYSTEM_INI.section_exist(section)) {
        preferences.recentSpawns.set(preferences.recentSpawns.length() + 1, section);
      }
    }
  }

  preferences.worldView = readEnumValue(EDebugWorldView, saved.worldView, preferences.worldView);
  preferences.simulationView = readEnumValue(EDebugSimulationView, saved.simulationView, preferences.simulationView);

  preferences.questView = readEnumValue(EDebugQuestView, saved.questView, preferences.questView);
  preferences.isOverlayEnabled = saved.isOverlayEnabled === true;

  if (type(saved.overlayViews) === "table") {
    for (const [, slot] of pairs(EDebugOverlaySlot)) {
      preferences.overlayViews[slot] = readEnumValue(
        EDebugOverlayView,
        saved.overlayViews![slot],
        preferences.overlayViews[slot]
      );
    }
  }

  const consoleHistory: Nillable<LuaArray<string>> = saved.consoleHistory;

  if (type(consoleHistory) === "table") {
    for (const index of $range(1, math.min(consoleHistory!.length(), debugConfig.CONSOLE_HISTORY_LIMIT))) {
      const line: string = consoleHistory!.get(index);

      if (type(line) === "string") {
        preferences.consoleHistory.set(preferences.consoleHistory.length() + 1, line);
      }
    }
  }

  const savedPositions: Nillable<LuaArray<IDebugSavedPosition>> = saved.savedPositions;

  if (type(savedPositions) === "table") {
    for (const index of $range(1, savedPositions!.length())) {
      const position: IDebugSavedPosition = savedPositions!.get(index);

      if (isSavedPosition(position)) {
        preferences.savedPositions.set(preferences.savedPositions.length() + 1, position);
      }
    }
  }

  return preferences;
}

/**
 * @param value - Value read from the file.
 * @returns Whether the value holds every field of a saved position.
 */
function isSavedPosition(value: unknown): value is IDebugSavedPosition {
  if (type(value) !== "table") {
    return false;
  }

  const position: IDebugSavedPosition = value as IDebugSavedPosition;

  return (
    type(position.name) === "string" &&
    type(position.level) === "string" &&
    type(position.x) === "number" &&
    type(position.y) === "number" &&
    type(position.z) === "number" &&
    type(position.levelVertexId) === "number" &&
    type(position.gameVertexId) === "number"
  );
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
