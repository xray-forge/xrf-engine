import { beforeEach, describe, expect, it } from "@jest/globals";

import { registerSimulator } from "@/engine/core/database";
import { EDebugOverlaySlot, EDebugOverlayView } from "@/engine/core/managers/debug/debug_types";
import { createDebugPreferences } from "@/engine/core/managers/debug/utils/debug_preferences";
import { DEBUG_OVERLAY_PANEL } from "@/engine/core/ui/debug/debug_layout";
import { DebugOverlay } from "@/engine/core/ui/debug/DebugOverlay";
import { mockRegisteredActor, resetRegistry } from "@/fixtures/engine";

beforeEach(() => {
  resetRegistry();
  registerSimulator();
  mockRegisteredActor();
});

describe("DebugOverlay", () => {
  it("should create a panel with its rows for each slot", () => {
    const overlay: DebugOverlay = new DebugOverlay();

    for (const [, slot] of pairs(EDebugOverlaySlot)) {
      expect(overlay.panels.get(slot).labels.length()).toBe(DEBUG_OVERLAY_PANEL.rows);
      expect(overlay.panels.get(slot).values.length()).toBe(DEBUG_OVERLAY_PANEL.rows);
    }
  });

  it("should show the view of each slot, hiding the panels that are off", () => {
    const overlay: DebugOverlay = new DebugOverlay();
    const views = createDebugPreferences().overlayViews;

    views[EDebugOverlaySlot.MIDDLE_RIGHT] = EDebugOverlayView.OFF;
    overlay.refresh(views, {
      targetId: null,
      flow: null,
      flowResult: null,
      simulationId: null,
      simulationRecords: new LuaTable(),
    });

    const target = overlay.panels.get(EDebugOverlaySlot.TOP_RIGHT);

    expect(target.background.IsShown()).toBe(true);
    expect(target.labels.get(1).IsShown()).toBe(true);
    expect(target.labels.get(1).TextControl().GetText()).toBe("target");
    expect(target.values.get(1).TextControl().GetText()).toBe("none");
    expect(target.labels.get(2).IsShown()).toBe(false);
    expect(overlay.panels.get(EDebugOverlaySlot.MIDDLE_RIGHT).background.IsShown()).toBe(false);
  });
});
