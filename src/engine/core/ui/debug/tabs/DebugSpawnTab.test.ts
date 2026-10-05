import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { AnyObject } from "xray16/lib";
import { MockAlifeSimulator } from "xray16/mocks";

import { getManager, registerSimulator, SYSTEM_INI } from "@/engine/core/database";
import { EDebugSpawnDestination, EDebugSpawnKind, EDebugTab } from "@/engine/core/managers/debug/debug_types";
import { DebugManager } from "@/engine/core/managers/debug/DebugManager";
import { spawnDebugEntry } from "@/engine/core/managers/debug/utils/debug_spawn_actions";
import { Debugger } from "@/engine/core/ui/debug/Debugger";
import { DebugSpawnTab } from "@/engine/core/ui/debug/tabs/DebugSpawnTab";
import { mockRegisteredActor, resetRegistry } from "@/fixtures/engine";

jest.mock("@/engine/core/managers/debug/utils/debug_preferences", () => ({
  createDebugPreferences: jest.fn(() => ({
    tab: "spawn",
    spawnKind: "outfits",
    spawnDestination: "inventory",
    recentSpawns: new LuaTable(),
  })),
  loadDebugPreferences: jest.fn(() => ({
    tab: "spawn",
    spawnKind: "outfits",
    spawnDestination: "inventory",
    recentSpawns: new LuaTable(),
  })),
  saveDebugPreferences: jest.fn(),
}));

jest.mock("@/engine/core/managers/debug/utils/debug_spawn_actions", () => ({
  spawnDebugEntry: jest.fn(() => "spawned"),
}));

/**
 * @returns Spawn tab of a new debugger window.
 */
function createSpawnTab(): DebugSpawnTab {
  const debuggerWindow: Debugger = new Debugger(getManager(DebugManager));

  jest.spyOn(debuggerWindow, "resume").mockImplementation(jest.fn());

  return debuggerWindow.tabs.get(EDebugTab.SPAWN) as DebugSpawnTab;
}

const outfits: AnyObject = {
  test_outfit_light: { class: "E_STLK", inv_name: "test_outfit_light", visual: "light.ogf" },
  test_outfit_heavy: { class: "E_STLK", inv_name: "test_outfit_heavy", visual: "heavy.ogf" },
};

beforeEach(() => {
  Object.assign((SYSTEM_INI as unknown as { data: AnyObject }).data, outfits);
  resetRegistry();
  MockAlifeSimulator.reset();
  jest.mocked(spawnDebugEntry).mockClear();
});

afterEach(() => {
  for (const section of Object.keys(outfits)) {
    delete (SYSTEM_INI as unknown as { data: AnyObject }).data[section];
  }
});

describe("DebugSpawnTab", () => {
  it("should show the remembered kind from the first page", () => {
    const tab: DebugSpawnTab = createSpawnTab();

    expect(tab.entries.length()).toBeGreaterThan(0);
    expect(tab.pager.page).toBe(1);

    for (const index of $range(1, tab.entries.length())) {
      expect(tab.entries.get(index).kind).toBe(EDebugSpawnKind.OUTFITS);
    }
  });

  it("should select entries of the shown page", () => {
    const tab: DebugSpawnTab = createSpawnTab();

    tab.onEntryClicked(1);

    expect(tab.selected).toBe(tab.entries.get(1));

    tab.onEntryClicked(tab.entries.length() + 1);

    expect(tab.selected).toBe(tab.entries.get(1));
  });

  it("should keep the count and the page within bounds", () => {
    const tab: DebugSpawnTab = createSpawnTab();

    tab.onCountChanged(-5);
    expect(tab.count).toBe(1);

    tab.onCountChanged(4);
    expect(tab.count).toBe(5);

    tab.onPageChanged(-1);
    expect(tab.pager.page).toBe(1);

    tab.onPageChanged(100);
    expect(tab.pager.page).toBe(1);
  });

  it("should filter the kind by the search", () => {
    const tab: DebugSpawnTab = createSpawnTab();

    tab.uiSearch.SetText("no such outfit");
    tab.onSearch();

    expect(tab.entries.length()).toBe(0);
  });

  it("should spawn the selection into the inventory and remember it", () => {
    registerSimulator();
    mockRegisteredActor();

    const tab: DebugSpawnTab = createSpawnTab();
    const manager: DebugManager = getManager(DebugManager);

    tab.onSpawn();

    expect(spawnDebugEntry).not.toHaveBeenCalled();

    tab.onEntryClicked(1);
    tab.onCountChanged(2);
    tab.onSpawn();

    expect(spawnDebugEntry).toHaveBeenCalledWith(tab.selected, 3, EDebugSpawnDestination.INVENTORY, null);
    expect(manager.preferences.recentSpawns.get(1)).toBe(tab.selected?.section);
    expect(tab.owner.resume).not.toHaveBeenCalled();
  });
});
