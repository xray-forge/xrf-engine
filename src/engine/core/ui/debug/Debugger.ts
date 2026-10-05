import {
  CScriptXmlInit,
  CUI3tButton,
  CUICheckButton,
  CUIScriptWnd,
  CUIStatic,
  CUITabControl,
  DIK_keys,
  dik_to_bind,
  LuabindClass,
  ui_events,
} from "xray16";
import { TKeyCode, TUIEvent } from "xray16/alias";
import { create2dVector, LuaArray, Nillable, TCount, TIndex, TLabel, TNumberId, TPath } from "xray16/lib";
import { $filename, $isNil, $isNotNil } from "xray16/macros";

import { EDebugTab } from "@/engine/core/managers/debug/debug_types";
import { debugConfig } from "@/engine/core/managers/debug/DebugConfig";
import type { DebugManager } from "@/engine/core/managers/debug/DebugManager";
import { describeDebugObject, inspectActorLocation } from "@/engine/core/managers/debug/utils/debug_inspect";
import { pinDebugTarget, selectDebugTarget } from "@/engine/core/managers/debug/utils/debug_target";
import { EGameEvent, EventsManager } from "@/engine/core/managers/events";
import { DEBUG_RECENT_TARGETS } from "@/engine/core/ui/debug/debug_layout";
import { DebugConsoleTab } from "@/engine/core/ui/debug/tabs/DebugConsoleTab";
import { DebuggerTab } from "@/engine/core/ui/debug/tabs/DebuggerTab";
import { DebugOverlayTab } from "@/engine/core/ui/debug/tabs/DebugOverlayTab";
import { DebugPlayerTab } from "@/engine/core/ui/debug/tabs/DebugPlayerTab";
import { DebugQuestsTab } from "@/engine/core/ui/debug/tabs/DebugQuestsTab";
import { DebugSpawnTab } from "@/engine/core/ui/debug/tabs/DebugSpawnTab";
import { DebugSystemTab } from "@/engine/core/ui/debug/tabs/DebugSystemTab";
import { DebugTargetTab } from "@/engine/core/ui/debug/tabs/DebugTargetTab";
import { DebugWorldTab } from "@/engine/core/ui/debug/tabs/DebugWorldTab";
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
  // Drop down list of recent targets under its header button: rows, and the marker of the current target's row.
  public uiRecentList!: CUIStatic;
  public uiRecentSelection!: CUIStatic;
  public uiRecentRows: LuaArray<CUI3tButton> = new LuaTable();
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

    this.Register(xml.Init3tButton("recent_button", this), "recent_button");
    this.AddCallback("recent_button", ui_events.BUTTON_CLICKED, () => this.onRecentListToggled(), this);

    this.Register(xml.Init3tButton("close_button", this), "close_button");
    this.AddCallback("close_button", ui_events.BUTTON_CLICKED, () => this.close(), this);

    this.uiTabs = xml.InitTab("tabs", this);
    this.Register(this.uiTabs, "tabs");
    this.AddCallback("tabs", ui_events.TAB_CHANGED, () => this.onTabChanged(), this);

    this.addTab(xml, new DebugTargetTab(this));
    this.addTab(xml, new DebugPlayerTab(this));
    this.addTab(xml, new DebugSpawnTab(this));
    this.addTab(xml, new DebugWorldTab(this));
    this.addTab(xml, new DebugQuestsTab(this));
    this.addTab(xml, new DebugOverlayTab(this));
    this.addTab(xml, new DebugSystemTab(this));
    this.addTab(xml, new DebugConsoleTab(this));

    this.initializeRecentList(xml);
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
    this.uiRecentSelection.Show(false);

    for (const index of $range(1, this.uiRecentRows.length())) {
      const row: CUI3tButton = this.uiRecentRows.get(index);
      const id: Nillable<TNumberId> = recentIds.get(index);

      row.Show($isNotNil(id));

      if ($isNotNil(id)) {
        row.TextControl().SetText(describeDebugObject(id));
      }

      if ($isNotNil(id) && id === targetId) {
        this.uiRecentSelection.SetWndPos(row.GetWndPos());
        this.uiRecentSelection.Show(true);
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
   * Open or close the list of recent targets.
   */
  public onRecentListToggled(): void {
    const count: TCount = math.min(this.manager.target.recentIds.length(), DEBUG_RECENT_TARGETS.rows);

    this.uiRecentList.SetWndSize(
      create2dVector(DEBUG_RECENT_TARGETS.width, count * DEBUG_RECENT_TARGETS.rowHeight + 12)
    );
    this.uiRecentList.Show(!this.uiRecentList.IsShown() && count > 0);
  }

  /**
   * Switch to a recent target, closing the list.
   *
   * @param index - Position of the target's row, newest first, from one.
   */
  public onRecentTargetSelected(index: TIndex): void {
    const id: Nillable<TNumberId> = this.manager.target.recentIds.get(index);

    this.uiRecentList.Show(false);

    if ($isNotNil(id) && id !== this.manager.target.id) {
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

    if (event === ui_events.WINDOW_KEY_PRESSED && this.tabs.get(this.manager.preferences.tab)?.onKeyPressed(key)) {
      return true;
    }

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
    this.uiRecentList.Show(false);

    if (this.uiTabs.GetActiveId() !== tab) {
      this.uiTabs.SetActiveTab(tab);
    }

    for (const [it, window] of this.tabs) {
      window.Show(it === tab);
    }

    this.refresh();
  }

  /**
   * Create the list of recent targets, closed, after the tabs so it opens over them.
   *
   * @param xml - Window form.
   */
  private initializeRecentList(xml: CScriptXmlInit): void {
    this.uiRecentList = xml.InitStatic("recent_list", this);
    this.uiRecentSelection = xml.InitStatic("recent_selection", this.uiRecentList);

    for (const index of $range(1, DEBUG_RECENT_TARGETS.rows)) {
      const name: TLabel = `recent_row_${index}`;
      const row: CUI3tButton = xml.Init3tButton("recent_row", this.uiRecentList);

      row.SetWndPos(
        create2dVector(row.GetWndPos().x, row.GetWndPos().y + (index - 1) * DEBUG_RECENT_TARGETS.rowHeight)
      );

      this.Register(row, name);
      this.AddCallback(name, ui_events.BUTTON_CLICKED, () => this.onRecentTargetSelected(index), this);
      this.uiRecentRows.set(index, row);
    }

    this.uiRecentList.Show(false);
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
