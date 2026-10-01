import { LuabindClass, object_binder } from "xray16";
import { GameObject, NetPacket, NetReader, ServerObject } from "xray16/alias";
import { Nillable, TDuration, TNumberId } from "xray16/lib";
import { $filename, $isNotNil } from "xray16/macros";

import {
  closeLoadMarker,
  closeSaveMarker,
  getManager,
  IRegistryObjectState,
  openLoadMarker,
  openSaveMarker,
  registerZone,
  registry,
  resetObject,
  unregisterZone,
} from "@/engine/core/database";
import { loadObjectLogic, saveObjectLogic } from "@/engine/core/database/logic";
import { EGameEvent, EventsManager } from "@/engine/core/managers/events";
import { mapDisplayConfig } from "@/engine/core/managers/map/MapDisplayConfig";
import { SoundManager } from "@/engine/core/managers/sounds/SoundManager";
import { soundsConfig } from "@/engine/core/managers/sounds/SoundsConfig";
import { emitSchemeEvent, initializeObjectSchemeLogic } from "@/engine/core/schemes/runtime";
import { getActiveSchemeStateOptimistic, hasActiveScheme } from "@/engine/core/schemes/state";
import { ESchemeEvent, ESchemeType } from "@/engine/core/schemes/types";
import { giveInfoPortion } from "@/engine/core/utils/info_portion";
import { LuaLogger } from "@/engine/core/utils/logging";

const logger: LuaLogger = new LuaLogger($filename);

/**
 * Object binder for restrictor zones.
 */
@LuabindClass()
export class RestrictorBinder extends object_binder {
  public isInitialized: boolean = false;
  public isLoaded: boolean = false;
  public isVisited: boolean = false;

  public visitCheckElapsed: TDuration = mapDisplayConfig.DISTANCE_CHECK_INTERVAL;

  public override reinit(): void {
    super.reinit();

    this.isInitialized = false;
    resetObject(this.object);
  }

  public override net_spawn(object: ServerObject): boolean {
    if (!super.net_spawn(object)) {
      return false;
    }

    logger.info("Go online: %s", this.object.name());

    registerZone(this.object);

    const objectId: TNumberId = this.object.id();

    // todo: ???
    if (soundsConfig.looped.has(objectId)) {
      const soundManager: SoundManager = getManager(SoundManager);

      for (const [sound] of soundsConfig.looped.get(objectId)) {
        soundManager.playLooped(objectId, sound);
      }
    }

    return true;
  }

  public override net_destroy(): void {
    const object: GameObject = this.object;
    const objectId: TNumberId = object.id();
    const state: IRegistryObjectState = registry.objects.get(objectId);

    logger.info("Go offline: %s", object.name());

    getManager(SoundManager).stop(objectId);

    if (hasActiveScheme(state)) {
      emitSchemeEvent(getActiveSchemeStateOptimistic(state), ESchemeEvent.SWITCH_OFFLINE, object);
    }

    unregisterZone(object);

    super.net_destroy();
  }

  public override update(delta: TDuration): void {
    super.update(delta);

    const actor: Nillable<GameObject> = registry.actor;
    const object: GameObject = this.object;
    const objectId: TNumberId = object.id();
    const state: IRegistryObjectState = registry.objects.get(objectId);

    if ($isNotNil(actor)) {
      if (!this.isInitialized) {
        this.isInitialized = true;

        initializeObjectSchemeLogic(object, state, this.isLoaded, ESchemeType.RESTRICTOR);
      }

      if (!this.isVisited) {
        this.visitCheckElapsed += delta;

        if (this.visitCheckElapsed >= mapDisplayConfig.DISTANCE_CHECK_INTERVAL) {
          this.visitCheckElapsed = 0;

          if (object.inside(registry.actor.position(), mapDisplayConfig.DISTANCE_TO_OPEN)) {
            logger.info("Visited: %s", object.name());

            this.isVisited = true;
            giveInfoPortion(string.format("%s_visited", object.name()));
            EventsManager.emitEvent(EGameEvent.RESTRICTOR_ZONE_VISITED, object, this);
          }
        }
      }
    }

    if (hasActiveScheme(state)) {
      emitSchemeEvent(getActiveSchemeStateOptimistic(state), ESchemeEvent.UPDATE, delta);
    }

    if (soundsConfig.playing.has(objectId)) {
      getManager(SoundManager).updateObject(objectId);
    }
  }

  public override net_save_relevant(): boolean {
    return true;
  }

  public override save(packet: NetPacket): void {
    openSaveMarker(packet, RestrictorBinder.__name);

    super.save(packet);

    saveObjectLogic(this.object, packet);

    packet.w_bool(this.isVisited);

    closeSaveMarker(packet, RestrictorBinder.__name);
  }

  public override load(reader: NetReader): void {
    this.isLoaded = true;

    openLoadMarker(reader, RestrictorBinder.__name);

    super.load(reader);

    loadObjectLogic(this.object, reader);

    this.isVisited = reader.r_bool();

    closeLoadMarker(reader, RestrictorBinder.__name);
  }
}
