import {
  CScriptXmlInit,
  CUIEditBox,
  CUIListBox,
  CUIMessageBoxEx,
  CUIScriptWnd,
  CUIStatic,
  CUIWindow,
  DIK_keys,
  dik_to_bind,
  FS,
  getFS,
  key_bindings,
  LuabindClass,
  ui_events,
} from "xray16";
import { FSFile, FSFileList, FSItem, TKeyCode, TUIEvent, Vector2D } from "xray16/alias";
import { create2dVector, LuaArray, Nillable, TLabel, TName, TPath } from "xray16/lib";
import { $filename, $isNil, $isNotNil } from "xray16/macros";

import { roots } from "@/engine/constants/roots";
import { forgeConfig } from "@/engine/core/database/forge_config";
import { SaveItem } from "@/engine/core/ui/menu/save/SaveItem";
import { createGameSave, deleteGameSave, getGameSaves } from "@/engine/core/utils/game_save";
import { LuaLogger } from "@/engine/core/utils/logging";
import { createScreenRectangle } from "@/engine/core/utils/rectangle";
import { EElementType, initializeElement, resolveXmlFile } from "@/engine/core/utils/ui";

const logger: LuaLogger = new LuaLogger($filename);
const base: TPath = "menu\\SaveDialog.component";

/**
 * Game saving menu.
 */
@LuabindClass()
export class SaveDialog extends CUIScriptWnd {
  public owner: CUIScriptWnd;

  public modalBoxMode: number = 0;
  public newSave: Nillable<TName> = "";

  public fileItemMainSize!: Vector2D;
  public fileItemFnSize!: Vector2D;
  public fileItemFdSize!: Vector2D;

  public uiForm!: CUIStatic;
  public uiEditBox!: CUIEditBox;
  public uiListBox!: CUIListBox<SaveItem>;
  public uiMessageBox!: CUIMessageBoxEx;

  public constructor(owner: CUIScriptWnd) {
    super();

    this.owner = owner;

    this.initialize();
    this.fillList();
  }

  public initialize(): void {
    this.SetWndRect(createScreenRectangle());

    const xml: CScriptXmlInit = resolveXmlFile(base);

    xml.InitWindow("background", 0, this);

    const ctrl: CUIWindow = new CUIWindow();

    xml.InitWindow("file_item:main", 0, ctrl);

    this.fileItemMainSize = create2dVector(ctrl.GetWidth(), ctrl.GetHeight());

    xml.InitWindow("file_item:fn", 0, ctrl);
    this.fileItemFnSize = create2dVector(ctrl.GetWidth(), ctrl.GetHeight());

    xml.InitWindow("file_item:fd", 0, ctrl);
    this.fileItemFdSize = create2dVector(ctrl.GetWidth(), ctrl.GetHeight());

    this.uiForm = xml.InitStatic("form", this);
    xml.InitTextWnd("form:caption", this.uiForm);

    this.uiEditBox = xml.InitEditBox("form:edit", this.uiForm);

    xml.InitFrame("form:list_frame", this.uiForm);

    this.uiListBox = initializeElement(xml, EElementType.LIST_BOX, "form:list", this.uiForm, {
      context: this,
      [ui_events.LIST_ITEM_CLICKED]: () => this.onListItemClicked(),
    });
    this.uiListBox.ShowSelectedItem(true);

    initializeElement(xml, EElementType.BUTTON, "form:btn_save", this.uiForm, {
      context: this,
      [ui_events.BUTTON_CLICKED]: () => this.onOkButtonClicked(),
    });

    initializeElement(xml, EElementType.BUTTON, "form:btn_delete", this.uiForm, {
      context: this,
      [ui_events.BUTTON_CLICKED]: () => this.onDeleteButtonClicked(),
    });

    initializeElement(xml, EElementType.BUTTON, "form:btn_cancel", this.uiForm, {
      context: this,
      [ui_events.BUTTON_CLICKED]: () => this.onCancelButtonClicked(),
    });

    this.uiMessageBox = initializeElement(xml, EElementType.MESSAGE_BOX_EX, "message_box", this, {
      [ui_events.MESSAGE_BOX_YES_CLICKED]: () => this.onMessageYesClicked(),
    });
  }

  /**
   * Fill list of available game saves.
   */
  public fillList(): void {
    this.uiListBox.RemoveAll();

    const savesList: LuaArray<FSItem> = getGameSaves();

    for (const [, file] of savesList) {
      const filename: TName = string.sub(
        file.NameFull(),
        0,
        string.len(file.NameFull()) - string.len(forgeConfig.SAVE.GAME_SAVE_EXTENSION)
      );
      const dateTime: TLabel = "[" + file.ModifDigitOnly() + "]";

      this.addItemToList(filename, dateTime);
    }
  }

  public addItemToList(filename: TName, datetime: TLabel): void {
    const saveItem: SaveItem = new SaveItem(this.fileItemMainSize.y, this.fileItemFdSize.x, datetime);

    saveItem.SetWndSize(this.fileItemMainSize);

    saveItem.uiInnerNameText.SetWndPos(create2dVector(0, 0));
    saveItem.uiInnerNameText.SetWndSize(this.fileItemFnSize);
    saveItem.uiInnerNameText.SetText(filename);
    saveItem.uiInnerAgeText.SetWndPos(create2dVector(this.fileItemFnSize.x + 4, 0));

    this.uiListBox.AddExistingItem(saveItem);
  }

  public onListItemClicked(): void {
    logger.info("List item clicked");

    if (this.uiListBox.GetSize() === 0) {
      return;
    }

    const item = this.uiListBox.GetSelectedItem();

    if ($isNil(item)) {
      return;
    }

    const itemText: string = item.uiInnerNameText.GetText();

    this.uiEditBox.SetText(itemText);
  }

  public onMessageYesClicked(): void {
    logger.info("Message yes clicked: %s", this.modalBoxMode);

    if (this.modalBoxMode === 1) {
      if (this.newSave) {
        createGameSave(this.newSave);
      }

      this.owner.ShowDialog(true);
      this.HideDialog();
      this.owner.Show(true);
    } else if (this.modalBoxMode === 2) {
      this.onDeleteSelectedFile();
    }
  }

  public onDeleteButtonClicked(): void {
    logger.info("Message delete clicked");

    if (this.uiListBox.GetSize() === 0) {
      return;
    }

    const item: Nillable<SaveItem> = this.uiListBox.GetSelectedItem();

    if (item) {
      this.modalBoxMode = 2;
      this.uiMessageBox.InitMessageBox("message_box_delete_file_name");
      this.uiMessageBox.ShowDialog(true);
    }
  }

  public onDeleteSelectedFile(): void {
    logger.info("Deleting selected file");

    if (this.uiListBox.GetSize() === 0) {
      return;
    }

    const index: number = this.uiListBox.GetSelectedIndex();

    if (index === -1) {
      return;
    }

    const item: SaveItem = this.uiListBox.GetItemByIndex(index);
    const filename: string = item.uiInnerNameText.GetText();

    deleteGameSave(filename);

    this.uiListBox.RemoveItem(item);
    this.onListItemClicked();
  }

  public onOkButtonClicked(): void {
    logger.info("OK confirm clicked");

    this.newSave = this.uiEditBox.GetText();

    if (string.len(this.newSave) === 0) {
      logger.info("Save name is empty");

      this.modalBoxMode = 0;
      this.uiMessageBox.InitMessageBox("message_box_empty_file_name");
      this.uiMessageBox.ShowDialog(true);

      return;
    }

    const fs: FS = getFS();
    const fileList: FSFileList = fs.file_list_open(roots.gameSaves, FS.FS_ListFiles);
    const file: Nillable<FSFile> = fs.exist(roots.gameSaves, this.newSave + forgeConfig.SAVE.GAME_SAVE_EXTENSION);

    if (file) {
      logger.info("File already exists");

      this.modalBoxMode = 1;
      this.uiMessageBox.InitMessageBox("message_box_file_already_exist");
      this.uiMessageBox.ShowDialog(true);

      fileList.Free();

      return;
    }

    fileList.Free();

    if ($isNotNil(this.newSave)) {
      createGameSave(this.newSave);
    }

    this.owner.ShowDialog(true);
    this.HideDialog();
    this.owner.Show(true);

    logger.info("Saved");
  }

  public onCancelButtonClicked(): void {
    logger.info("Cancel clicked");
    this.owner.ShowDialog(true);
    this.HideDialog();
    this.owner.Show(true);
  }

  /**
   * On keyboard button press.
   */
  public override OnKeyboard(key: TKeyCode, event: TUIEvent): boolean {
    super.OnKeyboard(key, event);

    if (dik_to_bind(key) === key_bindings.kQUIT) {
      this.onCancelButtonClicked();
    } else if (key === DIK_keys.DIK_RETURN && event === ui_events.WINDOW_KEY_PRESSED) {
      this.onOkButtonClicked();
    }

    return true;
  }
}
