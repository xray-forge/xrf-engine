import { CScriptXmlInit, CUI3tButton, CUIScrollView, CUIStatic, CUIWindow, LuabindClass, ui_events } from "xray16";
import { LuaArray, TName, TPath } from "xray16/lib";

import { EDebugTab, IDebugField } from "@/engine/core/managers/debug/debug_types";
import type { Debugger } from "@/engine/core/ui/debug/Debugger";
import { resolveXmlFile } from "@/engine/core/utils/ui";

/**
 * Tab of the debugger window, loaded from its own form and placed in the window's tab area.
 *
 * Controls register on the window under the tab's name, as the window keys callbacks by name and tabs share names
 * such as `heal_button`.
 */
@LuabindClass()
export abstract class DebuggerTab extends CUIWindow {
  public readonly owner: Debugger;
  public readonly tab: EDebugTab;
  public readonly xml: CScriptXmlInit;

  public constructor(owner: Debugger, tab: EDebugTab, form: TPath) {
    super();

    this.owner = owner;
    this.tab = tab;
    this.xml = resolveXmlFile(form);

    this.SetWindowName(`debugger_${tab}`);
    this.SetAutoDelete(true);
  }

  /**
   * Create the tab's controls. Called by the window once the tab is constructed, so that fields subclasses declare
   * are initialized by then.
   */
  public abstract initialize(): void;

  /**
   * Show what the tab displays as it is now, on opening the window, switching to the tab and after an action.
   */
  public abstract refresh(): void;

  /**
   * Create a button calling a handler when clicked.
   *
   * @param selector - Button node in the tab's form.
   * @param onClick - Click handler.
   * @param base - Window to place the button in.
   * @returns The button.
   */
  protected initializeButton(selector: TName, onClick: () => void, base: CUIWindow = this): CUI3tButton {
    const button: CUI3tButton = this.xml.Init3tButton(selector, base);
    const name: TName = `${this.tab}_${selector}`;

    this.owner.Register(button, name);
    this.owner.AddCallback(name, ui_events.BUTTON_CLICKED, onClick, this);

    return button;
  }

  /**
   * Show labelled values in a list built from the `field_row`, `field_label` and `field_value` templates.
   *
   * @param list - List to fill.
   * @param fields - Values to show.
   */
  protected fillFieldList(list: CUIScrollView, fields: LuaArray<IDebugField>): void {
    list.Clear();

    for (const index of $range(1, fields.length())) {
      const field: IDebugField = fields.get(index);
      const row: CUIStatic = this.xml.InitStatic("field_row", null);

      this.xml.InitStatic("field_label", row).TextControl().SetText(field.label);
      this.xml.InitStatic("field_value", row).TextControl().SetText(field.value);

      list.AddWindow(row, true);
      row.SetAutoDelete(true);
    }
  }
}
