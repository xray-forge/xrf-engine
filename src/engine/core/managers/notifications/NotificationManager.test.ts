import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { GameObject, GameTask } from "xray16/alias";
import { AnyObject } from "xray16/lib";
import { MockAlifeHumanStalker, MockAlifeSimulator, mockCGameTask, MockGameObject, MockVector } from "xray16/mocks";
import { resetFunctionMock } from "xray16/testing/utils";

import {
  disposeManager,
  getManager,
  initializeManager,
  registerActor,
  registerObject,
  registerSimulator,
  registerStoryLink,
  registry,
} from "@/engine/core/database";
import { EGameEvent, EventsManager } from "@/engine/core/managers/events";
import {
  ENotificationDirection,
  ENotificationType,
  ETreasureState,
  IItemRelocatedNotification,
  IMoneyRelocatedNotification,
  ISoundNotification,
  ITaskUpdatedNotification,
  ITipNotification,
  ITreasureNotification,
  NotificationManager,
} from "@/engine/core/managers/notifications";
import { notificationsConfig } from "@/engine/core/managers/notifications/NotificationsConfig";
import { AbstractPlayableSound } from "@/engine/core/managers/sounds/objects/AbstractPlayableSound";
import { ActorSound } from "@/engine/core/managers/sounds/objects/ActorSound";
import { soundsConfig } from "@/engine/core/managers/sounds/SoundsConfig";
import { ETaskState } from "@/engine/core/managers/tasks";
import { ISchemeWoundedState } from "@/engine/core/schemes/stalker/wounded";
import { resetRegistry } from "@/fixtures/engine";

describe("NotificationManager", () => {
  beforeEach(() => {
    resetRegistry();
    registerSimulator();
    registerActor(MockGameObject.mock());
    initializeManager(NotificationManager);
  });

  afterEach(() => {
    disposeManager(NotificationManager);
  });

  it("should correctly initialize", () => {
    const eventsManager: EventsManager = getManager(EventsManager);

    initializeManager(NotificationManager);

    expect(eventsManager.getSubscribersCount()).toBe(3);
    expect(eventsManager.getEventSubscribersCount(EGameEvent.DUMP_LUA_DATA)).toBe(1);
    expect(eventsManager.getEventSubscribersCount(EGameEvent.SURGE_SKIPPED)).toBe(1);
    expect(eventsManager.getEventSubscribersCount(EGameEvent.NOTIFICATION)).toBe(1);

    disposeManager(NotificationManager);

    expect(eventsManager.getSubscribersCount()).toBe(0);
  });

  it("should correctly handle generic call method with events", () => {
    const eventsManager: EventsManager = getManager(EventsManager);
    const notificationManager: NotificationManager = getManager(NotificationManager);

    notificationManager.sendItemRelocatedNotification = jest.fn();
    notificationManager.sendMoneyRelocatedNotification = jest.fn();
    notificationManager.sendTipNotification = jest.fn();
    notificationManager.sendSoundNotification = jest.fn();
    notificationManager.sendTreasureNotification = jest.fn();
    notificationManager.sendTaskNotification = jest.fn();

    expect(() => eventsManager.emitEvent(EGameEvent.NOTIFICATION)).toThrow();
    expect(() => eventsManager.emitEvent(EGameEvent.NOTIFICATION, {})).toThrow();
    expect(() => eventsManager.emitEvent(EGameEvent.NOTIFICATION, { type: "random" })).toThrow();
    expect(() => eventsManager.emitEvent(EGameEvent.NOTIFICATION, { type: ENotificationType.TIP })).not.toThrow();

    const task: GameTask = mockCGameTask();

    eventsManager.emitEvent<ITaskUpdatedNotification>(EGameEvent.NOTIFICATION, {
      type: ENotificationType.TASK,
      state: ETaskState.UPDATED,
      task: task,
    });
    expect(notificationManager.sendTaskNotification).toHaveBeenCalledWith(ETaskState.UPDATED, task);

    eventsManager.emitEvent<IMoneyRelocatedNotification>(EGameEvent.NOTIFICATION, {
      type: ENotificationType.MONEY,
      amount: 255,
      direction: ENotificationDirection.OUT,
    });
    expect(notificationManager.sendMoneyRelocatedNotification).toHaveBeenCalledWith(ENotificationDirection.OUT, 255);

    eventsManager.emitEvent<IItemRelocatedNotification>(EGameEvent.NOTIFICATION, {
      type: ENotificationType.ITEM,
      itemSection: "test",
      direction: ENotificationDirection.IN,
      amount: 10,
    });
    expect(notificationManager.sendItemRelocatedNotification).toHaveBeenCalledWith(
      ENotificationDirection.IN,
      "test",
      10
    );

    eventsManager.emitEvent<ITreasureNotification>(EGameEvent.NOTIFICATION, {
      type: ENotificationType.TREASURE,
      state: ETreasureState.FOUND_TREASURE,
    });
    expect(notificationManager.sendTreasureNotification).toHaveBeenCalledWith(ETreasureState.FOUND_TREASURE);

    eventsManager.emitEvent<ISoundNotification>(EGameEvent.NOTIFICATION, {
      type: ENotificationType.SOUND,
      faction: "faction",
      object: registry.actor,
      point: "test_point",
      soundPath: "test_path",
      delay: 10,
      soundCaption: "caption",
    });
    expect(notificationManager.sendSoundNotification).toHaveBeenCalledWith(
      registry.actor,
      "faction",
      "test_point",
      "test_path",
      "caption",
      10
    );

    eventsManager.emitEvent<ITipNotification>(EGameEvent.NOTIFICATION, {
      type: ENotificationType.TIP,
      caption: "caption",
      delay: 500,
      sender: "can_resupply",
      showtime: 128,
      senderId: "sid",
    });
    expect(notificationManager.sendTipNotification).toHaveBeenCalledWith("caption", "can_resupply", 500, 128, "sid");
  });

  it("should correctly send money relocation notifications", () => {
    const notificationManager: NotificationManager = getManager(NotificationManager);

    notificationManager.onSendGenericNotification = jest.fn();

    notificationManager.sendMoneyRelocatedNotification(ENotificationDirection.IN, 2000);
    expect(notificationManager.onSendGenericNotification).toHaveBeenCalledWith(
      true,
      "translated_general_in_money",
      "2000",
      "ui_inGame2_Dengi_polucheni",
      0,
      notificationsConfig.DEFAULT_NOTIFICATION_SHOW_DURATION
    );

    resetFunctionMock(notificationManager.onSendGenericNotification);

    notificationManager.sendMoneyRelocatedNotification(ENotificationDirection.OUT, 128);
    expect(notificationManager.onSendGenericNotification).toHaveBeenCalledWith(
      true,
      "translated_general_out_money",
      "128",
      "ui_inGame2_Dengi_otdani",
      0,
      notificationsConfig.DEFAULT_NOTIFICATION_SHOW_DURATION
    );
  });

  it("should correctly send item relocation notifications", () => {
    const notificationManager: NotificationManager = getManager(NotificationManager);

    notificationManager.onSendGenericNotification = jest.fn();

    notificationManager.sendItemRelocatedNotification(ENotificationDirection.IN, "detector_advanced", 25);
    expect(notificationManager.onSendGenericNotification).toHaveBeenCalledWith(
      true,
      "translated_general_in_item",
      "translated_st_detector2 x25",
      "ui_inGame2_Predmet_poluchen",
      0,
      notificationsConfig.DEFAULT_NOTIFICATION_SHOW_DURATION
    );

    resetFunctionMock(notificationManager.onSendGenericNotification);

    notificationManager.sendItemRelocatedNotification(ENotificationDirection.OUT, "detector_advanced");
    expect(notificationManager.onSendGenericNotification).toHaveBeenCalledWith(
      true,
      "translated_general_out_item",
      "translated_st_detector2",
      "ui_inGame2_Predmet_otdan",
      0,
      notificationsConfig.DEFAULT_NOTIFICATION_SHOW_DURATION
    );
  });

  it("should correctly send treasures notifications", () => {
    const notificationManager: NotificationManager = getManager(NotificationManager);

    notificationManager.onSendGenericNotification = jest.fn();

    notificationManager.sendTreasureNotification(ETreasureState.NEW_TREASURE_COORDINATES);
    expect(notificationManager.onSendGenericNotification).toHaveBeenCalledWith(
      true,
      "translated_st_found_new_treasure",
      "",
      "ui_inGame2_Polucheni_koordinaty_taynika",
      0,
      notificationsConfig.DEFAULT_NOTIFICATION_SHOW_DURATION
    );

    resetFunctionMock(notificationManager.onSendGenericNotification);

    notificationManager.sendTreasureNotification(ETreasureState.FOUND_TREASURE);
    expect(notificationManager.onSendGenericNotification).toHaveBeenCalledWith(
      true,
      "translated_st_got_treasure",
      "",
      "ui_inGame2_Polucheni_koordinaty_taynika",
      0,
      notificationsConfig.DEFAULT_NOTIFICATION_SHOW_DURATION
    );

    resetFunctionMock(notificationManager.onSendGenericNotification);

    notificationManager.sendTreasureNotification(ETreasureState.LOOTED_TREASURE_COORDINATES);
    expect(notificationManager.onSendGenericNotification).toHaveBeenCalledWith(
      true,
      "translated_st_found_old_treasure",
      "",
      "ui_inGame2_Polucheni_koordinaty_taynika",
      0,
      notificationsConfig.DEFAULT_NOTIFICATION_SHOW_DURATION
    );
  });

  it("should correctly send surge notifications", () => {
    const notificationManager: NotificationManager = getManager(NotificationManager);
    const eventsManager: EventsManager = getManager(EventsManager);

    notificationManager.onPlayPdaNotificationSound = jest.fn();
    notificationManager.onSendGenericNotification = jest.fn();

    eventsManager.emitEvent(EGameEvent.SURGE_SKIPPED);
    eventsManager.emitEvent(EGameEvent.SURGE_SKIPPED, false);

    expect(notificationManager.onPlayPdaNotificationSound).toHaveBeenCalledTimes(0);
    expect(notificationManager.onSendGenericNotification).toHaveBeenCalledTimes(0);

    eventsManager.emitEvent(EGameEvent.SURGE_SKIPPED, true);

    expect(notificationManager.onPlayPdaNotificationSound).toHaveBeenCalledTimes(1);
    expect(notificationManager.onSendGenericNotification).toHaveBeenCalledWith(
      false,
      "translated_st_tip",
      "translated_st_surge_while_asleep",
      "ui_inGame2_V_zone_nedavno_proshel_vibros",
      0,
      notificationsConfig.DEFAULT_NOTIFICATION_SHOW_DURATION,
      0
    );

    eventsManager.emitEvent(EGameEvent.SURGE_SKIPPED, true);

    expect(notificationManager.onSendGenericNotification).toHaveBeenCalledTimes(2);
    expect(notificationManager.onPlayPdaNotificationSound).toHaveBeenCalledTimes(2);
  });

  it("should correctly send task notifications", () => {
    const notificationManager: NotificationManager = getManager(NotificationManager);

    notificationManager.onPlayPdaNotificationSound = jest.fn();
    notificationManager.onSendGenericNotification = jest.fn();
    notificationManager.sendTaskNotification(ETaskState.NEW, mockCGameTask());

    expect(notificationManager.onPlayPdaNotificationSound).toHaveBeenCalledTimes(1);
    expect(notificationManager.onSendGenericNotification).toHaveBeenCalledWith(
      true,
      "translated_general_new_task",
      "translated_test_title.",
      "test_icon",
      0,
      notificationsConfig.QUEST_NOTIFICATION_SHOW_DURATION
    );

    notificationManager.onPlayPdaNotificationSound = jest.fn();
    notificationManager.onSendGenericNotification = jest.fn();
    notificationManager.sendTaskNotification(ETaskState.UPDATED, mockCGameTask({ title: "example", iconName: "icon" }));

    expect(notificationManager.onPlayPdaNotificationSound).toHaveBeenCalledTimes(1);
    expect(notificationManager.onSendGenericNotification).toHaveBeenCalledWith(
      true,
      "translated_general_update_task",
      "translated_example.",
      "icon",
      0,
      notificationsConfig.DEFAULT_NOTIFICATION_SHOW_DURATION
    );
  });

  it("should correctly send generic tips", () => {
    const notificationManager: NotificationManager = getManager(NotificationManager);
    const sender: GameObject = MockGameObject.mock();

    registerObject(sender);

    notificationManager.onPlayPdaNotificationSound = jest.fn();
    notificationManager.onSendGenericNotification = jest.fn();
    notificationManager.sendTipNotification("test_simple");

    expect(notificationManager.onPlayPdaNotificationSound).toHaveBeenCalledTimes(1);
    expect(notificationManager.onSendGenericNotification).toHaveBeenCalledWith(
      false,
      "translated_st_tip",
      "translated_test_simple",
      "ui_iconsTotal_grouping",
      0,
      notificationsConfig.DEFAULT_NOTIFICATION_SHOW_DURATION,
      0
    );

    notificationManager.onPlayPdaNotificationSound = jest.fn();
    notificationManager.onSendGenericNotification = jest.fn();
    notificationManager.sendTipNotification("test_simple", "ui_inGame2_PD_storonnik_ravnovesiya", 200, 555, "test");

    expect(notificationManager.onPlayPdaNotificationSound).toHaveBeenCalledTimes(1);
    expect(notificationManager.onSendGenericNotification).toHaveBeenCalledWith(
      false,
      "translated_st_tip",
      "translated_test_simple",
      "ui_inGame2_PD_storonnik_ravnovesiya",
      200,
      555,
      0
    );

    notificationManager.onPlayPdaNotificationSound = jest.fn();
    notificationManager.onSendGenericNotification = jest.fn();
    notificationManager.sendTipNotification("test_simple", "can_resupply", 200, 555, "test");

    expect(notificationManager.onPlayPdaNotificationSound).toHaveBeenCalledTimes(1);
    expect(notificationManager.onSendGenericNotification).toHaveBeenCalledWith(
      false,
      "translated_st_tip",
      "translated_test_simple",
      "ui_inGame2_Pered_zadaniyami_voennih",
      200,
      555,
      0
    );

    registerStoryLink(sender.id(), "test-sid");

    MockAlifeSimulator.addToRegistry(MockAlifeHumanStalker.mock({ id: sender.id(), online: true, alive: true }));

    notificationManager.onPlayPdaNotificationSound = jest.fn();
    notificationManager.onSendGenericNotification = jest.fn();
    notificationManager.sendTipNotification("another", null, 1024, 50, "test-sid");

    expect(notificationManager.onPlayPdaNotificationSound).toHaveBeenCalledTimes(1);
    expect(notificationManager.onSendGenericNotification).toHaveBeenCalledWith(
      false,
      "translated_st_tip",
      "translated_another",
      "ui_iconsTotal_grouping",
      1024,
      50,
      0
    );

    // No sending for not alive objects.
    MockAlifeHumanStalker.mock({ id: sender.id(), online: true, alive: false });

    notificationManager.onPlayPdaNotificationSound = jest.fn();
    notificationManager.onSendGenericNotification = jest.fn();
    notificationManager.sendTipNotification("another", null, 1024, 50, "test-sid");

    expect(notificationManager.onPlayPdaNotificationSound).toHaveBeenCalledTimes(0);
    expect(notificationManager.onSendGenericNotification).toHaveBeenCalledTimes(0);

    // No sending for heavy wounded objects.
    MockAlifeSimulator.addToRegistry(MockAlifeHumanStalker.mock({ id: sender.id(), online: true, alive: true }));

    registry.objects.get(sender.id()).wounded = {
      woundController: {
        woundState: "heavy",
      },
    } as ISchemeWoundedState;

    notificationManager.sendTipNotification("another", null, 1024, 50, "test-sid");

    expect(notificationManager.onPlayPdaNotificationSound).toHaveBeenCalledTimes(0);
    expect(notificationManager.onSendGenericNotification).toHaveBeenCalledTimes(0);
  });

  it("should send tips of senders that are not in the game without looking them up", () => {
    const notificationManager: NotificationManager = getManager(NotificationManager);

    notificationManager.onPlayPdaNotificationSound = jest.fn();
    notificationManager.onSendGenericNotification = jest.fn();
    jest.spyOn(registry.simulator, "object");

    notificationManager.sendTipNotification("test_simple", null, 0, 0, "not_registered_sid");

    expect(registry.simulator.object).not.toHaveBeenCalled();
    expect(notificationManager.onSendGenericNotification).toHaveBeenCalledTimes(1);
  });

  it("should not send sound notifications for sounds without a speaker faction", () => {
    const notificationManager: NotificationManager = getManager(NotificationManager);

    notificationManager.onSendGenericNotification = jest.fn();
    notificationManager.sendSoundNotification(null, null, "test_point", "characters_voice\\human_02\\military\\attack");

    expect(notificationManager.onSendGenericNotification).not.toHaveBeenCalled();
  });

  it("should correctly send sound notifications", () => {
    const notificationManager: NotificationManager = getManager(NotificationManager);

    notificationManager.onPlayPdaNotificationSound = jest.fn();
    notificationManager.onSendGenericNotification = jest.fn();
    notificationManager.sendSoundNotification(
      null,
      "test",
      "test_point",
      "characters_voice\\human_02\\military\\attack"
    );

    expect(notificationManager.onSendGenericNotification).toHaveBeenCalledWith(
      false,
      "translated_st_tip translated_test. translated_test_point:",
      "translated_military_attack",
      "ui_iconsTotal_grouping",
      1000,
      notificationsConfig.DEFAULT_NOTIFICATION_SHOW_DURATION,
      1
    );

    notificationManager.onSendGenericNotification = jest.fn();
    notificationManager.sendSoundNotification(registry.actor, "test", "test_point", "test_path", "test_caption", 500);

    expect(notificationManager.onSendGenericNotification).toHaveBeenCalledWith(
      false,
      "translated_st_tip translated_test. translated_test_point:",
      "translated_test_caption",
      "ui_iconsTotal_grouping",
      1500,
      notificationsConfig.DEFAULT_NOTIFICATION_SHOW_DURATION,
      1
    );

    expect(notificationManager.onPlayPdaNotificationSound).toHaveBeenCalledTimes(0);
  });

  it("should correctly play PDA notification sounds", () => {
    const notificationSound: AbstractPlayableSound = soundsConfig.themes.get("pda_task");

    expect(notificationSound).toBeDefined();
    expect(notificationSound).toBeInstanceOf(ActorSound);

    const notificationManager: NotificationManager = getManager(NotificationManager);

    notificationManager.onPlayPdaNotificationSound();

    expect((notificationSound as ActorSound).soundObject?.play_at_pos).toHaveBeenCalledTimes(1);
    expect((notificationSound as ActorSound).soundObject?.play_at_pos).toHaveBeenCalledWith(
      registry.actor,
      MockVector.create(),
      0,
      undefined
    );
  });

  it("should correctly send flexible notifications based on config and dialog state", () => {
    const notificationManager: NotificationManager = getManager(NotificationManager);

    // Flexible + not talking.
    jest.spyOn(registry.actor, "is_talking").mockImplementation(() => false);

    notificationManager.onSendGenericNotification(true, "test-title", "test-text", "test-icon", 10, 2000, 3);

    expect(registry.actor.give_game_news).toHaveBeenCalledWith("test-title", "test-text", "test-icon", 10, 2000, 3);
    expect(registry.actor.give_talk_message2).toHaveBeenCalledTimes(0);

    resetFunctionMock(registry.actor.give_game_news);

    // Flexible + talking.
    jest.spyOn(registry.actor, "is_talking").mockImplementation(() => true);

    notificationManager.onSendGenericNotification(true, "test-title", "test-text", "test-icon", 10, 2000, 3);

    expect(registry.actor.give_game_news).toHaveBeenCalledTimes(0);
    expect(registry.actor.give_talk_message2).toHaveBeenCalledWith(
      "test-title",
      "test-text",
      "test-icon",
      "iconed_answer_item"
    );

    resetFunctionMock(registry.actor.give_talk_message2);

    jest.spyOn(registry.actor, "is_talking").mockImplementation(() => true);

    notificationManager.onSendGenericNotification(false, "test-title", "test-text", "test-icon", 10, 2000, 3);

    expect(registry.actor.give_game_news).toHaveBeenCalledWith("test-title", "test-text", "test-icon", 10, 2000, 3);
    expect(registry.actor.give_talk_message2).toHaveBeenCalledTimes(0);

    resetFunctionMock(registry.actor.give_game_news);
  });

  it("should correctly handle debug dump event", () => {
    const manager: NotificationManager = getManager(NotificationManager);
    const data: AnyObject = {};

    EventsManager.emitEvent(EGameEvent.DUMP_LUA_DATA, data);

    expect(data).toEqual({ NotificationManager: expect.any(Object) });
    expect(manager.onDebugDump({})).toEqual({ NotificationManager: expect.any(Object) });
  });
});
