import { cast_planner, CTime, relation_registry, time_global } from "xray16";
import { ActionPlanner, GameObject } from "xray16/alias";
import { gameTimeToString, NIL, Nillable, TLabel, TName, TNumberId, toJSON } from "xray16/lib";
import { $filename, $isNotNil } from "xray16/macros";

import { stalkerCommunities, TCommunity } from "@/engine/constants/communities";
import { EActionId } from "@/engine/core/ai/planner/types";
import { StalkerStateController } from "@/engine/core/ai/state";
import { IRegistryObjectState, registry } from "@/engine/core/database";
import { getActiveSchemeState } from "@/engine/core/schemes/state";
import { LuaLogger } from "@/engine/core/utils/logging";
import { getNumberRelationBetweenCommunities } from "@/engine/core/utils/relation";
import { getObjectActiveWeaponSlot } from "@/engine/core/utils/weapon";

const logger: LuaLogger = new LuaLogger($filename);

/**
 * Debug object inventory items.
 *
 * @param object - Game object.
 */
export function logObjectInventoryItems(object: GameObject): void {
  logger.pushSeparator();
  logger.info("Print object inventory report: %s", object.name());

  logger.info("Best weapon: %s", object.best_weapon()?.name());
  logger.info("Best item: %s", object.best_item()?.name());

  object.iterate_inventory((owner, item) => {
    logger.info("*: %s %s", item.section(), item.id());
  }, object);

  logger.pushSeparator();
}

/**
 * Debug action planner state.
 *
 * @param object - Game object.
 */
export function logObjectPlannerState(object: GameObject): void {
  logger.pushSeparator();
  logger.info("Print object planner state report: %s", object.name());

  const plannerShowPrefix: TLabel = `[${time_global()}][${$filename}] [${object.name()}]`;
  const actionPlanner: Nillable<ActionPlanner> = object.motivation_action_manager();

  if (!actionPlanner) {
    return logger.info("Object does not have action planner, `nil` received");
  }

  const currentActionId: Nillable<TNumberId> = actionPlanner.current_action_id();

  logger.info("Current best enemy: %s", object.best_enemy()?.name());
  logger.info("Current best danger: %s", object.best_danger()?.object()?.name());
  logger.info("Current planner initialized: %s", actionPlanner.initialized());
  logger.info("Current planner action id: %s", currentActionId);

  // Detect specifically which action is played.
  if (
    currentActionId === EActionId.ALIFE ||
    currentActionId === EActionId.COMBAT ||
    currentActionId === EActionId.ANOMALY
  ) {
    logger.info(
      "Current action id: %s -> %s",
      currentActionId,
      cast_planner(actionPlanner.action(currentActionId)).current_action_id()
    );
  }

  if ($isNotNil(actionPlanner.show)) {
    actionPlanner.show(plannerShowPrefix);
  } else {
    logger.info("For more details run game in mixed/debug mode");
  }

  logger.pushSeparator();

  // Check state controller planner if it exists for the object.
  if (registry.objects.get(object.id())?.stateController) {
    logger.info("Print object state planner report: %s", object.name());

    const state: IRegistryObjectState = registry.objects.get(object.id());
    const actionPlanner: ActionPlanner = state.stateController!.planner;
    const currentActionId: Nillable<TNumberId> = actionPlanner.current_action_id();

    logger.info("Current state planner initialized: %s", actionPlanner.initialized());
    logger.info("Current state action id: %s", currentActionId);

    if ($isNotNil(actionPlanner.show)) {
      actionPlanner.show(plannerShowPrefix + "[planner] ");
    } else {
      logger.info("For more state details run game in mixed/debug mode");
    }

    logger.pushSeparator();
  }
}

/**
 * Details about state management of the object.
 *
 * @param object - Game object.
 */
export function logObjectStateController(object: GameObject): void {
  logger.pushSeparator();
  logger.info("Print object state controller report: %s", object.name());

  if (registry.objects.get(object.id())?.stateController) {
    const stateController: StalkerStateController = registry.objects.get(object.id()).stateController!;

    logger.info("Active animation type: %s", stateController.activeAnimationType);
    logger.info("Target state: %s", stateController.targetState);
    logger.info(
      "Look object: %s",
      stateController.lookObjectId ? registry.simulator.object(stateController.lookObjectId)?.name() || NIL : NIL
    );
    logger.info("Look type: %s", stateController.getObjectLookPositionType());
    logger.info("Current animation slot: %s", getObjectActiveWeaponSlot(object));
    logger.info("Callback object: %s", toJSON(stateController.callback));
    logger.info("Is combat: %s", stateController.isCombat);
    logger.info("Is alife: %s", stateController.isAlife);
    logger.info("Animation states: %s", toJSON(stateController.animationController.state));
    logger.info(
      "Animation controller animation: %s",
      toJSON(
        stateController.animationController.animations.get(
          stateController.animationController.state.currentState as TName
        )
      )
    );
    logger.info("Animstate states: %s", toJSON(stateController.animstateController.state));
    logger.info(
      "Animstate controller animation: %s",
      toJSON(
        stateController.animstateController.animations.get(
          stateController.animstateController.state.currentState as TName
        )
      )
    );
  } else {
    logger.info("No state controller declared for object");
  }

  logger.pushSeparator();
}

/**
 * Details about state management of the object.
 *
 * @param object - Game object.
 */
export function logObjectRelations(object: GameObject): void {
  logger.pushSeparator();
  logger.info("Print object relations report: %s", object.name());

  logger.info("Object community: %s", object.character_community());
  logger.info(
    "Object goodwill to actor: %s",
    relation_registry.community_relation(object.character_community(), registry.actor.character_community())
  );
  logger.info(
    "Object community to actor: %s",
    getNumberRelationBetweenCommunities(
      object.character_community() as TCommunity,
      registry.actor.character_community() as TCommunity
    )
  );
  logger.info(
    "Actor community to object: %s",
    getNumberRelationBetweenCommunities(
      registry.actor.character_community() as TCommunity,
      object.character_community() as TCommunity
    )
  );

  Object.values(stalkerCommunities).forEach((it) => {
    logger.info(
      "Community to object: %s %s",
      it,
      getNumberRelationBetweenCommunities(it, object.character_community() as TCommunity)
    );
    logger.info(
      "Object to community: %s %s",
      it,
      getNumberRelationBetweenCommunities(object.character_community() as TCommunity, it)
    );
  });

  logger.pushSeparator();
}

/**
 * Log object scheme state for easier debug.
 *
 * @param object - Game object.
 */
export function logObjectState(object: GameObject): void {
  logger.pushSeparator();
  logger.info("Print object state report: %s %s %s", object.name(), object.id(), object.section());

  const state: IRegistryObjectState = registry.objects.get(object.id());

  logger.info("Object section: %s", object.section());
  logger.info("Ini file name: %s", state.iniFilename);
  logger.info("Section logic: %s", state.sectionLogic);
  logger.info("Scheme type: %s", state.schemeType);
  logger.info("Active scheme: %s", state.activeScheme);
  logger.info("Active section: %s", state.activeSection);
  logger.info("Smart terrain name: %s", state.smartTerrainName);
  logger.info("Activation time: %s", state.activationTime);
  logger.info(
    "Activation game time: %s",
    (state.activationGameTime as Nillable<CTime>) ? gameTimeToString(state.activationGameTime) : NIL
  );
  logger.info("Portable store: %s", toJSON(state.portableStore));
  logger.info("State overrides: %s", toJSON(state.overrides));
  logger.info("Enemy id: %s", state.enemyId);
  logger.info("Enemy name: %s", state.enemyId ? registry.simulator.object(state.enemyId)?.name() : NIL);
  logger.info("Script combat type: %s", tostring(state.scriptCombatType));
  logger.info("Registered camp: %s", state.camp || "none");

  logger.pushSeparator();

  logger.info("State of scheme: %s", toJSON(getActiveSchemeState(state), "\n", 0, 4));

  logger.pushSeparator();
}
