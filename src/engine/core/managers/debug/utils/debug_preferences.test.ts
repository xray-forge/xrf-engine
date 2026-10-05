import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { $fromArray } from "xray16/macros";
import { replaceFunctionMock, resetFunctionMock } from "xray16/testing/utils";

import {
  EDebugOverlaySlot,
  EDebugOverlayView,
  EDebugQuestView,
  EDebugSpawnDestination,
  EDebugSpawnKind,
  EDebugTab,
  EDebugWorldView,
  IDebugPreferences,
} from "@/engine/core/managers/debug/debug_types";
import { debugConfig } from "@/engine/core/managers/debug/DebugConfig";
import {
  createDebugPreferences,
  loadDebugPreferences,
  saveDebugPreferences,
} from "@/engine/core/managers/debug/utils/debug_preferences";
import { loadObjectFromFile, saveObjectToFile } from "@/engine/core/utils/fs";

jest.mock("@/engine/core/utils/fs");

beforeEach(() => {
  resetFunctionMock(loadObjectFromFile);
  resetFunctionMock(saveObjectToFile);
});

describe("createDebugPreferences", () => {
  it("should create the defaults", () => {
    const preferences: IDebugPreferences = createDebugPreferences();

    expect(preferences.tab).toBe(debugConfig.DEFAULT_TAB);
    expect(preferences.spawnKind).toBe(EDebugSpawnKind.WEAPONS);
    expect(preferences.spawnDestination).toBe(EDebugSpawnDestination.INVENTORY);
    expect(preferences.recentSpawns).toEqualLuaArrays([]);
    expect(preferences.isOverlayEnabled).toBe(false);
    expect(preferences.overlayViews[EDebugOverlaySlot.TOP_RIGHT]).toBe(EDebugOverlayView.TARGET);
    expect(preferences.overlayViews[EDebugOverlaySlot.MIDDLE_LEFT]).toBe(EDebugOverlayView.FLOW);
    expect(preferences.overlayViews[EDebugOverlaySlot.MIDDLE_RIGHT]).toBe(EDebugOverlayView.ACTOR);
  });
});

describe("loadDebugPreferences", () => {
  it("should fall back to the defaults without a saved file", () => {
    replaceFunctionMock(loadObjectFromFile, () => null);

    expect(loadDebugPreferences().tab).toBe(debugConfig.DEFAULT_TAB);
    expect(loadObjectFromFile).toHaveBeenCalledWith("$app_data_root$\\debugger.dat");
  });

  it("should read saved preferences", () => {
    replaceFunctionMock(loadObjectFromFile, () => ({
      tab: EDebugTab.SYSTEM,
      spawnKind: EDebugSpawnKind.AMMO,
      spawnDestination: EDebugSpawnDestination.ACTOR,
      recentSpawns: $fromArray(["wpn_ak74"]),
      worldView: EDebugWorldView.TREASURES,
      questView: EDebugQuestView.FLOWS,
      consoleHistory: $fromArray(["1 + 1"]),
      isOverlayEnabled: true,
      overlayViews: {
        [EDebugOverlaySlot.TOP_RIGHT]: EDebugOverlayView.WORLD,
        [EDebugOverlaySlot.MIDDLE_LEFT]: EDebugOverlayView.OFF,
      },
      savedPositions: $fromArray([
        { name: "camp", level: "zaton", x: 1, y: 2, z: 3, levelVertexId: 4, gameVertexId: 5 },
      ]),
    }));

    const preferences: IDebugPreferences = loadDebugPreferences();

    expect(preferences.tab).toBe(EDebugTab.SYSTEM);
    expect(preferences.spawnKind).toBe(EDebugSpawnKind.AMMO);
    expect(preferences.spawnDestination).toBe(EDebugSpawnDestination.ACTOR);
    expect(preferences.recentSpawns).toEqualLuaArrays(["wpn_ak74"]);
    expect(preferences.worldView).toBe(EDebugWorldView.TREASURES);
    expect(preferences.questView).toBe(EDebugQuestView.FLOWS);
    expect(preferences.consoleHistory).toEqualLuaArrays(["1 + 1"]);
    expect(preferences.isOverlayEnabled).toBe(true);
    expect(preferences.overlayViews[EDebugOverlaySlot.TOP_RIGHT]).toBe(EDebugOverlayView.WORLD);
    expect(preferences.overlayViews[EDebugOverlaySlot.MIDDLE_LEFT]).toBe(EDebugOverlayView.OFF);
    expect(preferences.overlayViews[EDebugOverlaySlot.MIDDLE_RIGHT]).toBe(EDebugOverlayView.ACTOR);
    expect(preferences.savedPositions.length()).toBe(1);
    expect(preferences.savedPositions.get(1).name).toBe("camp");
  });

  it("should replace values a later build no longer has with the defaults", () => {
    replaceFunctionMock(loadObjectFromFile, () => ({
      tab: "removed_tab",
      spawnKind: "removed_kind",
      spawnDestination: 15,
      recentSpawns: $fromArray(["removed_section", "wpn_ak74"]),
      worldView: "removed_view",
      questView: "removed_view",
      consoleHistory: $fromArray([5, "actor"]),
      isOverlayEnabled: "yes",
      overlayViews: { [EDebugOverlaySlot.TOP_RIGHT]: "removed_view" },
      savedPositions: $fromArray([{ name: "broken" }, "not a position"]),
    }));

    const preferences: IDebugPreferences = loadDebugPreferences();

    expect(preferences.tab).toBe(debugConfig.DEFAULT_TAB);
    expect(preferences.spawnKind).toBe(EDebugSpawnKind.WEAPONS);
    expect(preferences.spawnDestination).toBe(EDebugSpawnDestination.INVENTORY);
    expect(preferences.recentSpawns).toEqualLuaArrays(["wpn_ak74"]);
    expect(preferences.worldView).toBe(EDebugWorldView.SMART_TERRAINS);
    expect(preferences.questView).toBe(EDebugQuestView.TASKS);
    expect(preferences.consoleHistory).toEqualLuaArrays(["actor"]);
    expect(preferences.isOverlayEnabled).toBe(false);
    expect(preferences.overlayViews[EDebugOverlaySlot.TOP_RIGHT]).toBe(EDebugOverlayView.TARGET);
    expect(preferences.savedPositions.length()).toBe(0);
  });
});

describe("saveDebugPreferences", () => {
  it("should write preferences to the user data folder", () => {
    const preferences: IDebugPreferences = createDebugPreferences();

    saveDebugPreferences(preferences);

    expect(saveObjectToFile).toHaveBeenCalledWith("$app_data_root$\\", "debugger.dat", preferences);
  });
});
