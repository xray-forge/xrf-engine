import { action_base, level, LuabindClass, patrol } from "xray16";
import { GameObject, Vector } from "xray16/alias";
import { assert, NIL, Nillable, StringNillable, TName, TNumberId } from "xray16/lib";

import { ESmartCoverState, EStalkerState } from "@/engine/core/animation/types/state_types";
import { getManager, getObjectIdByStoryId, registry, setStalkerState } from "@/engine/core/database";
import { parseConditionsList, pickSectionFromCondList, TConditionList } from "@/engine/core/ini";
import { SoundManager } from "@/engine/core/managers/sounds/SoundManager";
import {
  COVER_SUBSTATE_TABLE,
  ISchemeSmartCoverState,
} from "@/engine/core/schemes/stalker/smartcover/smartcover_types";
import { ISchemeEventHandler } from "@/engine/core/schemes/types";

/**
 * Action to handle hiding in smart covers.
 */
@LuabindClass()
export class ActionSmartCoverUse extends action_base implements ISchemeEventHandler {
  public readonly state: ISchemeSmartCoverState;

  public isInitialized: boolean = false;

  public coverCondlist!: TConditionList;
  public targetPathCondlist!: TConditionList;

  public coverState!: StringNillable<ESmartCoverState>;
  public coverName!: TName;

  public targetPath!: TName;
  public targetEnemyId: Nillable<TNumberId> = null;
  public firePosition: Nillable<Vector> = null;

  public constructor(state: ISchemeSmartCoverState) {
    super(null, ActionSmartCoverUse.__name);
    this.state = state;
  }

  public override initialize(): void {
    super.initialize();

    this.isInitialized = true;
    this.activate();
  }

  public activate(): void {
    this.state.signals = new LuaTable();
    this.targetEnemyId = null;
    this.coverName = this.state.coverName as TName;

    if (!this.isInitialized) {
      return;
    }

    this.object.set_smart_cover_target();

    assert(registry.smartCovers.has(this.coverName), "There is no smart cover with name '%s'.", this.coverName);

    setStalkerState(this.object, EStalkerState.SMART_COVER);

    this.targetPathCondlist = parseConditionsList(this.state.targetPath);
    this.updateSmartCoverTarget();

    this.coverCondlist = parseConditionsList(this.state.coverState);
    this.coverState = pickSectionFromCondList(registry.actor, this.object, this.coverCondlist) as ESmartCoverState;

    this.updateSmartCoverTargetState();
    this.updateSmartCoverTargetSelector();

    this.object.idle_min_time(this.state.idleMinTime);
    this.object.idle_max_time(this.state.idleMaxTime);
    this.object.lookout_min_time(this.state.lookoutMinTime);
    this.object.lookout_max_time(this.state.lookoutMaxTime);
  }

  public override execute(): void {
    super.execute();

    const smartCoverState: ESmartCoverState = pickSectionFromCondList(
      registry.actor,
      this.object,
      this.coverCondlist
    ) as ESmartCoverState;

    if (
      smartCoverState === ESmartCoverState.DEFAULT ||
      COVER_SUBSTATE_TABLE[this.coverState as ESmartCoverState] !== COVER_SUBSTATE_TABLE[smartCoverState]
    ) {
      this.coverState = smartCoverState;
    }

    this.updateSmartCoverTargetSelector();

    const state: ISchemeSmartCoverState = this.state;
    const object: GameObject = this.object;

    if (this.targetEnemyId && object.in_smart_cover()) {
      const enemy: Nillable<GameObject> = level.object_by_id(this.targetEnemyId);

      if (enemy && object.in_current_loophole_fov(enemy.position())) {
        state.signals!.set("enemy_in_fov", true);
        state.signals!.delete("enemy_not_in_fov");
      } else {
        state.signals!.delete("enemy_in_fov");
        state.signals!.set("enemy_not_in_fov", true);
      }
    }

    if (state.soundIdle) {
      getManager(SoundManager).play(object.id(), state.soundIdle);
    }
  }

  public deactivate(): void {
    this.state.coverName = null;
    this.state.loopholeName = null;
  }

  public override finalize(): void {
    this.isInitialized = false;
    super.finalize();
  }

  /**
   * Update target selection behaviour of current object based on smart cover state.
   */
  public updateSmartCoverTargetState(): void {
    const object: GameObject = this.object;

    if (!object.alive()) {
      return;
    }

    switch (this.coverState) {
      case ESmartCoverState.IDLE_TARGET:
        object.set_smart_cover_target_idle();

        return;

      case ESmartCoverState.LOOKOUT_TARGET:
        this.updateSmartCoverTarget();
        object.set_smart_cover_target_lookout();

        return;

      case ESmartCoverState.FIRE_TARGET:
        object.set_smart_cover_target_fire();

        return;

      case ESmartCoverState.FIRE_NO_LOOKOUT_TARGET:
        this.updateSmartCoverTarget();
        object.set_smart_cover_target_fire_no_lookout();

        return;

      default:
        this.updateSmartCoverTarget();
        object.set_smart_cover_target_default(true);

        return;
    }
  }

  /**
   * Update selector of smart cover target based on current state.
   */
  public updateSmartCoverTargetSelector(): void {
    if (this.coverState === NIL) {
      this.object.set_smart_cover_target_selector();
    } else {
      this.object.set_smart_cover_target_selector(this.updateSmartCoverTargetState, this);
    }
  }

  /**
   * Update target destination for current object.
   * Checks current conditions and updates smart cover target.
   */
  public updateSmartCoverTarget(): boolean {
    const pathName: Nillable<TName> = pickSectionFromCondList(registry.actor, this.object, this.targetPathCondlist);

    // Has target path.
    if (pathName && pathName !== NIL) {
      assert(level.patrol_path_exists(pathName), "There is no patrol path '%s'.", pathName);

      this.targetPath = pathName;
      this.firePosition = new patrol(pathName).point(0);

      this.object.set_smart_cover_target(this.firePosition);

      return true;

      // Has target enemy.
    } else if (this.state.targetEnemy) {
      const objectId: Nillable<TNumberId> = getObjectIdByStoryId(this.state.targetEnemy);
      const object: Nillable<GameObject> = objectId ? level.object_by_id(objectId) : null;

      this.targetEnemyId = objectId;

      if (object?.alive()) {
        this.object.set_smart_cover_target(object);
        this.firePosition = object.position();

        return true;
      }
      // Has target position.
    } else if (this.state.targetPosition) {
      this.object.set_smart_cover_target(this.state.targetPosition);
      this.firePosition = this.state.targetPosition;

      return true;
    }

    return false;
  }
}
