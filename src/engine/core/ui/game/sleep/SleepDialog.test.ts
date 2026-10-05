import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { CUI3tButton, CUIMessageBoxEx, CUIStatic, CUITrackBar, level } from "xray16";
import { createRectangle } from "xray16/lib";
import { MockGameObject } from "xray16/mocks";

import { infoPortions } from "@/engine/constants/info_portions";
import { getManager } from "@/engine/core/database";
import { SleepManager } from "@/engine/core/managers/sleep";
import { SleepDialog } from "@/engine/core/ui/game/sleep/SleepDialog";
import { giveInfoPortion, hasInfoPortion } from "@/engine/core/utils/info_portion";
import { mockRegisteredActor, resetRegistry } from "@/fixtures/engine";

describe("SleepDialog ui component", () => {
  beforeEach(() => {
    resetRegistry();
  });

  it("should correctly initialize", () => {
    const manager: SleepManager = getManager(SleepManager);
    const dialog: SleepDialog = new SleepDialog(manager);

    expect(dialog.SetWndRect).toHaveBeenCalled();

    expect(dialog.owner).toBe(manager);
    expect(dialog.xml).toBeDefined();
    expect(dialog.xml.ParseFile).toHaveBeenCalledWith("interaction\\SleepDialog.component.xml");

    expect(dialog.uiBackground).toBeInstanceOf(CUIStatic);
    expect(dialog.uiSleepStatic).toBeInstanceOf(CUIStatic);
    expect(dialog.uiSleepStatic2).toBeInstanceOf(CUIStatic);
    expect(dialog.uiCoverStatic).toBeInstanceOf(CUIStatic);
    expect(dialog.uiMarkerStatic).toBeInstanceOf(CUIStatic);
    expect(dialog.uiTimeTrack).toBeInstanceOf(CUITrackBar);
    expect(dialog.uiSleepButton).toBeInstanceOf(CUI3tButton);
    expect(dialog.uiCancelButton).toBeInstanceOf(CUI3tButton);
    expect(dialog.uiSleepMessageBox).toBeInstanceOf(CUIMessageBoxEx);
    expect(dialog.uiSleepNodeList).toBeInstanceOf(LuaTable);
    expect(dialog.uiSleepNodeList.length()).toBe(24);
  });

  it("should correctly handle display init with 4:3 screen", () => {
    mockRegisteredActor();

    const manager: SleepManager = getManager(SleepManager);
    const dialog: SleepDialog = new SleepDialog(manager);

    dialog.isWide = false;

    jest.spyOn(level, "get_time_hours").mockImplementation(() => 8);

    dialog.initializeDisplay();

    for (let it = 1; it <= 24; it += 1) {
      const hour = (8 + it) % 24;

      expect(dialog.uiSleepNodeList.get(it).TextControl().SetText).toHaveBeenCalledWith(
        hour + "translated_st_sleep_hours"
      );
    }

    expect(dialog.uiSleepStatic.SetTextureRect).toHaveBeenCalledWith(createRectangle(197, 413, 591, 531));
    expect(dialog.uiSleepStatic.SetWndSize).toHaveBeenCalledWith({
      x: 394,
      y: 118,
    });
    expect(dialog.uiSleepStatic2.SetTextureRect).toHaveBeenCalledWith(createRectangle(0, 413, 197, 531));
    expect(dialog.uiSleepStatic2.SetWndSize).toHaveBeenCalledWith({
      x: 197,
      y: 118,
    });
    expect(dialog.uiSleepStatic2.SetWndPos).toHaveBeenCalledWith({
      x: 118,
      y: 0,
    });
  });

  it("should correctly handle display init with 4:3 screen at night", () => {
    mockRegisteredActor();

    const manager: SleepManager = getManager(SleepManager);
    const dialog: SleepDialog = new SleepDialog(manager);

    dialog.isWide = false;

    jest.spyOn(level, "get_time_hours").mockImplementation(() => 22);

    dialog.initializeDisplay();

    for (let it = 1; it <= 24; it += 1) {
      const hour = (22 + it) % 24;

      expect(dialog.uiSleepNodeList.get(it).TextControl().SetText).toHaveBeenCalledWith(
        hour + "translated_st_sleep_hours"
      );
    }

    expect(dialog.uiSleepStatic.SetTextureRect).toHaveBeenCalledWith(createRectangle(541, 413, 591, 531));
    expect(dialog.uiSleepStatic.SetWndSize).toHaveBeenCalledWith({
      x: 50,
      y: 118,
    });
    expect(dialog.uiSleepStatic2.SetTextureRect).toHaveBeenCalledWith(createRectangle(0, 413, 541, 531));
    expect(dialog.uiSleepStatic2.SetWndSize).toHaveBeenCalledWith({
      x: 541,
      y: 118,
    });
    expect(dialog.uiSleepStatic2.SetWndPos).toHaveBeenCalledWith({
      x: 118,
      y: 0,
    });
  });

  it("should correctly handle display init with 16:9 screen", () => {
    mockRegisteredActor();

    const manager: SleepManager = getManager(SleepManager);
    const dialog: SleepDialog = new SleepDialog(manager);

    dialog.isWide = true;

    jest.spyOn(level, "get_time_hours").mockImplementation(() => 8);

    dialog.initializeDisplay();

    for (let it = 1; it <= 24; it += 1) {
      const hour = (8 + it) % 24;

      expect(dialog.uiSleepNodeList.get(it).TextControl().SetText).toHaveBeenCalledWith(
        hour + "translated_st_sleep_hours"
      );
    }

    expect(dialog.uiSleepStatic.SetTextureRect).toHaveBeenCalledWith(createRectangle(197, 413, 591, 531));
    expect(dialog.uiSleepStatic.SetWndSize).toHaveBeenCalledWith({
      x: 315.20000000000005,
      y: 118,
    });
    expect(dialog.uiSleepStatic2.SetTextureRect).toHaveBeenCalledWith(createRectangle(0, 413, 197, 531));
    expect(dialog.uiSleepStatic2.SetWndSize).toHaveBeenCalledWith({
      x: 157.60000000000002,
      y: 118,
    });
    expect(dialog.uiSleepStatic2.SetWndPos).toHaveBeenCalledWith({
      x: 118,
      y: 0,
    });
  });

  it("should correctly show sleep dialog when can sleep", () => {
    mockRegisteredActor();

    const manager: SleepManager = getManager(SleepManager);
    const dialog: SleepDialog = new SleepDialog(manager);

    jest.spyOn(dialog, "initializeDisplay").mockImplementation(jest.fn());
    jest.spyOn(dialog.uiTimeTrack, "SetCurrentValue");

    dialog.show();

    expect(hasInfoPortion(infoPortions.sleep_active)).toBe(true);
    expect(dialog.uiTimeTrack.SetCurrentValue).toHaveBeenCalled();
    expect(dialog.initializeDisplay).toHaveBeenCalled();
    expect(dialog.ShowDialog).toHaveBeenCalledWith(true);
  });

  it("should correctly show warning when cannot sleep", () => {
    const { actorGameObject } = mockRegisteredActor();
    const actorMock: MockGameObject = MockGameObject.asMock(actorGameObject);

    const manager: SleepManager = getManager(SleepManager);
    const dialog: SleepDialog = new SleepDialog(manager);

    jest.spyOn(dialog, "initializeDisplay").mockImplementation(jest.fn());

    actorMock.objectBleeding = 1;
    actorMock.objectRadiation = 1;

    dialog.show();

    expect(hasInfoPortion(infoPortions.sleep_active)).toBe(true);
    expect(dialog.uiSleepMessageBox.InitMessageBox).toHaveBeenCalledWith("message_box_ok");
    expect(dialog.uiSleepMessageBox.SetText).toHaveBeenCalledWith("sleep_warning_all_pleasures");
    expect(dialog.uiSleepMessageBox.ShowDialog).toHaveBeenCalledWith(true);

    actorMock.objectBleeding = 1;
    actorMock.objectRadiation = 0;

    dialog.show();

    expect(hasInfoPortion(infoPortions.sleep_active)).toBe(true);
    expect(dialog.uiSleepMessageBox.InitMessageBox).toHaveBeenCalledWith("message_box_ok");
    expect(dialog.uiSleepMessageBox.SetText).toHaveBeenCalledWith("sleep_warning_bleeding");
    expect(dialog.uiSleepMessageBox.ShowDialog).toHaveBeenCalledWith(true);

    actorMock.objectBleeding = 0;
    actorMock.objectRadiation = 1;

    dialog.show();

    expect(hasInfoPortion(infoPortions.sleep_active)).toBe(true);
    expect(dialog.uiSleepMessageBox.InitMessageBox).toHaveBeenCalledWith("message_box_ok");
    expect(dialog.uiSleepMessageBox.SetText).toHaveBeenCalledWith("sleep_warning_radiation");
    expect(dialog.uiSleepMessageBox.ShowDialog).toHaveBeenCalledWith(true);
  });

  it("should correctly handle 4:3 screen updates", () => {
    const manager: SleepManager = getManager(SleepManager);
    const dialog: SleepDialog = new SleepDialog(manager);

    dialog.isWide = false;

    jest.spyOn(dialog.uiTimeTrack, "GetIValue").mockImplementation(jest.fn(() => 0));
    dialog.Update();
    expect(dialog.uiMarkerStatic.SetWndPos).toHaveBeenNthCalledWith(1, { x: -25, y: 0 });

    jest.spyOn(dialog.uiTimeTrack, "GetIValue").mockImplementation(jest.fn(() => 1));
    dialog.Update();
    expect(dialog.uiMarkerStatic.SetWndPos).toHaveBeenNthCalledWith(2, { x: 5, y: 0 });

    jest.spyOn(dialog.uiTimeTrack, "GetIValue").mockImplementation(jest.fn(() => 10));
    dialog.Update();
    expect(dialog.uiMarkerStatic.SetWndPos).toHaveBeenNthCalledWith(3, { x: 221, y: 0 });

    jest.spyOn(dialog.uiTimeTrack, "GetIValue").mockImplementation(jest.fn(() => 23));
    dialog.Update();
    expect(dialog.uiMarkerStatic.SetWndPos).toHaveBeenNthCalledWith(4, { x: 541, y: 0 });

    jest.spyOn(dialog.uiTimeTrack, "GetIValue").mockImplementation(jest.fn(() => 24));
    dialog.Update();
    expect(dialog.uiMarkerStatic.SetWndPos).toHaveBeenNthCalledWith(5, { x: 566, y: 0 });
  });

  it("should correctly handle 16:9 screen updates", () => {
    const manager: SleepManager = getManager(SleepManager);
    const dialog: SleepDialog = new SleepDialog(manager);

    dialog.isWide = true;

    jest.spyOn(dialog.uiTimeTrack, "GetIValue").mockImplementation(jest.fn(() => 0));
    dialog.Update();
    expect(dialog.uiMarkerStatic.SetWndPos).toHaveBeenNthCalledWith(1, { x: -20, y: 0 });

    jest.spyOn(dialog.uiTimeTrack, "GetIValue").mockImplementation(jest.fn(() => 1));
    dialog.Update();
    expect(dialog.uiMarkerStatic.SetWndPos).toHaveBeenNthCalledWith(2, { x: 4, y: 0 });

    jest.spyOn(dialog.uiTimeTrack, "GetIValue").mockImplementation(jest.fn(() => 10));
    dialog.Update();
    expect(dialog.uiMarkerStatic.SetWndPos).toHaveBeenNthCalledWith(3, { x: 176.8, y: 0 });

    jest.spyOn(dialog.uiTimeTrack, "GetIValue").mockImplementation(jest.fn(() => 23));
    dialog.Update();
    expect(dialog.uiMarkerStatic.SetWndPos).toHaveBeenNthCalledWith(4, { x: 432.8, y: 0 });

    jest.spyOn(dialog.uiTimeTrack, "GetIValue").mockImplementation(jest.fn(() => 24));
    dialog.Update();
    expect(dialog.uiMarkerStatic.SetWndPos).toHaveBeenNthCalledWith(5, { x: 452.8, y: 0 });
  });

  it("should correctly handle sleep start button", () => {
    const manager: SleepManager = getManager(SleepManager);
    const dialog: SleepDialog = new SleepDialog(manager);

    jest.spyOn(manager, "startSleep").mockImplementation(jest.fn());
    jest.spyOn(dialog.uiTimeTrack, "GetIValue").mockImplementation(jest.fn(() => 12));

    dialog.onSleepButtonClick();

    expect(dialog.HideDialog).toHaveBeenCalled();
    expect(manager.startSleep).toHaveBeenCalledWith(12);
  });

  it("should correctly handle cancel button", () => {
    mockRegisteredActor();

    const manager: SleepManager = getManager(SleepManager);
    const dialog: SleepDialog = new SleepDialog(manager);

    giveInfoPortion(infoPortions.sleep_active);

    dialog.onCancelButtonClick();

    expect(dialog.HideDialog).toHaveBeenCalled();
    expect(hasInfoPortion(infoPortions.tutorial_sleep)).toBe(true);
    expect(hasInfoPortion(infoPortions.sleep_active)).toBe(false);
  });

  it("should correctly handle message box OK click", () => {
    mockRegisteredActor();

    const manager: SleepManager = getManager(SleepManager);
    const dialog: SleepDialog = new SleepDialog(manager);

    giveInfoPortion(infoPortions.sleep_active);

    dialog.onMessageBoxOkClicked();

    expect(hasInfoPortion(infoPortions.tutorial_sleep)).toBe(true);
    expect(hasInfoPortion(infoPortions.sleep_active)).toBe(false);
  });
});
