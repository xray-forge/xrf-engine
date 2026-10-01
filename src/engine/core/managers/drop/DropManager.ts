import { GameObject } from "xray16/alias";
import { AnyObject } from "xray16/lib";

import { getManager } from "@/engine/core/database";
import { AbstractManager } from "@/engine/core/managers/abstract";
import { DROP_MANAGER_CONFIG_LTX, dropConfig } from "@/engine/core/managers/drop/DropConfig";
import { createCorpseReleaseItems, readIniDropCountByLevel } from "@/engine/core/managers/drop/utils";
import { EGameEvent, EventsManager } from "@/engine/core/managers/events";

/**
 * Manage objects loot after death.
 */
export class DropManager extends AbstractManager {
  public override initialize(): void {
    // Read after game is started and level/simulation is initialized, the only part of drop config that depends on
    // the level and difficulty, the rest of it is static.
    dropConfig.ITEMS_DROP_COUNT_BY_LEVEL = readIniDropCountByLevel(DROP_MANAGER_CONFIG_LTX);

    const manager: EventsManager = getManager(EventsManager);

    manager.registerCallback(EGameEvent.DUMP_LUA_DATA, this.onDebugDump, this);
    manager.registerCallback(EGameEvent.STALKER_DEATH, this.onStalkerDeath, this);
  }

  public override destroy(): void {
    const manager: EventsManager = getManager(EventsManager);

    manager.unregisterCallback(EGameEvent.DUMP_LUA_DATA, this.onDebugDump);
    manager.unregisterCallback(EGameEvent.STALKER_DEATH, this.onStalkerDeath);
  }

  /**
   * Force spawn of death  loot for an object.
   * In cases of spawning death creatures there will be no death event, so forced spawn can help with it.
   *
   * @param object - Game object to spawn loot for.
   */
  public forceCorpseReleaseItemsSpawn(object: GameObject): void {
    createCorpseReleaseItems(object);
  }

  /**
   * Handle game object death.
   * Spawn required loot, filter existing loot and mark state of items in inventory.
   *
   * @param object - Game object facing death event.
   */
  public onStalkerDeath(object: GameObject): void {
    createCorpseReleaseItems(object);
  }

  /**
   * Handle dump data event.
   *
   * @param data - Data to dump into file.
   */
  public onDebugDump(data: AnyObject): AnyObject {
    data[this.constructor.name] = {
      dropConfig: dropConfig,
    };

    return data;
  }
}
