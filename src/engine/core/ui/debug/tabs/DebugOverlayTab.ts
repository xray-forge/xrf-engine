import { CUI3tButton, CUIScrollView, CUIStatic, CUITabControl, LuabindClass } from "xray16";
import { LuaArray, Nillable, TPath } from "xray16/lib";
import { $fromArray, $isNil } from "xray16/macros";

import {
  EDebugOverlaySlot,
  EDebugOverlayView,
  EDebugTab,
  IDebugField,
  IDebugFlow,
} from "@/engine/core/managers/debug/debug_types";
import type { DebugManager } from "@/engine/core/managers/debug/DebugManager";
import { inspectDebugOverlayView } from "@/engine/core/managers/debug/utils/debug_overlay";
import { getDebugOverlaySlotTag } from "@/engine/core/ui/debug/debug_layout";
import type { Debugger } from "@/engine/core/ui/debug/Debugger";
import { DebuggerTab } from "@/engine/core/ui/debug/tabs/DebuggerTab";
import { isGameStarted } from "@/engine/core/utils/game";
import { initializeStatics } from "@/engine/core/utils/ui";

const base: TPath = "menu\\debug\\DebugOverlayTab.component";

// Characters the preview passes to the flow view, which leaves wrapping to the preview list.
const PREVIEW_LENGTH: number = 1_000;

/**
 * Overlay tab: what each overlay slot shows, the overlay turned on or off, and the pinned flow as the overlay shows it.
 */
@LuabindClass()
export class DebugOverlayTab extends DebuggerTab {
  public uiFields!: CUIScrollView;
  public uiToggle!: CUI3tButton;
  public uiPinnedFlow!: CUIStatic;
  // Strip of views of each slot.
  public uiSlots: LuaTable<EDebugOverlaySlot, CUITabControl> = new LuaTable();

  public constructor(owner: Debugger) {
    super(owner, EDebugTab.OVERLAY, base);
  }

  public override initialize(): void {
    initializeStatics(
      this.xml,
      this,
      "heading_preview",
      "fields_background",
      "heading_overlay",
      "heading_flow",
      "overlay_hint"
    );

    for (const [, slot] of pairs(EDebugOverlaySlot)) {
      this.xml.InitStatic(`heading_${getDebugOverlaySlotTag(slot)}`, this);
      this.uiSlots.set(
        slot,
        this.initializeTabControl(`slot_${getDebugOverlaySlotTag(slot)}`, () => this.onSlotViewChanged(slot))
      );
    }

    this.uiFields = this.xml.InitScrollView("fields", this);
    this.uiPinnedFlow = this.xml.InitStatic("pinned_flow", this);
    this.uiToggle = this.initializeButton("toggle_button", () => this.onToggle());

    this.initializeButton("flow_refresh_button", () => this.onRefreshFlow());
    this.initializeButton("flow_unpin_button", () => this.onUnpinFlow());
  }

  public override refresh(): void {
    const manager: DebugManager = this.owner.manager;
    const flow: Nillable<IDebugFlow> = manager.pinnedFlow;

    this.uiToggle.TextControl().SetText(manager.preferences.isOverlayEnabled ? "turn off" : "turn on");
    this.uiPinnedFlow
      .TextControl()
      .SetText($isNil(flow) ? "none, pin one in the quests tab" : `following ${flow.identity}`);

    for (const [slot, strip] of this.uiSlots) {
      if (strip.GetActiveId() !== manager.preferences.overlayViews[slot]) {
        strip.SetActiveTab(manager.preferences.overlayViews[slot]);
      }
    }

    const fields: LuaArray<IDebugField> = inspectDebugOverlayView(
      EDebugOverlayView.FLOW,
      manager.getOverlayState(),
      PREVIEW_LENGTH
    );

    this.fillFieldList(
      this.uiFields,
      fields.length() > 0 ? fields : $fromArray<IDebugField>([{ label: "flow", value: "no game running" }])
    );
  }

  /**
   * Turn the overlay on or off.
   */
  public onToggle(): void {
    const isEnabled: boolean = !this.owner.manager.preferences.isOverlayEnabled;

    this.owner.manager.setOverlayEnabled(isEnabled);
    this.owner.onAction(`overlay ${isEnabled ? "on" : "off"}`);
  }

  /**
   * Show the view picked in a slot's strip.
   *
   * @param slot - Overlay slot.
   */
  public onSlotViewChanged(slot: EDebugOverlaySlot): void {
    const view: EDebugOverlayView = this.uiSlots.get(slot).GetActiveId() as EDebugOverlayView;

    if (view !== this.owner.manager.preferences.overlayViews[slot]) {
      this.owner.manager.setOverlayView(slot, view);
      this.owner.onAction(`${slot} shows ${view}`);
    }
  }

  /**
   * Run the pinned flow now, rather than on the overlay's next refresh.
   */
  public onRefreshFlow(): void {
    const manager: DebugManager = this.owner.manager;

    if (!isGameStarted() || $isNil(manager.pinnedFlow)) {
      return this.owner.report("no flow pinned in a running game");
    }

    manager.refreshPinnedFlow();
    this.owner.onAction(
      $isNil(manager.pinnedFlow) ? "the pinned flow could not run and was unpinned" : "pinned flow run"
    );
  }

  /**
   * Stop following the pinned flow.
   */
  public onUnpinFlow(): void {
    const flow: Nillable<IDebugFlow> = this.owner.manager.pinnedFlow;

    if ($isNil(flow)) {
      return this.owner.report("no flow pinned");
    }

    this.owner.manager.pinFlow(null);
    this.owner.onAction(`${flow.identity} unpinned`);
  }
}
