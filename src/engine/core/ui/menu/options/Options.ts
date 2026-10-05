import {
  COptionsManager,
  CScriptXmlInit,
  CUIComboBox,
  CUIMessageBoxEx,
  CUIScriptWnd,
  CUIStatic,
  CUITabControl,
  CUITrackBar,
  CUIWindow,
  DIK_keys,
  LuabindClass,
  ui_events,
} from "xray16";
import { TKeyCode, TUIEvent } from "xray16/alias";
import { consoleCommands, executeConsoleCommand, TPath } from "xray16/lib";
import { $filename } from "xray16/macros";

import { EGameRenderer, EOptionGroup, optionGroupsMessages } from "@/engine/core/ui/menu/options/options_types";
import { OptionsControls } from "@/engine/core/ui/menu/options/OptionsControls";
import { OptionsGameplay } from "@/engine/core/ui/menu/options/OptionsGameplay";
import { OptionsSound } from "@/engine/core/ui/menu/options/OptionsSound";
import { OptionsVideo } from "@/engine/core/ui/menu/options/OptionsVideo";
import { OptionsVideoAdvanced } from "@/engine/core/ui/menu/options/OptionsVideoAdvanced";
import { LuaLogger } from "@/engine/core/utils/logging";
import { createScreenRectangle } from "@/engine/core/utils/rectangle";
import { resolveXmlFile } from "@/engine/core/utils/ui";

const logger: LuaLogger = new LuaLogger($filename);
const base: TPath = "menu\\OptionsDialog.component";

@LuabindClass()
export class Options extends CUIScriptWnd {
  public isRestartSystemShown: boolean = false;

  public owner: CUIScriptWnd;
  // Store map of settings checker to verify whether renderer is correct.
  public preconditions: LuaTable<CUIWindow, (control: CUIWindow, renderer: EGameRenderer) => void> = new LuaTable();

  public uiTab!: CUITabControl;
  public uiDialog!: CUIStatic;
  public uiMessageBox!: CUIMessageBoxEx;

  public uiDialogVideoSettings!: OptionsVideo;
  public uiDialogVideoAdvancedSettings!: OptionsVideoAdvanced;
  public uiDialogSoundSettings!: OptionsSound;
  public uiDialogGameplaySettings!: OptionsGameplay;
  public uiDialogControlsSettings!: OptionsControls;

  // From child sections:
  public uiCurrentPresetSelect!: CUIComboBox;
  public uiCurrentRendererSelect!: CUIComboBox;
  public uiTextureLodTrackBar!: CUITrackBar;
  public uiSSamplingTrackBar!: CUITrackBar;
  public uiSSamplingComboBox!: CUIComboBox;

  public constructor(owner: CUIScriptWnd) {
    super();

    this.SetWindowName(this.__name);

    this.owner = owner;

    this.initializeControls();
    this.initializeCallbacks();

    this.uiTab.SetActiveTab("video");
  }

  public initializeControls(): void {
    this.SetWndRect(createScreenRectangle());
    this.Enable(true);

    const xml: CScriptXmlInit = resolveXmlFile(base);

    xml.InitStatic("background", this);
    this.uiDialog = xml.InitStatic("main_dialog:dialog", this);

    // --    xml.InitStatic                ("main_dialog:cap_options", this.dialog)

    this.uiDialogVideoSettings = new OptionsVideo();
    this.uiDialogVideoSettings.initialize(0, 0, xml, this);
    this.uiDialogVideoSettings.Show(false);
    this.uiDialog.AttachChild(this.uiDialogVideoSettings);
    xml.InitWindow("tab_size", 0, this.uiDialogVideoSettings);

    this.uiDialogSoundSettings = new OptionsSound();
    this.uiDialogSoundSettings.initialize(0, 0, xml);
    this.uiDialogSoundSettings.Show(false);
    this.uiDialog.AttachChild(this.uiDialogSoundSettings);
    xml.InitWindow("tab_size", 0, this.uiDialogSoundSettings);

    this.uiDialogGameplaySettings = new OptionsGameplay();
    this.uiDialogGameplaySettings.initialize(0, 0, xml, this);
    this.uiDialogGameplaySettings.Show(false);
    this.uiDialog.AttachChild(this.uiDialogGameplaySettings);
    xml.InitWindow("tab_size", 0, this.uiDialogGameplaySettings);

    this.uiDialogControlsSettings = new OptionsControls();
    this.uiDialogControlsSettings.initialize(0, 0, xml, this);
    this.uiDialogControlsSettings.Show(false);
    this.uiDialog.AttachChild(this.uiDialogControlsSettings);
    xml.InitWindow("tab_size", 0, this.uiDialogControlsSettings);

    this.uiDialogVideoAdvancedSettings = new OptionsVideoAdvanced();
    this.uiDialogVideoAdvancedSettings.initialize(0, 0, xml, this);
    this.uiDialogVideoAdvancedSettings.Show(false);
    this.uiDialog.AttachChild(this.uiDialogVideoAdvancedSettings);
    xml.InitWindow("tab_size", 0, this.uiDialogVideoAdvancedSettings);

    this.Register(xml.Init3tButton("main_dialog:btn_accept", this.uiDialog), "btn_accept");
    this.Register(xml.Init3tButton("main_dialog:btn_cancel", this.uiDialog), "btn_cancel");

    this.uiTab = xml.InitTab("main_dialog:tab", this.uiDialog);
    this.Register(this.uiTab, "tab");

    this.uiMessageBox = new CUIMessageBoxEx();
  }

  public initializeState(): void {
    logger.info("Set and save current values");

    const optionsManager: COptionsManager = new COptionsManager();

    optionsManager.SetCurrentValues(EOptionGroup.OPTIONS_VIDEO_PRESET);
    optionsManager.SaveBackupValues(EOptionGroup.OPTIONS_VIDEO_PRESET);

    optionsManager.SetCurrentValues(EOptionGroup.OPTIONS_VIDEO);
    optionsManager.SaveBackupValues(EOptionGroup.OPTIONS_VIDEO);

    optionsManager.SetCurrentValues(EOptionGroup.OPTIONS_VIDEO_ADVANCED);
    optionsManager.SaveBackupValues(EOptionGroup.OPTIONS_VIDEO_ADVANCED);

    optionsManager.SetCurrentValues(EOptionGroup.OPTIONS_GAMEPLAY);
    optionsManager.SaveBackupValues(EOptionGroup.OPTIONS_GAMEPLAY);

    optionsManager.SetCurrentValues(EOptionGroup.OPTIONS_SOUND);
    optionsManager.SaveBackupValues(EOptionGroup.OPTIONS_SOUND);

    optionsManager.SetCurrentValues(EOptionGroup.OPTIONS_CONTROLS);
    optionsManager.SetCurrentValues(EOptionGroup.KEY_BINDINGS);

    this.updateControls();
  }

  public initializeCallbacks(): void {
    this.AddCallback("tab", ui_events.TAB_CHANGED, () => this.onTabChanged(), this);
    this.AddCallback(
      "btn_advanced_graphic",
      ui_events.BUTTON_CLICKED,
      () => this.onShowAdvancedGraphicsClicked(),
      this
    );
    this.AddCallback("btn_accept", ui_events.BUTTON_CLICKED, () => this.onAcceptButtonClicked(), this);
    this.AddCallback("btn_cancel", ui_events.BUTTON_CLICKED, () => this.onCancelButtonClicked(), this);
    this.AddCallback(
      "btn_default_graphic",
      ui_events.BUTTON_CLICKED,
      () => this.onDefaultGraphicsButtonClicked(),
      this
    );
    this.AddCallback(
      "btn_default_sound",
      ui_events.BUTTON_CLICKED,
      () => this.onDefaultSoundSettingsButtonClicked(),
      this
    );
    this.AddCallback("combo_preset", ui_events.LIST_ITEM_SELECT, () => this.onPresetChanged(), this);
    this.AddCallback("btn_simply_graphic", ui_events.BUTTON_CLICKED, () => this.onShowSimpleGraphicsClicked(), this);
    this.AddCallback("btn_keyb_default", ui_events.BUTTON_CLICKED, () => this.onDefaultKeybindsButtonClicked(), this);
    this.AddCallback("combo_renderer", ui_events.LIST_ITEM_SELECT, () => this.updateControls(), this);
    this.AddCallback("trb_ssample", ui_events.BUTTON_CLICKED, () => this.updateControls(), this);
    this.AddCallback("cb_ssample", ui_events.LIST_ITEM_SELECT, () => this.updateControls(), this);
  }

  public updateControls(): void {
    const currentRenderer: EGameRenderer = this.uiCurrentRendererSelect.CurrentID();

    logger.info("Updating controls: %s", currentRenderer);

    for (const [key, value] of this.preconditions) {
      value(key, currentRenderer);
    }

    this.uiTextureLodTrackBar.SetOptIBounds(0, 4);
  }

  public onDefaultKeybindsButtonClicked(): void {
    executeConsoleCommand(consoleCommands.default_controls);

    const optionsManager: COptionsManager = new COptionsManager();

    optionsManager.SetCurrentValues(EOptionGroup.OPTIONS_CONTROLS);
    optionsManager.SetCurrentValues(EOptionGroup.KEY_BINDINGS);
  }

  public onPresetChanged(): void {
    const optionsManager: COptionsManager = new COptionsManager();

    optionsManager.SetCurrentValues(EOptionGroup.OPTIONS_VIDEO_ADVANCED);
  }

  public onDefaultGraphicsButtonClicked(): void {
    const optionsManager: COptionsManager = new COptionsManager();

    optionsManager.SendMessage2Group(EOptionGroup.OPTIONS_VIDEO, optionGroupsMessages.set_default_value);
  }

  public onDefaultSoundSettingsButtonClicked(): void {
    const optionsManager: COptionsManager = new COptionsManager();

    optionsManager.SendMessage2Group(EOptionGroup.OPTIONS_SOUND, optionGroupsMessages.set_default_value);
  }

  public onAcceptButtonClicked(): void {
    const optionsManager: COptionsManager = new COptionsManager();

    optionsManager.SaveValues(EOptionGroup.OPTIONS_VIDEO_PRESET);
    optionsManager.SaveValues(EOptionGroup.KEY_BINDINGS);
    optionsManager.SaveValues(EOptionGroup.OPTIONS_VIDEO);
    optionsManager.SaveValues(EOptionGroup.OPTIONS_VIDEO_ADVANCED);
    optionsManager.SaveValues(EOptionGroup.OPTIONS_GAMEPLAY);
    optionsManager.SaveValues(EOptionGroup.OPTIONS_SOUND);
    optionsManager.SaveValues(EOptionGroup.OPTIONS_CONTROLS);

    optionsManager.OptionsPostAccept();

    this.owner.ShowDialog(true);
    this.HideDialog();
    this.owner.Show(true);

    // Check and notify about game restart if needed.
    if (!this.isRestartSystemShown) {
      const nextOptionsManager: COptionsManager = new COptionsManager();

      if (nextOptionsManager.NeedSystemRestart()) {
        this.isRestartSystemShown = true;
        this.uiMessageBox.InitMessageBox("message_box_restart_game");
        this.uiMessageBox.ShowDialog(true);
      }
    }

    executeConsoleCommand(consoleCommands.cfg_save);
  }

  public onCancelButtonClicked(): void {
    const optionsManager: COptionsManager = new COptionsManager();

    optionsManager.UndoGroup(EOptionGroup.OPTIONS_VIDEO_PRESET);
    optionsManager.UndoGroup(EOptionGroup.OPTIONS_VIDEO);
    optionsManager.UndoGroup(EOptionGroup.OPTIONS_VIDEO_ADVANCED);
    optionsManager.UndoGroup(EOptionGroup.OPTIONS_SOUND);
    optionsManager.OptionsPostAccept();

    this.owner.ShowDialog(true);
    this.HideDialog();
    this.owner.Show(true);
  }

  public onTabChanged(): void {
    this.uiDialogVideoSettings.Show(false);
    this.uiDialogSoundSettings.Show(false);
    this.uiDialogGameplaySettings.Show(false);
    this.uiDialogControlsSettings.Show(false);
    this.uiDialogVideoAdvancedSettings.Show(false);

    switch (this.uiTab.GetActiveId()) {
      case "video":
        return this.uiDialogVideoSettings.Show(true);

      case "sound":
        return this.uiDialogSoundSettings.Show(true);

      case "gameplay":
        return this.uiDialogGameplaySettings.Show(true);

      case "controls":
        return this.uiDialogControlsSettings.Show(true);
    }
  }

  public onShowAdvancedGraphicsClicked(): void {
    logger.info("Show advanced graphics");
    this.uiDialogVideoSettings.Show(false);
    this.uiDialogVideoAdvancedSettings.Show(true);
  }

  public onShowSimpleGraphicsClicked(): void {
    logger.info("Show simplified graphics");
    this.uiDialogVideoSettings.Show(true);
    this.uiDialogVideoAdvancedSettings.Show(false);
  }

  public override OnKeyboard(key: TKeyCode, event: TUIEvent): boolean {
    const result: boolean = super.OnKeyboard(key, event);

    if (event === ui_events.WINDOW_KEY_PRESSED) {
      if (key === DIK_keys.DIK_ESCAPE) {
        if (this.uiDialogVideoAdvancedSettings.IsShown()) {
          this.uiDialogVideoAdvancedSettings.Show(false);
          this.uiDialogVideoSettings.Show(true);
        } else {
          this.onCancelButtonClicked();
        }
      }
    }

    return result;
  }
}
