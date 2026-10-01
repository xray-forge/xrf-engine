import { CArtefact, game_graph, level } from "xray16";
import { GameObject, NetPacket, NetProcessor } from "xray16/alias";
import { AnyObject, createVector, Nillable, TCount, TName, TNumberId } from "xray16/lib";
import { $filename } from "xray16/macros";

import { TLevel } from "@/engine/constants/levels";
import type { AnomalyZoneBinder } from "@/engine/core/binders/zones";
import {
  closeLoadMarker,
  closeSaveMarker,
  getManager,
  openLoadMarker,
  openSaveMarker,
  registry,
} from "@/engine/core/database";
import { AbstractManager } from "@/engine/core/managers/abstract";
import { EGameEvent, EventsManager } from "@/engine/core/managers/events";
import { updateAnomalyZonesDisplay } from "@/engine/core/managers/map/utils";
import { isSurgeEnabledOnLevel } from "@/engine/core/managers/surge/utils/surge_generic";
import { isArtefact } from "@/engine/core/utils/class_ids";
import { LuaLogger } from "@/engine/core/utils/logging";

const logger: LuaLogger = new LuaLogger($filename);

/**
 * Manage artefacts of anomaly zones: respawning them after surges, and releasing the ones the actor takes.
 */
export class ArtefactManager extends AbstractManager {
  // Levels whose anomaly zones respawn their artefacts once the actor is there.
  public respawnLevels: LuaTable<TName, boolean> = new LuaTable();

  public override initialize(): void {
    const eventsManager: EventsManager = getManager(EventsManager);

    eventsManager.registerCallback(EGameEvent.DUMP_LUA_DATA, this.onDebugDump, this);
    eventsManager.registerCallback(EGameEvent.ACTOR_FIRST_UPDATE, this.onActorFirstUpdate, this);
    eventsManager.registerCallback(EGameEvent.ACTOR_ITEM_TAKE, this.onActorItemTake, this);
    eventsManager.registerCallback(EGameEvent.SURGE_ENDED, this.onSurgeFinished, this);
    eventsManager.registerCallback(EGameEvent.SURGE_SKIPPED, this.onSurgeFinished, this);
  }

  public override destroy(): void {
    const eventsManager: EventsManager = getManager(EventsManager);

    eventsManager.unregisterCallback(EGameEvent.DUMP_LUA_DATA, this.onDebugDump);
    eventsManager.unregisterCallback(EGameEvent.ACTOR_FIRST_UPDATE, this.onActorFirstUpdate);
    eventsManager.unregisterCallback(EGameEvent.ACTOR_ITEM_TAKE, this.onActorItemTake);
    eventsManager.unregisterCallback(EGameEvent.SURGE_ENDED, this.onSurgeFinished);
    eventsManager.unregisterCallback(EGameEvent.SURGE_SKIPPED, this.onSurgeFinished);
  }

  public override save(packet: NetPacket): void {
    openSaveMarker(packet, ArtefactManager.name);

    packet.w_u16(table.size(this.respawnLevels));

    for (const [levelName] of this.respawnLevels) {
      packet.w_stringZ(levelName);
    }

    closeSaveMarker(packet, ArtefactManager.name);
  }

  public override load(reader: NetProcessor): void {
    openLoadMarker(reader, ArtefactManager.name);

    this.respawnLevels = new LuaTable();

    const count: TCount = reader.r_u16();

    for (const _ of $range(1, count)) {
      this.respawnLevels.set(reader.r_stringZ(), true);
    }

    closeLoadMarker(reader, ArtefactManager.name);
  }

  /**
   * Handle actor first update on a level, respawning its artefacts if a surge finished while the actor was elsewhere.
   * Anomaly zones of the level are registered by then, as they go online with the level.
   */
  public onActorFirstUpdate(): void {
    if (this.respawnLevels.get(level.name())) {
      this.respawnArtefacts();
    }
  }

  /**
   * Respawn artefacts and change layers of anomaly zones on the current level, then refresh the map display.
   */
  public respawnArtefacts(): void {
    logger.info("Respawn artefacts on level: %s", level.name());

    this.respawnLevels.delete(level.name());

    for (const [, anomalyZone] of registry.anomalyZones) {
      anomalyZone.respawnArtefactsAndChangeLayers();
    }

    updateAnomalyZonesDisplay();
  }

  /**
   * Handle a surge ended or skipped: it reaches every level surges happen on, reshuffling their anomaly zones.
   * The current level respawns its artefacts at once, the others once the actor gets there.
   */
  public onSurgeFinished(): void {
    const currentLevel: TLevel = level.name();

    for (const gameLevel of game_graph().levels()) {
      const levelName: TLevel = registry.simulator.level_name<TLevel>(gameLevel.id);

      if (levelName !== currentLevel && isSurgeEnabledOnLevel(levelName)) {
        this.respawnLevels.set(levelName, true);
      }
    }

    if (isSurgeEnabledOnLevel(currentLevel)) {
      this.respawnArtefacts();
    }
  }

  /**
   * Handle actor taking an artefact: release it from its anomaly zone and stop it following its path.
   *
   * @param object - Taken by actor game object.
   */
  public onActorItemTake(object: GameObject): void {
    if (!isArtefact(object)) {
      return;
    }

    logger.info("On artefact take: %s", object.name());

    const id: TNumberId = object.id();
    const zone: Nillable<AnomalyZoneBinder> = registry.artefacts.parentZones.get(id) as Nillable<AnomalyZoneBinder>;

    if (zone) {
      zone.onArtefactTaken(id);
    } else {
      registry.artefacts.ways.delete(id);
    }

    (object.get_artefact() as CArtefact).FollowByPath("NULL", 0, createVector(500, 500, 500));
  }

  /**
   * Handle dump data event.
   *
   * @param data - Data to dump into file.
   */
  public onDebugDump(data: AnyObject): AnyObject {
    data[this.constructor.name] = {
      respawnLevels: this.respawnLevels,
    };

    return data;
  }
}
