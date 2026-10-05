import {
  CScriptXmlInit,
  CUICheckButton,
  CUIComboBox,
  CUIScriptWnd,
  CUIStatic,
  CUITabControl,
  DIK_keys,
  dik_to_bind,
  LuabindClass,
  ui_events,
} from "xray16";
import { TKeyCode, TUIEvent } from "xray16/alias";
import { LuaArray, Nillable, TLabel, TNumberId, TPath } from "xray16/lib";
import { $filename, $isNil } from "xray16/macros";

import { EDebugTab } from "@/engine/core/managers/debug/debug_types";
import { debugConfig } from "@/engine/core/managers/debug/DebugConfig";
import type { DebugManager } from "@/engine/core/managers/debug/DebugManager";
import { describeDebugObject, inspectActorLocation } from "@/engine/core/managers/debug/utils/debug_inspect";
import { pinDebugTarget, selectDebugTarget } from "@/engine/core/managers/debug/utils/debug_target";
import { EGameEvent, EventsManager } from "@/engine/core/managers/events";
import { DebuggerTab } from "@/engine/core/ui/debug/tabs/DebuggerTab";
import { DebugPlayerTab } from "@/engine/core/ui/debug/tabs/DebugPlayerTab";
import { DebugSystemTab } from "@/engine/core/ui/debug/tabs/DebugSystemTab";
import { DebugTargetTab } from "@/engine/core/ui/debug/tabs/DebugTargetTab";
import type { MainMenu } from "@/engine/core/ui/menu/MainMenu";
import { isGameStarted } from "@/engine/core/utils/game";
import { LuaLogger } from "@/engine/core/utils/logging";
import { createScreenRectangle } from "@/engine/core/utils/rectangle";
import { resolveXmlFile } from "@/engine/core/utils/ui";

const logger: LuaLogger = new LuaLogger($filename);
const base: TPath = "menu\\debug\\Debugger.component";

/**
 * Debugger window: a header with the target and the actor's location, a tab list, the selected tab and a message
 * line reporting the last action.
 *
 * It opens over the main menu, which keeps it working while the game is paused.
 */
@LuabindClass()
export class Debugger extends CUIScriptWnd {
  public readonly manager: DebugManager;
  public readonly tabs: LuaTable<EDebugTab, DebuggerTab> = new LuaTable();

  public menu: Nillable<MainMenu> = null;
  // Opened from a level with the debugger key, so closing returns to the game rather than to the main menu.
  public isResumingOnClose: boolean = false;

  public uiTabs!: CUITabControl;
  public uiHeaderTarget!: CUIStatic;
  public uiHeaderLocation!: CUIStatic;
  public uiPinCheck!: CUICheckButton;
  public uiRecentTargets!: CUIComboBox;
  public uiMessage!: CUIStatic;

  public constructor(manager: DebugManager) {
    super();

    this.manager = manager;

    this.SetWindowName(this.__name);
    this.SetWndRect(createScreenRectangle());
    this.Enable(true);

    this.initializeControls();
  }

  /**
   * Create the window's controls and its tabs.
   */
  public initializeControls(): void {
    const xml: CScriptXmlInit = resolveXmlFile(base);

    xml.InitStatic("background", this);
    xml.InitStatic("header_background", this);
    xml.InitStatic("tab_list_background", this);
    xml.InitStatic("message_background", this);

    this.uiHeaderTarget = xml.InitStatic("header_target", this);
    this.uiHeaderLocation = xml.InitStatic("header_location", this);
    this.uiMessage = xml.InitStatic("message", this);

    this.uiPinCheck = xml.InitCheck("pin_check", this);
    this.Register(this.uiPinCheck, "pin_check");
    this.AddCallback("pin_check", ui_events.CHECK_BUTTON_SET, () => this.onPinChanged(), this);
    this.AddCallback("pin_check", ui_events.CHECK_BUTTON_RESET, () => this.onPinChanged(), this);

    this.uiRecentTargets = xml.InitComboBox("recent_targets", this);
    this.Register(this.uiRecentTargets, "recent_targets");
    this.AddCallback("recent_targets", ui_events.LIST_ITEM_SELECT, () => this.onRecentTargetSelected(), this);

    this.Register(xml.Init3tButton("close_button", this), "close_button");
    this.AddCallback("close_button", ui_events.BUTTON_CLICKED, () => this.close(), this);

    this.uiTabs = xml.InitTab("tabs", this);
    this.Register(this.uiTabs, "tabs");
    this.AddCallback("tabs", ui_events.TAB_CHANGED, () => this.onTabChanged(), this);

    this.addTab(xml, new DebugTargetTab(this));
    this.addTab(xml, new DebugPlayerTab(this));
    this.addTab(xml, new DebugSystemTab(this));
  }

  /**
   * Show the debugger over a main menu, hiding the menu.
   *
   * @param menu - Main menu the debugger opens over.
   * @param isResumingOnClose - Whether closing the debugger returns to the game rather than to the menu.
   */
  public open(menu: MainMenu, isResumingOnClose: boolean): void {
    logger.info("Open debugger, resume on close: %s", isResumingOnClose);

    this.menu = menu;
    this.isResumingOnClose = isResumingOnClose;

    this.report("");
    this.ShowDialog(true);

    menu.HideDialog();
    menu.Show(false);

    this.showTab(this.manager.preferences.tab);
  }

  /**
   * Close the debugger, returning to the game when it was opened from a level and to the main menu otherwise.
   */
  public close(): void {
    if (this.isResumingOnClose) {
      this.resume();
    } else {
      this.HideDialog();
      this.menu?.ShowDialog(true);
      this.menu?.Show(true);
      this.menu = null;
    }
  }

  /**
   * Close the debugger and the main menu under it, letting the game run. Actions that need the world to move, such
   * as a teleport, end with it.
   */
  public resume(): void {
    this.HideDialog();
    this.menu?.close();
    this.menu = null;
  }

  /**
   * Show the result of the last action on the message line.
   *
   * @param message - Result message.
   */
  public report(message: TLabel): void {
    if (message !== "") {
      logger.info("Debugger: %s", message);
    }

    this.uiMessage.TextControl().SetText(message);
  }

  /**
   * Report an action's result and show the state it left.
   *
   * @param message - Result message.
   */
  public onAction(message: TLabel): void {
    this.report(message);
    this.refresh();
  }

  /**
   * Show the header and the selected tab as they are now.
   */
  public refresh(): void {
    this.refreshHeader();
    this.tabs.get(this.manager.preferences.tab)?.refresh();
  }

  /**
   * Make an object the target and show it.
   *
   * @param id - Object id.
   */
  public setTarget(id: TNumberId): void {
    selectDebugTarget(this.manager.target, id);
    this.refresh();
  }

  /**
   * Show the target, the recent targets and where the actor stands.
   */
  public refreshHeader(): void {
    const targetId: Nillable<TNumberId> = this.manager.target.id;
    const recentIds: LuaArray<TNumberId> = this.manager.target.recentIds;

    if (!isGameStarted()) {
      this.uiHeaderTarget.TextControl().SetText("no game running");
      this.uiHeaderLocation.TextControl().SetText("");

      return;
    }

    this.uiHeaderTarget.TextControl().SetText($isNil(targetId) ? "no target" : describeDebugObject(targetId));
    this.uiHeaderLocation.TextControl().SetText(inspectActorLocation());
    this.uiPinCheck.SetCheck(this.manager.target.isPinned);

    this.uiRecentTargets.ClearList();

    for (const index of $range(1, recentIds.length())) {
      const id: TNumberId = recentIds.get(index);

      this.uiRecentTargets.AddItem(describeDebugObject(id), id);

      // Selects by position in the list, counted from zero, and fails on a position the list does not have.
      if (id === targetId) {
        this.uiRecentTargets.SetCurrentID(index - 1);
      }
    }
  }

  /**
   * Show the tab picked in the tab list.
   */
  public onTabChanged(): void {
    this.showTab(this.uiTabs.GetActiveId() as EDebugTab);
  }

  /**
   * Pin or unpin the target.
   */
  public onPinChanged(): void {
    this.uiPinCheck.SetCheck(pinDebugTarget(this.manager.target, this.uiPinCheck.GetCheck()));
  }

  /**
   * Switch to a recent target.
   */
  public onRecentTargetSelected(): void {
    const id: TNumberId = this.uiRecentTargets.CurrentID();

    if (id !== this.manager.target.id) {
      this.setTarget(id);
    }
  }

  /**
   * Stand in for the main menu it covers, which stops updating while hidden and so stops announcing that the menu
   * is open.
   */
  public override Update(): void {
    super.Update();

    EventsManager.emitEvent(EGameEvent.MAIN_MENU_UPDATE);
  }

  /**
   * Close on Escape and on the debugger key.
   */
  public override OnKeyboard(key: TKeyCode, event: TUIEvent): boolean {
    const result: boolean = super.OnKeyboard(key, event);

    if (
      event === ui_events.WINDOW_KEY_PRESSED &&
      (key === DIK_keys.DIK_ESCAPE || dik_to_bind(key) === debugConfig.KEY_BINDING)
    ) {
      this.close();

      return true;
    }

    return result;
  }

  /**
   * Show a tab and remember it as the one to reopen on.
   *
   * @param tab - Tab to show.
   */
  private showTab(tab: EDebugTab): void {
    this.manager.selectTab(tab);

    if (this.uiTabs.GetActiveId() !== tab) {
      this.uiTabs.SetActiveTab(tab);
    }

    for (const [it, window] of this.tabs) {
      window.Show(it === tab);
    }

    this.refresh();
  }

  /**
   * Place a tab in the tab area, hidden until selected.
   *
   * @param xml - Window form, holding the tab area.
   * @param tab - Tab to add.
   */
  private addTab(xml: CScriptXmlInit, tab: DebuggerTab): void {
    tab.initialize();
    tab.Show(false);

    this.AttachChild(tab);
    xml.InitWindow("tab_area", 0, tab);

    this.tabs.set(tab.tab, tab);
  }
}
