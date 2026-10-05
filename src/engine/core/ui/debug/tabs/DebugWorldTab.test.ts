import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MockVector } from "xray16/mocks";

import { getManager, registerSimulator } from "@/engine/core/database";
import { EDebugTab, EDebugWorldView } from "@/engine/core/managers/debug/debug_types";
import { DebugManager } from "@/engine/core/managers/debug/DebugManager";
import { teleportActorToDebugWorldEntry } from "@/engine/core/managers/debug/utils/debug_world_actions";
import { Debugger } from "@/engine/core/ui/debug/Debugger";
import { DebugWorldTab } from "@/engine/core/ui/debug/tabs/DebugWorldTab";
import { mockRegisteredActor, resetRegistry } from "@/fixtures/engine";

jest.mock("@/engine/core/managers/debug/utils/debug_preferences", () => {
  const actual: { createDebugPreferences: () => object } = jest.requireActual(
    "@/engine/core/managers/debug/utils/debug_preferences"
  );

  function create(): object {
    return { ...actual.createDebugPreferences(), tab: "world", worldView: "saved positions" };
  }

  return {
    createDebugPreferences: jest.fn(create),
    loadDebugPreferences: jest.fn(create),
    saveDebugPreferences: jest.fn(),
  };
});

jest.mock("@/engine/core/managers/debug/utils/debug_world_actions", () => ({
  ...(jest.requireActual("@/engine/core/managers/debug/utils/debug_world_actions") as object),
  teleportActorToDebugWorldEntry: jest.fn(() => "teleported"),
}));

/**
 * @returns World tab of a new debugger window.
 */
function createWorldTab(): DebugWorldTab {
  const debuggerWindow: Debugger = new Debugger(getManager(DebugManager));

  jest.spyOn(debuggerWindow, "resume").mockImplementation(jest.fn());

  return debuggerWindow.tabs.get(EDebugTab.WORLD) as DebugWorldTab;
}

beforeEach(() => {
  resetRegistry();
  registerSimulator();
  mockRegisteredActor({ position: MockVector.mock(1, 2, 3) });
});

describe("DebugWorldTab", () => {
  it("should save positions, list them and delete the selected one", () => {
    const tab: DebugWorldTab = createWorldTab();
    const manager: DebugManager = getManager(DebugManager);

    expect(manager.preferences.worldView).toBe(EDebugWorldView.POSITIONS);

    tab.uiSearch.SetText("camp");
    tab.onSavePosition();
    tab.uiSearch.SetText("");
    tab.onSearch();

    expect(manager.preferences.savedPositions.length()).toBe(1);
    expect(tab.entries.length()).toBe(1);

    tab.onDeletePosition();

    expect(manager.preferences.savedPositions.length()).toBe(1);

    tab.onEntryClicked(1);
    tab.onDeletePosition();

    expect(manager.preferences.savedPositions.length()).toBe(0);
    expect(tab.entries.length()).toBe(0);
    expect(tab.selected).toBeNull();
  });

  it("should teleport to the selected row and resume the game", () => {
    const tab: DebugWorldTab = createWorldTab();

    tab.onTeleport();

    expect(teleportActorToDebugWorldEntry).not.toHaveBeenCalled();

    tab.onSavePosition();
    tab.onEntryClicked(1);
    tab.onTeleport();

    expect(teleportActorToDebugWorldEntry).toHaveBeenCalledWith(tab.selected);
    expect(tab.owner.resume).toHaveBeenCalled();
  });

  it("should target only objects", () => {
    const tab: DebugWorldTab = createWorldTab();

    tab.onSavePosition();
    tab.onEntryClicked(1);
    tab.onTarget();

    expect(getManager(DebugManager).target.id).toBeNull();
  });
});
