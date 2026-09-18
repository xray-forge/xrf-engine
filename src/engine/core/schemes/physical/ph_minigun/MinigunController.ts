import { CCar, level, move, patrol, time_global } from "xray16";
import { Car, GameObject, Vector } from "xray16/alias";
import {
  abort,
  ACTOR,
  ACTOR_ID,
  createEmptyVector,
  createVector,
  NIL,
  Nillable,
  TSection,
  TStringId,
  TTimestamp,
  yaw,
} from "xray16/lib";
import { $isNotNil } from "xray16/macros";

import { getObjectByStoryId, registry } from "@/engine/core/database";
import { pickSectionFromCondList } from "@/engine/core/ini";
import { AbstractSchemeController } from "@/engine/core/schemes/base";
import { minigunConfig } from "@/engine/core/schemes/physical/ph_minigun/MinigunConfig";
import {
  EMinigunCannonState,
  EMinigunFireTargetState,
  EMinigunState,
  ISchemeMinigunState,
} from "@/engine/core/schemes/physical/ph_minigun/ph_minigun_types";
import {
  isActiveSection,
  isMonsterScriptCaptured,
  scriptReleaseMonster,
  switchObjectSchemeToSection,
  trySwitchToAnotherSection,
} from "@/engine/core/schemes/runtime";
import { IBaseSchemeLogic } from "@/engine/core/schemes/state";
import { isObjectWounded } from "@/engine/core/utils/planner";

/**
 * Controller handling minigun scheme behaviour for an object.
 */
export class MinigunController extends AbstractSchemeController<ISchemeMinigunState> {
  public mgun: Car;
  public startDirection: Vector;
  public startLookPos: Vector;

  public destroyed: boolean = false;
  public stateCannon: EMinigunCannonState = EMinigunCannonState.NONE;
  public stateFiretarget: EMinigunFireTargetState = EMinigunFireTargetState.NONE;
  public stateShooting: EMinigunState = EMinigunState.NONE;

  public startDelayingTime: number = 0;
  public startShootingTime: number = 0;
  public fcUpdNum: number = 0;
  public fcUpdAvg: number = 0;
  public fcLastUpdTm: number = 0;

  public lastPosition: Nillable<Vector> = null;
  public lastPositionTime: number = 0;
  public stateDelaying: boolean = false;
  public hasWeapon: boolean = false;

  public targetObject: Nillable<GameObject> = null;
  public targetFirePt: Nillable<Vector> = null;
  public targetFirePtIdx: number = 0;
  public fireRangeSqr: number = 0;
  public defFireTime: number = 0;
  public defFireRep: number = 0;
  public fireRep: number = 0;

  public fireTrackTarget: Nillable<boolean> = null;
  public pathFire: Nillable<string> = null;
  public pathFirePoint: Nillable<Vector> = null;
  public onTargetVis: Nillable<IBaseSchemeLogic> = null;
  public onTargetNvis: Nillable<IBaseSchemeLogic> = null;

  public constructor(object: GameObject, state: ISchemeMinigunState) {
    super(object, state);

    this.mgun = this.object.get_car();
    this.startDirection = this.object.direction();
    this.startLookPos = createEmptyVector();
    this.startLookPos.x = this.object.position().x + 5 * math.sin(this.startDirection.x);
    this.startLookPos.z = this.object.position().z + 5 * math.cos(this.startDirection.x);
    this.startLookPos.y = this.object.position().y;
  }

  public override activate(): void {
    this.startDelayingTime = time_global();
    this.startShootingTime = time_global();

    this.fcUpdNum = 0; // -- fastcall updates num
    this.fcUpdAvg = 10; // -- average time of the fastcall updates (in millisecond)
    this.fcLastUpdTm = -1; // -- fastcall last update time

    this.state.signals = new LuaTable();
    this.lastPosition = null;
    this.lastPositionTime = 0;

    this.stateDelaying = false;
    this.destroyed = false;

    this.object.set_nonscript_usable(false);
    this.object.set_tip_text("");

    if (this.mgun.HasWeapon()) {
      this.mgun.Action(CCar.eWpnActivate, 1);
      this.hasWeapon = true;
    } else {
      this.hasWeapon = false;
    }

    this.stateFiretarget = EMinigunFireTargetState.NONE;
    this.stateCannon = EMinigunCannonState.NONE;
    this.stateShooting = EMinigunState.NONE;

    this.targetFirePt = null;
    this.targetFirePtIdx = 0;
    this.targetObject = null;

    this.onTargetVis = null;
    this.onTargetNvis = null;

    const actor: GameObject = registry.actor;

    if (this.hasWeapon) {
      if (this.state.fireTarget === "points") {
        this.stateFiretarget = EMinigunFireTargetState.POINTS;
      } else {
        if (this.state.fireTarget === ACTOR && actor.alive()) {
          this.targetObject = actor;
          this.stateFiretarget = EMinigunFireTargetState.ENEMY;
        } else {
          const n = this.state.fireTarget;

          if ($isNotNil(n)) {
            const obj = getObjectByStoryId(n);

            if (obj && obj.alive()) {
              this.targetObject = obj;
              this.stateFiretarget = EMinigunFireTargetState.ENEMY;
            }
          }
        }
      }

      this.fireTrackTarget = this.state.fireTrackTarget;

      if (this.state.onTargetVis) {
        const vis = this.state.onTargetVis;

        if ($isNotNil(vis.p1)) {
          const storyObject = getObjectByStoryId(vis.p1 as TStringId);

          if (storyObject && storyObject.alive()) {
            vis.p1 = storyObject as any;
            this.onTargetVis = vis as any;
          }
        }
      }

      if (this.state.onTargetNvis) {
        const nvis = this.state.onTargetNvis;

        if ($isNotNil(nvis.p1)) {
          const storyObject = getObjectByStoryId(nvis.p1 as TStringId);

          if (storyObject && storyObject.alive()) {
            nvis.p1 = storyObject as any;
            this.onTargetNvis = nvis;
          }
        }
      }

      this.pathFire = this.state.pathFire;
      this.pathFirePoint = null;

      if ($isNotNil(this.pathFire)) {
        if (level.patrol_path_exists(this.pathFire)) {
          this.pathFirePoint = new patrol(this.pathFire).point(0);
        } else {
          abort("[ph_minigun] patrol path %s doesnt exist.", tostring(this.pathFire));
        }
      }

      this.defFireTime = this.state.fireTime;
      this.defFireRep = this.state.fireRep;
      this.fireRep = this.defFireRep;

      this.fireRangeSqr = this.state.fireRange * this.state.fireRange;

      if (this.stateFiretarget === EMinigunFireTargetState.POINTS && this.pathFire) {
        this.stateCannon = EMinigunCannonState.FOLLOW;
        this.stateShooting = EMinigunState.NONE;
      } else if (this.stateFiretarget === EMinigunFireTargetState.ENEMY) {
        this.stateShooting = EMinigunState.NONE;
        this.stateCannon = EMinigunCannonState.FOLLOW;
      } else {
        this.stateFiretarget = EMinigunFireTargetState.NONE;
        this.stateCannon = EMinigunCannonState.NONE;
        this.stateShooting = EMinigunState.NONE;
      }
    }

    this.object.set_fastcall(this.fastcall, this);
  }

  public update(): void {
    if (trySwitchToAnotherSection(this.object, this.state)) {
      return;
    }

    if (this.destroyed) {
      switchObjectSchemeToSection(this.object, this.state.ini, NIL);

      return;
    }

    this.checkFireTime();
  }
  /**
   * Toggle the minigun weapon fire action.
   *
   * @param shooting - Fire action flag passed to the car weapon, where non-zero enables firing.
   */
  public setShooting(shooting: number): void {
    this.mgun.Action(CCar.eWpnFire, shooting);
  }

  /**
   * Update the shooting and delaying timers that alternate between firing and pausing the minigun.
   */
  public checkFireTime(): void {
    if (this.state.fireRep === -1) {
      return;
    }

    if (1000 * this.state.fireTime + this.startShootingTime >= time_global() && !this.stateDelaying) {
      this.stateDelaying = false;
      this.startDelayingTime = time_global() + math.random(-0.2, 0.2) * 1000 * this.state.fireTime;

      return;
    } else {
      this.stateDelaying = true;
    }

    if (this.startDelayingTime + 1000 * this.state.fireRep >= time_global() && this.stateDelaying) {
      this.stateDelaying = true;
      this.startShootingTime = time_global();
    } else {
      this.stateDelaying = false;
    }
  }

  /**
   * Save the scheme state of the minigun controller.
   */
  public save(): void {}

  /**
   * Rotate the minigun cannon to aim at the provided direction.
   *
   * @param direction - Direction to aim the weapon at, or null to keep the current aim.
   */
  public rotToFiredir(direction: Nillable<Vector>): void {
    if (direction) {
      this.mgun.SetParam(CCar.eWpnDesiredPos, direction);
    }
  }

  /**
   * Rotate the minigun cannon to aim at the provided fire point.
   *
   * @param pt - Point to aim the weapon at, or null to keep the current aim.
   */
  public rotToFirepoint(pt: Nillable<Vector>): void {
    if (pt) {
      this.mgun.SetParam(CCar.eWpnDesiredPos, pt);
    }
  }

  /**
   * Handle the fastcall tick: run the fast update (aim/fire) while the section is active, and stop firing once the
   * scheme has switched away (matches ph_minigun.script `if active_scheme ~= "ph_minigun"`).
   *
   * @returns Whether the fastcall should stop on this tick.
   */
  public fastcall(): boolean {
    if (!isActiveSection(this.object, this.state.section)) {
      this.setShooting(0);

      return true;
    }

    return this.fastUpdate();
  }

  /**
   * Run the per-tick aiming and shooting logic, switching schemes on target visibility and firing when able.
   *
   * @returns Whether the fastcall should stop, which happens when the car is destroyed or capture is lost.
   */
  public fastUpdate(): boolean {
    if (this.mgun.GetfHealth() <= 0) {
      this.destroyCar();

      return true;
    }

    const now: number = time_global();

    if (this.fcUpdNum < minigunConfig.DEFAULT_MAX_FC_UPD_NUM) {
      const lastUpdate: TTimestamp = this.fcLastUpdTm;

      if (lastUpdate !== -1) {
        const n = this.fcUpdNum;

        if (n < 3000) {
          this.fcUpdAvg = (this.fcUpdAvg * n + (now - lastUpdate)) / (n + 1);
          this.fcUpdNum = n + 1;
        } else {
          this.fcUpdNum = 1;
        }
      }

      this.fcLastUpdTm = now;
    }

    if (this.stateCannon === EMinigunCannonState.STOP && this.stateFiretarget === EMinigunFireTargetState.NONE) {
      if (isMonsterScriptCaptured(this.object) && !this.object.action()) {
        this.destroyCar();

        return true;
      }

      return false;
    }

    if (this.hasWeapon) {
      if (
        this.onTargetVis &&
        (this.onTargetVis.p1 as any).alive() &&
        this.mgun.IsObjectVisible(this.onTargetVis.p1 as any)
      ) {
        const newSection: Nillable<TSection> = pickSectionFromCondList(
          registry.actor,
          this.object,
          this.onTargetVis.condlist
        );

        if (newSection) {
          switchObjectSchemeToSection(this.object, this.state.ini!, newSection);
        }
      }

      if (
        this.onTargetNvis &&
        (this.onTargetNvis.p1 as any).alive() &&
        !this.mgun.IsObjectVisible(this.onTargetNvis.p1 as any)
      ) {
        const newSection: Nillable<TSection> = pickSectionFromCondList(
          registry.actor,
          this.object,
          this.onTargetNvis.condlist
        );

        if (newSection) {
          switchObjectSchemeToSection(this.object, this.state.ini!, newSection);
        }
      }

      if (this.stateFiretarget === EMinigunFireTargetState.POINTS) {
        const fireAngle = this.getAngleXZ(this.object, this.pathFirePoint!, this.startDirection);
        const canRotate =
          fireAngle <= (this.state.fireAngle * math.pi) / 360 && fireAngle >= -((this.state.fireAngle * math.pi) / 360);

        if (canRotate) {
          this.rotToFirepoint(this.pathFirePoint);
          if (this.stateDelaying) {
            if (this.stateShooting !== EMinigunState.NONE && this.state.autoFire) {
              this.stateShooting = EMinigunState.NONE;
              this.setShooting(this.stateShooting);
            }
          } else {
            if (this.stateShooting === EMinigunState.NONE) {
              this.stateShooting = EMinigunState.SHOOTING_ON;
              this.setShooting(this.stateShooting);
            }
          }
        }
      } else if (this.stateFiretarget === EMinigunFireTargetState.ENEMY) {
        const fireAngle = this.getAngleXZ(this.object, this.targetObject!.position(), this.startDirection);
        const canRotate =
          fireAngle <= (this.state.fireAngle * math.pi) / 360 && fireAngle >= -((this.state.fireAngle * math.pi) / 360);
        const objectVisible = this.mgun.IsObjectVisible(this.targetObject!) || !this.state.shootOnlyOnVisible;

        if (
          this.targetObject!.alive() &&
          this.object.position().distance_to_sqr(this.targetObject!.position()) <= this.fireRangeSqr &&
          objectVisible &&
          canRotate
        ) {
          if (!this.stateDelaying) {
            this.targetFirePt = this.targetObject!.position();
            if (this.targetObject!.id() !== ACTOR_ID) {
              if (this.targetObject!.target_body_state() === move.crouch) {
                this.targetFirePt.y = this.targetFirePt.y + 0.5;
              } else if (!isObjectWounded(this.targetObject!.id())) {
                this.targetFirePt.y = this.targetFirePt.y + 1.2;
              } else {
                this.targetFirePt.y = this.targetFirePt.y + 0.1;
              }
            } else {
              this.targetFirePt.y = this.targetFirePt.y + 1.0;
            }

            this.rotToFirepoint(this.targetFirePt);

            if (this.mgun.CanHit()) {
              if (this.stateShooting === EMinigunState.NONE && this.state.autoFire) {
                this.stateShooting = EMinigunState.SHOOTING_ON;
                this.setShooting(this.stateShooting);
              }
            } else {
              if (this.stateShooting !== EMinigunState.NONE) {
                this.stateShooting = EMinigunState.NONE;
                this.setShooting(this.stateShooting);
              }
            }
          } else {
            this.stateShooting = EMinigunState.NONE;
            this.setShooting(this.stateShooting);
          }
        } else {
          if (this.stateShooting !== EMinigunState.NONE || !canRotate || this.stateDelaying) {
            this.stateShooting = EMinigunState.NONE;
            this.setShooting(this.stateShooting);
            this.rotToFiredir(this.startLookPos);
          }

          if (this.fireTrackTarget) {
            this.targetFirePt = this.targetObject!.position();
            this.targetFirePt.y = this.targetFirePt.y + 1.0;
            this.rotToFirepoint(this.targetFirePt);
          }
        }
      }
    }

    return false;
  }

  /**
   * Stop the minigun, release the monster script, grant the death info portion and mark the car as destroyed.
   */
  public destroyCar(): void {
    this.stateCannon = EMinigunCannonState.NONE;
    this.stateFiretarget = EMinigunFireTargetState.NONE;
    this.stateShooting = EMinigunState.NONE;
    this.mgun.Action(CCar.eWpnAutoFire, 0);
    this.setShooting(this.stateShooting);

    scriptReleaseMonster(this.object);

    if ($isNotNil(this.state.onDeathInfo)) {
      registry.actor.give_info_portion(this.state.onDeathInfo);
    }

    this.destroyed = true;
  }

  /**
   * Calculate the yaw angle in the XZ plane between the object direction and the direction towards a position.
   *
   * @param object - Object whose position is used as the origin of the target direction.
   * @param position - Target position to measure the angle towards.
   * @param direction - Reference direction to measure the angle from.
   * @returns Yaw angle between the reference direction and the direction towards the position.
   */
  public getAngleXZ(object: GameObject, position: Vector, direction: Vector): number {
    const dir1: Vector = direction;

    dir1.y = 0;

    // todo: just sub vectors?
    const dir2: Vector = createVector(position.x, position.y, position.z).sub(object.position());

    dir2.y = 0;

    return yaw(dir1, dir2);
  }
}
