import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { CUIMessageBoxEx, CUIMMShniaga, DIK_keys, game, get_console, IsGameTypeSingle, level, ui_events } from "xray16";
import { gameTypes } from "xray16/lib";
import { replaceFunctionMock, resetFunctionMock } from "xray16/testing/utils";

import { getManager, registerSimulator } from "@/engine/core/database";
import { forgeConfig } from "@/engine/core/database/forge_config";
import { EGameEvent, EventsManager } from "@/engine/core/managers/events";
import { DebugDialog } from "@/engine/core/ui/debug/DebugDialog";
import { LoadDialog } from "@/engine/core/ui/menu/load/LoadDialog";
import { MainMenu } from "@/engine/core/ui/menu/MainMenu";
import { EMainMenuModalMode } from "@/engine/core/ui/menu/menu_types";
import { Options } from "@/engine/core/ui/menu/options/Options";
import { getGameSaves, loadLastGameSave } from "@/engine/core/utils/game_save";
import { mockRegisteredActor, resetRegistry } from "@/fixtures/engine";

jest.mock("@/engine/core/utils/game_save");

describe("MainMenu component", () => {
  beforeEach(() => {
    resetRegistry();
    resetFunctionMock(loadLastGameSave);
  });

  it("should correctly create", () => {
    const menu: MainMenu = new MainMenu();

    expect(menu.uiGameOptionsDialog).toBeNull();
    expect(menu.uiGameSavesSaveDialog).toBeNull();
    expect(menu.uiGameSavesLoadDialog).toBeNull();
    expect(menu.uiGameDebugDialog).toBeNull();
    expect(menu.uiGameExtensionsDialog).toBeNull();

    expect(menu.modalBoxMode).toBe(EMainMenuModalMode.OFF);
  });

  it("should correctly emit event on menu show / hide", () => {
    const eventsManager: EventsManager = getManager(EventsManager);

    jest.spyOn(eventsManager, "emitEvent").mockImplementation(jest.fn());

    const menu: MainMenu = new MainMenu();

    expect(eventsManager.emitEvent).toHaveBeenCalledWith(EGameEvent.MAIN_MENU_ON, menu);

    menu.close();

    expect(eventsManager.emitEvent).toHaveBeenCalledWith(EGameEvent.MAIN_MENU_OFF, menu);
    expect(get_console().execute).toHaveBeenCalledWith("main_menu off");
  });

  it("should correctly initialize controls and callbacks", () => {
    const menu: MainMenu = new MainMenu();

    expect(menu.SetWndRect).toHaveBeenCalledTimes(1);
    expect(menu.uiModalBox).toBeInstanceOf(CUIMessageBoxEx);
    expect(menu.xrMenuPageController).toBeInstanceOf(CUIMMShniaga);
    expect(menu.Register).toHaveBeenCalledWith(menu.uiModalBox, "msg_box");
    expect(menu.AddCallback).toHaveBeenCalledTimes(19);
  });

  it("should lazily open each available menu mode", () => {
    const menu: MainMenu = new MainMenu();

    jest.spyOn(menu, "HideDialog").mockImplementation(jest.fn());
    jest.spyOn(menu, "Show").mockImplementation(jest.fn());
    jest.spyOn(Options.prototype, "initializeState").mockImplementation(jest.fn());
    replaceFunctionMock(getGameSaves, () => new LuaTable());

    menu.onOptionsButtonClick();
    menu.onSaveGameButtonClick();
    menu.onExtensionsButtonClick();

    expect(menu.uiGameOptionsDialog?.ShowDialog).toHaveBeenCalledWith(true);
    expect(menu.uiGameSavesSaveDialog?.ShowDialog).toHaveBeenCalledWith(true);
    expect(menu.uiGameExtensionsDialog?.ShowDialog).toHaveBeenCalledWith(true);
    expect(menu.HideDialog).toHaveBeenCalledTimes(3);
    expect(menu.Show).toHaveBeenLastCalledWith(false);

    const options = menu.uiGameOptionsDialog;
    const save = menu.uiGameSavesSaveDialog;
    const extensions = menu.uiGameExtensionsDialog;

    menu.onOptionsButtonClick();
    menu.onSaveGameButtonClick();
    menu.onExtensionsButtonClick();

    expect(menu.uiGameOptionsDialog).toBe(options);
    expect(menu.uiGameSavesSaveDialog).toBe(save);
    expect(menu.uiGameExtensionsDialog).toBe(extensions);
  });

  it("should correctly load last save on click", () => {
    const menu: MainMenu = new MainMenu();

    menu.onLoadLastSaveButtonClick();

    expect(loadLastGameSave).toHaveBeenCalledTimes(1);
    expect(menu.uiModalBox.InitMessageBox).not.toHaveBeenCalled();
    expect(menu.uiModalBox.ShowDialog).not.toHaveBeenCalled();

    registerSimulator();
    mockRegisteredActor();

    menu.onLoadLastSaveButtonClick();

    expect(loadLastGameSave).toHaveBeenCalledTimes(1);
    expect(menu.modalBoxMode).toBe(EMainMenuModalMode.CONFIRM_LOAD_SAVE);
    expect(menu.uiModalBox.InitMessageBox).toHaveBeenCalledWith("message_box_confirm_load_save");
    expect(menu.uiModalBox.ShowDialog).toHaveBeenCalledWith(true);
  });

  it("should correctly handle game credits button", () => {
    const menu: MainMenu = new MainMenu();

    menu.onGameCreditsButtonClick();
    expect(game.start_tutorial).toHaveBeenCalledWith("credits_seq");
  });

  it("should correctly handle load game button", () => {
    const menu: MainMenu = new MainMenu();

    jest.spyOn(menu, "HideDialog").mockImplementation(jest.fn());
    jest.spyOn(menu, "Show").mockImplementation(jest.fn());

    replaceFunctionMock(getGameSaves, () => new LuaTable());

    expect(menu.uiGameSavesLoadDialog).toBeNull();

    menu.onLoadGameButtonClick();

    expect(menu.HideDialog).toHaveBeenCalled();
    expect(menu.Show).toHaveBeenCalledWith(false);
    expect(menu.uiGameSavesLoadDialog?.ShowDialog).toHaveBeenCalledWith(true);

    const previous: LoadDialog = menu.uiGameSavesLoadDialog as LoadDialog;

    menu.onLoadGameButtonClick();

    expect(menu.uiGameSavesLoadDialog).toBe(previous);
  });

  it("should correctly handle debug button", () => {
    const menu: MainMenu = new MainMenu();

    jest.spyOn(menu, "HideDialog").mockImplementation(jest.fn());
    jest.spyOn(menu, "Show").mockImplementation(jest.fn());

    expect(menu.uiGameDebugDialog).toBeNull();

    forgeConfig.DEBUG.IS_ENABLED = false;
    menu.onDevelopmentDebugButtonClick();

    expect(menu.uiGameDebugDialog).toBeNull();

    forgeConfig.DEBUG.IS_ENABLED = true;
    menu.onDevelopmentDebugButtonClick();

    expect(menu.HideDialog).toHaveBeenCalled();
    expect(menu.Show).toHaveBeenCalledWith(false);
    expect(menu.uiGameDebugDialog?.ShowDialog).toHaveBeenCalledWith(true);

    const previous: DebugDialog = menu.uiGameDebugDialog as DebugDialog;

    menu.onDevelopmentDebugButtonClick();

    expect(menu.uiGameDebugDialog).toBe(previous);
  });

  it("should correctly confirm click in modal boxes", () => {
    const menu: MainMenu = new MainMenu();

    menu.modalBoxMode = EMainMenuModalMode.ON;
    menu.onMessageBoxConfirmClick();

    expect(loadLastGameSave).not.toHaveBeenCalled();
    expect(menu.modalBoxMode).toBe(EMainMenuModalMode.OFF);

    menu.modalBoxMode = EMainMenuModalMode.CONFIRM_LOAD_SAVE;
    menu.onMessageBoxConfirmClick();

    expect(loadLastGameSave).toHaveBeenCalled();
    expect(menu.modalBoxMode).toBe(EMainMenuModalMode.OFF);
  });

  it("should correctly decline click in modal boxes", () => {
    const menu: MainMenu = new MainMenu();

    menu.modalBoxMode = EMainMenuModalMode.ON;
    menu.onMessageBoxDeclineClick();

    expect(menu.modalBoxMode).toBe(EMainMenuModalMode.OFF);
  });
});

describe("MainMenu keyboard events", () => {
  beforeEach(() => {
    resetRegistry();
  });

  it("should correctly handle Q keyboard events", () => {
    const menu: MainMenu = new MainMenu();

    jest.spyOn(menu, "onQuitGameButtonClick").mockImplementation(jest.fn());

    menu.OnKeyboard(DIK_keys.DIK_Q, ui_events.WINDOW_KEY_PRESSED);
    expect(menu.onQuitGameButtonClick).toHaveBeenCalledTimes(1);
  });

  it("should correctly handle F11 keyboard events", () => {
    const menu: MainMenu = new MainMenu();

    jest.spyOn(menu, "onDevelopmentDebugButtonClick").mockImplementation(jest.fn());

    menu.OnKeyboard(DIK_keys.DIK_F11, ui_events.WINDOW_KEY_PRESSED);
    expect(menu.onDevelopmentDebugButtonClick).toHaveBeenCalledTimes(1);
  });

  it("should correctly handle ESCAPE keyboard events", () => {
    const menu: MainMenu = new MainMenu();

    jest.spyOn(menu, "onReturnToGameButtonClick").mockImplementation(jest.fn());

    menu.OnKeyboard(DIK_keys.DIK_ESCAPE, ui_events.WINDOW_KEY_PRESSED);
    expect(menu.onReturnToGameButtonClick).toHaveBeenCalledTimes(0);

    const { actorGameObject } = mockRegisteredActor();

    jest.spyOn(actorGameObject, "alive").mockImplementation(() => false);

    menu.OnKeyboard(DIK_keys.DIK_ESCAPE, ui_events.WINDOW_KEY_PRESSED);
    expect(menu.onReturnToGameButtonClick).toHaveBeenCalledTimes(0);

    jest.spyOn(actorGameObject, "alive").mockImplementation(() => true);

    menu.OnKeyboard(DIK_keys.DIK_ESCAPE, ui_events.WINDOW_KEY_PRESSED);
    expect(menu.onReturnToGameButtonClick).toHaveBeenCalledTimes(1);

    jest.spyOn(level, "present").mockImplementation(() => false);

    menu.OnKeyboard(DIK_keys.DIK_ESCAPE, ui_events.WINDOW_KEY_PRESSED);
    expect(menu.onReturnToGameButtonClick).toHaveBeenCalledTimes(1);

    jest.spyOn(level, "present").mockImplementation(() => true);

    menu.OnKeyboard(DIK_keys.DIK_ESCAPE, ui_events.WINDOW_KEY_PRESSED);
    expect(menu.onReturnToGameButtonClick).toHaveBeenCalledTimes(2);

    jest.spyOn(actorGameObject, "alive").mockImplementation(() => false);

    menu.OnKeyboard(DIK_keys.DIK_ESCAPE, ui_events.WINDOW_KEY_PRESSED);
    expect(menu.onReturnToGameButtonClick).toHaveBeenCalledTimes(2);

    replaceFunctionMock(IsGameTypeSingle, () => false);

    menu.OnKeyboard(DIK_keys.DIK_ESCAPE, ui_events.WINDOW_KEY_PRESSED);
    expect(menu.onReturnToGameButtonClick).toHaveBeenCalledTimes(3);
  });

  it("should register callbacks for every menu control", () => {
    const menu: MainMenu = new MainMenu();

    jest.mocked(menu.AddCallback).mockClear();
    menu.initializeCallBacks();

    const registered: Array<string> = jest.mocked(menu.AddCallback).mock.calls.map(([id]) => id as string);

    expect(registered).toEqual(
      expect.arrayContaining([
        "btn_novice",
        "btn_stalker",
        "btn_veteran",
        "btn_master",
        "btn_options",
        "btn_load",
        "btn_save",
        "btn_quit",
        "btn_quit_to_mm",
        "btn_ret",
        "btn_lastsave",
        "btn_extensions",
        "btn_credits",
        "msg_box",
      ])
    );
  });

  it("should toggle magnifier visibility on show", () => {
    const menu: MainMenu = new MainMenu();

    menu.Show(true);

    expect(menu.xrMenuPageController.SetVisibleMagnifier).toHaveBeenCalledWith(true);
  });

  it("should reset modal mode on message box ok and cancel", () => {
    const menu: MainMenu = new MainMenu();

    menu.modalBoxMode = EMainMenuModalMode.CONFIRM_LOAD_SAVE;
    menu.onMessageBoxOkClick();
    expect(menu.modalBoxMode).toBe(EMainMenuModalMode.OFF);

    menu.modalBoxMode = EMainMenuModalMode.CONFIRM_LOAD_SAVE;
    menu.onMessageBoxCancelClick();
    expect(menu.modalBoxMode).toBe(EMainMenuModalMode.OFF);
  });

  it("should show confirmation dialog on quit to windows", () => {
    const menu: MainMenu = new MainMenu();

    menu.onQuitToWindowsButtonClick();

    expect(menu.uiModalBox.InitMessageBox).toHaveBeenCalledWith("message_box_quit_windows");
    expect(menu.uiModalBox.ShowDialog).toHaveBeenCalledWith(true);
  });

  it("should show disconnect dialog with a message matching the game type", () => {
    const menu: MainMenu = new MainMenu();

    jest.spyOn(level, "game_id").mockImplementation(() => gameTypes.eGameIDSingle);
    menu.onDisconnectButtonClick();

    expect(menu.uiModalBox.InitMessageBox).toHaveBeenCalledWith("message_box_quit_game");
    expect(menu.uiModalBox.SetText).toHaveBeenCalledWith("ui_mm_quit_game_message");

    jest.spyOn(level, "game_id").mockImplementation(() => gameTypes.eGameIDDeathmatch);
    menu.onDisconnectButtonClick();

    expect(menu.uiModalBox.SetText).toHaveBeenCalledWith("ui_mm_disconnect_message");
  });

  it("should execute console commands on quit confirmations", () => {
    const menu: MainMenu = new MainMenu();

    menu.onQuitGameConfirmButtonClick();
    expect(get_console().execute).toHaveBeenCalledWith("disconnect");

    menu.onQuitGameButtonClick();
    expect(get_console().execute).toHaveBeenCalledWith("quit");
  });

  it("should close menu on return to game", () => {
    const menu: MainMenu = new MainMenu();

    jest.spyOn(menu, "close").mockImplementation(jest.fn());

    menu.onReturnToGameButtonClick();

    expect(menu.close).toHaveBeenCalledTimes(1);
  });

  it("should start credits tutorial", () => {
    const menu: MainMenu = new MainMenu();

    menu.onGameCreditsButtonClick();

    expect(game.start_tutorial).toHaveBeenCalledWith("credits_seq");
  });

  it("should load last save directly when no game is running", () => {
    const menu: MainMenu = new MainMenu();

    menu.onLoadLastSaveButtonClick();

    expect(loadLastGameSave).toHaveBeenCalledTimes(1);
    expect(menu.modalBoxMode).toBe(EMainMenuModalMode.OFF);
  });

  it("should confirm loading last save while playing", () => {
    const { actorGameObject } = mockRegisteredActor();
    const menu: MainMenu = new MainMenu();

    registerSimulator();
    jest.spyOn(actorGameObject, "alive").mockImplementation(() => true);

    menu.onLoadLastSaveButtonClick();

    expect(loadLastGameSave).not.toHaveBeenCalled();
    expect(menu.modalBoxMode).toBe(EMainMenuModalMode.CONFIRM_LOAD_SAVE);
    expect(menu.uiModalBox.InitMessageBox).toHaveBeenCalledWith("message_box_confirm_load_save");
    expect(menu.uiModalBox.ShowDialog).toHaveBeenCalledWith(true);
  });

  it("should lazily create and show the extensions dialog", () => {
    const menu: MainMenu = new MainMenu();

    menu.onExtensionsButtonClick();

    const dialog = menu.uiGameExtensionsDialog;

    expect(dialog).not.toBeNull();
    expect(dialog?.ShowDialog).toHaveBeenCalledWith(true);
    expect(menu.HideDialog).toHaveBeenCalledTimes(1);

    menu.onExtensionsButtonClick();

    expect(menu.uiGameExtensionsDialog).toBe(dialog);
  });

  it("should lazily create and show the save dialog", () => {
    const menu: MainMenu = new MainMenu();

    menu.onSaveGameButtonClick();

    const dialog = menu.uiGameSavesSaveDialog;

    expect(dialog).not.toBeNull();

    menu.onSaveGameButtonClick();

    expect(menu.uiGameSavesSaveDialog).toBe(dialog);
  });
});
