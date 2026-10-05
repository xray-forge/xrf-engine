import {
  CScriptXmlInit,
  CUI3tButton,
  CUIEditBox,
  CUIScrollView,
  CUIStatic,
  CUITabControl,
  CUIWindow,
  LuabindClass,
  ui_events,
} from "xray16";
import { create2dVector, LuaArray, TCount, TIndex, TName, TPath } from "xray16/lib";

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
   * @param name - Name to register the button under, for buttons made from one node many times.
   * @returns The button.
   */
  protected initializeButton(
    selector: TName,
    onClick: () => void,
    base: CUIWindow = this,
    name: TName = selector
  ): CUI3tButton {
    const button: CUI3tButton = this.xml.Init3tButton(selector, base);
    const registeredName: TName = `${this.tab}_${name}`;

    this.owner.Register(button, registeredName);
    this.owner.AddCallback(registeredName, ui_events.BUTTON_CLICKED, onClick, this);

    return button;
  }

  /**
   * Create a tab control calling a handler when another of its buttons is picked.
   *
   * @param selector - Tab control node in the tab's form.
   * @param onChange - Change handler.
   * @returns The tab control.
   */
  protected initializeTabControl(selector: TName, onChange: () => void): CUITabControl {
    const tabs: CUITabControl = this.xml.InitTab(selector, this);
    const name: TName = `${this.tab}_${selector}`;

    this.owner.Register(tabs, name);
    this.owner.AddCallback(name, ui_events.TAB_CHANGED, onChange, this);

    return tabs;
  }

  /**
   * Create an edit box calling a handler when its text is committed with Enter.
   *
   * @param selector - Edit box node in the tab's form.
   * @param onCommit - Commit handler.
   * @returns The edit box.
   */
  protected initializeEditBox(selector: TName, onCommit: () => void): CUIEditBox {
    const editBox: CUIEditBox = this.xml.InitEditBox(selector, this);
    const name: TName = `${this.tab}_${selector}`;

    this.owner.Register(editBox, name);
    this.owner.AddCallback(name, ui_events.EDIT_TEXT_COMMIT, onCommit, this);

    return editBox;
  }

  /**
   * Create a column of buttons from one node, each calling a handler with its position.
   *
   * @param selector - Button node in the tab's form, holding the column's left edge.
   * @param count - How many buttons to create.
   * @param y - Top edge of the first button.
   * @param step - Distance from one button to the next.
   * @param onClick - Click handler, given the position of the button clicked, from one.
   * @returns The buttons, top first.
   */
  protected initializeButtonColumn(
    selector: TName,
    count: TCount,
    y: number,
    step: number,
    onClick: (position: TIndex) => void
  ): LuaArray<CUI3tButton> {
    const buttons: LuaArray<CUI3tButton> = new LuaTable();

    for (const index of $range(1, count)) {
      const button: CUI3tButton = this.initializeButton(selector, () => onClick(index), this, `${selector}_${index}`);

      button.SetWndPos(create2dVector(button.GetWndPos().x, y + (index - 1) * step));
      buttons.set(index, button);
    }

    return buttons;
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
