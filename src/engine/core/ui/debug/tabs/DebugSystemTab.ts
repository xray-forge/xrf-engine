import { CUI3tButton, CUIScrollView, LuabindClass } from "xray16";
import { LuaArray, TLabel, TPath } from "xray16/lib";

import { EDebugOverlaySlot, EDebugTab } from "@/engine/core/managers/debug/debug_types";
import { debugConfig } from "@/engine/core/managers/debug/DebugConfig";
import type { DebugManager } from "@/engine/core/managers/debug/DebugManager";
import {
  collectDebugGarbage,
  dumpDebugLuaData,
  dumpDebugSystemIni,
  inspectDebugSystem,
  toggleDebugSimulationView,
} from "@/engine/core/managers/debug/utils/debug_system";
import { DEBUG_BUTTON_HEIGHT, DEBUG_OVERLAY_SLOT_ROW } from "@/engine/core/ui/debug/debug_layout";
import type { Debugger } from "@/engine/core/ui/debug/Debugger";
import { DebuggerTab } from "@/engine/core/ui/debug/tabs/DebuggerTab";
import { initializeStatics } from "@/engine/core/utils/ui";

const base: TPath = "menu\\debug\\DebugSystemTab.component";

/**
 * System tab: Lua runtime facts, memory, dumps, debug views and the overlay setup.
 */
@LuabindClass()
export class DebugSystemTab extends DebuggerTab {
  public uiFields!: CUIScrollView;
  public uiOverlayToggle!: CUI3tButton;
  // Button of each overlay slot, cycling the view it shows, in the order of `debugConfig.OVERLAY_SLOTS`.
  public uiOverlaySlots: LuaArray<CUI3tButton> = new LuaTable();

  public constructor(owner: Debugger) {
    super(owner, EDebugTab.SYSTEM, base);
  }

  public override initialize(): void {
    initializeStatics(
      this.xml,
      this,
      "fields_background",
      "heading_lua",
      "heading_dumps",
      "heading_views",
      "heading_overlay"
    );

    this.uiFields = this.xml.InitScrollView("fields", this);

    this.initializeButton("collect_garbage_button", () => this.onAction(collectDebugGarbage));
    this.initializeButton("refresh_button", () => this.onAction(() => ""));
    this.initializeButton("dump_lua_data_button", () => this.onAction(dumpDebugLuaData));
    this.initializeButton("dump_system_ini_button", () => this.onAction(dumpDebugSystemIni));
    this.initializeButton("simulation_view_button", () => this.onAction(toggleDebugSimulationView));

    this.uiOverlayToggle = this.initializeButton("overlay_toggle_button", () => this.onOverlayToggle());

    this.uiOverlaySlots = this.initializeButtonColumn(
      "overlay_slot_button",
      debugConfig.OVERLAY_SLOTS.length(),
      DEBUG_OVERLAY_SLOT_ROW.y,
      DEBUG_BUTTON_HEIGHT + DEBUG_OVERLAY_SLOT_ROW.gap,
      (index) => this.onOverlaySlotClicked(index)
    );
  }

  public override refresh(): void {
    const manager: DebugManager = this.owner.manager;

    this.fillFieldList(this.uiFields, inspectDebugSystem());
    this.uiOverlayToggle.TextControl().SetText(`overlay ${manager.preferences.isOverlayEnabled ? "on" : "off"}`);

    for (const index of $range(1, debugConfig.OVERLAY_SLOTS.length())) {
      const slot: EDebugOverlaySlot = debugConfig.OVERLAY_SLOTS.get(index);

      this.uiOverlaySlots.get(index).TextControl().SetText(`${slot}: ${manager.preferences.overlayViews[slot]}`);
    }
  }

  /**
   * Run a system action.
   *
   * @param action - Action returning its result message.
   */
  public onAction(action: () => TLabel): void {
    this.owner.onAction(action());
  }

  /**
   * Turn the overlay on or off.
   */
  public onOverlayToggle(): void {
    const isEnabled: boolean = !this.owner.manager.preferences.isOverlayEnabled;

    this.owner.manager.setOverlayEnabled(isEnabled);
    this.owner.onAction(`overlay ${isEnabled ? "on" : "off"}`);
  }

  /**
   * Show the next view in an overlay slot.
   *
   * @param index - Position of the slot button, from one.
   */
  public onOverlaySlotClicked(index: number): void {
    const slot: EDebugOverlaySlot = debugConfig.OVERLAY_SLOTS.get(index);

    this.owner.onAction(`${slot} shows ${this.owner.manager.cycleOverlayView(slot)}`);
  }
}
