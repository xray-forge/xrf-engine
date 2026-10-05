import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { CUIScriptWnd, CUIWindow, DIK_keys, get_console, ui_events } from "xray16";
import { consoleCommands } from "xray16/lib";
import { MockConsole, MockCOptionsManager, MockCUIScriptWnd, MockCUIWindow } from "xray16/mocks";

import { Options } from "@/engine/core/ui/menu/options/Options";
import { EGameRenderer, EOptionGroup, optionGroupsMessages } from "@/engine/core/ui/menu/options/options_types";

describe("Options", () => {
  beforeEach(() => {
    MockConsole.reset();
    MockCOptionsManager.reset();
  });

  it("should correctly create window", () => {
    const options: Options = new Options(MockCUIScriptWnd.mock());

    expect(options.WindowName()).toBe(Options.name);
  });

  it("should initialize state for every persisted options group", () => {
    const options: Options = new Options(MockCUIScriptWnd.mock());
    const control: CUIWindow = MockCUIWindow.mock();
    const precondition = jest.fn();

    options.preconditions.set(control, precondition);
    jest.spyOn(options.uiCurrentRendererSelect, "CurrentID").mockReturnValue(EGameRenderer.R3);
    options.initializeState();

    const manager: MockCOptionsManager = MockCOptionsManager.instances[0];

    expect(manager.SetCurrentValues.mock.calls).toEqual([
      [EOptionGroup.OPTIONS_VIDEO_PRESET],
      [EOptionGroup.OPTIONS_VIDEO],
      [EOptionGroup.OPTIONS_VIDEO_ADVANCED],
      [EOptionGroup.OPTIONS_GAMEPLAY],
      [EOptionGroup.OPTIONS_SOUND],
      [EOptionGroup.OPTIONS_CONTROLS],
      [EOptionGroup.KEY_BINDINGS],
    ]);
    expect(manager.SaveBackupValues.mock.calls).toEqual([
      [EOptionGroup.OPTIONS_VIDEO_PRESET],
      [EOptionGroup.OPTIONS_VIDEO],
      [EOptionGroup.OPTIONS_VIDEO_ADVANCED],
      [EOptionGroup.OPTIONS_GAMEPLAY],
      [EOptionGroup.OPTIONS_SOUND],
    ]);
    expect(precondition).toHaveBeenCalledWith(control, EGameRenderer.R3);
    expect(options.uiTextureLodTrackBar.SetOptIBounds).toHaveBeenCalledWith(0, 4);
  });

  it("should correctly handle default key bindings", () => {
    const options: Options = new Options(MockCUIScriptWnd.mock());

    options.onDefaultKeybindsButtonClicked();

    const manager: MockCOptionsManager = MockCOptionsManager.instances[0];

    expect(get_console().execute).toHaveBeenCalledWith(consoleCommands.default_controls);
    expect(manager.SetCurrentValues.mock.calls).toEqual([[EOptionGroup.OPTIONS_CONTROLS], [EOptionGroup.KEY_BINDINGS]]);
  });

  it("should save every option group and show a restart notification once", () => {
    const owner: CUIScriptWnd = MockCUIScriptWnd.mock();
    const options: Options = new Options(owner);

    MockCOptionsManager.needsSystemRestart = true;
    options.onAcceptButtonClicked();

    const manager: MockCOptionsManager = MockCOptionsManager.instances[0];

    expect(manager.SaveValues.mock.calls).toEqual([
      [EOptionGroup.OPTIONS_VIDEO_PRESET],
      [EOptionGroup.KEY_BINDINGS],
      [EOptionGroup.OPTIONS_VIDEO],
      [EOptionGroup.OPTIONS_VIDEO_ADVANCED],
      [EOptionGroup.OPTIONS_GAMEPLAY],
      [EOptionGroup.OPTIONS_SOUND],
      [EOptionGroup.OPTIONS_CONTROLS],
    ]);
    expect(manager.OptionsPostAccept).toHaveBeenCalledTimes(1);
    expect(owner.ShowDialog).toHaveBeenCalledWith(true);
    expect(options.HideDialog).toHaveBeenCalledTimes(1);
    expect(options.uiMessageBox.InitMessageBox).toHaveBeenCalledWith("message_box_restart_game");
    expect(get_console().execute).toHaveBeenCalledWith(consoleCommands.cfg_save);

    options.onAcceptButtonClicked();
    expect(options.uiMessageBox.InitMessageBox).toHaveBeenCalledTimes(1);
  });

  it("should discard editable option groups on cancellation", () => {
    const owner: CUIScriptWnd = MockCUIScriptWnd.mock();
    const options: Options = new Options(owner);

    options.onCancelButtonClicked();

    const manager: MockCOptionsManager = MockCOptionsManager.instances[0];

    expect(manager.UndoGroup.mock.calls).toEqual([
      [EOptionGroup.OPTIONS_VIDEO_PRESET],
      [EOptionGroup.OPTIONS_VIDEO],
      [EOptionGroup.OPTIONS_VIDEO_ADVANCED],
      [EOptionGroup.OPTIONS_SOUND],
    ]);
    expect(manager.OptionsPostAccept).toHaveBeenCalledTimes(1);
    expect(owner.ShowDialog).toHaveBeenCalledWith(true);
    expect(options.HideDialog).toHaveBeenCalledTimes(1);
  });

  it("should correctly change presets and restore default groups", () => {
    const options: Options = new Options(MockCUIScriptWnd.mock());

    options.onPresetChanged();
    options.onDefaultGraphicsButtonClicked();
    options.onDefaultSoundSettingsButtonClicked();

    expect(MockCOptionsManager.instances[0].SetCurrentValues).toHaveBeenCalledWith(EOptionGroup.OPTIONS_VIDEO_ADVANCED);
    expect(MockCOptionsManager.instances[1].SendMessage2Group).toHaveBeenCalledWith(
      EOptionGroup.OPTIONS_VIDEO,
      optionGroupsMessages.set_default_value
    );
    expect(MockCOptionsManager.instances[2].SendMessage2Group).toHaveBeenCalledWith(
      EOptionGroup.OPTIONS_SOUND,
      optionGroupsMessages.set_default_value
    );
  });

  it("should correctly change tabs and close advanced graphics with Escape", () => {
    const options: Options = new Options(MockCUIScriptWnd.mock());

    options.uiTab.SetActiveTab("sound");
    options.onTabChanged();
    expect(options.uiDialogSoundSettings.IsShown()).toBe(true);
    expect(options.uiDialogVideoSettings.IsShown()).toBe(false);

    options.onShowAdvancedGraphicsClicked();
    expect(options.uiDialogVideoAdvancedSettings.IsShown()).toBe(true);

    options.OnKeyboard(DIK_keys.DIK_ESCAPE, ui_events.WINDOW_KEY_PRESSED);
    expect(options.uiDialogVideoAdvancedSettings.IsShown()).toBe(false);
    expect(options.uiDialogVideoSettings.IsShown()).toBe(true);
  });
});
