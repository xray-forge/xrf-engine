import { action_base, danger_object, LuabindClass, patrol, stalker_ids, time_global } from "xray16";
import { DangerObject, GameObject, Patrol, Vector } from "xray16/alias";
import { abort, createVector, isObjectAtTerminalWaypoint, Nillable, TTimestamp } from "xray16/lib";
import { $isNil, $isNotNil } from "xray16/macros";

import { StalkerPatrolController } from "@/engine/core/ai/patrol/StalkerPatrolController";
import { EStalkerState, ILookTargetDescriptor } from "@/engine/core/animation/types";
import { getManager, registry, setStalkerState } from "@/engine/core/database";
import { parseWaypointsData } from "@/engine/core/ini";
import { SoundManager } from "@/engine/core/managers/sounds/SoundManager";
import { ICampPoint, ISchemeCamperState } from "@/engine/core/schemes/stalker/camper/camper_types";
import {
  getNextCampPatrolPoint,
  isOnCampPatrolWalkPoint,
} from "@/engine/core/schemes/stalker/camper/utils/camper_utils";
import { isObjectFacingDanger } from "@/engine/core/schemes/stalker/danger/utils";
import { ISchemeEventHandler } from "@/engine/core/schemes/types";

/**
 * Action implementing camper combat behaviour, patrolling cover points and firing at enemies from them.
 */
@LuabindClass()
export class ActionCombatCamping extends action_base implements ISchemeEventHandler {
  public state: ISchemeCamperState;
  public patrolController: StalkerPatrolController;

  public flag: Nillable<number> = null;
  public danger: boolean = false;
  public nextPoint: Nillable<ICampPoint> = null;
  public scantime: Nillable<TTimestamp> = null;
  public direction: Nillable<Vector> = null;
  public position: Nillable<Vector> = null;
  public lookPosition: Nillable<Vector> = null;
  public destPosition: Nillable<Vector> = null;
  public lookPoint: Nillable<Vector> = null;
  public point0: Nillable<Vector> = null;
  public point2: Nillable<Vector> = null;
  public enemy: Nillable<GameObject> = null;
  public enemyPosition: Nillable<Vector> = null;

  public constructor(state: ISchemeCamperState, object: GameObject) {
    super(null, ActionCombatCamping.__name);

    this.state = state;
    this.patrolController = registry.objects.get(object.id()).patrolController!;
    this.state.scanTable = new LuaTable();
  }

  public override initialize(): void {
    super.initialize();

    this.object.set_desired_position();
    this.object.set_desired_direction();

    this.reset();

    this.enemyPosition = null;
  }

  public activate(): void {
    this.reset();
  }

  /**
   * Reset the camper state, configuring walk and look patrols and the scan table for sniper or regular mode.
   */
  public reset(): void {
    setStalkerState(this.object, EStalkerState.PATROL);

    this.state.signals = new LuaTable();
    this.state.scanTable = new LuaTable();

    if (this.state.sniper) {
      this.patrolController.reset(
        this.state.pathWalk,
        parseWaypointsData(this.state.pathWalk)!,
        null,
        null,
        null,
        this.state.suggestedState,
        { context: this, callback: () => false }
      );

      const lookPatrol: Patrol = new patrol(this.state.pathLook);

      if ($isNotNil(lookPatrol)) {
        for (const k of $range(0, lookPatrol.count() - 1)) {
          for (const i of $range(0, 31)) {
            if (lookPatrol.flag(k, i)) {
              if ($isNil(this.state.scanTable.get(i))) {
                this.state.scanTable.set(i, new LuaTable());
              }

              table.insert(this.state.scanTable.get(i), { key: k, pos: lookPatrol.point(k) });
            }
          }
        }
      }

      if (!this.object.sniper_update_rate()) {
        this.object.sniper_update_rate(true);
      }
    } else {
      this.patrolController.reset(
        this.state.pathWalk,
        parseWaypointsData(this.state.pathWalk)!,
        this.state.pathLook,
        parseWaypointsData(this.state.pathLook),
        null,
        this.state.suggestedState,
        { context: this, callback: () => false }
      );

      if (this.object.sniper_update_rate()) {
        this.object.sniper_update_rate(false);
      }
    }

    this.state.lastLookPoint = null;
    this.state.curLookPoint = null;
    this.state.scanBegin = null;
  }

  public override finalize(): void {
    this.patrolController.finalize();
    super.finalize();
  }

  public override execute(): void {
    super.execute();
    this.enemy = this.object.best_enemy();

    if (this.enemy) {
      this.state.memEnemy = this.object.memory_time(this.enemy);

      if ($isNil(this.state.memEnemy) || time_global() - this.state.memEnemy > this.state.idle) {
        this.enemy = null;
        this.state.memEnemy = null;
        this.patrolController.setup();
      }
    } else {
      if ($isNotNil(this.state.memEnemy)) {
        this.state.memEnemy = null;
        this.patrolController.setup();
      }
    }

    if (this.enemy) {
      if (this.object.see(this.enemy) && this.canShoot()) {
        setStalkerState(
          this.object,
          this.state.suggestedState.camperingFire ??
            (this.state.sniper ? EStalkerState.HIDE_SNIPER_FIRE : EStalkerState.HIDE_FIRE),
          null,
          null,
          { lookObjectId: this.enemy.id(), lookPosition: this.enemy.position() },
          { animation: true }
        );

        if ($isNotNil(this.state.attackSound)) {
          getManager(SoundManager).play(this.object.id(), this.state.attackSound);
        }
      } else {
        const memoryPosition: Vector = this.object.memory_position(this.enemy);

        if (
          !this.enemyPosition ||
          this.enemyPosition.x !== memoryPosition.x ||
          this.enemyPosition.y !== memoryPosition.y ||
          this.enemyPosition.z !== memoryPosition.z
        ) {
          this.enemyPosition = memoryPosition;

          if (this.state.sniper) {
            this.position = this.object.position();

            this.direction = createVector(
              this.enemyPosition.x - this.position.x,
              0,
              this.enemyPosition.z - this.position.z
            );
            this.direction.normalize();

            const wideSight = this.position.distance_to(this.enemyPosition) * math.tan(this.state.enemyDisp);

            this.point0 = createVector(
              this.enemyPosition.x + wideSight * this.direction.z,
              this.enemyPosition.y,
              this.enemyPosition.z - wideSight * this.direction.x
            );

            this.point2 = createVector(
              this.enemyPosition.x - wideSight * this.direction.z,
              this.enemyPosition.y,
              this.enemyPosition.z + wideSight * this.direction.x
            );

            // todo: Optimize.
            this.state.scanTable!.set(-1, new LuaTable());
            table.insert(this.state.scanTable!.get(-1), { key: 0, pos: this.point0 });
            table.insert(this.state.scanTable!.get(-1), { key: 1, pos: this.enemyPosition });
            table.insert(this.state.scanTable!.get(-1), { key: 2, pos: this.point2 });
          }
        }

        if (this.state.sniper) {
          if (time_global() - this.state.memEnemy! < this.state.postEnemyWait) {
            const position: Nillable<ILookTargetDescriptor> = $isNotNil(this.enemyPosition)
              ? { lookPosition: this.enemyPosition }
              : null;

            setStalkerState(
              this.object,
              this.state.suggestedState.campering ?? EStalkerState.HIDE_NA,
              null,
              null,
              position
            );
          } else {
            this.scan(-1);
          }
        } else {
          if (isOnCampPatrolWalkPoint(this.object, this.state)) {
            const position: Nillable<ILookTargetDescriptor> = $isNil(this.enemyPosition)
              ? null
              : { lookPosition: this.enemyPosition, lookObjectId: null };

            setStalkerState(
              this.object,
              this.state.suggestedState.campering ?? EStalkerState.HIDE,
              null,
              null,
              position
            );
          } else {
            this.patrolController.setup();
            this.patrolController.update();
          }
        }
      }

      return;
    }

    if (this.processDanger()) {
      this.danger = true;

      return;
    }

    if (this.danger) {
      this.danger = false;
      this.patrolController.setup();
    }

    if (this.state.sniper) {
      if (isOnCampPatrolWalkPoint(this.object, this.state)) {
        if ($isNil(this.scantime)) {
          this.scantime = time_global();
        }

        this.scan(this.state.waypointFlag as number);

        const [isOnWaypoint] = isObjectAtTerminalWaypoint(
          this.patrolController.object,
          this.patrolController.patrolWalk as Patrol
        );

        if (isOnWaypoint) {
          return;
        }

        if ($isNotNil(this.scantime) && time_global() - this.scantime >= this.state.scantimeFree) {
          this.patrolController.setup();
        }
      } else {
        this.scantime = null;
        this.patrolController.update();
      }
    } else {
      this.patrolController.update();
    }
  }

  /**
   * Determine whether the object is allowed to fire based on the configured shoot mode.
   *
   * @returns Whether the object may shoot at its current position.
   */
  public canShoot(): boolean {
    switch (this.state.shoot) {
      case "always":
        return true;

      case "none":
        return false;

      case "terminal": {
        const [isOnTerminalWaypoint] = isObjectAtTerminalWaypoint(
          this.patrolController.object,
          this.patrolController.patrolWalk as Patrol
        );

        return isOnTerminalWaypoint;
      }

      default:
        abort(
          "%s: unrecognized shoot type '%s' for '%s'.",
          ActionCombatCamping.__name,
          this.state.shoot,
          this.object.name()
        );
    }
  }

  /**
   * @returns Whether there is any danger.
   */
  public processDanger(): boolean {
    if (!isObjectFacingDanger(this.object)) {
      return false;
    }

    const danger: Nillable<DangerObject> = this.object.best_danger();

    if (!danger) {
      return false;
    }

    const dangerObject: Nillable<GameObject> = danger.object();

    if (!this.danger) {
      this.object.play_sound(stalker_ids.sound_alarm, 1, 0, 1, 0);
    }

    if (dangerObject && danger.type() === danger_object.attacked && time_global() - danger.time() < 5_000) {
      setStalkerState(this.object, this.state.suggestedState.camperingFire ?? EStalkerState.HIDE_FIRE, null, null, {
        lookPosition: dangerObject.position(),
      });
    } else {
      setStalkerState(
        this.object,
        this.state.suggestedState.campering ?? (this.state.sniper ? EStalkerState.HIDE_NA : EStalkerState.HIDE),
        null,
        null,
        { lookPosition: danger.position() }
      );
    }

    return true;
  }

  /**
   * Sweep the object's aim across the look points associated with the given waypoint flag.
   *
   * @param flag - The waypoint flag whose scan points should be swept.
   */
  public scan(flag: number): void {
    if ($isNil(this.state.scanTable!.get(flag))) {
      return;
    }

    const now: TTimestamp = time_global();

    if (this.flag !== flag) {
      this.flag = flag;
      this.state.scanBegin = null;
      this.state.curLookPoint = null;
      this.state.lastLookPoint = null;
    }

    if ($isNil(this.state.scanBegin) || now - this.state.scanBegin > this.state.timeScanDelta) {
      this.nextPoint = getNextCampPatrolPoint(flag, this.state) as ICampPoint;

      if ($isNil(this.state.curLookPoint)) {
        this.state.curLookPoint = 1;
      }

      if (!this.state.lastLookPoint) {
        this.state.lastLookPoint = this.nextPoint;
      }

      this.lookPosition = this.state.lastLookPoint.pos;
      this.destPosition = this.nextPoint.pos;
      this.lookPoint = createVector(
        this.lookPosition!.x +
          (this.state.curLookPoint * (this.destPosition.x - this.lookPosition!.x)) / this.state.scandelta,
        this.lookPosition!.y +
          (this.state.curLookPoint * (this.destPosition.y - this.lookPosition!.y)) / this.state.scandelta,
        this.lookPosition!.z +
          (this.state.curLookPoint * (this.destPosition.z - this.lookPosition!.z)) / this.state.scandelta
      );

      setStalkerState(this.object, this.state.suggestedState.campering ?? EStalkerState.HIDE_NA, null, null, {
        lookPosition: this.lookPoint,
      });

      if (this.state.curLookPoint >= this.state.scandelta) {
        this.state.curLookPoint = null;
        this.state.lastLookPoint = this.nextPoint;
      } else {
        this.state.curLookPoint += this.state.scanBegin ? (now - this.state.scanBegin) / this.state.timeScanDelta : 1;
      }

      this.state.scanBegin = now;
    }
  }
}
