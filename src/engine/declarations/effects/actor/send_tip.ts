import { GameObject } from "xray16/alias";
import { assert, extern, TLabel, TStringId } from "xray16/lib";

import { EGameEvent, EventsManager } from "@/engine/core/managers/events";
import { TNotificationIcon } from "@/engine/core/managers/notifications";
import { ENotificationType, ITipNotification } from "@/engine/core/managers/notifications/notifications_types";

/**
 * Show tip in bottom left of game interface.
 */
extern(
  "xr_effects.send_tip",
  (_: GameObject, __: GameObject, [caption, icon, senderId]: [TLabel, TNotificationIcon, TStringId]): void => {
    assert(caption, "Expected caption to be provided for sent_tip effect.");

    EventsManager.emitEvent<ITipNotification>(EGameEvent.NOTIFICATION, {
      type: ENotificationType.TIP,
      caption,
      sender: icon,
      senderId,
    });
  }
);
