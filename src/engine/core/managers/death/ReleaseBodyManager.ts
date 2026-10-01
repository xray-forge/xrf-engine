import { game_graph } from "xray16";
import { GameObject, NetPacket, NetProcessor, ServerObject } from "xray16/alias";
import { AnyObject, Nillable, TCount, TIndex, TNumberId } from "xray16/lib";
import { $filename, $isNil } from "xray16/macros";

import {
  closeLoadMarker,
  closeSaveMarker,
  getManager,
  openLoadMarker,
  openSaveMarker,
  registry,
} from "@/engine/core/database";
import { AbstractManager } from "@/engine/core/managers/abstract";
import { deathConfig } from "@/engine/core/managers/death/DeathConfig";
import { canReleaseObjectCorpse, getFarthestCorpseToRelease } from "@/engine/core/managers/death/utils/death_utils";
import { EGameEvent, EventsManager } from "@/engine/core/managers/events";
import { isCreature } from "@/engine/core/utils/class_ids";
import { LuaLogger } from "@/engine/core/utils/logging";
import { resetTable } from "@/engine/core/utils/table";

const logger: LuaLogger = new LuaLogger($filename);

/**
 * Manage persisting stalker corpses, as vanilla does.
 * Release the farthest of them when there are more than the limit.
 *
 * Only corpses of the actor level are tracked: loading on another level drops the list,
 * and corpses of a level are registered again when they come online.
 */
export class ReleaseBodyManager extends AbstractManager {
  public override initialize(): void {
    const manager: EventsManager = getManager(EventsManager);

    manager.registerCallback(EGameEvent.DUMP_LUA_DATA, this.onDebugDump, this);
    manager.registerCallback(EGameEvent.STALKER_DEATH, this.onStalkerDeath, this);
  }

  public override destroy(): void {
    const manager: EventsManager = getManager(EventsManager);

    manager.unregisterCallback(EGameEvent.DUMP_LUA_DATA, this.onDebugDump);
    manager.unregisterCallback(EGameEvent.STALKER_DEATH, this.onStalkerDeath);
  }

  public override save(packet: NetPacket): void {
    openSaveMarker(packet, ReleaseBodyManager.name);

    const count: TCount = deathConfig.RELEASE_OBJECTS_REGISTRY.length();

    packet.w_u16(count);

    for (const [, id] of deathConfig.RELEASE_OBJECTS_REGISTRY) {
      packet.w_u16(id);
    }

    const levelId: TNumberId = game_graph().vertex(registry.actorServer.m_game_vertex_id).level_id();

    packet.w_u16(levelId);

    closeSaveMarker(packet, ReleaseBodyManager.name);
  }

  public override load(reader: NetProcessor): void {
    openLoadMarker(reader, ReleaseBodyManager.name);

    const count: TCount = reader.r_u16();

    resetTable(deathConfig.RELEASE_OBJECTS_REGISTRY);

    for (const index of $range(1, count)) {
      deathConfig.RELEASE_OBJECTS_REGISTRY.set(index, reader.r_u16());
    }

    const levelId: TNumberId = reader.r_u16();

    // Is not same level, reset corpses list.
    if (levelId !== game_graph().vertex(registry.actorServer.m_game_vertex_id).level_id()) {
      resetTable(deathConfig.RELEASE_OBJECTS_REGISTRY);
    }

    closeLoadMarker(reader, ReleaseBodyManager.name);
  }

  /**
   * Register provided object as corpse and try to release other objects that are far from the actor.
   *
   * @param object - Game object to register as corpse.
   */
  public registerCorpse(object: GameObject): void {
    // Nothing to do with corpse, is quest related / has quest items.
    if (!canReleaseObjectCorpse(object)) {
      return;
    }

    for (const [, id] of deathConfig.RELEASE_OBJECTS_REGISTRY) {
      if (id === object.id()) {
        return;
      }
    }

    logger.info(
      "Register corpse object: %s, %s/%s",
      object.name(),
      deathConfig.RELEASE_OBJECTS_REGISTRY.length(),
      deathConfig.MAX_BODY_COUNT
    );

    table.insert(deathConfig.RELEASE_OBJECTS_REGISTRY, object.id());

    if (deathConfig.RELEASE_OBJECTS_REGISTRY.length() > deathConfig.MAX_BODY_COUNT) {
      this.releaseCorpses();
    }
  }

  /**
   * Release corpses of game objects that are over current permitted corpses cap.
   * Checks that corpses can be released (no quest items, no quest NPCs) and are far from the player.
   */
  public releaseCorpses(): void {
    logger.info("Try to release corpses");

    for (let index: TCount = deathConfig.RELEASE_OBJECTS_REGISTRY.length(); index > 0; index--) {
      const object: Nillable<ServerObject> = registry.simulator.object(deathConfig.RELEASE_OBJECTS_REGISTRY.get(index));

      // Keep alive creatures, the server sees a creature that has just died as alive until its next update.
      if (object && isCreature(object)) {
        continue;
      }

      table.remove(deathConfig.RELEASE_OBJECTS_REGISTRY, index);
    }

    const countToRelease: TCount = deathConfig.RELEASE_OBJECTS_REGISTRY.length() - deathConfig.MAX_BODY_COUNT;

    for (const _ of $range(1, countToRelease)) {
      const [index, object] = getFarthestCorpseToRelease(deathConfig.RELEASE_OBJECTS_REGISTRY);

      // Nothing to release, can skip further checks.
      if ($isNil(object)) {
        return;
      }

      logger.info("Releasing object: %s", object.name());

      registry.simulator.release(object, true);
      table.remove(deathConfig.RELEASE_OBJECTS_REGISTRY, index as TIndex);
    }
  }

  /**
   * Handle game object death.
   *
   * @param object - Game object facing death event.
   */
  public onStalkerDeath(object: GameObject): void {
    this.registerCorpse(object);
  }

  /**
   * Handle dump data event.
   *
   * @param data - Data to dump into file.
   */
  public onDebugDump(data: AnyObject): AnyObject {
    data[this.constructor.name] = {
      deathConfig: deathConfig,
    };

    return data;
  }
}
