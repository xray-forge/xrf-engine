import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { get_console, level } from "xray16";
import { GameObject } from "xray16/alias";
import { MockConsole, MockGameObject } from "xray16/mocks";
import { replaceFunctionMock, resetFunctionMock } from "xray16/testing/utils";

import { disposeManager, getManager, registerSimulator } from "@/engine/core/database";
import { forgeConfig } from "@/engine/core/database/forge_config";
import { EDebugTab } from "@/engine/core/managers/debug/debug_types";
import { debugConfig } from "@/engine/core/managers/debug/DebugConfig";
import { DebugManager } from "@/engine/core/managers/debug/DebugManager";
import { TDebugCatalogue } from "@/engine/core/managers/debug/utils/debug_catalogue";
import { loadDebugPreferences, saveDebugPreferences } from "@/engine/core/managers/debug/utils/debug_preferences";
import { EGameEvent, EventsManager } from "@/engine/core/managers/events";
import { Debugger } from "@/engine/core/ui/debug/Debugger";
import type { MainMenu } from "@/engine/core/ui/menu/MainMenu";
import { mockRegisteredActor, resetRegistry } from "@/fixtures/engine";

jest.mock("@/engine/core/managers/debug/utils/debug_preferences", () => ({
  createDebugPreferences: jest.fn(() => ({ tab: "target" })),
  loadDebugPreferences: jest.fn(() => ({
    tab: "player",
    recentSpawns: new LuaTable(),
    consoleHistory: new LuaTable(),
  })),
  saveDebugPreferences: jest.fn(),
}));

jest.mock("@/engine/core/ui/debug/Debugger", () => ({
  Debugger: class {
    public open = jest.fn();
  },
}));

describe("DebugManager", () => {
  const menu: MainMenu = {} as MainMenu;

  beforeEach(() => {
    resetRegistry();
    registerSimulator();
    MockConsole.reset();
    resetFunctionMock(level.get_target_obj);
    jest.mocked(saveDebugPreferences).mockClear();

    forgeConfig.DEBUG.IS_ENABLED = true;
    debugConfig.KEY_BINDING = 1_000;
  });

  it("should initialize and destroy", () => {
    const manager: DebugManager = getManager(DebugManager);
    const eventsManager: EventsManager = getManager(EventsManager);

    expect(loadDebugPreferences).toHaveBeenCalled();
    expect(manager.preferences.tab).toBe(EDebugTab.PLAYER);
    expect(eventsManager.getEventSubscribersCount(EGameEvent.MAIN_MENU_ON)).toBe(1);
    expect(eventsManager.getEventSubscribersCount(EGameEvent.ACTOR_INFO_ADDED)).toBe(1);
    expect(eventsManager.getEventSubscribersCount(EGameEvent.ACTOR_INFO_REMOVED)).toBe(1);
    expect(eventsManager.getEventSubscribersCount(EGameEvent.DUMP_LUA_DATA)).toBe(1);

    disposeManager(DebugManager);

    expect(eventsManager.getSubscribersCount()).toBe(0);
  });

  it("should open the debugger over a menu, creating it once", () => {
    const manager: DebugManager = getManager(DebugManager);

    manager.openDebugger(menu, false);

    const debuggerWindow: Debugger = manager.uiDebugger as Debugger;

    expect(debuggerWindow.open).toHaveBeenCalledWith(menu, false);

    manager.openDebugger(menu, true);

    expect(manager.uiDebugger).toBe(debuggerWindow);
    expect(debuggerWindow.open).toHaveBeenCalledWith(menu, true);
  });

  it("should not open the debugger when debugging is disabled", () => {
    const manager: DebugManager = getManager(DebugManager);

    forgeConfig.DEBUG.IS_ENABLED = false;
    manager.openDebugger(menu, false);

    expect(manager.uiDebugger).toBeNull();
    expect(manager.onKeyPress(debugConfig.KEY_BINDING)).toBe(false);
  });

  it("should open the main menu on the debugger key in a level, then the debugger over it", () => {
    mockRegisteredActor();

    const manager: DebugManager = getManager(DebugManager);
    const eventsManager: EventsManager = getManager(EventsManager);
    const object: GameObject = MockGameObject.mock();

    replaceFunctionMock(level.get_target_obj, () => object);

    expect(manager.onKeyPress(1)).toBe(false);
    expect(manager.isOpenRequested).toBe(false);

    expect(manager.onKeyPress(debugConfig.KEY_BINDING)).toBe(true);
    expect(manager.isOpenRequested).toBe(true);
    expect(manager.target.id).toBe(object.id());
    expect(get_console().execute).toHaveBeenCalledWith("main_menu on");

    // The menu announces itself while it is created, and the debugger waits for its first update.
    eventsManager.emitEvent(EGameEvent.MAIN_MENU_ON, menu);

    expect(manager.isOpenRequested).toBe(false);
    expect(manager.requestedMenu).toBe(menu);
    expect(manager.uiDebugger).toBeNull();

    eventsManager.emitEvent(EGameEvent.MAIN_MENU_UPDATE);

    expect(manager.requestedMenu).toBeNull();
    expect(manager.uiDebugger?.open).toHaveBeenCalledWith(menu, true);
    expect(eventsManager.getEventSubscribersCount(EGameEvent.MAIN_MENU_UPDATE)).toBe(0);
  });

  it("should ignore main menus it did not request", () => {
    const manager: DebugManager = getManager(DebugManager);
    const eventsManager: EventsManager = getManager(EventsManager);

    eventsManager.emitEvent(EGameEvent.MAIN_MENU_ON, menu);

    expect(manager.requestedMenu).toBeNull();
    expect(eventsManager.getEventSubscribersCount(EGameEvent.MAIN_MENU_UPDATE)).toBe(0);
  });

  it("should save the selected tab when it changes", () => {
    const manager: DebugManager = getManager(DebugManager);

    manager.selectTab(EDebugTab.PLAYER);

    expect(saveDebugPreferences).not.toHaveBeenCalled();

    manager.selectTab(EDebugTab.SYSTEM);

    expect(manager.preferences.tab).toBe(EDebugTab.SYSTEM);
    expect(saveDebugPreferences).toHaveBeenCalledWith(manager.preferences);
  });

  it("should build the catalogue once", () => {
    const manager: DebugManager = getManager(DebugManager);

    expect(manager.catalogue).toBeNull();

    const catalogue: TDebugCatalogue = manager.getCatalogue();

    expect(manager.getCatalogue()).toBe(catalogue);
  });

  it("should remember recent spawns and save them", () => {
    const manager: DebugManager = getManager(DebugManager);

    manager.rememberSpawn("wpn_a");
    manager.rememberSpawn("wpn_b");
    manager.rememberSpawn("wpn_a");

    expect(manager.preferences.recentSpawns).toEqualLuaArrays(["wpn_a", "wpn_b"]);
    expect(saveDebugPreferences).toHaveBeenCalledTimes(3);
  });

  it("should remember info portions the actor gains or loses", () => {
    const manager: DebugManager = getManager(DebugManager);
    const eventsManager: EventsManager = getManager(EventsManager);

    eventsManager.emitEvent(EGameEvent.ACTOR_INFO_ADDED, null, "first_info");
    eventsManager.emitEvent(EGameEvent.ACTOR_INFO_REMOVED, null, "second_info");
    eventsManager.emitEvent(EGameEvent.ACTOR_INFO_ADDED, null, "first_info");

    expect(manager.recentInfoPortions).toEqualLuaArrays(["first_info", "second_info"]);
  });

  it("should remember console lines and save them", () => {
    const manager: DebugManager = getManager(DebugManager);

    manager.rememberConsoleLine("actor:name()");
    manager.rememberConsoleLine("1 + 1");

    expect(manager.preferences.consoleHistory).toEqualLuaArrays(["1 + 1", "actor:name()"]);
    expect(saveDebugPreferences).toHaveBeenCalledTimes(2);
  });

  it("should dump its state", () => {
    const manager: DebugManager = getManager(DebugManager);

    expect(manager.onDebugDump({})).toEqual({
      DebugManager: { target: manager.target, preferences: manager.preferences },
    });
  });
});
