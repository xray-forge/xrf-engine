import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import { getManager, registerSimulator } from "@/engine/core/database";
import { EDebugOverlaySlot, EDebugOverlayView, EDebugTab, IDebugFlow } from "@/engine/core/managers/debug/debug_types";
import { DebugManager } from "@/engine/core/managers/debug/DebugManager";
import { Debugger } from "@/engine/core/ui/debug/Debugger";
import { DebugOverlayTab } from "@/engine/core/ui/debug/tabs/DebugOverlayTab";
import { mockRegisteredActor, resetRegistry } from "@/fixtures/engine";

jest.mock("@/engine/core/managers/debug/utils/debug_preferences", () => {
  const actual: { createDebugPreferences: () => object } = jest.requireActual(
    "@/engine/core/managers/debug/utils/debug_preferences"
  );

  function create(): object {
    return { ...actual.createDebugPreferences(), tab: "overlay" };
  }

  return {
    createDebugPreferences: jest.fn(create),
    loadDebugPreferences: jest.fn(create),
    saveDebugPreferences: jest.fn(),
  };
});

const flow: IDebugFlow = { identity: "quests_test", module: "checks.test", source: "test.flow.ts", level: null };

/**
 * @returns Overlay tab of a new debugger window.
 */
function createOverlayTab(): DebugOverlayTab {
  return new Debugger(getManager(DebugManager)).tabs.get(EDebugTab.OVERLAY) as DebugOverlayTab;
}

beforeEach(() => {
  resetRegistry();
  registerSimulator();
  mockRegisteredActor();
});

describe("DebugOverlayTab", () => {
  it("should show whether the overlay is on, what each slot shows and the pinned flow", () => {
    const manager: DebugManager = getManager(DebugManager);
    const tab: DebugOverlayTab = createOverlayTab();

    tab.refresh();

    expect(tab.uiToggle.TextControl().GetText()).toBe("turn on");
    expect(tab.uiPinnedFlow.TextControl().GetText()).toBe("none, pin one in the quests tab");

    for (const [slot, strip] of tab.uiSlots) {
      expect(strip.GetActiveId()).toBe(manager.preferences.overlayViews[slot]);
    }

    manager.pinnedFlow = flow;
    tab.refresh();

    expect(tab.uiPinnedFlow.TextControl().GetText()).toBe("following quests_test");
  });

  it("should turn the overlay on and off", () => {
    const manager: DebugManager = getManager(DebugManager);
    const tab: DebugOverlayTab = createOverlayTab();

    jest.spyOn(manager, "setOverlayEnabled").mockImplementation((isEnabled) => {
      manager.preferences.isOverlayEnabled = isEnabled;
    });

    tab.onToggle();

    expect(manager.setOverlayEnabled).toHaveBeenCalledWith(true);

    tab.onToggle();

    expect(manager.setOverlayEnabled).toHaveBeenLastCalledWith(false);
  });

  it("should show the view picked for a slot", () => {
    const manager: DebugManager = getManager(DebugManager);
    const tab: DebugOverlayTab = createOverlayTab();

    jest.spyOn(manager, "setOverlayView").mockImplementation(jest.fn());

    tab.uiSlots.get(EDebugOverlaySlot.MIDDLE_LEFT).SetActiveTab(EDebugOverlayView.WORLD);
    tab.onSlotViewChanged(EDebugOverlaySlot.MIDDLE_LEFT);

    expect(manager.setOverlayView).toHaveBeenCalledWith(EDebugOverlaySlot.MIDDLE_LEFT, EDebugOverlayView.WORLD);
  });

  it("should run and unpin the pinned flow", () => {
    const manager: DebugManager = getManager(DebugManager);
    const tab: DebugOverlayTab = createOverlayTab();

    jest.spyOn(manager, "refreshPinnedFlow").mockImplementation(jest.fn());
    jest.spyOn(manager, "pinFlow").mockImplementation((it) => {
      manager.pinnedFlow = it;
    });

    tab.onRefreshFlow();
    tab.onUnpinFlow();

    expect(manager.refreshPinnedFlow).not.toHaveBeenCalled();
    expect(manager.pinFlow).not.toHaveBeenCalled();

    manager.pinnedFlow = flow;
    tab.onRefreshFlow();

    expect(manager.refreshPinnedFlow).toHaveBeenCalled();

    tab.onUnpinFlow();

    expect(manager.pinFlow).toHaveBeenCalledWith(null);
  });
});
