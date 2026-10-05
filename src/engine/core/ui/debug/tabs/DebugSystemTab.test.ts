import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import { getManager, registerSimulator } from "@/engine/core/database";
import { EDebugOverlaySlot, EDebugOverlayView, EDebugTab } from "@/engine/core/managers/debug/debug_types";
import { debugConfig } from "@/engine/core/managers/debug/DebugConfig";
import { DebugManager } from "@/engine/core/managers/debug/DebugManager";
import { Debugger } from "@/engine/core/ui/debug/Debugger";
import { DebugSystemTab } from "@/engine/core/ui/debug/tabs/DebugSystemTab";
import { mockRegisteredActor, resetRegistry } from "@/fixtures/engine";

jest.mock("@/engine/core/managers/debug/utils/debug_preferences", () => {
  const actual: { createDebugPreferences: () => object } = jest.requireActual(
    "@/engine/core/managers/debug/utils/debug_preferences"
  );

  function create(): object {
    return { ...actual.createDebugPreferences(), tab: "system" };
  }

  return {
    createDebugPreferences: jest.fn(create),
    loadDebugPreferences: jest.fn(create),
    saveDebugPreferences: jest.fn(),
  };
});

/**
 * @returns System tab of a new debugger window.
 */
function createSystemTab(): DebugSystemTab {
  return new Debugger(getManager(DebugManager)).tabs.get(EDebugTab.SYSTEM) as DebugSystemTab;
}

beforeEach(() => {
  resetRegistry();
  registerSimulator();
  mockRegisteredActor();
});

describe("DebugSystemTab", () => {
  it("should show whether the overlay is on and what each slot shows", () => {
    const tab: DebugSystemTab = createSystemTab();

    tab.refresh();

    expect(tab.uiOverlayToggle.TextControl().GetText()).toBe("overlay off");
    expect(debugConfig.OVERLAY_SLOTS.length()).toBe(3);
    expect(tab.uiOverlaySlots.length()).toBe(3);

    for (const index of $range(1, debugConfig.OVERLAY_SLOTS.length())) {
      const slot: EDebugOverlaySlot = debugConfig.OVERLAY_SLOTS.get(index);

      expect(tab.uiOverlaySlots.get(index).TextControl().GetText()).toBe(
        `${slot}: ${getManager(DebugManager).preferences.overlayViews[slot]}`
      );
    }
  });

  it("should turn the overlay on and off", () => {
    const manager: DebugManager = getManager(DebugManager);
    const tab: DebugSystemTab = createSystemTab();

    jest.spyOn(manager, "setOverlayEnabled").mockImplementation((isEnabled) => {
      manager.preferences.isOverlayEnabled = isEnabled;
    });

    tab.onOverlayToggle();

    expect(manager.setOverlayEnabled).toHaveBeenCalledWith(true);

    tab.onOverlayToggle();

    expect(manager.setOverlayEnabled).toHaveBeenLastCalledWith(false);
  });

  it("should cycle the view of the slot clicked", () => {
    const manager: DebugManager = getManager(DebugManager);
    const tab: DebugSystemTab = createSystemTab();

    jest.spyOn(manager, "cycleOverlayView").mockImplementation(() => EDebugOverlayView.WORLD);

    tab.onOverlaySlotClicked(2);

    expect(manager.cycleOverlayView).toHaveBeenCalledWith(debugConfig.OVERLAY_SLOTS.get(2));
  });
});
