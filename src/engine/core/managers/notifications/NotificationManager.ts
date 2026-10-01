import { clsid, game } from "xray16";
import { AlifeSimulator, GameObject, GameTask } from "xray16/alias";
import {
  abort,
  ACTOR_ID,
  AnyObject,
  assert,
  Nillable,
  TCount,
  TDuration,
  TLabel,
  TName,
  TNumberId,
  TPath,
  TSection,
  TStringId,
} from "xray16/lib";
import { $filename, $isNil, $isNotNil } from "xray16/macros";

import { getManager, getObjectIdByStoryId, registry } from "@/engine/core/database";
import { AbstractManager } from "@/engine/core/managers/abstract";
import { EGameEvent, EventsManager } from "@/engine/core/managers/events";
import {
  notificationsIcons,
  TNotificationIcon,
  TNotificationIconKey,
} from "@/engine/core/managers/notifications/notifications_icons";
import {
  ENotificationDirection,
  ENotificationType,
  ETreasureState,
  IItemRelocatedNotification,
  IMoneyRelocatedNotification,
  INotification,
  ISoundNotification,
  ITaskUpdatedNotification,
  ITipNotification,
  ITreasureNotification,
} from "@/engine/core/managers/notifications/notifications_types";
import { notificationsConfig } from "@/engine/core/managers/notifications/NotificationsConfig";
import { ISmartTerrainDescriptor } from "@/engine/core/managers/simulation/types";
import { getSimulationTerrainDescriptorById } from "@/engine/core/managers/simulation/utils";
import { SoundManager } from "@/engine/core/managers/sounds/SoundManager";
import { ETaskState } from "@/engine/core/managers/tasks/types";
import { Stalker } from "@/engine/core/objects/creature/Stalker";
import { getSmartTerrainNameCaption } from "@/engine/core/objects/smart_terrain/utils";
import { getInventoryNameForItemSectionSafely } from "@/engine/core/utils/caption";
import { LuaLogger } from "@/engine/core/utils/logging";
import { isObjectWounded } from "@/engine/core/utils/planner";

const logger: LuaLogger = new LuaLogger($filename);

/**
 * Manager for processing of notifications on different game events.
 * Display information about new treasures, quests or items/money operations.
 *
 * Other code sends notifications by emitting `EGameEvent.NOTIFICATION`, without importing this manager.
 */
export class NotificationManager extends AbstractManager {
  public override initialize(): void {
    const eventsManager: EventsManager = getManager(EventsManager);

    eventsManager.registerCallback(EGameEvent.DUMP_LUA_DATA, this.onDebugDump, this);
    eventsManager.registerCallback(EGameEvent.SURGE_SKIPPED, this.onSurgeSkipped, this);
    eventsManager.registerCallback(EGameEvent.NOTIFICATION, this.sendNotification, this);
  }

  public override destroy(): void {
    const eventsManager: EventsManager = getManager(EventsManager);

    eventsManager.unregisterCallback(EGameEvent.DUMP_LUA_DATA, this.onDebugDump);
    eventsManager.unregisterCallback(EGameEvent.SURGE_SKIPPED, this.onSurgeSkipped);
    eventsManager.unregisterCallback(EGameEvent.NOTIFICATION, this.sendNotification);
  }

  /**
   * Handle generic notification event.
   */
  public sendNotification(notification: INotification): void {
    assert(type(notification) === "table", "Expected notification event to be an object.");

    switch (notification.type) {
      case ENotificationType.ITEM: {
        const { direction, itemSection, amount } = notification as IItemRelocatedNotification;

        return this.sendItemRelocatedNotification(direction, itemSection, amount);
      }

      case ENotificationType.MONEY: {
        const { direction, amount } = notification as IMoneyRelocatedNotification;

        return this.sendMoneyRelocatedNotification(direction, amount);
      }

      case ENotificationType.TIP: {
        const { caption, delay, sender, showtime, senderId } = notification as ITipNotification;

        return this.sendTipNotification(caption, sender, delay, showtime, senderId);
      }

      case ENotificationType.SOUND: {
        const { object = null, faction, point, soundPath, soundCaption, delay } = notification as ISoundNotification;

        return this.sendSoundNotification(object, faction, point, soundPath, soundCaption, delay);
      }

      case ENotificationType.TREASURE: {
        const { state } = notification as ITreasureNotification;

        return this.sendTreasureNotification(state);
      }

      case ENotificationType.TASK: {
        const { state, task } = notification as ITaskUpdatedNotification;

        return this.sendTaskNotification(state, task);
      }

      default:
        abort("Expected valid event type, '%s' received for notification.", notification.type);
    }
  }

  /**
   * Send notification with information about actor money transfer.
   */
  public sendMoneyRelocatedNotification(direction: ENotificationDirection, amount: TCount): void {
    logger.info("Show relocate money message: %s %s", direction, amount);

    const notificationTitle: TLabel = game.translate_string(
      direction === ENotificationDirection.IN ? "general_in_money" : "general_out_money"
    );
    const notificationText: TLabel = tostring(amount);
    const notificationIcon: TName =
      direction === ENotificationDirection.IN ? notificationsIcons.money_received : notificationsIcons.money_given;

    this.onSendGenericNotification(
      true,
      notificationTitle,
      notificationText,
      notificationIcon,
      0,
      notificationsConfig.DEFAULT_NOTIFICATION_SHOW_DURATION
    );
  }

  /**
   * Show notification in game UI or in dialog window if actor is talking.
   */
  public sendItemRelocatedNotification(
    direction: ENotificationDirection,
    itemSection: TSection,
    amount: TCount = 1
  ): void {
    logger.info("Show relocate item message: %s %s %s", direction, itemSection, amount);

    const notificationTitle: TLabel = game.translate_string(
      direction === ENotificationDirection.IN ? "general_in_item" : "general_out_item"
    );
    const notificationText: TLabel = string.format(
      "%s%s",
      getInventoryNameForItemSectionSafely(itemSection),
      amount === 1 ? "" : " x" + amount
    );
    const notificationIcon: TName =
      direction === ENotificationDirection.IN ? notificationsIcons.item_received : notificationsIcons.item_given;

    this.onSendGenericNotification(
      true,
      notificationTitle,
      notificationText,
      notificationIcon,
      0,
      notificationsConfig.DEFAULT_NOTIFICATION_SHOW_DURATION
    );
  }

  /**
   * Show notifications related to treasures state updates.
   */
  public sendTreasureNotification(state: ETreasureState): void {
    logger.info("Show treasure notification: %s", state);

    let notificationTitle: TLabel = "";

    if (state === ETreasureState.NEW_TREASURE_COORDINATES) {
      notificationTitle = game.translate_string("st_found_new_treasure");
    } else if (state === ETreasureState.FOUND_TREASURE) {
      notificationTitle = game.translate_string("st_got_treasure");
    } else if (state === ETreasureState.LOOTED_TREASURE_COORDINATES) {
      notificationTitle = game.translate_string("st_found_old_treasure");
    }

    this.onSendGenericNotification(
      true,
      notificationTitle,
      "",
      notificationsIcons.received_secret_coordinates,
      0,
      notificationsConfig.DEFAULT_NOTIFICATION_SHOW_DURATION
    );
  }

  /**
   * Send notification about task state update.
   */
  public sendTaskNotification(newState: ETaskState, task: GameTask): void {
    const notificationTaskDescription: Record<ETaskState, TLabel> = {
      [ETaskState.NEW]: "general_new_task",
      [ETaskState.COMPLETED]: "general_complete_task",
      [ETaskState.FAIL]: "general_fail_task",
      [ETaskState.REVERSED]: "general_reverse_task",
      [ETaskState.UPDATED]: "general_update_task",
    };

    const notificationTitle: TLabel = game.translate_string(notificationTaskDescription[newState]);
    const notificationDescription: string = game.translate_string(task.get_title()) + ".";
    const notificationIcon: TName = task.get_icon_name() ?? "ui_iconsTotal_storyline";
    const notificationDuration: TDuration =
      newState === ETaskState.UPDATED
        ? notificationsConfig.DEFAULT_NOTIFICATION_SHOW_DURATION
        : notificationsConfig.QUEST_NOTIFICATION_SHOW_DURATION;

    this.onPlayPdaNotificationSound();
    this.onSendGenericNotification(
      true,
      notificationTitle,
      notificationDescription,
      notificationIcon,
      0,
      notificationDuration
    );
  }

  /**
   * Send generic tip notification.
   */
  public sendTipNotification(
    caption: TLabel,
    sender: Nillable<TNotificationIcon | TNotificationIconKey | GameObject> = null,
    delay: Nillable<TDuration> = 0,
    showtime: Nillable<TDuration> = notificationsConfig.DEFAULT_NOTIFICATION_SHOW_DURATION,
    senderId: Nillable<TStringId> = null
  ): void {
    logger.info("Show tip notification: %s %s %s %s", caption, delay, showtime, senderId);

    // Verify whether sender can send notifications.
    // todo: Probably here check ID from sender object if it is provided?
    const senderObjectId: Nillable<TNumberId> = $isNotNil(senderId) ? getObjectIdByStoryId(senderId) : null;

    // A sender that does not exist in the game sends the tip as it is, as in vanilla `news_manager.send_tip`.
    if ($isNotNil(senderObjectId)) {
      const simulator: Nillable<AlifeSimulator> = registry.simulator;

      if ($isNotNil(simulator)) {
        const serverObject: Nillable<Stalker> = simulator.object<Stalker>(senderObjectId);

        if ($isNotNil(serverObject)) {
          // Check if sender is not wounded.
          if (serverObject.online && isObjectWounded(serverObject.id)) {
            return logger.info("Cannot send tip, object is wounded");
          }

          // Check if sender is alive.
          if (!serverObject.alive()) {
            return logger.info("Cannot send tip, object is not alive");
          }
        }
      }
    }

    const notificationTitle: TLabel = game.translate_string("st_tip");
    const notificationDescription: TLabel = game.translate_string(caption);
    let notificationIcon: TName = "ui_iconsTotal_grouping";

    // If sender is game object, check sender character icon to display instead of generic one.
    if (sender) {
      // In case of string check if it is name of icon (original schemas use it) or fallback to just string.
      if (type(sender) === "string") {
        notificationIcon = notificationsIcons[sender as TNotificationIconKey] || (sender as TNotificationIcon);
      } else {
        notificationIcon = (sender as GameObject).character_icon();
      }
    }

    this.onPlayPdaNotificationSound();
    this.onSendGenericNotification(
      false,
      notificationTitle,
      notificationDescription,
      notificationIcon,
      delay || 0,
      showtime || notificationsConfig.DEFAULT_NOTIFICATION_SHOW_DURATION,
      0
    );
  }

  /**
   * Send generic sound notification to replicate what characters say.
   */
  public sendSoundNotification(
    object: Nillable<GameObject>,
    faction: Nillable<TName>,
    point: Nillable<TName | TNumberId>,
    soundPath: TPath,
    soundCaption: Nillable<TLabel> = null,
    delay: TDuration = 0
  ): void {
    // logger.format("Send sound notification: %s %s %s %s", object?.name(), soundPath, soundCaption, faction);

    // Sounds without a speaker faction show no notification, as in vanilla `news_manager.send_sound`.
    if ($isNil(faction)) {
      return;
    }

    let pointName: TName = "";

    // Point is a smart terrain ID or a translatable label, which finds no terrain.
    if (point) {
      const terrainDescriptor: Nillable<ISmartTerrainDescriptor> = getSimulationTerrainDescriptorById(
        point as TNumberId
      );

      pointName = terrainDescriptor
        ? getSmartTerrainNameCaption(terrainDescriptor.terrain)
        : game.translate_string(point as TName);
    }

    let soundCaptionText: Nillable<TLabel> = soundCaption;

    if ($isNil(soundCaptionText)) {
      [soundCaptionText] = string.gsub(soundPath, "(characters_voice\\human_..\\)([^\\]*)", "%2");
      [soundCaptionText] = string.gsub(soundCaptionText, "[\\]([^\\]*)", "_%1");
    }

    const notificationTextTranslated: TLabel = game.translate_string(soundCaptionText);

    // Check if it is translated, do not show if translation is missing.
    if (notificationTextTranslated === soundCaptionText) {
      return;
    }

    let textureName: TName = "ui_iconsTotal_grouping";

    if (object && (object.clsid() === clsid.script_stalker || object.clsid() === clsid.stalker)) {
      textureName = object.character_icon();
    } else if (notificationsIcons[faction as TNotificationIconKey]) {
      textureName = notificationsIcons[faction as TNotificationIconKey];
    }

    const notificationTitle: TLabel = string.format(
      "%s %s%s:",
      game.translate_string("st_tip"),
      game.translate_string(faction),
      pointName === "" ? "" : ". " + pointName
    );

    this.onSendGenericNotification(
      false,
      notificationTitle,
      notificationTextTranslated,
      textureName,
      delay + 1000,
      notificationsConfig.DEFAULT_NOTIFICATION_SHOW_DURATION,
      1
    );
  }

  /**
   * Play default sound notification of PDA updates.
   */
  public onPlayPdaNotificationSound(): void {
    getManager(SoundManager).play(ACTOR_ID, "pda_task");
  }

  /**
   * On surge skip show notification.
   */
  public onSurgeSkipped(shouldNotify: boolean): void {
    if (shouldNotify) {
      this.sendTipNotification("st_surge_while_asleep", notificationsIcons.recent_surge);
    }
  }

  /**
   * Send flexible notification.
   * In case of generic UI just show notification element, in case of dialog show it as message in history.
   * Without `newsType`, the engine news type is its default one.
   */
  public onSendGenericNotification(
    isFlexible: boolean,
    notificationTitle: TLabel,
    notificationText: TLabel,
    notificationIcon: TName,
    delay: TDuration,
    showTime: TDuration,
    newsType: Nillable<TNumberId> = null
  ): void {
    logger.info("Send generic notification: '%s', '%s', '%s'", notificationTitle, notificationText, notificationIcon);

    if (isFlexible && registry.actor.is_talking()) {
      registry.actor.give_talk_message2(notificationTitle, notificationText, notificationIcon, "iconed_answer_item");
    } else {
      /**
       * Call correct method based on LUA binding signature.
       * Different methods are called based on different params count.
       */
      if ($isNil(newsType)) {
        registry.actor.give_game_news(notificationTitle, notificationText, notificationIcon, delay, showTime);
      } else {
        registry.actor.give_game_news(notificationTitle, notificationText, notificationIcon, delay, showTime, newsType);
      }
    }
  }

  /**
   * Handle dump data event.
   *
   * @param data - Data to dump into file.
   */
  public onDebugDump(data: AnyObject): AnyObject {
    data[this.constructor.name] = {
      notificationsConfig: notificationsConfig,
    };

    return data;
  }
}
