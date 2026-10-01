import { clsid } from "xray16";
import { GameObject, NetPacket, NetProcessor, ServerCreatureObject, TClassId, Vector } from "xray16/alias";
import {
  ACTOR_ID,
  AnyObject,
  assert,
  NIL,
  Nillable,
  PartialRecord,
  StringNillable,
  TCount,
  TName,
  TNumberId,
  TRate,
} from "xray16/lib";
import { $filename, $isNil } from "xray16/macros";

import { TArtefact } from "@/engine/constants/items/artefacts";
import { TWeapon } from "@/engine/constants/items/weapons";
import { TMonster } from "@/engine/constants/monsters";
import {
  closeLoadMarker,
  closeSaveMarker,
  getManager,
  getPortableStoreValue,
  openLoadMarker,
  openSaveMarker,
  registry,
  setPortableStoreValue,
} from "@/engine/core/database";
import { AbstractManager } from "@/engine/core/managers/abstract";
import { EGameEvent, EventsManager } from "@/engine/core/managers/events";
import { IActorStatistics, PS_ANABIOTICS_USED } from "@/engine/core/managers/statistics/statistics_types";
import type { TaskObject } from "@/engine/core/managers/tasks";
import type { ITreasureDescriptor } from "@/engine/core/managers/treasures";
import { isArtefact, isWeapon } from "@/engine/core/utils/class_ids";
import { LuaLogger } from "@/engine/core/utils/logging";

const logger: LuaLogger = new LuaLogger($filename);

/**
 * Manager to measure game statistics of actions done by actor.
 */
export class StatisticsManager extends AbstractManager {
  public actorStatistics: IActorStatistics = {
    surgesCount: 0,
    completedTasksCount: 0,
    killedMonstersCount: 0,
    killedStalkersCount: 0,
    collectedTreasuresCount: 0,
    collectedArtefactsCount: 0,
    bestKilledMonster: null,
    bestKilledMonsterRank: 0,
    favoriteWeapon: null,
    collectedArtefacts: new LuaTable(),
  };

  // Damage the actor has dealt with each weapon section.
  public weaponsStatistics: LuaTable<TWeapon, TRate> = new LuaTable();
  // Artefacts the actor has taken, so taking one again is not counted.
  public takenArtefacts: LuaTable<TNumberId, TNumberId> = new LuaTable();

  // Built with the manager, as class IDs do not exist yet while scripts load.
  public monsterClassesMap: PartialRecord<TClassId, TName> = {
    [clsid.bloodsucker_s]: "bloodsucker",
    [clsid.boar_s]: "boar",
    [clsid.burer_s]: "burer",
    [clsid.chimera_s]: "chimera",
    [clsid.controller_s]: "controller",
    [clsid.dog_s]: "dog",
    [clsid.flesh_s]: "flesh",
    [clsid.gigant_s]: "gigant",
    [clsid.poltergeist_s]: "poltergeist",
    [clsid.psy_dog_s]: "psy_dog",
    [clsid.pseudodog_s]: "pseudodog",
    [clsid.snork_s]: "snork",
    [clsid.tushkano_s]: "tushkano",
  };

  public override initialize(): void {
    const eventsManager: EventsManager = getManager(EventsManager);

    eventsManager.registerCallback(EGameEvent.DUMP_LUA_DATA, this.onDebugDump, this);
    eventsManager.registerCallback(EGameEvent.TASK_COMPLETED, this.onTaskCompleted, this);
    eventsManager.registerCallback(EGameEvent.SURGE_SURVIVED_WITH_ANABIOTIC, this.onSurvivedSurgeWithAnabiotic, this);
    eventsManager.registerCallback(EGameEvent.ACTOR_ITEM_TAKE, this.onActorCollectedItem, this);
    eventsManager.registerCallback(EGameEvent.SURGE_SKIPPED, this.onSurgePassed, this);
    eventsManager.registerCallback(EGameEvent.SURGE_ENDED, this.onSurgePassed, this);
    eventsManager.registerCallback(EGameEvent.TREASURE_FOUND, this.onTreasureFound, this);
    eventsManager.registerCallback(EGameEvent.STALKER_HIT, this.onObjectHit, this);
    eventsManager.registerCallback(EGameEvent.STALKER_DEATH, this.onStalkerKilled, this);
    eventsManager.registerCallback(EGameEvent.MONSTER_HIT, this.onObjectHit, this);
    eventsManager.registerCallback(EGameEvent.MONSTER_DEATH, this.onMonsterKilled, this);
  }

  public override destroy(): void {
    const eventsManager: EventsManager = getManager(EventsManager);

    eventsManager.unregisterCallback(EGameEvent.DUMP_LUA_DATA, this.onDebugDump);
    eventsManager.unregisterCallback(EGameEvent.TASK_COMPLETED, this.onTaskCompleted);
    eventsManager.unregisterCallback(EGameEvent.SURGE_SURVIVED_WITH_ANABIOTIC, this.onSurvivedSurgeWithAnabiotic);
    eventsManager.unregisterCallback(EGameEvent.ACTOR_ITEM_TAKE, this.onActorCollectedItem);
    eventsManager.unregisterCallback(EGameEvent.SURGE_SKIPPED, this.onSurgePassed);
    eventsManager.unregisterCallback(EGameEvent.SURGE_ENDED, this.onSurgePassed);
    eventsManager.unregisterCallback(EGameEvent.TREASURE_FOUND, this.onTreasureFound);
    eventsManager.unregisterCallback(EGameEvent.STALKER_HIT, this.onObjectHit);
    eventsManager.unregisterCallback(EGameEvent.STALKER_DEATH, this.onStalkerKilled);
    eventsManager.unregisterCallback(EGameEvent.MONSTER_HIT, this.onObjectHit);
    eventsManager.unregisterCallback(EGameEvent.MONSTER_DEATH, this.onMonsterKilled);
  }

  public override load(reader: NetProcessor): void {
    openLoadMarker(reader, StatisticsManager.name);

    this.actorStatistics = {} as IActorStatistics;
    this.actorStatistics.surgesCount = reader.r_u16();
    this.actorStatistics.completedTasksCount = reader.r_u16();
    this.actorStatistics.killedMonstersCount = reader.r_u32();
    this.actorStatistics.killedStalkersCount = reader.r_u32();
    this.actorStatistics.collectedTreasuresCount = reader.r_u16();
    this.actorStatistics.collectedArtefactsCount = reader.r_u16();
    this.actorStatistics.bestKilledMonsterRank = reader.r_u32();

    const bestMonster: StringNillable<TMonster> = reader.r_stringZ();

    this.actorStatistics.bestKilledMonster = bestMonster === NIL ? null : bestMonster;

    const favoriteWeapon: StringNillable<TWeapon> = reader.r_stringZ();

    this.actorStatistics.favoriteWeapon = favoriteWeapon === NIL ? null : favoriteWeapon;

    this.weaponsStatistics = new LuaTable();

    const weaponsCount: TCount = reader.r_u16();

    for (const _ of $range(1, weaponsCount)) {
      const section: TWeapon = reader.r_stringZ();
      const damage: TRate = reader.r_float();

      this.weaponsStatistics.set(section, damage);
    }

    this.actorStatistics.collectedArtefacts = new LuaTable();

    const artefactsCount: TCount = reader.r_u8();

    for (const _ of $range(1, artefactsCount)) {
      const section: TArtefact = reader.r_stringZ();

      this.actorStatistics.collectedArtefacts.set(section, true);
    }

    this.takenArtefacts = new LuaTable();

    const takenArtefactsCount: TCount = reader.r_u16();

    for (const _ of $range(1, takenArtefactsCount)) {
      const id: TNumberId = reader.r_u16();

      this.takenArtefacts.set(id, id);
    }

    closeLoadMarker(reader, StatisticsManager.name);
  }

  public override save(packet: NetPacket): void {
    openSaveMarker(packet, StatisticsManager.name);

    packet.w_u16(this.actorStatistics.surgesCount);
    packet.w_u16(this.actorStatistics.completedTasksCount);
    packet.w_u32(this.actorStatistics.killedMonstersCount);
    packet.w_u32(this.actorStatistics.killedStalkersCount);
    packet.w_u16(this.actorStatistics.collectedTreasuresCount);
    packet.w_u16(this.actorStatistics.collectedArtefactsCount);
    packet.w_u32(this.actorStatistics.bestKilledMonsterRank);
    packet.w_stringZ(tostring(this.actorStatistics.bestKilledMonster));
    packet.w_stringZ(tostring(this.actorStatistics.favoriteWeapon));

    packet.w_u16(table.size(this.weaponsStatistics));

    for (const [section, damage] of this.weaponsStatistics) {
      packet.w_stringZ(section);
      packet.w_float(damage);
    }

    packet.w_u8(table.size(this.actorStatistics.collectedArtefacts));

    for (const [section] of this.actorStatistics.collectedArtefacts) {
      packet.w_stringZ(section);
    }

    packet.w_u16(table.size(this.takenArtefacts));

    for (const [id] of this.takenArtefacts) {
      packet.w_u16(id);
    }

    closeSaveMarker(packet, StatisticsManager.name);
  }

  /**
   * Get count of used anabiotics from pstore.
   *
   * @returns Count of used anabiotics.
   */
  public getUsedAnabioticsCount(): TCount {
    return getPortableStoreValue(ACTOR_ID, PS_ANABIOTICS_USED, 0);
  }

  /**
   * Handle usage of anabiotic during emission.
   */
  public onSurvivedSurgeWithAnabiotic(): void {
    logger.info("Increment used anabiotics count");

    setPortableStoreValue(ACTOR_ID, PS_ANABIOTICS_USED, getPortableStoreValue(ACTOR_ID, PS_ANABIOTICS_USED, 0) + 1);
  }

  /**
   * Handle task completion by an actor.
   *
   * @param task - Completed task object.
   */
  public onTaskCompleted(task: TaskObject): void {
    logger.info("Increment completed quests count");
    this.actorStatistics.completedTasksCount += 1;
  }

  /**
   * Handle item pick up event.
   *
   * @param item - Game object picked up.
   */
  public onActorCollectedItem(item: GameObject): void {
    const itemId: TNumberId = item.id();

    if (!isArtefact(item) || this.takenArtefacts.has(itemId)) {
      return;
    }

    logger.info("Increment collected artefacts count: %s", item.section());

    this.takenArtefacts.set(itemId, itemId);
    this.actorStatistics.collectedArtefactsCount += 1;
    this.actorStatistics.collectedArtefacts.set(item.section(), true);
  }

  /**
   * Increment count of survived surges.
   * Surge passed.
   */
  public onSurgePassed(): void {
    logger.info("Increment surges count");
    this.actorStatistics.surgesCount += 1;
  }

  /**
   * Handle actor found treasure.
   *
   * @param treasure - Found treasure secret.
   */
  public onTreasureFound(treasure: ITreasureDescriptor): void {
    logger.info("Increment collected secrets count");
    this.actorStatistics.collectedTreasuresCount += 1;
  }

  /**
   * Handle stalker kill event and update stats.
   *
   * @param object - Object killed.
   * @param killer - Object killer.
   */
  public onStalkerKilled(object: GameObject, killer: Nillable<GameObject>): void {
    if (killer?.id() === ACTOR_ID) {
      this.actorStatistics.killedStalkersCount += 1;
    }
  }

  /**
   * Handle object hit by an actor and collect statistics.
   *
   * @param object - Game object.
   * @param amount - Amount of damage done.
   * @param direction - Direction of object hit.
   * @param who - Source object of hit.
   */
  public onObjectHit(object: GameObject, amount: TRate, direction: Vector, who: Nillable<GameObject>): void {
    if (who?.id() !== ACTOR_ID) {
      return;
    }

    const activeItem: Nillable<GameObject> = registry.actor.active_item();

    if (!isWeapon(activeItem)) {
      return;
    }

    const section: TWeapon = activeItem.section();
    const damage: TRate = (this.weaponsStatistics.get(section) ?? 0) + amount;
    const favoriteWeapon: Nillable<TWeapon> = this.actorStatistics.favoriteWeapon;

    this.weaponsStatistics.set(section, damage);

    // Only the hit weapon gains damage, so it either passes the favorite one or nothing changes.
    if ($isNil(favoriteWeapon) || damage > (this.weaponsStatistics.get(favoriteWeapon) ?? 0)) {
      this.actorStatistics.favoriteWeapon = section;
    }
  }

  /**
   * Handle monster kill event and update stats.
   *
   * @param object - Object killed.
   * @param who - Object killer.
   */
  public onMonsterKilled(object: GameObject, who: Nillable<GameObject>): void {
    if (who?.id() !== ACTOR_ID) {
      return;
    }

    let community: Nillable<TName> = this.monsterClassesMap[object.clsid()];

    assert(
      community,
      "Statistics error: cannot find monster class for [%s] clsid [%s].",
      object.name(),
      tostring(object.clsid())
    );

    const serverObject: Nillable<ServerCreatureObject> = registry.simulator.object(object.id());

    // Increment count.
    this.actorStatistics.killedMonstersCount += 1;

    if (serverObject) {
      const rank: TRate = serverObject.rank();

      if (community === "flesh") {
        if (rank === 3) {
          community = community + "_strong";
        } else {
          community = community + "_weak";
        }
      } else if (community === "poltergeist") {
        if (rank === 12) {
          community = community + "_flame";
        } else {
          community = community + "_tele";
        }
      } else if (community === "boar") {
        if (rank === 6) {
          community = community + "_strong";
        } else {
          community = community + "_weak";
        }
      } else if (community === "pseudodog" || community === "psy_dog") {
        if (rank === 13) {
          community = community + "_strong";
        } else {
          community = community + "_weak";
        }
      } else if (community === "bloodsucker") {
        if (rank === 16) {
          community = community + "_strong";
        } else if (rank === 15) {
          community = community + "_normal";
        } else {
          community = community + "_weak";
        }
      }

      if (rank > this.actorStatistics.bestKilledMonsterRank) {
        logger.info("Updated best monster killed: %s %s", community, rank);

        this.actorStatistics.bestKilledMonsterRank = rank;
        this.actorStatistics.bestKilledMonster = community as TMonster;
      }
    }
  }

  /**
   * Handle dump data event.
   *
   * @param data - Data to dump into file.
   */
  public onDebugDump(data: AnyObject): AnyObject {
    data[this.constructor.name] = {
      actorStatistics: this.actorStatistics,
      weaponsStatistics: this.weaponsStatistics,
      takenArtefacts: this.takenArtefacts,
    };

    return data;
  }
}
