import { callback, level, LuabindClass, object_binder } from "xray16";
import { GameObject, IniFile, NetPacket, NetReader, ServerObject, Vector } from "xray16/alias";
import { Nillable, TCount, TDuration, TIndex, TNumberId } from "xray16/lib";
import { $filename, $isNotNil } from "xray16/macros";

import { mapMarks } from "@/engine/constants/map_marks";
import {
  closeLoadMarker,
  closeSaveMarker,
  getManager,
  IRegistryObjectState,
  openLoadMarker,
  openSaveMarker,
  registerObject,
  registry,
  resetObject,
  unregisterObject,
} from "@/engine/core/database";
import { loadObjectLogic, saveObjectLogic } from "@/engine/core/database/logic";
import { pickSectionFromCondList, TConditionList } from "@/engine/core/ini";
import { BoxManager, isBoxObject } from "@/engine/core/managers/box";
import { SoundManager } from "@/engine/core/managers/sounds/SoundManager";
import { emitSchemeEvent, initializeObjectSchemeLogic } from "@/engine/core/schemes/runtime";
import {
  getActiveSchemeStateOptimistic,
  getSchemeStateOptimistic,
  hasActiveScheme,
  hasSchemeState,
} from "@/engine/core/schemes/state";
import { EScheme, ESchemeEvent, ESchemeType } from "@/engine/core/schemes/types";
import { LuaLogger } from "@/engine/core/utils/logging";

const logger: LuaLogger = new LuaLogger($filename);

/**
 * Binder of physic game objects.
 */
@LuabindClass()
export class PhysicObjectBinder extends object_binder {
  public isInitialized: boolean = false;
  public isLoaded: boolean = false;

  public state!: IRegistryObjectState;

  public override reinit(): void {
    super.reinit();

    this.isInitialized = false;
    this.state = resetObject(this.object);
  }

  public override net_spawn(object: ServerObject): boolean {
    if (!super.net_spawn(object)) {
      return false;
    }

    logger.info("Go online: %s", object.name());

    const ini: Nillable<IniFile> = this.object.spawn_ini() as Nillable<IniFile>;

    if (ini && ini.section_exist("level_spot") && ini.line_exist("level_spot", "actor_box")) {
      level.map_add_object_spot(this.object.id(), mapMarks.ui_pda2_actor_box_location, "st_ui_pda_actor_box");
    }

    registerObject(this.object);

    this.setupCallbacks();

    return true;
  }

  public override net_destroy(): void {
    const object: GameObject = this.object;
    const objectId: TNumberId = object.id();

    logger.info("Go offline: %s", object.name());

    this.resetCallbacks();

    if (level.map_has_object_spot(objectId, mapMarks.ui_pda2_actor_box_location) !== 0) {
      level.map_remove_object_spot(objectId, mapMarks.ui_pda2_actor_box_location);
    }

    getManager(SoundManager).stop(objectId);

    const state: IRegistryObjectState = registry.objects.get(objectId);

    if (hasActiveScheme(state)) {
      emitSchemeEvent(getActiveSchemeStateOptimistic(state), ESchemeEvent.SWITCH_OFFLINE, object);
    }

    const onOfflineCondlist: Nillable<TConditionList> = state?.overrides?.onOffline as Nillable<TConditionList>;

    if (onOfflineCondlist) {
      pickSectionFromCondList(registry.actor, object, onOfflineCondlist);
    }

    unregisterObject(object);

    super.net_destroy();
  }

  public override update(delta: TDuration): void {
    super.update(delta);

    if (!this.isInitialized && $isNotNil(registry.actor)) {
      this.isInitialized = true;
      initializeObjectSchemeLogic(this.object, this.state, this.isLoaded, ESchemeType.OBJECT);
    }

    if (hasActiveScheme(this.state)) {
      emitSchemeEvent(getActiveSchemeStateOptimistic(this.state), ESchemeEvent.UPDATE, delta);
    }

    getManager(SoundManager).updateObject(this.object.id());
  }

  public override net_save_relevant(): boolean {
    return true;
  }

  public override save(packet: NetPacket): void {
    openSaveMarker(packet, PhysicObjectBinder.__name);

    super.save(packet);
    saveObjectLogic(this.object, packet);

    closeSaveMarker(packet, PhysicObjectBinder.__name);
  }

  public override load(reader: NetReader): void {
    this.isLoaded = true;

    openLoadMarker(reader, PhysicObjectBinder.__name);

    super.load(reader);
    loadObjectLogic(this.object, reader);

    closeLoadMarker(reader, PhysicObjectBinder.__name);
  }

  /**
   * Setup binder callback on going online.
   */
  public setupCallbacks(): void {
    this.object.set_callback(callback.hit, this.onHit, this);
    this.object.set_callback(callback.death, this.onDeath, this);
    this.object.set_callback(callback.use_object, this.onUse, this);
  }

  /**
   * Clear binder callbacks before the script binder instance is destroyed.
   */
  public resetCallbacks(): void {
    this.object.set_callback(callback.hit, null);
    this.object.set_callback(callback.death, null);
    this.object.set_callback(callback.use_object, null);
  }

  /**
   * Handle object being used.
   *
   * @param object - Game object being used.
   * @param who - Game object using it.
   */
  public onUse(object: GameObject, who: Nillable<GameObject>): void {
    logger.info("Object used: %s (%s) by %s", object.name(), object.section(), who?.name());

    if (hasActiveScheme(this.state)) {
      emitSchemeEvent(getActiveSchemeStateOptimistic(this.state), ESchemeEvent.USE, object, who);
    }
  }

  /**
   * Handle object being hit.
   * Emit corresponding event to capture them with activated schemes.
   *
   * @param object - Game object being hit.
   * @param amount - Amount of damage with hit.
   * @param direction - Direction of the hit relative to current object.
   * @param who - Object hitting current object.
   * @param boneIndex - Index of the bone being hit.
   */
  public onHit(object: GameObject, amount: TCount, direction: Vector, who: GameObject, boneIndex: TIndex): void {
    // logger.format("Object hit: %s by %s", object.name(), object.section(), who.name());

    if (hasSchemeState(this.state, EScheme.HIT)) {
      emitSchemeEvent(
        getSchemeStateOptimistic(this.state, EScheme.HIT),
        ESchemeEvent.HIT,
        object,
        amount,
        direction,
        who,
        boneIndex
      );
    }

    if (hasActiveScheme(this.state)) {
      emitSchemeEvent(
        getActiveSchemeStateOptimistic(this.state),
        ESchemeEvent.HIT,
        object,
        amount,
        direction,
        who,
        boneIndex
      );
    }
  }

  /**
   * Handle destruction of the physical object.
   *
   * @param object - Game object that was killed/destroyed.
   * @param who - Game object that destroyed it.
   */
  public onDeath(object: GameObject, who: GameObject): void {
    logger.info("Object destroyed: %s (%s) by %s", object.name(), object.section(), who.name());

    if (hasActiveScheme(this.state)) {
      emitSchemeEvent(getActiveSchemeStateOptimistic(this.state), ESchemeEvent.DEATH, object, who);
    }

    if (this.object.spawn_ini()?.section_exist("drop_box") || isBoxObject(this.object)) {
      getManager(BoxManager).spawnBoxObjectItems(this.object);
    }
  }
}
