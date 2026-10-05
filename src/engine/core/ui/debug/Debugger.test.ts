import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { DIK_keys, dik_to_bind, ui_events } from "xray16";
import { replaceFunctionMock, resetFunctionMock } from "xray16/testing/utils";

import { getManager } from "@/engine/core/database";
import { EDebugTab } from "@/engine/core/managers/debug/debug_types";
import { debugConfig } from "@/engine/core/managers/debug/DebugConfig";
import { DebugManager } from "@/engine/core/managers/debug/DebugManager";
import { Debugger } from "@/engine/core/ui/debug/Debugger";
import { MainMenu } from "@/engine/core/ui/menu/MainMenu";
import { resetRegistry } from "@/fixtures/engine";

jest.mock("@/engine/core/managers/debug/utils/debug_preferences", () => {
  const actual: { createDebugPreferences: () => object } = jest.requireActual(
    "@/engine/core/managers/debug/utils/debug_preferences"
  );

  function create(): object {
    return { ...actual.createDebugPreferences(), tab: "target" };
  }

  return {
    createDebugPreferences: jest.fn(create),
    loadDebugPreferences: jest.fn(create),
    saveDebugPreferences: jest.fn(),
  };
});

describe("Debugger", () => {
  beforeEach(() => {
    resetRegistry();
    resetFunctionMock(dik_to_bind);

    debugConfig.KEY_BINDING = 1_000;
  });

  /**
   * @returns Debugger window with a main menu to open over.
   */
  function createDebugger(): [Debugger, MainMenu] {
    const menu: MainMenu = new MainMenu();

    jest.spyOn(menu, "HideDialog").mockImplementation(jest.fn());
    jest.spyOn(menu, "ShowDialog").mockImplementation(jest.fn());
    jest.spyOn(menu, "Show").mockImplementation(jest.fn());
    jest.spyOn(menu, "close").mockImplementation(jest.fn());

    return [new Debugger(getManager(DebugManager)), menu];
  }

  it("should create a tab for each debugger tab", () => {
    const [debuggerWindow] = createDebugger();

    for (const tab of Object.values(EDebugTab)) {
      expect(debuggerWindow.tabs.get(tab)).toBeDefined();
      expect(debuggerWindow.tabs.get(tab).tab).toBe(tab);
    }
  });

  it("should open over the menu on the remembered tab", () => {
    const [debuggerWindow, menu] = createDebugger();

    jest.spyOn(debuggerWindow, "ShowDialog").mockImplementation(jest.fn());
    jest.spyOn(debuggerWindow.tabs.get(EDebugTab.TARGET), "refresh");

    getManager(DebugManager).preferences.tab = EDebugTab.TARGET;
    debuggerWindow.open(menu, false);

    expect(debuggerWindow.ShowDialog).toHaveBeenCalledWith(true);
    expect(menu.HideDialog).toHaveBeenCalled();
    expect(menu.Show).toHaveBeenCalledWith(false);
    expect(debuggerWindow.tabs.get(EDebugTab.TARGET).IsShown()).toBe(true);
    expect(debuggerWindow.tabs.get(EDebugTab.PLAYER).IsShown()).toBe(false);
    expect(debuggerWindow.tabs.get(EDebugTab.TARGET).refresh).toHaveBeenCalled();
  });

  it("should close back to the menu when opened from it", () => {
    const [debuggerWindow, menu] = createDebugger();

    jest.spyOn(debuggerWindow, "HideDialog").mockImplementation(jest.fn());

    debuggerWindow.open(menu, false);
    debuggerWindow.close();

    expect(debuggerWindow.HideDialog).toHaveBeenCalled();
    expect(menu.ShowDialog).toHaveBeenCalledWith(true);
    expect(menu.Show).toHaveBeenCalledWith(true);
    expect(menu.close).not.toHaveBeenCalled();
    expect(debuggerWindow.menu).toBeNull();
  });

  it("should close back to the game when opened from a level", () => {
    const [debuggerWindow, menu] = createDebugger();

    jest.spyOn(debuggerWindow, "HideDialog").mockImplementation(jest.fn());

    debuggerWindow.open(menu, true);
    debuggerWindow.close();

    expect(debuggerWindow.HideDialog).toHaveBeenCalled();
    expect(menu.close).toHaveBeenCalled();
    expect(debuggerWindow.menu).toBeNull();
  });

  it("should close on escape and on the debugger key", () => {
    const [debuggerWindow] = createDebugger();

    jest.spyOn(debuggerWindow, "close").mockImplementation(jest.fn());
    replaceFunctionMock(dik_to_bind, (key: number) => (key === DIK_keys.DIK_F11 ? debugConfig.KEY_BINDING : -1));

    debuggerWindow.OnKeyboard(DIK_keys.DIK_A, ui_events.WINDOW_KEY_PRESSED);
    expect(debuggerWindow.close).not.toHaveBeenCalled();

    debuggerWindow.OnKeyboard(DIK_keys.DIK_ESCAPE, ui_events.WINDOW_KEY_PRESSED);
    debuggerWindow.OnKeyboard(DIK_keys.DIK_F11, ui_events.WINDOW_KEY_PRESSED);
    expect(debuggerWindow.close).toHaveBeenCalledTimes(2);
  });

  it("should report action results on the message line", () => {
    const [debuggerWindow] = createDebugger();

    jest.spyOn(debuggerWindow, "refresh");

    debuggerWindow.onAction("done");

    expect(debuggerWindow.uiMessage.TextControl().GetText()).toBe("done");
    expect(debuggerWindow.refresh).toHaveBeenCalled();
  });

  it("should show that no game runs in the header", () => {
    const [debuggerWindow] = createDebugger();

    debuggerWindow.refreshHeader();

    expect(debuggerWindow.uiHeaderTarget.TextControl().GetText()).toBe("no game running");
  });
});
