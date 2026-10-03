import { callback, LuabindClass, object_binder, time_global } from "xray16";
import { NetPacket, NetReader, ServerObject } from "xray16/alias";
import { TDuration, TTimestamp } from "xray16/lib";
import { $filename } from "xray16/macros";

import {
  closeLoadMarker,
  closeSaveMarker,
  loadObjectLogic,
  markCrowDead,
  openLoadMarker,
  openSaveMarker,
  registerCrow,
  registry,
  resetObject,
  saveObjectLogic,
  unregisterCrow,
} from "@/engine/core/database";
import { crowSpawnerConfig } from "@/engine/core/schemes/restrictor/sr_crow_spawner/CrowSpawnerConfig";
import { LuaLogger } from "@/engine/core/utils/logging";

const logger: LuaLogger = new LuaLogger($filename);

/**
 * Binder of crow game object with wrapped lifecycle.
 */
@LuabindClass()
export class CrowBinder extends object_binder {
  public diedAt: TTimestamp = 0;

  public override net_save_relevant(): boolean {
    return true;
  }

  public override reinit(): void {
    super.reinit();

    this.diedAt = 0;

    resetObject(this.object);
  }

  public override net_spawn(object: ServerObject): boolean {
    if (!super.net_spawn(object)) {
      return false;
    }

    registerCrow(this.object);

    this.object.set_callback(callback.death, this.onDeath, this);

    return true;
  }

  public override net_destroy(): void {
    this.object.set_callback(callback.death, null);

    unregisterCrow(this.object);

    super.net_destroy();
  }

  public override update(delta: TDuration): void {
    super.update(delta);

    if (
      this.diedAt !== 0 &&
      !this.object.alive() &&
      time_global() - crowSpawnerConfig.CROW_CORPSE_RELEASE_TIMEOUT >= this.diedAt
    ) {
      logger.info("Release dead crow");
      registry.simulator.release(registry.simulator.object(this.object.id()), true);
    }
  }

  public override save(packet: NetPacket): void {
    openSaveMarker(packet, CrowBinder.__name);

    super.save(packet);
    saveObjectLogic(this.object, packet);
    packet.w_u32(this.diedAt);

    closeSaveMarker(packet, CrowBinder.__name);
  }

  public override load(reader: NetReader): void {
    openLoadMarker(reader, CrowBinder.__name);

    super.load(reader);
    loadObjectLogic(this.object, reader);

    this.diedAt = reader.r_u32();
    closeLoadMarker(reader, CrowBinder.__name);
  }

  /**
   * On crow object death.
   */
  public onDeath(): void {
    logger.info("Crow death: %s", this.object.name());

    this.diedAt = time_global();

    markCrowDead(this.object);
  }
}
