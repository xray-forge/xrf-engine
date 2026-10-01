import { ServerObject } from "xray16/alias";
import { isInTimeInterval, TName } from "xray16/lib";
import { $fromObject, $isNotNil } from "xray16/macros";

import { communities, TCommunity } from "@/engine/constants/communities";
import { infoPortions } from "@/engine/constants/info_portions";
import { smartTerrainNames } from "@/engine/constants/smart_terrain_names";
import { registry } from "@/engine/core/database";
import {
  simulationPreconditionAlways,
  simulationPreconditionDay,
  simulationPreconditionLateNight,
  simulationPreconditionNear,
  simulationPreconditionNearAndDay,
  simulationPreconditionNearAndNight,
  simulationPreconditionNearDayFight,
  simulationPreconditionNight,
  simulationPreconditionNotSurge,
  simulationPreconditionSurge,
} from "@/engine/core/managers/simulation/activity/simulation_preconditions";
import { ESimulationRole, ISimulationActivityDescriptor } from "@/engine/core/managers/simulation/types";
import { surgeConfig } from "@/engine/core/managers/surge/SurgeConfig";
import { Squad } from "@/engine/core/objects/squad/Squad";
import { hasInfoPortion } from "@/engine/core/utils/info_portion";
import { isAnySquadMemberEnemyToActor } from "@/engine/core/utils/relation";

/**
 * Descriptor of faction activities based on simulation role.
 */
export const simulationActivities: LuaTable<TCommunity, ISimulationActivityDescriptor> = $fromObject({
  [communities.none]: {
    [ESimulationRole.SQUAD]: null,
    [ESimulationRole.SMART_TERRAIN]: null,
    [ESimulationRole.ACTOR]: null,
  },
  [communities.stalker]: {
    [ESimulationRole.ACTOR]: null,
    [ESimulationRole.SMART_TERRAIN]: {
      base: (squad: Squad, target: ServerObject) => {
        return (
          isInTimeInterval(18, 8) &&
          !surgeConfig.IS_STARTED &&
          !isAnySquadMemberEnemyToActor(squad) &&
          $isNotNil(registry.baseSmartTerrains.get(target.name()))
        );
      },
      surge: simulationPreconditionSurge,
      territory: () => isInTimeInterval(8, 18) && !surgeConfig.IS_STARTED,
      resource: () => isInTimeInterval(8, 18) && !surgeConfig.IS_STARTED,
    },
    [ESimulationRole.SQUAD]: null,
  },
  [communities.bandit]: {
    [ESimulationRole.SQUAD]: {
      stalker: (squad: Squad, target: ServerObject) =>
        isInTimeInterval(8, 21) && !surgeConfig.IS_STARTED && simulationPreconditionNear(squad, target),
    },
    [ESimulationRole.SMART_TERRAIN]: {
      base: (squad: Squad, target: ServerObject) => {
        const terrainName: TName = target.name();

        return (
          isInTimeInterval(21, 8) &&
          !surgeConfig.IS_STARTED &&
          !isAnySquadMemberEnemyToActor(squad) &&
          (terrainName === smartTerrainNames.zat_stalker_base_smart ||
            terrainName === smartTerrainNames.jup_a10_smart_terrain)
        );
      },
      territory: () => isInTimeInterval(8, 21) && !surgeConfig.IS_STARTED,
      surge: simulationPreconditionSurge,
      resource: null,
    },
    [ESimulationRole.ACTOR]: (squad: Squad, target: ServerObject) =>
      hasInfoPortion(infoPortions.sim_bandit_attack_harder) && simulationPreconditionNear(squad, target),
  },
  [communities.dolg]: {
    [ESimulationRole.SQUAD]: {
      freedom: simulationPreconditionNearDayFight,
      monster_predatory_day: simulationPreconditionNearDayFight,
      monster_predatory_night: simulationPreconditionNearDayFight,
      monster_vegetarian: simulationPreconditionNearDayFight,
      monster_zombied_day: simulationPreconditionNearDayFight,
      monster_special: simulationPreconditionNearDayFight,
    },
    [ESimulationRole.SMART_TERRAIN]: {
      base: (squad: Squad, target: ServerObject) =>
        isInTimeInterval(19, 8) &&
        !surgeConfig.IS_STARTED &&
        !isAnySquadMemberEnemyToActor(squad) &&
        (target.name() === smartTerrainNames.zat_stalker_base_smart ||
          target.name() === smartTerrainNames.jup_a6 ||
          target.name() === smartTerrainNames.pri_a16),
      territory: () => isInTimeInterval(8, 19) && !surgeConfig.IS_STARTED,
      surge: simulationPreconditionSurge,
      resource: null,
    },
    [ESimulationRole.ACTOR]: null,
  },
  [communities.freedom]: {
    [ESimulationRole.SQUAD]: {
      dolg: simulationPreconditionNearDayFight,
    },
    [ESimulationRole.SMART_TERRAIN]: {
      base: (squad: Squad, target: ServerObject) =>
        isInTimeInterval(19, 8) &&
        !surgeConfig.IS_STARTED &&
        !isAnySquadMemberEnemyToActor(squad) &&
        (target.name() === smartTerrainNames.zat_stalker_base_smart ||
          target.name() === smartTerrainNames.jup_a6 ||
          target.name() === smartTerrainNames.pri_a16),
      territory: () => isInTimeInterval(8, 19) && !surgeConfig.IS_STARTED,
      surge: simulationPreconditionSurge,
      resource: null,
    },
    [ESimulationRole.ACTOR]: null,
  },
  [communities.killer]: {
    [ESimulationRole.SQUAD]: null,
    [ESimulationRole.SMART_TERRAIN]: {
      territory: simulationPreconditionNotSurge,
      base: null,
      resource: null,
      surge: simulationPreconditionSurge,
    },
    [ESimulationRole.ACTOR]: simulationPreconditionNear,
  },
  [communities.zombied]: {
    [ESimulationRole.SQUAD]: null,
    [ESimulationRole.SMART_TERRAIN]: {
      territory: simulationPreconditionAlways,
      lair: simulationPreconditionAlways,
      resource: null,
      base: null,
    },
    [ESimulationRole.ACTOR]: null,
  },
  [communities.monster_predatory_day]: {
    [ESimulationRole.SQUAD]: {
      monster_vegetarian: simulationPreconditionDay,
      stalker: simulationPreconditionNearAndDay,
      bandit: simulationPreconditionNearAndDay,
      dolg: simulationPreconditionNearAndDay,
      freedom: simulationPreconditionNearAndDay,
      killer: simulationPreconditionNearAndDay,
    },
    [ESimulationRole.SMART_TERRAIN]: {
      territory: simulationPreconditionDay,
      lair: simulationPreconditionNight,
      base: null,
      resource: null,
    },
    [ESimulationRole.ACTOR]: simulationPreconditionNearAndDay,
  },
  [communities.monster_predatory_night]: {
    [ESimulationRole.SQUAD]: {
      monster_vegetarian: simulationPreconditionLateNight,
      stalker: simulationPreconditionNearAndNight,
      bandit: simulationPreconditionNearAndNight,
      dolg: simulationPreconditionNearAndNight,
      freedom: simulationPreconditionNearAndNight,
      killer: simulationPreconditionNearAndNight,
    },
    [ESimulationRole.SMART_TERRAIN]: {
      territory: simulationPreconditionNight,
      lair: simulationPreconditionDay,
      base: null,
      resource: null,
    },
    [ESimulationRole.ACTOR]: simulationPreconditionNearAndNight,
  },
  [communities.monster_vegetarian]: {
    [ESimulationRole.SQUAD]: null,
    [ESimulationRole.SMART_TERRAIN]: {
      lair: simulationPreconditionAlways,
      base: null,
      resource: null,
    },
    [ESimulationRole.ACTOR]: simulationPreconditionNearAndDay,
  },
  [communities.monster_zombied_day]: {
    [ESimulationRole.SQUAD]: {
      stalker: simulationPreconditionNearAndDay,
      bandit: simulationPreconditionNearAndDay,
      dolg: simulationPreconditionNearAndDay,
      freedom: simulationPreconditionNearAndDay,
      killer: simulationPreconditionNearAndDay,
    },
    [ESimulationRole.SMART_TERRAIN]: {
      territory: simulationPreconditionNotSurge,
      lair: simulationPreconditionNight,
      base: null,
      resource: null,
    },
    [ESimulationRole.ACTOR]: simulationPreconditionNearAndDay,
  },
  [communities.monster_zombied_night]: {
    [ESimulationRole.SQUAD]: {
      stalker: simulationPreconditionNearAndNight,
      bandit: simulationPreconditionNearAndNight,
      dolg: simulationPreconditionNearAndNight,
      freedom: simulationPreconditionNearAndNight,
      killer: simulationPreconditionNearAndNight,
    },
    [ESimulationRole.SMART_TERRAIN]: {
      territory: simulationPreconditionNight,
      lair: simulationPreconditionDay,
      base: null,
      resource: null,
    },
    [ESimulationRole.ACTOR]: simulationPreconditionNearAndNight,
  },
  [communities.monster_special]: {
    [ESimulationRole.SQUAD]: null,
    [ESimulationRole.SMART_TERRAIN]: { lair: simulationPreconditionAlways, base: null, resource: null },
    [ESimulationRole.ACTOR]: null,
  },
  [communities.monster]: {
    [ESimulationRole.SQUAD]: null,
    [ESimulationRole.SMART_TERRAIN]: { lair: simulationPreconditionAlways, base: null, resource: null },
    [ESimulationRole.ACTOR]: null,
  },
  [communities.army]: {
    [ESimulationRole.SQUAD]: null,
    [ESimulationRole.SMART_TERRAIN]: {
      base: () => isInTimeInterval(18, 8) && !surgeConfig.IS_STARTED,
      surge: simulationPreconditionSurge,
      territory: () => isInTimeInterval(8, 18) && !surgeConfig.IS_STARTED,
      resource: () => isInTimeInterval(8, 18) && !surgeConfig.IS_STARTED,
    },
    [ESimulationRole.ACTOR]: null,
  },
  [communities.ecolog]: {
    [ESimulationRole.SQUAD]: null,
    [ESimulationRole.SMART_TERRAIN]: {
      base: () => isInTimeInterval(18, 8) && !surgeConfig.IS_STARTED,
      surge: simulationPreconditionSurge,
      territory: () => isInTimeInterval(8, 18) && !surgeConfig.IS_STARTED,
      resource: () => isInTimeInterval(8, 18) && !surgeConfig.IS_STARTED,
    },
    [ESimulationRole.ACTOR]: null,
  },
  [communities.monolith]: {
    [ESimulationRole.SQUAD]: null,
    [ESimulationRole.SMART_TERRAIN]: {
      base: () => isInTimeInterval(18, 8) && !surgeConfig.IS_STARTED,
      surge: simulationPreconditionSurge,
      territory: () => isInTimeInterval(8, 18) && !surgeConfig.IS_STARTED,
      resource: () => isInTimeInterval(8, 18) && !surgeConfig.IS_STARTED,
    },
    [ESimulationRole.ACTOR]: null,
  },
}) as LuaTable<TCommunity, ISimulationActivityDescriptor>;
