import {
  CScriptXmlInit,
  CUIListBox,
  CUIMessageBoxEx,
  CUIScriptWnd,
  CUIStatic,
  CUITextWnd,
  CUIWindow,
  DIK_keys,
  dik_to_bind,
  key_bindings,
  LuabindClass,
  ui_events,
  valid_saved_game,
} from "xray16";
import { FSItem, GameObject, TKeyCode, TUIEvent, Vector2D } from "xray16/alias";
import { create2dVector, LuaArray, Nillable, TIndex, TLabel, TName, TPath } from "xray16/lib";
import { $filename } from "xray16/macros";

import { registry } from "@/engine/core/database";
import { forgeConfig } from "@/engine/core/database/forge_config";
import { LoadItem } from "@/engine/core/ui/menu/load/LoadItem";
import {
  deleteGameSave,
  getFileDataForGameSave,
  getGameSaves,
  isGameSaveFileExist,
  loadGameSave,
} from "@/engine/core/utils/game_save";
import { LuaLogger } from "@/engine/core/utils/logging";
import { copyRectangle, createScreenRectangle } from "@/engine/core/utils/rectangle";
import { EElementType, initializeElement, initializeStatics, resolveXmlFile } from "@/engine/core/utils/ui";

const logger: LuaLogger = new LuaLogger($filename);
const base: TPath = "menu\\LoadDialog.component";

/**
 * Main menu window to load game saves.
 */
@LuabindClass()
export class LoadDialog extends CUIScriptWnd {
  public owner: CUIScriptWnd;

  public messageBoxMode: number = 0;

  public fileItemMainSize!: Vector2D;
  public fileItemInnerNameTextSize!: Vector2D;
  public fileItemDdSize!: Vector2D;

  public uiForm!: CUIStatic;
  public uiPicture!: CUIStatic;
  public uiFileCaption!: CUITextWnd;
  public uiFileData!: CUITextWnd;
  public uiListBox!: CUIListBox<LoadItem>;
  public uiMessageBox!: CUIMessageBoxEx;

  public constructor(owner: CUIScriptWnd) {
    super();

    this.owner = owner;

    this.initialize();
  }

  public initialize(): void {
    this.SetWndRect(createScreenRectangle());

    const xml: CScriptXmlInit = resolveXmlFile(base);

    initializeStatics(xml, this, "background");

    const window: CUIWindow = new CUIWindow();

    xml.InitWindow("file_item:main", 0, window);
    this.fileItemMainSize = create2dVector(window.GetWidth(), window.GetHeight());

    xml.InitWindow("file_item:fn", 0, window);
    this.fileItemInnerNameTextSize = create2dVector(window.GetWidth(), window.GetHeight());

    xml.InitWindow("file_item:fd", 0, window);
    this.fileItemDdSize = create2dVector(window.GetWidth(), window.GetHeight());

    this.uiForm = xml.InitStatic("form", this);

    this.uiPicture = initializeElement(xml, EElementType.STATIC, "form:picture", this.uiForm);
    initializeStatics(xml, this.uiForm, "form:caption");

    this.uiFileCaption = initializeElement(xml, EElementType.TEXT_WINDOW, "form:file_caption", this.uiForm);
    this.uiFileData = initializeElement(xml, EElementType.TEXT_WINDOW, "form:file_data", this.uiForm);

    xml.InitFrame("form:list_frame", this.uiForm);

    this.uiListBox = initializeElement(xml, EElementType.LIST_BOX, "form:list", this.uiForm, {
      context: this,
      [ui_events.LIST_ITEM_CLICKED]: () => this.onListItemClicked(),
      [ui_events.WINDOW_LBUTTON_DB_CLICK]: () => this.onListItemDoubleClicked(),
    });
    this.uiListBox.ShowSelectedItem(true);

    initializeElement(xml, EElementType.BUTTON, "form:btn_load", this.uiForm, {
      context: this,
      [ui_events.BUTTON_CLICKED]: () => this.onLoadButtonClicked(),
    });

    initializeElement(xml, EElementType.BUTTON, "form:btn_delete", this.uiForm, {
      context: this,
      [ui_events.BUTTON_CLICKED]: () => this.onDeleteButtonClicked(),
    });

    initializeElement(xml, EElementType.BUTTON, "form:btn_cancel", this.uiForm, {
      context: this,
      [ui_events.BUTTON_CLICKED]: () => this.onBackButtonClicked(),
    });

    this.uiMessageBox = initializeElement(xml, EElementType.MESSAGE_BOX_EX, "message_box", this, {
      [ui_events.MESSAGE_BOX_YES_CLICKED]: () => this.onConfirmedLoadClicked(),
      [ui_events.MESSAGE_BOX_OK_CLICKED]: () => this.onConfirmedLoadClicked(),
    });
  }

  public fillList(): void {
    this.uiListBox.RemoveAll();

    const savesList: LuaArray<FSItem> = getGameSaves();

    for (const [, file] of savesList) {
      const filename: TName = string.sub(
        file.NameFull(),
        0,
        string.len(file.NameFull()) - string.len(forgeConfig.SAVE.GAME_SAVE_EXTENSION)
      );

      this.addItemToList(filename, `[${file.ModifDigitOnly()}]`);
    }
  }

  public addItemToList(filename: TName, datetime: TLabel): void {
    const loadItem: LoadItem = new LoadItem(this.fileItemMainSize.y, this.fileItemDdSize.x, datetime);

    loadItem.SetWndSize(this.fileItemMainSize);
    loadItem.uiInnerNameText.SetWndPos(create2dVector(0, 0));
    loadItem.uiInnerNameText.SetWndSize(this.fileItemInnerNameTextSize);
    loadItem.uiInnerNameText.SetText(filename);
    loadItem.uiInnerAgeText.SetWndPos(create2dVector(this.fileItemInnerNameTextSize.x + 4, 0));
    loadItem.uiInnerAgeText.SetWndSize(this.fileItemDdSize);

    this.uiListBox.AddExistingItem(loadItem);
  }

  public onListItemClicked(): void {
    logger.info("List item selected");

    if (this.uiListBox.GetSize() === 0) {
      return;
    }

    const item: Nillable<LoadItem> = this.uiListBox.GetSelectedItem();

    if (!item) {
      this.uiFileCaption.SetText("");
      this.uiFileData.SetText("");

      this.uiPicture.InitTexture("ui_ui_noise");
      this.uiPicture.SetTextureRect(copyRectangle(this.uiPicture.GetTextureRect()));

      return;
    }

    const itemText: TLabel = item.uiInnerNameText.GetText();

    this.uiFileCaption.SetText(itemText);
    this.uiFileCaption.SetEllipsis(true);
    this.uiFileData.SetText(getFileDataForGameSave(itemText));

    if (!isGameSaveFileExist(itemText + forgeConfig.SAVE.GAME_SAVE_EXTENSION)) {
      this.uiListBox.RemoveItem(item);

      return;
    }

    if (isGameSaveFileExist(itemText + ".dds")) {
      this.uiPicture.InitTexture(itemText);
    } else {
      this.uiPicture.InitTexture("ui_ui_noise");
    }

    this.uiPicture.SetTextureRect(copyRectangle(this.uiPicture.GetTextureRect()));
  }

  public onListItemDoubleClicked(): void {
    logger.info("List item double-clicked");
    this.onLoadButtonClicked();
  }

  public onConfirmedLoadClicked(): void {
    logger.info("Message yes confirmed");

    const index: TIndex = this.uiListBox.GetSelectedIndex();

    if (index === -1) {
      return;
    }

    if (this.messageBoxMode === 1) {
      const item: LoadItem = this.uiListBox.GetItemByIndex(index);
      const innerNameTextame: string = item.uiInnerNameText.GetText();

      deleteGameSave(innerNameTextame);

      this.uiListBox.RemoveItem(item);

      this.onListItemClicked();
    } else if (this.messageBoxMode === 2) {
      this.loadGameInternal();
    }

    this.messageBoxMode = 0;
  }

  public loadGameInternal(): void {
    logger.info("Load game internal");

    if (this.uiListBox.GetSize() === 0) {
      return;
    }

    const index: TIndex = this.uiListBox.GetSelectedIndex();

    if (index === -1) {
      return;
    }

    const item: LoadItem = this.uiListBox.GetItemByIndex(index);
    const innerNameTextName: TName = item.uiInnerNameText.GetText();

    loadGameSave(innerNameTextName);
  }

  public onLoadButtonClicked(): void {
    logger.info("Load game clicked");

    if (this.uiListBox.GetSize() === 0) {
      return;
    }

    const item: Nillable<LoadItem> = this.uiListBox.GetSelectedItem();

    if (!item) {
      return;
    }

    const innerNameTextName: TName = item.uiInnerNameText.GetText();

    if (!valid_saved_game(innerNameTextName)) {
      this.messageBoxMode = 0;
      this.uiMessageBox.InitMessageBox("message_box_invalid_saved_game");
      this.uiMessageBox.ShowDialog(true);

      return;
    }

    if (!registry.simulator) {
      this.loadGameInternal();

      return;
    }

    const actor: Nillable<GameObject> = registry.actor;

    if (actor && !actor.alive()) {
      this.loadGameInternal();

      return;
    }

    this.messageBoxMode = 2;
    this.uiMessageBox.InitMessageBox("message_box_confirm_load_save");
    this.uiMessageBox.ShowDialog(true);
  }

  public onBackButtonClicked(): void {
    logger.info("Back clicked");

    this.owner.ShowDialog(true);
    this.HideDialog();
    this.owner.Show(true);
  }

  /**
   * Delete game save button clicked.
   */
  public onDeleteButtonClicked(): void {
    logger.info("Delete clicked");

    if (this.uiListBox.GetSize() === 0) {
      return;
    }

    const index: TIndex = this.uiListBox.GetSelectedIndex();

    if (index === -1) {
      return;
    }

    this.messageBoxMode = 1;

    this.uiMessageBox.InitMessageBox("message_box_delete_file_name");
    this.uiMessageBox.ShowDialog(true);
  }

  public override OnKeyboard(key: TKeyCode, event: TUIEvent): boolean {
    super.OnKeyboard(key, event);

    const bind: number = dik_to_bind(key);

    if (bind === key_bindings.kQUIT) {
      this.onBackButtonClicked();
    }

    if (key === DIK_keys.DIK_RETURN && event === ui_events.WINDOW_KEY_PRESSED) {
      this.onLoadButtonClicked();
    }

    return true;
  }
}
