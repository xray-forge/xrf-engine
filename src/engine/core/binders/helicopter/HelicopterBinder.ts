import { callback, CHelicopter, clsid, level, LuabindClass, object_binder } from "xray16";
import { GameObject, NetPacket, NetReader, ServerObject, TClassId, Vector } from "xray16/alias";
import { Nillable, TDistance, TDuration, TIndex, TNumberId, TRate } from "xray16/lib";
import { $isNotNil } from "xray16/macros";

import {
  closeLoadMarker,
  closeSaveMarker,
  getManager,
  IRegistryObjectState,
  openLoadMarker,
  openSaveMarker,
  registerHelicopter,
  registry,
  resetObject,
  SYSTEM_INI,
  unregisterHelicopter,
  unregisterHelicopterFromList,
} from "@/engine/core/database";
import { loadObjectLogic, saveObjectLogic } from "@/engine/core/database/logic";
import { readIniNumber } from "@/engine/core/ini";
import { SoundManager } from "@/engine/core/managers/sounds/SoundManager";
import { HelicopterCombatController } from "@/engine/core/schemes/helicopter/heli_move/combat/HelicopterCombatController";
import { HelicopterFireController } from "@/engine/core/schemes/helicopter/heli_move/fire/HelicopterFireController";
import { getHelicopterFireController } from "@/engine/core/schemes/helicopter/heli_move/utils";
import { emitSchemeEvent, initializeObjectSchemeLogic } from "@/engine/core/schemes/runtime";
import { getActiveSchemeStateOptimistic, hasActiveScheme } from "@/engine/core/schemes/state";
import { ESchemeEvent, ESchemeType } from "@/engine/core/schemes/types";
import { getHelicopterHealth } from "@/engine/core/utils/helicopter";

/**
 * Binder for helicopter game object events and logics.
 */
@LuabindClass()
export class HelicopterBinder extends object_binder {
  public isLoaded: boolean = false;
  public isInitialized: boolean = false;

  public state!: IRegistryObjectState;
  public helicopter: CHelicopter;
  public helicopterFireController: HelicopterFireController;
  public combatController!: HelicopterCombatController;

  public flameStartHealth: TRate = 0;

  public constructor(object: GameObject) {
    super(object);

    this.helicopter = this.object.get_helicopter();
    this.helicopterFireController = getHelicopterFireController(object);
  }

  public override reinit(): void {
    super.reinit();

    this.isInitialized = false;
    this.state = resetObject(this.object);

    this.combatController = new HelicopterCombatController(this.object);
    this.flameStartHealth = readIniNumber(SYSTEM_INI, "helicopter", "flame_start_health", true);

    this.object.set_callback(callback.helicopter_on_point, this.onWaypoint, this);
    this.object.set_callback(callback.helicopter_on_hit, this.onHit, this);
  }

  public override update(delta: TDuration): void {
    super.update(delta);

    if (!this.isInitialized && $isNotNil(registry.actor)) {
      this.isInitialized = true;
      initializeObjectSchemeLogic(this.object, this.state, this.isLoaded, ESchemeType.HELICOPTER);
    }

    if (hasActiveScheme(this.state)) {
      emitSchemeEvent(getActiveSchemeStateOptimistic(this.state), ESchemeEvent.UPDATE, delta);
    }

    // Check helicopter health and state.
    if (!this.helicopter.m_dead) {
      const health: TRate = getHelicopterHealth(this.helicopter, this.state.invulnerable);

      if (health < this.flameStartHealth && !this.helicopter.m_flame_started) {
        this.helicopter.StartFlame();
      }

      if (health <= 0.005 && !this.state.immortal) {
        this.helicopter.Die();
        unregisterHelicopterFromList(this.object);
      }
    }

    getManager(SoundManager).updateObject(this.object.id());
  }

  public override net_spawn(object: ServerObject): boolean {
    if (!super.net_spawn(object)) {
      return false;
    }

    registerHelicopter(this);

    return true;
  }

  public override net_destroy(): void {
    this.resetCallbacks();

    unregisterHelicopter(this);

    super.net_destroy();
  }

  public override net_save_relevant(): boolean {
    return true;
  }

  public override save(packet: NetPacket): void {
    openSaveMarker(packet, HelicopterBinder.__name);

    super.save(packet);

    saveObjectLogic(this.object, packet);

    closeSaveMarker(packet, HelicopterBinder.__name);

    this.combatController.save(packet);
  }

  public override load(reader: NetReader): void {
    this.isLoaded = true;

    openLoadMarker(reader, HelicopterBinder.__name);

    super.load(reader);

    loadObjectLogic(this.object, reader);

    closeLoadMarker(reader, HelicopterBinder.__name);

    this.combatController.load(reader);
  }

  /**
   * Clear engine callbacks installed by the binder.
   */
  public resetCallbacks(): void {
    this.object.set_callback(callback.helicopter_on_point, null);
    this.object.set_callback(callback.helicopter_on_hit, null);
  }

  /**
   * @param power - Hit power.
   * @param impulse - Impulse power.
   * @param type - Type of the hit.
   * @param objectId - Object hitting helicopter.
   */
  public onHit(power: TRate, impulse: TRate, type: TNumberId, objectId: TNumberId): void {
    const enemy: Nillable<GameObject> = level.object_by_id(objectId);
    const enemyClassId: Nillable<TClassId> = enemy?.clsid() as Nillable<TClassId>;

    this.helicopterFireController.enemy = enemy;
    this.helicopterFireController.onHit();

    if (this.state.hit && (enemyClassId === clsid.actor || enemyClassId === clsid.script_stalker)) {
      emitSchemeEvent(this.state.hit, ESchemeEvent.HIT, this.object, power, null, enemy, null);
    }
  }

  /**
   * @param distance - Waypoint distance.
   * @param position - Waypoint position.
   * @param index - Patrol point index.
   */
  public onWaypoint(distance: TDistance, position: Vector, index: TIndex): void {
    if (hasActiveScheme(this.state)) {
      emitSchemeEvent(getActiveSchemeStateOptimistic(this.state), ESchemeEvent.WAYPOINT, this.object, null, index);
    }
  }
}
