import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { DIK_keys } from "xray16";
import { $fromArray } from "xray16/macros";

import { getManager } from "@/engine/core/database";
import { EDebugTab } from "@/engine/core/managers/debug/debug_types";
import { DebugManager } from "@/engine/core/managers/debug/DebugManager";
import { evaluateDebugLua } from "@/engine/core/managers/debug/utils/debug_console";
import { Debugger } from "@/engine/core/ui/debug/Debugger";
import { DebugConsoleTab } from "@/engine/core/ui/debug/tabs/DebugConsoleTab";
import { resetRegistry } from "@/fixtures/engine";

jest.mock("@/engine/core/managers/debug/utils/debug_preferences", () => {
  const actual: { createDebugPreferences: () => object } = jest.requireActual(
    "@/engine/core/managers/debug/utils/debug_preferences"
  );

  function create(): object {
    return { ...actual.createDebugPreferences(), tab: "console" };
  }

  return {
    createDebugPreferences: jest.fn(create),
    loadDebugPreferences: jest.fn(create),
    saveDebugPreferences: jest.fn(),
  };
});

jest.mock("@/engine/core/managers/debug/utils/debug_console", () => ({
  createDebugConsoleEnvironment: jest.fn(() => ({})),
  evaluateDebugLua: jest.fn(() => "2"),
}));

/**
 * @returns Console tab of a new debugger window.
 */
function createConsoleTab(): DebugConsoleTab {
  return new Debugger(getManager(DebugManager)).tabs.get(EDebugTab.CONSOLE) as DebugConsoleTab;
}

beforeEach(() => {
  resetRegistry();
  jest.mocked(evaluateDebugLua).mockClear();
});

describe("DebugConsoleTab", () => {
  it("should run the typed line, show it with its result and remember it", () => {
    const tab: DebugConsoleTab = createConsoleTab();

    tab.onRun();

    expect(evaluateDebugLua).not.toHaveBeenCalled();

    tab.uiInput.SetText("1 + 1");
    tab.onRun();

    expect(evaluateDebugLua).toHaveBeenCalledWith("1 + 1", {});
    expect(tab.rowCount).toBe(2);
    expect(tab.uiInput.GetText()).toBe("");
    expect(getManager(DebugManager).preferences.consoleHistory).toEqualLuaArrays(["1 + 1"]);
  });

  it("should step through the history with up and down", () => {
    const tab: DebugConsoleTab = createConsoleTab();

    getManager(DebugManager).preferences.consoleHistory = $fromArray(["second", "first"]);

    expect(tab.onKeyPressed(DIK_keys.DIK_A)).toBe(false);

    tab.onKeyPressed(DIK_keys.DIK_UP);
    expect(tab.uiInput.GetText()).toBe("second");

    tab.onKeyPressed(DIK_keys.DIK_UP);
    tab.onKeyPressed(DIK_keys.DIK_UP);
    expect(tab.uiInput.GetText()).toBe("first");

    tab.onKeyPressed(DIK_keys.DIK_DOWN);
    tab.onKeyPressed(DIK_keys.DIK_DOWN);
    expect(tab.uiInput.GetText()).toBe("");
  });
});
