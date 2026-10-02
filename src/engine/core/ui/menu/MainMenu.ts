import {
  CMainMenu,
  CScriptXmlInit,
  CUIMessageBoxEx,
  CUIMMShniaga,
  CUIScriptWnd,
  CUIStatic,
  DIK_keys,
  game,
  IsGameTypeSingle,
  level,
  LuabindClass,
  main_menu,
  ui_events,
} from "xray16";
import { TKeyCode, TUIEvent } from "xray16/alias";
import { executeConsoleCommand, gameDifficulties, gameTypes, Nillable, TPath } from "xray16/lib";
import { $filename, $isNotNil } from "xray16/macros";

import { consoleCommands } from "@/engine/constants/console_commands";
import { gameTutorials } from "@/engine/constants/game_tutorials";
import { registry } from "@/engine/core/database";
import { forgeConfig } from "@/engine/core/database/forge_config";
import { EGameEvent } from "@/engine/core/managers/events/events_types";
import { EventsManager } from "@/engine/core/managers/events/EventsManager";
import { DebugDialog } from "@/engine/core/ui/debug/DebugDialog";
import { ExtensionsDialog } from "@/engine/core/ui/menu/extensions/ExtensionsDialog";
import { LoadDialog } from "@/engine/core/ui/menu/load/LoadDialog";
import { EMainMenuModalMode } from "@/engine/core/ui/menu/menu_types";
import { Options } from "@/engine/core/ui/menu/options/Options";
import { SaveDialog } from "@/engine/core/ui/menu/save/SaveDialog";
import { loadLastGameSave, startNewGame } from "@/engine/core/utils/game_save";
import { LuaLogger } from "@/engine/core/utils/logging";
import { createScreenRectangle } from "@/engine/core/utils/rectangle";
import { resolveXmlFile } from "@/engine/core/utils/ui";

const logger: LuaLogger = new LuaLogger($filename);

export const base: TPath = "menu\\MainMenu.component";

/**
 * Main game menu component implementation.
 */
@LuabindClass()
export class MainMenu extends CUIScriptWnd {
  public readonly xrMenuController: CMainMenu = main_menu.get_main_menu();
  public xrMenuPageController!: CUIMMShniaga;

  public uiModalBox!: CUIMessageBoxEx;
  public modalBoxMode: EMainMenuModalMode = EMainMenuModalMode.OFF;

  public uiGameOptionsDialog: Nillable<Options> = null;
  public uiGameSavesSaveDialog: Nillable<SaveDialog> = null;
  public uiGameSavesLoadDialog: Nillable<LoadDialog> = null;
  public uiGameDebugDialog: Nillable<DebugDialog> = null;
  public uiGameExtensionsDialog: Nillable<ExtensionsDialog> = null;

  public constructor() {
    super();

    this.initializeControls();
    this.initializeCallBacks();

    EventsManager.emitEvent(EGameEvent.MAIN_MENU_ON, this);
  }

  /**
   * Initialize UI controls.
   */
  public initializeControls(): void {
    this.SetWndRect(createScreenRectangle());

    const xml: CScriptXmlInit = resolveXmlFile(base);

    xml.InitStatic("background", this);

    this.uiModalBox = new CUIMessageBoxEx();
    this.xrMenuPageController = xml.InitMMShniaga("shniaga_wnd", this);

    this.Register(this.uiModalBox, "msg_box");

    const versionLabel: CUIStatic = xml.InitStatic("static_version", this);

    versionLabel.TextControl().SetText(string.format(forgeConfig.VERSION, this.xrMenuController.GetGSVer()));
  }

  /**
   * Initialize callback handlers of main menu controls.
   */
  public initializeCallBacks(): void {
    this.AddCallback("btn_novice", ui_events.BUTTON_CLICKED, () => startNewGame(gameDifficulties.gd_novice), this);
    this.AddCallback("btn_stalker", ui_events.BUTTON_CLICKED, () => startNewGame(gameDifficulties.gd_stalker), this);
    this.AddCallback("btn_veteran", ui_events.BUTTON_CLICKED, () => startNewGame(gameDifficulties.gd_veteran), this);
    this.AddCallback("btn_master", ui_events.BUTTON_CLICKED, () => startNewGame(gameDifficulties.gd_master), this);
    this.AddCallback("btn_options", ui_events.BUTTON_CLICKED, () => this.onOptionsButtonClick(), this);
    this.AddCallback("btn_load", ui_events.BUTTON_CLICKED, () => this.onLoadGameButtonClick(), this);
    this.AddCallback("btn_save", ui_events.BUTTON_CLICKED, () => this.onSaveGameButtonClick(), this);

    this.AddCallback("btn_quit", ui_events.BUTTON_CLICKED, () => this.onQuitToWindowsButtonClick(), this);
    this.AddCallback("btn_quit_to_mm", ui_events.BUTTON_CLICKED, () => this.onDisconnectButtonClick(), this);
    this.AddCallback("btn_ret", ui_events.BUTTON_CLICKED, () => this.onReturnToGameButtonClick(), this);
    this.AddCallback("btn_lastsave", ui_events.BUTTON_CLICKED, () => this.onLoadLastSaveButtonClick(), this);
    this.AddCallback("btn_extensions", ui_events.BUTTON_CLICKED, () => this.onExtensionsButtonClick(), this);
    this.AddCallback("btn_credits", ui_events.BUTTON_CLICKED, () => this.onGameCreditsButtonClick(), this);

    this.AddCallback("msg_box", ui_events.MESSAGE_BOX_OK_CLICKED, () => this.onMessageBoxOkClick(), this);
    this.AddCallback("msg_box", ui_events.MESSAGE_BOX_CANCEL_CLICKED, () => this.onMessageBoxCancelClick(), this);
    this.AddCallback("msg_box", ui_events.MESSAGE_BOX_YES_CLICKED, () => this.onMessageBoxConfirmClick(), this);
    this.AddCallback("msg_box", ui_events.MESSAGE_BOX_NO_CLICKED, () => this.onMessageBoxDeclineClick(), this);
    this.AddCallback(
      "msg_box",
      ui_events.MESSAGE_BOX_QUIT_GAME_CLICKED,
      () => this.onQuitGameConfirmButtonClick(),
      this
    );
    this.AddCallback("msg_box", ui_events.MESSAGE_BOX_QUIT_WIN_CLICKED, () => this.onQuitGameButtonClick(), this);
  }

  public override Show(isVisible: boolean): void {
    this.xrMenuPageController.SetVisibleMagnifier(isVisible);
  }

  /**
   * Close main menu.
   */
  public close(): void {
    executeConsoleCommand(consoleCommands.main_menu, "off");
    EventsManager.emitEvent(EGameEvent.MAIN_MENU_OFF, this);
  }

  /**
   * Clicked message box confirmation.
   */
  public onMessageBoxOkClick(): void {
    this.modalBoxMode = EMainMenuModalMode.OFF;
  }

  /**
   * Declined message box.
   */
  public onMessageBoxCancelClick(): void {
    this.modalBoxMode = EMainMenuModalMode.OFF;
  }

  /**
   * Clicked load last save.
   */
  public onLoadLastSaveButtonClick(): void {
    logger.info("Load last save click");

    // If currently playing game and actor is alive, ask confirmation.
    if ($isNotNil(registry.simulator) && registry.actor?.alive()) {
      this.modalBoxMode = EMainMenuModalMode.CONFIRM_LOAD_SAVE;
      this.uiModalBox.InitMessageBox("message_box_confirm_load_save");
      this.uiModalBox.ShowDialog(true);
    } else {
      loadLastGameSave();
    }
  }

  /**
   * Clicked credits menu button.
   */
  public onGameCreditsButtonClick(): void {
    game.start_tutorial(gameTutorials.credits_seq);
  }

  /**
   * On click extensions menu item button.
   */
  public onExtensionsButtonClick(): void {
    if (!this.uiGameExtensionsDialog) {
      this.uiGameExtensionsDialog = new ExtensionsDialog(this);
    }

    this.uiGameExtensionsDialog.ShowDialog(true);

    this.HideDialog();
    this.Show(false);
  }

  /**
   * Clicked close game button.
   */
  public onQuitToWindowsButtonClick(): void {
    this.uiModalBox.InitMessageBox("message_box_quit_windows");
    this.uiModalBox.ShowDialog(true);
  }

  /**
   * Clicked disconnect from game.
   */
  public onDisconnectButtonClick(): void {
    this.uiModalBox.InitMessageBox("message_box_quit_game");

    this.uiModalBox.SetText(
      level.game_id() === gameTypes.eGameIDSingle ? "ui_mm_quit_game_message" : "ui_mm_disconnect_message"
    );
    this.uiModalBox.ShowDialog(true);
  }

  /**
   * Clicked confirmation of game quit.
   */
  public onQuitGameConfirmButtonClick(): void {
    executeConsoleCommand(consoleCommands.disconnect);
  }

  /**
   * Clicked quit game button.
   */
  public onQuitGameButtonClick(): void {
    executeConsoleCommand(consoleCommands.quit);
  }

  /**
   * Clicked return to game.
   */
  public onReturnToGameButtonClick(): void {
    this.close();
  }

  /**
   * Clicked save game button.
   */
  public onSaveGameButtonClick(): void {
    if (!this.uiGameSavesSaveDialog) {
      this.uiGameSavesSaveDialog = new SaveDialog(this);
    }

    this.uiGameSavesSaveDialog.fillList();
    this.uiGameSavesSaveDialog.ShowDialog(true);
    this.HideDialog();
    this.Show(false);
  }

  /**
   * Clicked options button.
   */
  public onOptionsButtonClick(): void {
    if (!this.uiGameOptionsDialog) {
      this.uiGameOptionsDialog = new Options(this);
    }

    this.uiGameOptionsDialog.initializeState();
    this.uiGameOptionsDialog.ShowDialog(true);

    this.HideDialog();
    this.Show(false);
  }

  /**
   * Clicked debugging menu button.
   */
  public onDevelopmentDebugButtonClick(): void {
    if (!forgeConfig.DEBUG.IS_ENABLED) {
      return logger.info("Debug settings are disabled");
    }

    if (!this.uiGameDebugDialog) {
      this.uiGameDebugDialog = new DebugDialog(this);
    }

    this.uiGameDebugDialog.ShowDialog(true);

    this.HideDialog();
    this.Show(false);
  }

  /**
   * On open load games menu click.
   */
  public onLoadGameButtonClick(): void {
    if (!this.uiGameSavesLoadDialog) {
      this.uiGameSavesLoadDialog = new LoadDialog(this);
    }

    this.uiGameSavesLoadDialog.fillList();
    this.uiGameSavesLoadDialog.ShowDialog(true);
    this.HideDialog();
    this.Show(false);
  }

  /**
   * Confirm message box confirmation.
   */
  public onMessageBoxConfirmClick(): void {
    switch (this.modalBoxMode) {
      case EMainMenuModalMode.CONFIRM_LOAD_SAVE:
        loadLastGameSave();
        break;
    }

    this.modalBoxMode = EMainMenuModalMode.OFF;
  }

  /**
   * Decline message box confirmation.
   */
  public onMessageBoxDeclineClick(): void {
    this.modalBoxMode = EMainMenuModalMode.OFF;
  }

  public override OnKeyboard(key: TKeyCode, event: TUIEvent): boolean {
    super.OnKeyboard(key, event);

    if (event === ui_events.WINDOW_KEY_PRESSED) {
      switch (key) {
        case DIK_keys.DIK_ESCAPE: {
          if (level.present() && (registry.actor?.alive() || !IsGameTypeSingle())) {
            this.onReturnToGameButtonClick();
          }

          break;
        }

        case DIK_keys.DIK_F11: {
          this.onDevelopmentDebugButtonClick();
          break;
        }

        case DIK_keys.DIK_Q:
          this.onQuitGameButtonClick();
          break;
      }
    }

    return true;
  }
}
