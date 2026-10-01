import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { level } from "xray16";
import { GameObject, ServerObject } from "xray16/alias";
import { AnyObject, TName, TNumberId } from "xray16/lib";
import { $fromObject } from "xray16/macros";
import { EMockPacketDataType, MockAlifeObject, MockGameObject, MockIniFile, MockNetProcessor } from "xray16/mocks";

import { disposeManager, getManager, registerActor, registry } from "@/engine/core/database";
import { parseConditionsList } from "@/engine/core/ini";
import { EGameEvent, EventsManager } from "@/engine/core/managers/events";
import { removeTreasureMapSpot, showTreasureMapSpot } from "@/engine/core/managers/map/utils";
import { ETreasureState, NotificationManager } from "@/engine/core/managers/notifications";
import { ENotificationType } from "@/engine/core/managers/notifications/notifications_types";
import { TREASURE_MANAGER_CONFIG_LTX, treasureConfig } from "@/engine/core/managers/treasures/TreasureConfig";
import { TreasureManager } from "@/engine/core/managers/treasures/TreasureManager";
import { ETreasureType, ITreasureDescriptor } from "@/engine/core/managers/treasures/treasures_types";
import { readIniTreasuresList } from "@/engine/core/managers/treasures/utils/treasures_init";
import { giveInfoPortion } from "@/engine/core/utils/info_portion";
import { resetRegistry } from "@/fixtures/engine";

jest.mock("@/engine/core/managers/map/utils");

describe("TreasureManager", () => {
  beforeEach(() => {
    resetRegistry();

    treasureConfig.ENHANCED_MODE_ENABLED = true;
    treasureConfig.TREASURES = readIniTreasuresList(TREASURE_MANAGER_CONFIG_LTX);
  });

  it("should have proper configuration", () => {
    expect(treasureConfig.TREASURES).toEqualLuaTables({
      jup_b1_secret: {
        checked: false,
        type: ETreasureType.RARE,
        empty: parseConditionsList("{+info_b10_first_zone_visited} true, false"),
        given: false,
        refreshing: null,
        items: {
          wpn_abakan: {
            "1": {
              count: 1,
              itemsIds: null,
              probability: 1,
            },
          },
          wpn_addon_scope: {
            "1": {
              count: 1,
              itemsIds: null,
              probability: 1,
            },
          },
        },
        itemsToFindRemain: 0,
      },
      jup_b2_secret: {
        checked: false,
        type: ETreasureType.EPIC,
        empty: null,
        given: false,
        items: {
          wpn_abakan: {
            "1": {
              count: 2,
              itemsIds: null,
              probability: 1,
            },
          },
        },
        itemsToFindRemain: 0,
        refreshing: parseConditionsList("true"),
      },
      jup_b3_secret: {
        checked: false,
        empty: null,
        given: false,
        type: ETreasureType.RARE,
        items: {
          wpn_abakan: {
            "1": {
              count: 1,
              itemsIds: null,
              probability: 1,
            },
          },
          wpn_addon_scope: {
            "1": {
              count: 1,
              itemsIds: null,
              probability: 1,
            },
          },
        },
        itemsToFindRemain: 0,
        refreshing: null,
      },
    });
  });

  it("should correctly initialize and destroy", () => {
    const manager: TreasureManager = getManager(TreasureManager);
    const eventsManager: EventsManager = getManager(EventsManager);

    manager.initialize();

    expect(eventsManager.getSubscribersCount()).toBe(4);
    expect(eventsManager.getEventSubscribersCount(EGameEvent.DUMP_LUA_DATA)).toBe(1);
    expect(eventsManager.getEventSubscribersCount(EGameEvent.ACTOR_UPDATE)).toBe(1);
    expect(eventsManager.getEventSubscribersCount(EGameEvent.ACTOR_ITEM_TAKE)).toBe(1);
    expect(eventsManager.getEventSubscribersCount(EGameEvent.RESTRICTOR_ZONE_REGISTERED)).toBe(1);

    manager.destroy();

    expect(eventsManager.getSubscribersCount()).toBe(0);
  });

  it("should correctly handle statics shortcuts", () => {
    const manager: TreasureManager = getManager(TreasureManager);

    jest.spyOn(manager, "giveActorTreasureCoordinates").mockImplementation(() => {});
    jest.spyOn(manager, "onRegisterItem").mockImplementation(() => true);

    TreasureManager.giveTreasureCoordinates("test");
    expect(manager.giveActorTreasureCoordinates).toHaveBeenCalled();

    expect(TreasureManager.registerItem(MockAlifeObject.mock())).toBe(true);
    expect(manager.giveActorTreasureCoordinates).toHaveBeenCalled();
  });

  it("should correctly handle spawn all in updates", () => {
    const manager: TreasureManager = getManager(TreasureManager);

    manager.initialize();

    jest.spyOn(Date, "now").mockImplementation(() => 1000);
    manager.areItemsSpawned = true;
    manager["spawnTreasures"] = jest.fn();

    manager.update();

    expect(manager["spawnTreasures"]).not.toHaveBeenCalled();
    expect(manager.lastUpdatedAt).toBe(1000);

    manager.lastUpdatedAt = -1000;
    manager.areItemsSpawned = false;

    manager.update();

    expect(manager["spawnTreasures"]).toHaveBeenCalled();
    expect(manager.lastUpdatedAt).toBe(1000);
  });

  it("should correctly handle empty state in updates", () => {
    registerActor(MockGameObject.mockActor());
    giveInfoPortion("info_b10_first_zone_visited");

    const manager: TreasureManager = getManager(TreasureManager);

    manager.treasuresRestrictorByName.set("jup_b1_secret", 1501);
    manager.initialize();

    const descriptor: ITreasureDescriptor = treasureConfig.TREASURES.get("jup_b1_secret");

    manager.update();

    expect(level.map_remove_object_spot).not.toHaveBeenCalled();

    expect(descriptor.empty).not.toBeNull();
    expect(descriptor.checked).toBe(false);

    const eventsManager: EventsManager = getManager(EventsManager);

    jest.spyOn(eventsManager, "emitEvent").mockImplementation(jest.fn());

    manager.lastUpdatedAt = -1000;
    descriptor.given = true;
    manager.update();

    expect(removeTreasureMapSpot).toHaveBeenCalledWith(1501, descriptor);
    expect(descriptor.empty).toBeNull();
    expect(descriptor.checked).toBe(true);
    // Emptying via the `empty` condlist still counts toward the found-treasures statistic.
    expect(eventsManager.emitEvent).toHaveBeenCalledWith(EGameEvent.TREASURE_FOUND, descriptor);
  });

  it("should correctly handle refresh state in updates", () => {
    registerActor(MockGameObject.mockActor());

    const manager: TreasureManager = getManager(TreasureManager);

    manager.initialize();

    const descriptor: ITreasureDescriptor = treasureConfig.TREASURES.get("jup_b2_secret");

    descriptor.given = true;
    descriptor.checked = true;

    manager.update();

    expect(descriptor.checked).toBe(false);
    expect(descriptor.given).toBe(false);
  });

  it("should correctly register restrictors", () => {
    const notSecret: ServerObject = MockAlifeObject.mock();
    const secret: ServerObject = MockAlifeObject.mock({
      spawnIni: MockIniFile.mock("spawn.ini", { secret: {} }),
    });
    const manager: TreasureManager = getManager(TreasureManager);

    jest.spyOn(manager, "onRegisterRestrictor");

    manager.initialize();

    EventsManager.emitEvent(EGameEvent.RESTRICTOR_ZONE_REGISTERED, notSecret);

    expect(manager.onRegisterRestrictor).toHaveBeenCalledWith(notSecret);
    expect(manager.treasuresRestrictorByName.length()).toBe(0);

    EventsManager.emitEvent(EGameEvent.RESTRICTOR_ZONE_REGISTERED, secret);

    expect(manager.onRegisterRestrictor).toHaveBeenNthCalledWith(2, secret);
    expect(manager.treasuresRestrictorByName.length()).toBe(1);
  });

  it("should correctly get treasures", () => {
    const manager: TreasureManager = getManager(TreasureManager);

    manager.initialize();

    expect(treasureConfig.TREASURES.get("jup_b1_secret")).not.toBeNull();
    expect(treasureConfig.TREASURES.get("jup_b1_secret")).toBe(treasureConfig.TREASURES.get("jup_b1_secret"));
  });

  it("should correctly spawn treasures", () => {
    const manager: TreasureManager = getManager(TreasureManager);

    manager.initialize();

    manager["spawnTreasure"] = jest.fn();

    manager["spawnTreasures"]();
    expect(manager["spawnTreasure"]).toHaveBeenCalledTimes(3);

    manager["spawnTreasures"]();
    expect(manager["spawnTreasure"]).toHaveBeenCalledTimes(3);

    expect(manager["spawnTreasure"]).toHaveBeenNthCalledWith(1, "jup_b1_secret");
    expect(manager["spawnTreasure"]).toHaveBeenNthCalledWith(2, "jup_b2_secret");
    expect(manager["spawnTreasure"]).toHaveBeenNthCalledWith(3, "jup_b3_secret");
  });

  it("should name the missing treasure when spawning an unknown one", () => {
    const manager: TreasureManager = getManager(TreasureManager);

    expect(() => manager["spawnTreasure"]("not_existing_secret")).toThrow(
      "There is no stored secret with id: 'not_existing_secret'."
    );
  });

  it("should register items declared in a treasure spawn ini", () => {
    const manager: TreasureManager = getManager(TreasureManager);
    const item: ServerObject = MockAlifeObject.mock();

    (item as AnyObject).id = 100;
    jest.spyOn(item, "spawn_ini").mockReturnValue(MockIniFile.mock("spawn.ini", { secret: { name: "jup_b1_secret" } }));
    jest.spyOn(item, "section_name").mockReturnValue("wpn_abakan");

    expect(manager.onRegisterItem(item)).toBe(true);
    expect(treasureConfig.TREASURES.get("jup_b1_secret").items.get("wpn_abakan").get(1).itemsIds).toEqualLuaTables({
      1: 100,
    });
  });

  it("should spawn registered treasure items and track their restrictor", () => {
    const manager: TreasureManager = getManager(TreasureManager);
    const descriptor: ITreasureDescriptor = treasureConfig.TREASURES.get("jup_b1_secret");
    const source: AnyObject = {
      angle: "angle",
      m_game_vertex_id: 2,
      m_level_vertex_id: 1,
      position: "position",
      used_ai_locations: jest.fn(() => true),
    };
    const created: AnyObject = { id: 500, use_ai_locations: jest.fn() };

    const itemIds: LuaTable<number, number> = new LuaTable();

    itemIds.set(1, 100);
    descriptor.items.get("wpn_abakan").get(1).itemsIds = itemIds;
    descriptor.items.get("wpn_addon_scope").get(1).itemsIds = null;
    manager.treasuresRestrictorByName.set("jup_b1_secret", 50);

    registry.simulator = {
      create: jest.fn(() => created),
      object: jest.fn(() => source),
    } as never;

    jest.spyOn(math, "random").mockReturnValue(0);

    manager["spawnTreasure"]("jup_b1_secret");

    expect(registry.simulator.create).toHaveBeenCalledWith("wpn_abakan", "position", 1, 2);
    expect(manager.treasuresRestrictorByItem.get(500)).toBe(50);
    expect(descriptor.itemsToFindRemain).toBe(1);
  });

  it("should reveal treasure coordinates and notify the actor", () => {
    const manager: TreasureManager = getManager(TreasureManager);
    const descriptor: ITreasureDescriptor = treasureConfig.TREASURES.get("jup_b1_secret");
    const notificationManager: NotificationManager = getManager(NotificationManager);

    manager.treasuresRestrictorByName.set("jup_b1_secret", 50);
    jest.spyOn(notificationManager, "sendTreasureNotification").mockImplementation(jest.fn());

    manager.giveActorTreasureCoordinates("jup_b1_secret");

    expect(descriptor.given).toBe(true);
    expect(showTreasureMapSpot).toHaveBeenCalledWith(50, descriptor);
    expect(notificationManager.sendTreasureNotification).toHaveBeenCalledWith(ETreasureState.NEW_TREASURE_COORDINATES);
  });

  it("should reveal one remaining treasure when choosing random coordinates", () => {
    const manager: TreasureManager = getManager(TreasureManager);

    treasureConfig.TREASURES.get("jup_b1_secret").given = false;
    treasureConfig.TREASURES.get("jup_b2_secret").given = true;
    treasureConfig.TREASURES.get("jup_b3_secret").given = true;

    jest.spyOn(manager, "giveActorTreasureCoordinates").mockImplementation(jest.fn());
    jest.spyOn(math, "random").mockReturnValue(1);

    manager.giveActorRandomTreasureCoordinates();

    expect(manager.giveActorTreasureCoordinates).toHaveBeenCalledWith("jup_b1_secret");
  });

  it("should correctly handle actor taking item", () => {
    const eventsManager: EventsManager = getManager(EventsManager);
    const treasureManager: TreasureManager = getManager(TreasureManager);
    const first: GameObject = MockGameObject.mock();
    const second: GameObject = MockGameObject.mock();

    expect(() => treasureManager.onActorItemTake(first)).not.toThrow();

    jest.spyOn(eventsManager, "emitEvent").mockImplementation(jest.fn());

    // Items that are not part of a treasure change nothing.
    treasureManager.treasuresRestrictorByName.set("jup_b1_secret", 55);
    treasureManager.onActorItemTake(first);

    expect(treasureConfig.TREASURES.get("jup_b1_secret").itemsToFindRemain).toBe(0);
    expect(eventsManager.emitEvent).not.toHaveBeenCalled();

    treasureManager.treasuresRestrictorByItem.set(second.id(), 55);
    treasureManager.treasuresRestrictorByName.set("jup_b1_secret", 55);

    treasureManager.onActorItemTake(second);

    const treasure: ITreasureDescriptor = treasureConfig.TREASURES.get("jup_b1_secret");

    expect(treasure.itemsToFindRemain).toBe(-1);
    expect(treasure.checked).toBe(true);

    expect(removeTreasureMapSpot).toHaveBeenCalledWith(55, treasure);
    expect(eventsManager.emitEvent).toHaveBeenCalledWith(EGameEvent.NOTIFICATION, {
      type: ENotificationType.TREASURE,
      state: ETreasureState.FOUND_TREASURE,
    });
    expect(eventsManager.emitEvent).toHaveBeenCalledWith(EGameEvent.TREASURE_FOUND, treasure);
  });

  it("should correctly handle save and load", () => {
    const manager: TreasureManager = getManager(TreasureManager);
    const processor: MockNetProcessor = new MockNetProcessor();

    manager.areItemsSpawned = true;
    manager.treasuresRestrictorByItem = $fromObject<TNumberId, TNumberId>({ 10: 200, 11: 300 });
    manager.treasuresRestrictorByName = $fromObject<TName, TNumberId>({
      jup_b1_secret: 55,
      jup_b2_secret: 66,
    });

    treasureConfig.TREASURES.get("jup_b1_secret").itemsToFindRemain = 4;
    treasureConfig.TREASURES.get("jup_b1_secret").given = true;
    treasureConfig.TREASURES.get("jup_b2_secret").given = true;
    treasureConfig.TREASURES.get("jup_b3_secret").checked = true;

    manager.save(processor.asNetPacket());

    expect(processor.writeDataOrder).toEqual([
      EMockPacketDataType.BOOLEAN,
      EMockPacketDataType.U16,
      EMockPacketDataType.U16,
      EMockPacketDataType.U16,
      EMockPacketDataType.U16,
      EMockPacketDataType.U16,
      EMockPacketDataType.U16,
      EMockPacketDataType.U16,
      EMockPacketDataType.BOOLEAN,
      EMockPacketDataType.BOOLEAN,
      EMockPacketDataType.U8,
      EMockPacketDataType.U16,
      EMockPacketDataType.BOOLEAN,
      EMockPacketDataType.BOOLEAN,
      EMockPacketDataType.U8,
      EMockPacketDataType.U16,
      EMockPacketDataType.BOOLEAN,
      EMockPacketDataType.BOOLEAN,
      EMockPacketDataType.U8,
      EMockPacketDataType.U16,
    ]);
    expect(processor.dataList).toEqual([
      true,
      2,
      10,
      200,
      11,
      300,
      3,
      // First treasure.
      55,
      true,
      false,
      4,
      // Second treasure.
      66,
      true,
      false,
      0,
      // Third treasure.
      -1,
      false,
      true,
      0,
      19,
    ]);

    disposeManager(TreasureManager);

    treasureConfig.TREASURES = readIniTreasuresList(TREASURE_MANAGER_CONFIG_LTX);

    const newManager: TreasureManager = getManager(TreasureManager);

    newManager.treasuresRestrictorByName = $fromObject<TName, TNumberId>({
      jup_b1_secret: 55,
      jup_b2_secret: 66,
    });

    newManager.load(processor.asNetReader());

    expect(processor.readDataOrder).toEqual(processor.writeDataOrder);
    expect(processor.dataList).toHaveLength(0);

    expect(newManager.areItemsSpawned).toBe(true);
    expect(newManager.treasuresRestrictorByItem).toEqualLuaTables({
      10: 200,
      11: 300,
    });

    expect(treasureConfig.TREASURES.length()).toBe(3);
    expect(treasureConfig.TREASURES.get("jup_b1_secret")).toEqualLuaTables({
      given: true,
      checked: false,
      refreshing: null,
      type: ETreasureType.RARE,
      empty: expect.any(Object),
      items: expect.any(Object),
      itemsToFindRemain: 4,
    });
    expect(treasureConfig.TREASURES.get("jup_b2_secret")).toEqualLuaTables({
      given: true,
      checked: false,
      refreshing: expect.any(Object),
      type: ETreasureType.EPIC,
      empty: expect.any(Object),
      items: expect.any(Object),
      itemsToFindRemain: 0,
    });
    expect(treasureConfig.TREASURES.get("jup_b3_secret")).toEqualLuaTables({
      given: false,
      checked: false,
      refreshing: expect.any(Object),
      type: ETreasureType.RARE,
      empty: expect.any(Object),
      items: expect.any(Object),
      itemsToFindRemain: 0,
    });
  });

  it("should correctly handle debug dump event", () => {
    const manager: TreasureManager = getManager(TreasureManager);
    const data: AnyObject = {};

    EventsManager.emitEvent(EGameEvent.DUMP_LUA_DATA, data);

    expect(data).toEqual({ TreasureManager: expect.any(Object) });
    expect(manager.onDebugDump({})).toEqual({ TreasureManager: expect.any(Object) });
  });
});
