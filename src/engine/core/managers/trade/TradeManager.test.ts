import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { time_global } from "xray16";
import { GameObject, IniFile } from "xray16/alias";
import { AnyObject } from "xray16/lib";
import { EMockPacketDataType, MockGameObject, MockNetProcessor } from "xray16/mocks";
import { replaceFunctionMock } from "xray16/testing/utils";

import { getManager, loadIniFile } from "@/engine/core/database";
import { registry } from "@/engine/core/database/registry";
import { parseConditionsList } from "@/engine/core/ini";
import { EGameEvent, EventsManager } from "@/engine/core/managers/events";
import { TradeManager } from "@/engine/core/managers/trade";
import { resetRegistry } from "@/fixtures/engine";

describe("TradeManager class implementation", () => {
  beforeEach(() => {
    resetRegistry();
  });

  it("should correctly initialize and destroy", () => {
    const manager: TradeManager = getManager(TradeManager);
    const eventsManager: EventsManager = getManager(EventsManager);

    manager.initialize();

    expect(eventsManager.getSubscribersCount()).toBe(1);
    expect(eventsManager.getEventSubscribersCount(EGameEvent.DUMP_LUA_DATA)).toBe(1);

    manager.destroy();

    expect(eventsManager.getSubscribersCount()).toBe(0);
  });

  it("should correctly initialize for objects", () => {
    const tradeManager: TradeManager = getManager(TradeManager);
    const object: GameObject = MockGameObject.mock();
    const ini: IniFile = loadIniFile("managers\\trade\\trade_generic.ltx");

    expect(registry.trade.length()).toBe(0);

    expect(() => tradeManager.initializeForObject(object, "trade_manager_not_existing.ltx")).toThrow();
    expect(registry.trade.length()).toBe(0);

    tradeManager.initializeForObject(object, "managers\\trade\\trade_generic.ltx");

    expect(registry.trade.length()).toBe(1);
    expect(registry.trade.get(object.id())).toEqualLuaTables({
      config: ini,
      configPath: ini.fname(),
      resupplyAt: -1,
      updateAt: -1,
      buyCondition: parseConditionsList("generic_buy"),
      buyItemFactorCondition: parseConditionsList("0.7"),
      sellCondition: parseConditionsList("generic_sell"),
      buySupplies: parseConditionsList("{+tier4} tier4, {+tier3} supplies_tier_3, {+tier2} tier2, tier1"),
      discounts: parseConditionsList("{+first} low_discounts, discounts_section"),
      currentBuyItemConditionFactor: null,
      currentBuySupplies: null,
      currentBuyCondition: null,
      currentSellCondition: null,
    });
  });

  it("should correctly update for objects", () => {
    const tradeManager: TradeManager = getManager(TradeManager);
    const object: GameObject = MockGameObject.mock();
    const ini: IniFile = loadIniFile("managers\\trade\\trade_generic.ltx");

    replaceFunctionMock(time_global, () => 30_000);
    tradeManager.initializeForObject(object, ini.fname());

    replaceFunctionMock(time_global, () => 40_000);

    tradeManager.updateForObject(object);

    const expected = {
      config: ini,
      configPath: ini.fname(),
      resupplyAt: 86440000,
      updateAt: 3640000,
      currentBuyItemConditionFactor: 0.7,
      buyCondition: parseConditionsList("generic_buy"),
      buyItemFactorCondition: parseConditionsList("0.7"),
      sellCondition: parseConditionsList("generic_sell"),
      buySupplies: parseConditionsList("{+tier4} tier4, {+tier3} supplies_tier_3, {+tier2} tier2, tier1"),
      discounts: parseConditionsList("{+first} low_discounts, discounts_section"),
      currentBuySupplies: "tier1",
      currentBuyCondition: "generic_buy",
      currentSellCondition: "generic_sell",
    };

    expect(object.buy_condition).toHaveBeenCalledWith(ini, "generic_buy");
    expect(object.buy_supplies).toHaveBeenCalledWith(ini, "tier1");
    expect(object.buy_item_condition_factor).toHaveBeenCalledWith(0.7);
    expect(object.sell_condition).toHaveBeenCalledWith(ini, "generic_sell");

    expect(registry.trade.get(object.id())).toEqualLuaTables(expected);

    tradeManager.updateForObject(object);
    tradeManager.updateForObject(object);
    tradeManager.updateForObject(object);

    expect(registry.trade.get(object.id())).toEqualLuaTables(expected);
  });

  it("should resupply objects again after the resupply period with unchanged supplies section", () => {
    const tradeManager: TradeManager = getManager(TradeManager);
    const object: GameObject = MockGameObject.mock();
    const ini: IniFile = loadIniFile("managers\\trade\\trade_generic.ltx");

    replaceFunctionMock(time_global, () => 30_000);
    tradeManager.initializeForObject(object, ini.fname());

    replaceFunctionMock(time_global, () => 40_000);
    tradeManager.updateForObject(object);

    replaceFunctionMock(time_global, () => 86_440_000);
    tradeManager.updateForObject(object);

    expect(object.buy_supplies).toHaveBeenCalledTimes(2);
    expect(object.buy_supplies).toHaveBeenNthCalledWith(2, ini, "tier1");
    expect(registry.trade.get(object.id()).resupplyAt).toBe(172_840_000);
  });

  it("should correctly get sell discount for objects", () => {
    const tradeManager: TradeManager = getManager(TradeManager);
    const object: GameObject = MockGameObject.mock();
    const ini: IniFile = loadIniFile("managers\\trade\\trade_generic.ltx");

    replaceFunctionMock(time_global, () => 30_000);
    tradeManager.initializeForObject(object, ini.fname());

    expect(tradeManager.getSellDiscountForObject(object.id())).toBe(0.5);
  });

  it("should correctly get buy discount for objects", () => {
    const tradeManager: TradeManager = getManager(TradeManager);
    const object: GameObject = MockGameObject.mock();
    const ini: IniFile = loadIniFile("managers\\trade\\trade_generic.ltx");

    replaceFunctionMock(time_global, () => 30_000);
    tradeManager.initializeForObject(object, ini.fname());

    expect(tradeManager.getBuyDiscountForObject(object.id())).toBe(0.3);
  });

  it("should not read discounts config again on every item price", () => {
    const tradeManager: TradeManager = getManager(TradeManager);
    const object: GameObject = MockGameObject.mock();
    const ini: IniFile = loadIniFile("managers\\trade\\trade_generic.ltx");

    tradeManager.initializeForObject(object, ini.fname());

    const readString = jest.spyOn(ini, "r_string");

    readString.mockClear();

    expect(tradeManager.getBuyDiscountForObject(object.id())).toBe(0.3);
    expect(tradeManager.getSellDiscountForObject(object.id())).toBe(0.5);
    expect(readString).not.toHaveBeenCalledWith("trader", "discounts");
  });

  it("should correctly save and load data when not initialized", () => {
    const tradeManager: TradeManager = getManager(TradeManager);
    const object: GameObject = MockGameObject.mock();
    const processor: MockNetProcessor = new MockNetProcessor();

    replaceFunctionMock(time_global, () => 30_000);
    tradeManager.saveObjectState(object, processor.asNetPacket());

    expect(processor.writeDataOrder).toEqual([EMockPacketDataType.BOOLEAN, EMockPacketDataType.U16]);
    expect(processor.dataList).toEqual([false, 1]);

    registry.objects.delete(object.id());

    tradeManager.loadObjectState(object, processor.asNetProcessor());

    expect(processor.writeDataOrder).toEqual(processor.readDataOrder);
    expect(processor.dataList).toHaveLength(0);

    expect(registry.trade.get(object.id())).toBeNull();
  });

  it("should correctly check if item can be traded (now always true)", () => {
    expect(getManager(TradeManager).isItemAvailableForTrade(MockGameObject.mock(), MockGameObject.mock())).toBe(true);
  });

  it("should correctly save and load data when not updated", () => {
    const tradeManager: TradeManager = getManager(TradeManager);
    const object: GameObject = MockGameObject.mock();
    const ini: IniFile = loadIniFile("managers\\trade\\trade_generic.ltx");
    const processor: MockNetProcessor = new MockNetProcessor();

    replaceFunctionMock(time_global, () => 10_000);
    tradeManager.initializeForObject(object, "managers\\trade\\trade_generic.ltx");

    replaceFunctionMock(time_global, () => 30_000);
    tradeManager.saveObjectState(object, processor.asNetPacket());

    expect(processor.writeDataOrder).toEqual([
      EMockPacketDataType.BOOLEAN,
      EMockPacketDataType.STRING,
      EMockPacketDataType.STRING,
      EMockPacketDataType.STRING,
      EMockPacketDataType.STRING,
      EMockPacketDataType.I32,
      EMockPacketDataType.I32,
      EMockPacketDataType.U16,
    ]);
    expect(processor.dataList).toEqual([true, "managers\\trade\\trade_generic.ltx", "", "", "", -30_001, -30_001, 7]);

    registry.objects.delete(object.id());

    tradeManager.loadObjectState(object, processor.asNetProcessor());

    expect(processor.writeDataOrder).toEqual(processor.readDataOrder);
    expect(processor.dataList).toHaveLength(0);

    expect(object.sell_condition).not.toHaveBeenCalled();
    expect(object.buy_condition).not.toHaveBeenCalled();
    expect(object.buy_supplies).not.toHaveBeenCalled();
    expect(object.buy_item_condition_factor).not.toHaveBeenCalled();

    expect(registry.trade.get(object.id())).toEqualLuaTables({
      config: ini,
      configPath: ini.fname(),
      buyCondition: parseConditionsList("generic_buy"),
      buyItemFactorCondition: parseConditionsList("0.7"),
      sellCondition: parseConditionsList("generic_sell"),
      buySupplies: parseConditionsList("{+tier4} tier4, {+tier3} supplies_tier_3, {+tier2} tier2, tier1"),
      discounts: parseConditionsList("{+first} low_discounts, discounts_section"),
      currentBuyItemConditionFactor: null,
      currentBuyCondition: null,
      currentBuySupplies: null,
      currentSellCondition: null,
      resupplyAt: -1,
      updateAt: -1,
    });
  });

  it("should correctly save and load data when updated", () => {
    const tradeManager: TradeManager = getManager(TradeManager);
    const object: GameObject = MockGameObject.mock();
    const ini: IniFile = loadIniFile("managers\\trade\\trade_generic.ltx");
    const processor: MockNetProcessor = new MockNetProcessor();

    replaceFunctionMock(time_global, () => 10_000);
    tradeManager.initializeForObject(object, "managers\\trade\\trade_generic.ltx");

    replaceFunctionMock(time_global, () => 20_000);
    tradeManager.updateForObject(object);

    replaceFunctionMock(time_global, () => 30_000);
    tradeManager.saveObjectState(object, processor.asNetPacket());

    expect(processor.writeDataOrder).toEqual([
      EMockPacketDataType.BOOLEAN,
      EMockPacketDataType.STRING,
      EMockPacketDataType.STRING,
      EMockPacketDataType.STRING,
      EMockPacketDataType.STRING,
      EMockPacketDataType.I32,
      EMockPacketDataType.I32,
      EMockPacketDataType.U16,
    ]);
    expect(processor.dataList).toEqual([
      true,
      "managers\\trade\\trade_generic.ltx",
      "generic_buy",
      "generic_sell",
      "tier1",
      3590000,
      86390000,
      7,
    ]);

    registry.objects.delete(object.id());

    tradeManager.loadObjectState(object, processor.asNetProcessor());

    expect(processor.writeDataOrder).toEqual(processor.readDataOrder);
    expect(processor.dataList).toHaveLength(0);

    expect(object.buy_condition).toHaveBeenNthCalledWith(2, ini, "generic_buy");
    expect(object.sell_condition).toHaveBeenNthCalledWith(2, ini, "generic_sell");
    expect(object.buy_item_condition_factor).toHaveBeenCalledTimes(1);
    expect(object.buy_item_condition_factor).toHaveBeenCalledTimes(1);

    tradeManager.initializeForObject(object, ini.fname());

    expect(registry.trade.get(object.id())).toEqualLuaTables({
      config: ini,
      configPath: ini.fname(),
      buyCondition: parseConditionsList("generic_buy"),
      buyItemFactorCondition: parseConditionsList("0.7"),
      sellCondition: parseConditionsList("generic_sell"),
      buySupplies: parseConditionsList("{+tier4} tier4, {+tier3} supplies_tier_3, {+tier2} tier2, tier1"),
      discounts: parseConditionsList("{+first} low_discounts, discounts_section"),
      currentBuyItemConditionFactor: null,
      currentBuyCondition: "generic_buy",
      currentBuySupplies: "tier1",
      currentSellCondition: "generic_sell",
      resupplyAt: 86420000,
      updateAt: 3620000,
    });

    replaceFunctionMock(time_global, () => 3_620_001);
    tradeManager.updateForObject(object);

    expect(object.buy_item_condition_factor).toHaveBeenCalledTimes(2);
    expect(object.buy_item_condition_factor).toHaveBeenLastCalledWith(0.7);
  });

  it("should correctly handle debug dump event", () => {
    const manager: TradeManager = getManager(TradeManager);
    const data: AnyObject = {};

    EventsManager.emitEvent(EGameEvent.DUMP_LUA_DATA, data);

    expect(data).toEqual({ TradeManager: expect.any(Object) });
    expect(manager.onDebugDump({})).toEqual({ TradeManager: expect.any(Object) });
  });
});
