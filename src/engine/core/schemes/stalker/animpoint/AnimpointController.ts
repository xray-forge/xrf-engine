import { level } from "xray16";
import { GameObject, Vector } from "xray16/alias";
import {
  angleToDirection,
  areSameVectors,
  assert,
  createVector,
  LuaArray,
  Nillable,
  TIndex,
  TName,
  TNumberId,
  TRate,
} from "xray16/lib";
import { $filename, $isNil, $isNotNil } from "xray16/macros";

import { campConfig, CampController, EObjectCampActivity } from "@/engine/core/ai/camp";
import {
  animpoint_predicates,
  animpointPredicateAlways,
} from "@/engine/core/animation/predicates/animpoint_predicates";
import { states } from "@/engine/core/animation/states";
import { EStalkerState, WEAPON_POSTFIX } from "@/engine/core/animation/types";
import { getCampZoneForPosition, registry } from "@/engine/core/database";
import { SmartCover } from "@/engine/core/objects/smart_cover";
import { AbstractSchemeController } from "@/engine/core/schemes/base";
import {
  IAnimpointActionDescriptor,
  ISchemeAnimpointState,
} from "@/engine/core/schemes/stalker/animpoint/animpoint_types";
import { LuaLogger } from "@/engine/core/utils/logging";

const logger: LuaLogger = new LuaLogger($filename);

/**
 * Controller of animpoint scheme when stalkers are captured by animation and follow some defined logic.
 * Specific animation state for some period of time.
 */
export class AnimpointController extends AbstractSchemeController<ISchemeAnimpointState> {
  public isStarted: boolean = false;
  public isDirectionReached: boolean = false;

  public currentAction: Nillable<EStalkerState> = null;
  public availableActions: Nillable<LuaArray<IAnimpointActionDescriptor>> = null;

  public campController: Nillable<CampController> = null;
  public coverName: Nillable<TName> = null;

  public position: Nillable<Vector> = null;
  public positionLevelVertexId: Nillable<TNumberId> = null;
  public vertexPosition: Nillable<Vector> = null;
  public smartCoverDirection: Nillable<Vector> = null;
  public lookPosition: Nillable<Vector> = null;

  public override activate(object: GameObject): void {
    logger.info("Activate animpoint scheme: %s", object.name());

    this.state.signals = new LuaTable();

    this.calculatePosition();

    if (this.isStarted) {
      if (!this.state.useCamp && !this.campController && this.coverName === this.state.coverName) {
        this.fillPossibleAnimationActions();

        const targetAction: EStalkerState = this.state.approvedActions.get(
          math.random(this.state.approvedActions.length())
        ).name;

        const currentStateAnimstate: Nillable<TName> = states.get(targetAction).animstate;
        const targetStateAnimstate: Nillable<TName> = states.get(this.currentAction as EStalkerState).animstate;

        if (currentStateAnimstate === targetStateAnimstate) {
          if (targetAction !== this.currentAction) {
            this.currentAction = table.random(this.state.approvedActions)[1].name;
          }

          return;
        }
      }

      this.stop();
    }
  }

  /**
   * Called from other places managing game animations.
   * Example: camp binder updates.
   */
  public update(): void {
    const actionsList: LuaArray<EStalkerState> = new LuaTable();
    const description: Nillable<EStalkerState> = this.state.description;

    if (!this.state.useCamp) {
      if (!this.state.availableAnimations) {
        assert(
          this.state.approvedActions,
          "animpoint not in camp and approvedActions is null. Name [%s]",
          this.state.coverName
        );

        for (const [, action] of this.state.approvedActions) {
          table.insert(actionsList, action.name);
        }
      } else {
        for (const [, state] of this.state.availableAnimations) {
          table.insert(actionsList, state);
        }
      }

      this.currentAction = table.random(actionsList)[1];

      return;
    }

    const [campAction, isDirector] = this.campController!.getObjectActivity(this.object.id());
    const campActionsList = isDirector
      ? campConfig.CAMP_ACTIVITY_ANIMATION.get(campAction as EObjectCampActivity).director
      : campConfig.CAMP_ACTIVITY_ANIMATION.get(campAction as EObjectCampActivity).listener;

    let isFound: boolean = false;

    for (const [, action] of this.state.approvedActions!) {
      for (const it of $range(1, campActionsList.length())) {
        if (description + campActionsList.get(it) === action.name) {
          table.insert(actionsList, action.name);
          isFound = true;
        }
      }
    }

    if (!isFound) {
      table.insert(actionsList, description as EStalkerState);
    }

    const randomIndex: TIndex = math.random(actionsList.length());
    let action: EStalkerState = actionsList.get(randomIndex);

    if (this.state.actionNameBase) {
      if (this.state.actionNameBase === description + WEAPON_POSTFIX) {
        action = (description + WEAPON_POSTFIX) as EStalkerState;
      }

      if (action === description + WEAPON_POSTFIX && this.state.actionNameBase === description) {
        table.remove(actionsList, randomIndex);
        action = table.random(actionsList)[1];
      }
    } else {
      this.state.actionNameBase = action === description + WEAPON_POSTFIX ? action : description;
    }

    this.currentAction = action;
  }

  /**
   * Calculate object positioning based on animpoint target smart cover position.
   */
  public calculatePosition(): void {
    const smartCover: Nillable<SmartCover> = registry.smartCovers.get(this.state.coverName);

    assert(smartCover, "There is no registered smart_cover with name '%s'.", this.state.coverName);

    const previousPosition: Nillable<Vector> = this.position;

    this.position = smartCover.position;

    // Turn towards another cover has to be performed from scratch.
    if (!previousPosition || !areSameVectors(previousPosition, this.position)) {
      this.isDirectionReached = false;
    }

    this.positionLevelVertexId = level.vertex_id(this.position);
    this.vertexPosition = level.vertex_position(this.positionLevelVertexId);
    this.smartCoverDirection = angleToDirection(smartCover.angle);

    const lookDirection: Vector = this.smartCoverDirection!.normalize();

    this.lookPosition = createVector(
      this.position.x + 10 * lookDirection.x,
      this.position.y,
      this.position.z + 10 * lookDirection.z
    );

    const descriptionState: EStalkerState = smartCover.description() as EStalkerState;

    if ($isNil(animpoint_predicates.get(descriptionState))) {
      assert(
        this.state.availableAnimations,
        "Wrong animpoint smart_cover description '%s', name '%s'.",
        tostring(descriptionState),
        smartCover.name()
      );
    }

    this.state.description = descriptionState;
    this.availableActions = animpoint_predicates.get(descriptionState);
    this.state.approvedActions = new LuaTable();
  }

  /**
   * @returns Tuple with animpoint position and direction.
   */
  public getAnimationParameters(): LuaMultiReturn<[Nillable<Vector>, Nillable<Vector>]> {
    return $multi(this.position, this.smartCoverDirection);
  }

  /**
   * @returns Whether object reached position where animpoint scheme should activate animations.
   */
  public isPositionReached(): boolean {
    if (this.currentAction) {
      return true;
    }

    if (!this.position) {
      return false;
    }

    const object: GameObject = registry.objects.get(this.object.id()).object;

    if (!object) {
      return false;
    }

    // Left the place, have to reach it and turn towards cover again.
    if (object.position().distance_to_sqr(this.vertexPosition!) > this.state.reachDistanceSqr) {
      this.isDirectionReached = false;

      return false;
    }

    // Turn towards cover is latched - once done it stays valid while object remains at the place.
    if (!this.isDirectionReached) {
      const direction: Vector = object.direction();
      const coverAngle: TRate = -math.deg(math.atan2(this.smartCoverDirection!.x, this.smartCoverDirection!.z));
      const objectAngle: TRate = -math.deg(math.atan2(direction.x, direction.z));
      const rotationY: TRate = math.min(
        math.abs(coverAngle - objectAngle),
        360 - math.abs(coverAngle) - math.abs(objectAngle)
      );

      this.isDirectionReached = rotationY < 50;
    }

    return this.isDirectionReached;
  }

  /**
   * Build the list of approved animation actions for the object from the available animations or actions.
   */
  public fillPossibleAnimationActions(): void {
    const isInCamp: boolean = $isNotNil(this.campController);

    if (this.state.availableAnimations) {
      for (const [, state] of this.state.availableAnimations) {
        table.insert(this.state.approvedActions, {
          predicate: animpointPredicateAlways,
          name: state,
        });
      }
    } else if (this.availableActions) {
      for (const [, action] of this.availableActions) {
        if (action.predicate(this.object, isInCamp)) {
          table.insert(this.state.approvedActions, action);
        }
      }
    }

    assert(
      this.state.approvedActions.length() !== 0,
      "There is no approved actions for stalker[%s] in animpoint.",
      this.object.name()
    );

    logger.info("Filled available actions: %s %s", this.object.name(), this.state.approvedActions.length());
  }

  /**
   * Start animpoint activity.
   * Fill approved actions list and start animating.
   */
  public start(): void {
    logger.info("Start: %s", this.object.name());

    this.campController = this.state.useCamp ? getCampZoneForPosition(this.position) : null;

    this.fillPossibleAnimationActions();

    // Capture object in camp if it exists. Handle separate animation otherwise.
    if (this.campController) {
      this.campController.registerObject(this.object.id());
    } else {
      this.currentAction = table.random(this.state.approvedActions)[1].name;
    }

    this.isStarted = true;
    this.coverName = this.state.coverName;

    logger.info("Started: %s %s %s", this.object.name(), this.currentAction, this.coverName);
  }

  /**
   * Stop animation based on animpoint scheme logics.
   */
  public stop(): void {
    logger.info("Stop: %s", this.object.name());

    if (this.campController) {
      this.campController.unregisterObject(this.object.id());
      this.campController = null;
    }

    this.isStarted = false;
    this.currentAction = null;
  }
}
