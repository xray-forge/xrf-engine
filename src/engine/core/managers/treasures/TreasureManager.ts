import { time_global } from "xray16";
import { AlifeSimulator, GameObject, IniFile, NetPacket, NetProcessor, ServerObject } from "xray16/alias";
import {
  AnyObject,
  assert,
  LuaArray,
  Nillable,
  TCount,
  TName,
  TNumberId,
  TProbability,
  TRUE,
  TStringId,
  TTimestamp,
} from "xray16/lib";
import { $filename } from "xray16/macros";

import { SECRET_SECTION } from "@/engine/constants/sections";
import {
  closeLoadMarker,
  closeSaveMarker,
  getManager,
  openLoadMarker,
  openSaveMarker,
  registry,
} from "@/engine/core/database";
import { pickSectionFromCondList } from "@/engine/core/ini";
import { AbstractManager } from "@/engine/core/managers/abstract";
import { EGameEvent, EventsManager } from "@/engine/core/managers/events";
import { removeTreasureMapSpot, showTreasureMapSpot } from "@/engine/core/managers/map/utils";
import {
  ENotificationType,
  ETreasureState,
  ITreasureNotification,
} from "@/engine/core/managers/notifications/notifications_types";
import { treasureConfig } from "@/engine/core/managers/treasures/TreasureConfig";
import { ITreasureDescriptor, ITreasureItemsDescriptor } from "@/engine/core/managers/treasures/treasures_types";
import { LuaLogger } from "@/engine/core/utils/logging";

const logger: LuaLogger = new LuaLogger($filename);

/**
 * Manager to handle treasures indication, giving and completion for actor.
 */
export class TreasureManager extends AbstractManager {
  /**
   * Share treasure coordinates with the actor.
   */
  public static giveTreasureCoordinates(treasureId: TStringId): void {
    return getManager(TreasureManager).giveActorTreasureCoordinates(treasureId);
  }

  /**
   * Register server object in treasure manager.
   */
  public static registerItem(serverObject: ServerObject): boolean {
    return getManager(TreasureManager).onRegisterItem(serverObject);
  }

  public areItemsSpawned: boolean = false;
  public lastUpdatedAt: TTimestamp = -Infinity;

  public treasuresRestrictorByName: LuaTable<TName, TNumberId> = new LuaTable(); // Restrictor ID by name.
  public treasuresRestrictorByItem: LuaTable<TNumberId, TNumberId> = new LuaTable(); // Restrictor ID by item ID.

  public override initialize(): void {
    const eventsManager: EventsManager = getManager(EventsManager);

    eventsManager.registerCallback(EGameEvent.DUMP_LUA_DATA, this.onDebugDump, this);
    eventsManager.registerCallback(EGameEvent.ACTOR_UPDATE, this.update, this);
    eventsManager.registerCallback(EGameEvent.ACTOR_ITEM_TAKE, this.onActorItemTake, this);
    eventsManager.registerCallback(EGameEvent.RESTRICTOR_ZONE_REGISTERED, this.onRegisterRestrictor, this);
  }

  public override destroy(): void {
    const eventsManager: EventsManager = getManager(EventsManager);

    eventsManager.unregisterCallback(EGameEvent.DUMP_LUA_DATA, this.onDebugDump);
    eventsManager.unregisterCallback(EGameEvent.ACTOR_UPDATE, this.update);
    eventsManager.unregisterCallback(EGameEvent.ACTOR_ITEM_TAKE, this.onActorItemTake);
    eventsManager.unregisterCallback(EGameEvent.RESTRICTOR_ZONE_REGISTERED, this.onRegisterRestrictor);
  }

  public override update(): void {
    if (!this.areItemsSpawned) {
      this.spawnTreasures();
    }

    const now: TTimestamp = time_global();

    if (now - this.lastUpdatedAt >= treasureConfig.UPDATED_PERIOD) {
      this.lastUpdatedAt = now;
    } else {
      return;
    }

    // Handle treasure refreshing and emptying by condition with each tick.
    for (const [section, descriptor] of treasureConfig.TREASURES) {
      if (descriptor.given) {
        if (
          descriptor.empty &&
          !descriptor.checked &&
          pickSectionFromCondList(registry.actor, null, descriptor.empty) === TRUE
        ) {
          descriptor.empty = null;
          descriptor.checked = true;

          removeTreasureMapSpot(this.treasuresRestrictorByName.get(section), descriptor);

          EventsManager.emitEvent(EGameEvent.TREASURE_FOUND, descriptor);
        } else if (
          descriptor.refreshing &&
          descriptor.checked &&
          pickSectionFromCondList(registry.actor, null, descriptor.refreshing) === TRUE
        ) {
          descriptor.given = false;
          descriptor.checked = false;
        }
      }
    }
  }

  public override save(packet: NetPacket): void {
    openSaveMarker(packet, TreasureManager.name);

    packet.w_bool(this.areItemsSpawned);
    packet.w_u16(table.size(this.treasuresRestrictorByItem));

    for (const [itemId, restrictorId] of this.treasuresRestrictorByItem) {
      packet.w_u16(itemId);
      packet.w_u16(restrictorId);
    }

    packet.w_u16(table.size(treasureConfig.TREASURES));

    for (const [treasure, descriptor] of treasureConfig.TREASURES) {
      if (!this.treasuresRestrictorByName.get(treasure)) {
        packet.w_u16(-1);
      } else {
        packet.w_u16(this.treasuresRestrictorByName.get(treasure));
      }

      packet.w_bool(descriptor.given);
      packet.w_bool(descriptor.checked);
      packet.w_u8(descriptor.itemsToFindRemain);
    }

    closeSaveMarker(packet, TreasureManager.name);
  }

  public override load(reader: NetProcessor): void {
    openLoadMarker(reader, TreasureManager.name);

    this.areItemsSpawned = reader.r_bool();
    this.treasuresRestrictorByItem = new LuaTable();

    const count: TCount = reader.r_u16();

    for (const _ of $range(1, count)) {
      const itemId: TNumberId = reader.r_u16();
      const restrictorId: TNumberId = reader.r_u16();

      this.treasuresRestrictorByItem.set(itemId, restrictorId);
    }

    const secretsCount: TCount = reader.r_u16();

    for (const _ of $range(1, secretsCount)) {
      const restrictorId: TNumberId = reader.r_u16();
      let restrictorName: Nillable<TStringId> = null;

      for (const [name, id] of this.treasuresRestrictorByName) {
        if (id === restrictorId) {
          restrictorName = name;
          break;
        }
      }

      const isGiven: boolean = reader.r_bool();
      const isChecked: boolean = reader.r_bool();
      const isToFind: number = reader.r_u8();

      if (restrictorName && treasureConfig.TREASURES.has(restrictorName)) {
        const secret: ITreasureDescriptor = treasureConfig.TREASURES.get(restrictorName);

        secret.given = isGiven;
        secret.checked = isChecked;
        secret.itemsToFindRemain = isToFind;
      }
    }

    closeLoadMarker(reader, TreasureManager.name);
  }

  /**
   * Spawn all configured game treasures on game start.
   */
  protected spawnTreasures(): void {
    if (this.areItemsSpawned) {
      return;
    }

    logger.info("Spawning game treasures");

    for (const [treasureId] of treasureConfig.TREASURES) {
      this.spawnTreasure(treasureId);
    }

    this.areItemsSpawned = true;
  }

  /**
   * Spawn treasure items if needed and link IDs.
   *
   * @param treasureId - Section ID of the treasure to spawn.
   */
  protected spawnTreasure(treasureId: TStringId): void {
    // logger.format("Spawn treasure ID: %s", treasureId);

    assert(treasureConfig.TREASURES.get(treasureId), "There is no stored secret with id:", treasureId);

    if (treasureConfig.TREASURES.get(treasureId).given) {
      return logger.info("Spawned secret is already given: %s", treasureId);
    }

    const simulator: AlifeSimulator = registry.simulator;
    const secret: ITreasureDescriptor = treasureConfig.TREASURES.get(treasureId);

    for (const [section, itemParameters] of secret.items) {
      for (const secretIndex of $range(1, itemParameters.length())) {
        const itemDescriptor: ITreasureItemsDescriptor = itemParameters.get(secretIndex);

        for (const itemIndex of $range(1, itemDescriptor.count)) {
          const probability: TProbability = math.random();

          // Is probability chance is satisfying + have item list for secret
          if (
            probability < itemDescriptor.probability &&
            itemDescriptor.itemsIds &&
            itemDescriptor.itemsIds.get(itemIndex)
          ) {
            const serverObject: ServerObject = simulator.object(itemDescriptor.itemsIds.get(itemIndex)) as ServerObject;
            const object: ServerObject = simulator.create(
              section,
              serverObject.position,
              serverObject.m_level_vertex_id,
              serverObject.m_game_vertex_id
            );

            object.angle = serverObject.angle;
            object.use_ai_locations(serverObject.used_ai_locations());

            this.treasuresRestrictorByItem.set(object.id, this.treasuresRestrictorByName.get(treasureId));

            secret.itemsToFindRemain += 1;
          }
        }
      }
    }
  }

  /**
   * Give the actor coordinates of a treasure, optionally spawning it, and show its map spot with a notification.
   *
   * @param treasureId - Identifier of the treasure to reveal to the actor.
   * @param spawn - Whether the treasure items should be spawned before revealing the coordinates.
   */
  public giveActorTreasureCoordinates(treasureId: TStringId, spawn: boolean = false): void {
    logger.info("Give treasure: %s %s", treasureId, spawn);

    assert(treasureConfig.TREASURES.get(treasureId), "There is no stored secret: [%s]", tostring(treasureId));

    const descriptor: ITreasureDescriptor = treasureConfig.TREASURES.get(treasureId);

    // Nothing to do here.
    if (descriptor.given) {
      return logger.info("Already given treasure: %s", treasureId);
    }

    // Just notify actor. todo: check empty as condlist?
    if (descriptor.itemsToFindRemain === 0 && !descriptor.empty) {
      EventsManager.emitEvent<ITreasureNotification>(EGameEvent.NOTIFICATION, {
        type: ENotificationType.TREASURE,
        state: ETreasureState.LOOTED_TREASURE_COORDINATES,
      });

      return logger.info("Already empty treasure given: %s", treasureId);
    }

    // Spawn if needed.
    if (spawn) {
      this.spawnTreasure(treasureId);
    }

    descriptor.given = true;
    showTreasureMapSpot(this.treasuresRestrictorByName.get(treasureId), descriptor);

    EventsManager.emitEvent<ITreasureNotification>(EGameEvent.NOTIFICATION, {
      type: ENotificationType.TREASURE,
      state: ETreasureState.NEW_TREASURE_COORDINATES,
    });
  }

  /**
   * Give one of random treasures that were not given for the actor.
   */
  public giveActorRandomTreasureCoordinates(): void {
    logger.info("Give random treasure");

    const availableTreasures: LuaArray<TStringId> = new LuaTable();

    for (const [id, descriptor] of treasureConfig.TREASURES) {
      if (!descriptor.given) {
        table.insert(availableTreasures, id);
      }
    }

    if (availableTreasures.length() === 0) {
      logger.info("No available treasures to give random");
    } else {
      this.giveActorTreasureCoordinates(availableTreasures.get(math.random(1, availableTreasures.length())));
    }
  }

  /**
   * Give all treasure coordinates.
   */
  public giveActorAllTreasureCoordinates(): void {
    logger.info("Give actor all treasures");

    let count: TCount = 0;

    for (const [id, descriptor] of treasureConfig.TREASURES) {
      if (!descriptor.given) {
        count += 1;
        this.giveActorTreasureCoordinates(id);
      }
    }

    if (count === 0) {
      logger.info("No more available treasures to give for actor");
    }
  }

  /**
   * Register a server item as belonging to a treasure based on its spawn ini secret section.
   *
   * @param object - Server object to register as a treasure item.
   * @returns Whether the object was registered as part of a treasure.
   */
  public onRegisterItem(object: ServerObject): boolean {
    const spawnIni: Nillable<IniFile> = object.spawn_ini();

    if (!spawnIni || !spawnIni.section_exist(SECRET_SECTION)) {
      return false;
    }

    const [, section, value] = spawnIni.r_line<string, TStringId | "">(SECRET_SECTION, 0, "", "");

    assert(section === "name", "There is no 'name' field in [secret] section for object [%s].", object.name());
    assert(value !== "", "Field 'name' in [secret] section got no value for object [%s].", object.name());
    assert(
      treasureConfig.TREASURES.get(value),
      "Attempt to register item '%s' in not existing treasure '%s'.",
      object.name(),
      value
    );

    const item: LuaArray<ITreasureItemsDescriptor> = treasureConfig.TREASURES.get(value).items.get(
      object.section_name()
    );

    assert(item, "Attempt to register unknown item [%s] in secret [%s].", object.section_name(), value);

    for (const it of $range(1, item.length())) {
      if (!item.get(it).itemsIds) {
        item.get(it).itemsIds = new LuaTable();
      }

      const count: TCount = item.get(it).itemsIds!.length();

      if (count < item.get(it).count) {
        item.get(it).itemsIds!.set(count + 1, object.id);

        return true;
      }
    }

    return false;
  }

  /**
   * Register game restrictor linked with secret.
   * Note: name of restrictor should match secret section.
   *
   * @param object - Restrictor zone server object.
   */
  public onRegisterRestrictor(object: ServerObject): boolean {
    if (object.spawn_ini()?.section_exist(SECRET_SECTION)) {
      this.treasuresRestrictorByName.set(object.name(), object.id);

      return true;
    } else {
      return false;
    }
  }

  /**
   * On item taken by actor, verify it is part of treasure.
   */
  public onActorItemTake(object: GameObject): void {
    const objectId: TNumberId = object.id();
    const restrictorId: Nillable<TNumberId> = this.treasuresRestrictorByItem.get(objectId);

    let treasureId: Nillable<TStringId> = null;

    for (const [name, id] of this.treasuresRestrictorByName) {
      if (restrictorId === id) {
        treasureId = name as TStringId;
        break;
      }
    }

    const treasure: Nillable<ITreasureDescriptor> = treasureId ? treasureConfig.TREASURES.get(treasureId) : null;

    if (treasure) {
      logger.info("Treasure item taken: %s", objectId);

      treasure.itemsToFindRemain -= 1;

      if (treasure.itemsToFindRemain <= 0) {
        treasure.checked = true;

        EventsManager.emitEvent(EGameEvent.TREASURE_FOUND, treasure);

        removeTreasureMapSpot(this.treasuresRestrictorByName.get(treasureId as TStringId), treasure);

        EventsManager.emitEvent<ITreasureNotification>(EGameEvent.NOTIFICATION, {
          type: ENotificationType.TREASURE,
          state: ETreasureState.FOUND_TREASURE,
        });

        logger.info("Secret now is empty: %s", treasureId);
      }

      this.treasuresRestrictorByItem.delete(objectId);
    }
  }

  /**
   * Handle dump data event.
   *
   * @param data - Data to dump into file.
   */
  public onDebugDump(data: AnyObject): AnyObject {
    data[this.constructor.name] = {
      treasureConfig: treasureConfig,
      areItemsSpawned: this.areItemsSpawned,
      lastUpdatedAt: this.lastUpdatedAt,
      treasuresRestrictorByName: this.treasuresRestrictorByName,
      treasuresRestrictorByItem: this.treasuresRestrictorByItem,
    };

    return data;
  }
}
