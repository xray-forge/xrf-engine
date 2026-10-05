import { CScriptXmlInit, CUIScriptWnd, CUIStatic, LuabindClass } from "xray16";
import { create2dVector, LuaArray, TCount, TPath } from "xray16/lib";

import {
  EDebugOverlaySlot,
  EDebugOverlayView,
  IDebugField,
  IDebugOverlayState,
} from "@/engine/core/managers/debug/debug_types";
import { inspectDebugOverlayView } from "@/engine/core/managers/debug/utils/debug_overlay";
import {
  DEBUG_CHARACTER_WIDTH,
  DEBUG_OVERLAY_PANEL,
  DEBUG_OVERLAY_SLOT_POSITIONS,
} from "@/engine/core/ui/debug/debug_layout";
import { createScreenRectangle } from "@/engine/core/utils/rectangle";
import { resolveXmlFile } from "@/engine/core/utils/ui";

const base: TPath = "menu\\debug\\DebugOverlay.component";

// Characters a value row fits before text wraps onto the next row.
const VALUE_LENGTH: TCount = math.floor(DEBUG_OVERLAY_PANEL.valueWidth / DEBUG_CHARACTER_WIDTH);

/**
 * Panel of the overlay: rows of labelled values over a background.
 */
interface IDebugOverlayPanel {
  background: CUIStatic;
  labels: LuaArray<CUIStatic>;
  values: LuaArray<CUIStatic>;
}

/**
 * Overlay drawn over the game while it runs: a panel in each slot showing the view chosen for it.
 */
@LuabindClass()
export class DebugOverlay extends CUIScriptWnd {
  public readonly panels: LuaTable<EDebugOverlaySlot, IDebugOverlayPanel> = new LuaTable();

  public constructor() {
    super();

    this.SetWindowName(this.__name);
    this.SetWndRect(createScreenRectangle());

    const xml: CScriptXmlInit = resolveXmlFile(base);

    for (const [, slot] of pairs(EDebugOverlaySlot)) {
      this.panels.set(slot, this.createPanel(xml, slot));
    }
  }

  /**
   * Show what each panel's view shows now, hiding panels that are off.
   *
   * @param views - View of each slot.
   * @param state - What the views follow.
   */
  public refresh(views: Record<EDebugOverlaySlot, EDebugOverlayView>, state: IDebugOverlayState): void {
    for (const [slot, panel] of this.panels) {
      const view: EDebugOverlayView = views[slot];
      const fields: LuaArray<IDebugField> = inspectDebugOverlayView(view, state, VALUE_LENGTH);
      const shown: TCount = math.min(fields.length(), DEBUG_OVERLAY_PANEL.rows);

      panel.background.Show(view !== EDebugOverlayView.OFF && fields.length() > 0);

      for (const index of $range(1, DEBUG_OVERLAY_PANEL.rows)) {
        const isShown: boolean = index <= shown;

        panel.labels.get(index).Show(isShown);
        panel.values.get(index).Show(isShown);

        if (isShown) {
          panel.labels.get(index).TextControl().SetText(fields.get(index).label);
          panel.values.get(index).TextControl().SetText(fields.get(index).value);
        }
      }

      panel.background.SetWndSize(
        create2dVector(
          DEBUG_OVERLAY_PANEL.width,
          shown * DEBUG_OVERLAY_PANEL.rowHeight + DEBUG_OVERLAY_PANEL.padding * 2
        )
      );
    }
  }

  /**
   * @param xml - Overlay form.
   * @param slot - Slot to place the panel in.
   * @returns Panel with its rows, placed in the slot.
   */
  private createPanel(xml: CScriptXmlInit, slot: EDebugOverlaySlot): IDebugOverlayPanel {
    const background: CUIStatic = xml.InitStatic("panel", this);
    const panel: IDebugOverlayPanel = {
      background,
      labels: new LuaTable(),
      values: new LuaTable(),
    };

    background.SetWndPos(create2dVector(DEBUG_OVERLAY_SLOT_POSITIONS[slot].x, DEBUG_OVERLAY_SLOT_POSITIONS[slot].y));

    for (const index of $range(1, DEBUG_OVERLAY_PANEL.rows)) {
      const y: number = DEBUG_OVERLAY_PANEL.padding + (index - 1) * DEBUG_OVERLAY_PANEL.rowHeight;
      const label: CUIStatic = xml.InitStatic("row_label", background);
      const value: CUIStatic = xml.InitStatic("row_value", background);

      label.SetWndPos(create2dVector(DEBUG_OVERLAY_PANEL.padding, y));
      value.SetWndPos(create2dVector(DEBUG_OVERLAY_PANEL.padding + DEBUG_OVERLAY_PANEL.labelWidth, y));

      panel.labels.set(index, label);
      panel.values.set(index, value);
    }

    return panel;
  }
}
