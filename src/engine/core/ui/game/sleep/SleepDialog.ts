import {
  CScriptXmlInit,
  CUI3tButton,
  CUIMessageBoxEx,
  CUIScriptWnd,
  CUIStatic,
  CUITrackBar,
  game,
  level,
  LuabindClass,
  ui_events,
} from "xray16";
import { GameObject, Vector2D } from "xray16/alias";
import { create2dVector, createRectangle, TDuration, TNumberId, TPath, TTimestamp } from "xray16/lib";
import { $filename } from "xray16/macros";

import { infoPortions } from "@/engine/constants/info_portions/info_portions";
import { registry } from "@/engine/core/database";
import { SleepManager } from "@/engine/core/managers/sleep";
import { SCREEN_WIDE_COEFFICIENT } from "@/engine/core/ui/screen_layout";
import { disableInfoPortion, giveInfoPortion } from "@/engine/core/utils/info_portion";
import { LuaLogger } from "@/engine/core/utils/logging";
import { canActorSleep } from "@/engine/core/utils/object";
import { createScreenRectangle } from "@/engine/core/utils/rectangle";
import {
  EElementType,
  initializeElement,
  initializeStatic,
  isWideScreen,
  resolveXmlFile,
} from "@/engine/core/utils/ui";

const logger: LuaLogger = new LuaLogger($filename);
const base: TPath = "interaction\\SleepDialog.component";

/**
 * In-game sleep dialog, shown when interacting with sleeping beds.
 */
@LuabindClass()
export class SleepDialog extends CUIScriptWnd {
  public readonly owner: SleepManager;
  public readonly xml: CScriptXmlInit = resolveXmlFile(base, new CScriptXmlInit(), true);

  public isWide: boolean = isWideScreen();

  public uiBackground!: CUIStatic;
  public uiSleepStatic!: CUIStatic;
  public uiSleepStatic2!: CUIStatic;
  public uiCoverStatic!: CUIStatic;
  public uiMarkerStatic!: CUIStatic;
  public uiTimeTrack!: CUITrackBar;
  public uiSleepButton!: CUI3tButton;
  public uiCancelButton!: CUI3tButton;
  public uiSleepMessageBox!: CUIMessageBoxEx;
  public uiSleepNodeList: LuaTable<TNumberId, CUIStatic> = new LuaTable();

  public constructor(owner: SleepManager) {
    super();

    this.owner = owner;

    this.initializeControls();
  }

  /**
   * Initialize UI control elements.
   */
  public initializeControls(): void {
    this.SetWndRect(createScreenRectangle());

    this.uiBackground = initializeStatic(this.xml, this, "background");
    this.uiSleepStatic = initializeStatic(this.xml, this.uiBackground, "sleep_static");
    this.uiSleepStatic2 = initializeStatic(this.xml, this.uiBackground, "sleep_static");
    this.uiCoverStatic = initializeStatic(this.xml, this.uiBackground, "static_cover");
    this.uiMarkerStatic = initializeStatic(this.xml, this.uiCoverStatic, "st_marker");

    for (let it = 1; it <= 24; it += 1) {
      this.uiSleepNodeList.set(it, initializeStatic(this.xml, this.uiBackground, "sleep_st_" + it));
    }

    this.uiTimeTrack = initializeElement(this.xml, EElementType.TRACK_BAR, "time_track", this.uiBackground);

    this.uiSleepButton = initializeElement(this.xml, EElementType.BUTTON, "btn_sleep", this.uiBackground, {
      context: this,
      [ui_events.BUTTON_CLICKED]: () => this.onSleepButtonClick(),
    });

    this.uiCancelButton = initializeElement(this.xml, EElementType.BUTTON, "btn_cancel", this.uiBackground, {
      context: this,
      [ui_events.BUTTON_CLICKED]: () => this.onCancelButtonClick(),
    });

    this.uiSleepMessageBox = initializeElement(this.xml, EElementType.MESSAGE_BOX_EX, "sleep_mb", this, {
      [ui_events.MESSAGE_BOX_OK_CLICKED]: () => this.onMessageBoxOkClicked(),
    });
  }

  /**
   * Initialize display of sleep dialog.
   */
  public initializeDisplay(): void {
    const currentHours: TTimestamp = level.get_time_hours();

    for (let it = 1; it <= 24; it += 1) {
      let hours: number = currentHours + it;

      if (hours >= 24) {
        hours -= 24;
      }

      this.uiSleepNodeList
        .get(it)
        .TextControl()
        .SetText(hours + game.translate_string("st_sleep_hours"));
    }

    const delta: number = math.floor((591 / 24) * currentHours);

    this.uiSleepStatic.SetTextureRect(createRectangle(delta, 413, 591, 531));

    const staticPositionX: number = 591 - delta;

    this.uiSleepStatic.SetWndSize(
      create2dVector(this.isWide ? staticPositionX * SCREEN_WIDE_COEFFICIENT : staticPositionX, 118)
    );
    this.uiSleepStatic2.SetTextureRect(createRectangle(0, 413, delta, 531));

    this.uiSleepStatic2.SetWndSize(create2dVector(this.isWide ? delta * SCREEN_WIDE_COEFFICIENT : delta, 118));

    const position: Vector2D = this.uiSleepStatic2.GetWndPos();

    position.x = this.uiSleepStatic.GetWndPos().x + this.uiSleepStatic.GetWidth();
    this.uiSleepStatic2.SetWndPos(position);
  }

  /**
   * Show in-game sleep dialog options.
   */
  public show(): void {
    logger.info("Show sleep options");

    giveInfoPortion(infoPortions.sleep_active);

    // Handle cases when actor cannot sleep because of various factors.
    if (canActorSleep()) {
      this.uiTimeTrack.SetCurrentValue();
      this.initializeDisplay();
      this.ShowDialog(true);
    } else {
      this.uiSleepMessageBox.InitMessageBox("message_box_ok");

      const actor: GameObject = registry.actor;

      if (actor.bleeding > 0 && actor.radiation > 0) {
        this.uiSleepMessageBox.SetText("sleep_warning_all_pleasures");
      } else if (actor.bleeding > 0) {
        this.uiSleepMessageBox.SetText("sleep_warning_bleeding");
      } else {
        this.uiSleepMessageBox.SetText("sleep_warning_radiation");
      }

      this.uiSleepMessageBox.ShowDialog(true);
    }
  }

  /**
   * Handle update tick for the ui component.
   */
  public override Update(): void {
    super.Update();

    const sleepTime: TDuration = this.uiTimeTrack.GetIValue() - 1;
    let x: number = math.floor((591 / 24) * sleepTime);

    if (x === 0) {
      x = 5;
    }

    this.uiMarkerStatic.SetWndPos(create2dVector(this.isWide ? x * SCREEN_WIDE_COEFFICIENT : x, 0));
  }

  /**
   * Handle sleep OK button click.
   */
  public onSleepButtonClick(): void {
    this.HideDialog();
    this.owner.startSleep(this.uiTimeTrack.GetIValue());
  }

  /**
   * Handle sleep cancel button click.
   */
  public onCancelButtonClick(): void {
    this.HideDialog();

    giveInfoPortion(infoPortions.tutorial_sleep);
    disableInfoPortion(infoPortions.sleep_active);
  }

  /**
   * Handle closing cannot sleep message box.
   */
  public onMessageBoxOkClicked(): void {
    giveInfoPortion(infoPortions.tutorial_sleep);
    disableInfoPortion(infoPortions.sleep_active);
  }
}
