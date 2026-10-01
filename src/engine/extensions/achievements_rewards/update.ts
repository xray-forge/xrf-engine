import { game } from "xray16";
import { ServerObject } from "xray16/alias";
import { TNumberId } from "xray16/lib";

import { infoPortions } from "@/engine/constants/info_portions";
import { getObjectIdByStoryId, registry } from "@/engine/core/database";
import { EGameEvent, EventsManager } from "@/engine/core/managers/events";
import { ENotificationType, ITipNotification, notificationsIcons } from "@/engine/core/managers/notifications";
import { EAchievement } from "@/engine/core/utils/achievements";
import { hasInfoPortion } from "@/engine/core/utils/info_portion";
import { spawnItemsForObjectFromList } from "@/engine/core/utils/spawn";
import { achievementRewardsConfig } from "@/engine/extensions/achievements_rewards/AchievementRewardsConfig";

/**
 * Handle generic actor update tick.
 */
export function update(): void {
  if (hasInfoPortion(infoPortions.detective_achievement_gained)) {
    updateDetectiveAchievementRewardSpawn();
  }

  if (hasInfoPortion(infoPortions.mutant_hunter_achievement_gained)) {
    updateMutantHunterAchievementSpawn();
  }
}

/**
 * Handle generic update tick and verify detective achievement.
 */
export function updateDetectiveAchievementRewardSpawn(): void {
  if (!achievementRewardsConfig.LAST_DETECTIVE_ACHIEVEMENT_SPAWN_AT) {
    achievementRewardsConfig.LAST_DETECTIVE_ACHIEVEMENT_SPAWN_AT = game.get_game_time();
  }

  if (
    game.get_game_time().diffSec(achievementRewardsConfig.LAST_DETECTIVE_ACHIEVEMENT_SPAWN_AT) >
    achievementRewardsConfig.ACHIEVEMENT_REWARD_SPAWN_PERIOD
  ) {
    spawnItemsForObjectFromList(
      registry.simulator.object(
        getObjectIdByStoryId(achievementRewardsConfig.REWARD_BOXES.ZATON) as TNumberId
      ) as ServerObject,
      achievementRewardsConfig.REWARD_ITEMS[EAchievement.DETECTIVE],
      4
    );

    EventsManager.emitEvent<ITipNotification>(EGameEvent.NOTIFICATION, {
      type: ENotificationType.TIP,
      caption: "st_detective_news",
      sender: notificationsIcons.got_medicine,
    });

    achievementRewardsConfig.LAST_DETECTIVE_ACHIEVEMENT_SPAWN_AT = game.get_game_time();
  }
}

/**
 * Handle generic update tick and verify mutant achievement.
 */
export function updateMutantHunterAchievementSpawn(): void {
  if (!achievementRewardsConfig.LAST_MUTANT_HUNTER_ACHIEVEMENT_SPAWN_AT) {
    achievementRewardsConfig.LAST_MUTANT_HUNTER_ACHIEVEMENT_SPAWN_AT = game.get_game_time();
  }

  if (
    game.get_game_time().diffSec(achievementRewardsConfig.LAST_MUTANT_HUNTER_ACHIEVEMENT_SPAWN_AT) >
    achievementRewardsConfig.ACHIEVEMENT_REWARD_SPAWN_PERIOD
  ) {
    spawnItemsForObjectFromList(
      registry.simulator.object(
        getObjectIdByStoryId(achievementRewardsConfig.REWARD_BOXES.JUPITER) as TNumberId
      ) as ServerObject,
      achievementRewardsConfig.REWARD_ITEMS[EAchievement.MUTANT_HUNTER],
      5
    );

    EventsManager.emitEvent<ITipNotification>(EGameEvent.NOTIFICATION, {
      type: ENotificationType.TIP,
      caption: "st_mutant_hunter_news",
      sender: notificationsIcons.got_ammo,
    });

    achievementRewardsConfig.LAST_MUTANT_HUNTER_ACHIEVEMENT_SPAWN_AT = game.get_game_time();
  }
}
