import { time_global } from "xray16";
import { GameObject, IniFile, NetPacket, NetProcessor } from "xray16/alias";
import {
  abort,
  AnyObject,
  assertNonEmptyString,
  Nillable,
  TNumberId,
  TPath,
  TRate,
  TSection,
  TTimestamp,
} from "xray16/lib";
import { $filename, $isNil } from "xray16/macros";

import {
  closeLoadMarker,
  closeSaveMarker,
  getManager,
  loadIniFile,
  openLoadMarker,
  openSaveMarker,
  registry,
} from "@/engine/core/database";
import { parseConditionsList, pickSectionFromCondList, readIniNumber, readIniString } from "@/engine/core/ini";
import { AbstractManager } from "@/engine/core/managers/abstract";
import { EGameEvent, EventsManager } from "@/engine/core/managers/events";
import { ITradeManagerDescriptor } from "@/engine/core/managers/trade/trade_types";
import { tradeConfig } from "@/engine/core/managers/trade/TradeConfig";
import { LuaLogger } from "@/engine/core/utils/logging";

const logger: LuaLogger = new LuaLogger($filename, { file: "trade" });

/**
 * Manager to handle current trading state / trading items lists for stalker objects.
 * Handles initialization and updating of trading states, manages descriptors with trading information.
 */
export class TradeManager extends AbstractManager {
  public override initialize(): void {
    const eventsManager: EventsManager = getManager(EventsManager);

    eventsManager.registerCallback(EGameEvent.DUMP_LUA_DATA, this.onDebugDump, this);
  }

  public override destroy(): void {
    const eventsManager: EventsManager = getManager(EventsManager);

    eventsManager.unregisterCallback(EGameEvent.DUMP_LUA_DATA, this.onDebugDump);
  }

  /**
   * Initialize trade manager descriptor for provided stalker object.
   */
  public initializeForObject(object: GameObject, iniFilePath: TPath): void {
    logger.info("Initialize trade for: %s %s", object.name(), iniFilePath);

    const existingDescriptor: Nillable<ITradeManagerDescriptor> = registry.trade.get(object.id());

    if (!$isNil(existingDescriptor) && existingDescriptor.configPath === iniFilePath) {
      return;
    }

    registry.trade.set(object.id(), this.createDescriptor(object, iniFilePath));
  }

  /**
   * Create a trade descriptor with static configuration and initial runtime state.
   *
   * @param object - Game object that owns the trade descriptor.
   * @param iniFilePath - Path of the trade configuration file.
   * @returns Trade descriptor initialized from the provided configuration.
   */
  private createDescriptor(object: GameObject, iniFilePath: TPath): ITradeManagerDescriptor {
    const iniFile: IniFile = loadIniFile(iniFilePath);

    const sellCondlist: Nillable<string> = readIniString(iniFile, "trader", "sell_condition", true);
    const buyCondlist: Nillable<string> = readIniString(iniFile, "trader", "buy_condition", true);
    const buySuppliesCondlist: Nillable<string> = readIniString(iniFile, "trader", "buy_supplies", false);
    const buyItemFactorCondlist: string = readIniString(
      iniFile,
      "trader",
      "buy_item_condition_factor",
      false,
      null,
      "0.7"
    );
    const discountsCondlist: string = readIniString(iniFile, "trader", "discounts", false, null, "");

    if ($isNil(buyCondlist) || $isNil(sellCondlist)) {
      abort("Wrong trade manager configuration used for game object: '%s'.", object.name());
    }

    return {
      config: iniFile,
      configPath: iniFilePath,
      updateAt: -1,
      resupplyAt: -1,
      sellCondition: parseConditionsList(sellCondlist),
      buyCondition: parseConditionsList(buyCondlist),
      buySupplies: $isNil(buySuppliesCondlist) ? null : parseConditionsList(buySuppliesCondlist),
      buyItemFactorCondition: parseConditionsList(buyItemFactorCondlist),
      discounts: discountsCondlist === "" ? null : parseConditionsList(discountsCondlist),
      currentSellCondition: null,
      currentBuyCondition: null,
      currentBuyItemConditionFactor: null,
      currentBuySupplies: null,
    };
  }

  /**
   * Perform trading schemes update for game object instance.
   *
   * @param object - Game object to update trading state.
   */
  public updateForObject(object: GameObject): void {
    const tradeDescriptor: Nillable<ITradeManagerDescriptor> = registry.trade.get(object.id());
    const now: TTimestamp = time_global();

    // Nothing to update / not time yet:
    if ($isNil(tradeDescriptor) || tradeDescriptor.updateAt > now) {
      return;
    }

    tradeDescriptor.updateAt = now + tradeConfig.UPDATE_PERIOD;

    logger.info("Updating trade state for: '%s', next at '%s'", object.name(), tradeDescriptor.updateAt);

    const buyCondition: Nillable<TSection> = pickSectionFromCondList(
      registry.actor,
      object,
      tradeDescriptor.buyCondition
    );

    assertNonEmptyString(buyCondition, "Wrong section in buy_condition condlist for object '%s'.", object.name());

    if (tradeDescriptor.currentBuyCondition !== buyCondition) {
      object.buy_condition(tradeDescriptor.config, buyCondition);
      tradeDescriptor.currentBuyCondition = buyCondition;
    }

    const sellCondition: Nillable<TSection> = pickSectionFromCondList(
      registry.actor,
      object,
      tradeDescriptor.sellCondition
    );

    assertNonEmptyString(sellCondition, "Wrong section in sell_condition condlist for object '%s'.", object.name());

    if (tradeDescriptor.currentSellCondition !== sellCondition) {
      logger.info("Change object sell condition: %s %s", object.name(), sellCondition);
      object.sell_condition(tradeDescriptor.config, sellCondition);
      tradeDescriptor.currentSellCondition = sellCondition;
    }

    const buyItemConditionFactor: TRate = tonumber(
      pickSectionFromCondList(registry.actor, object, tradeDescriptor.buyItemFactorCondition)
    )!;

    if (tradeDescriptor.currentBuyItemConditionFactor !== buyItemConditionFactor) {
      logger.info("Change object buy condition factor: %s %s", object.name(), buyItemConditionFactor);
      object.buy_item_condition_factor(buyItemConditionFactor);
      tradeDescriptor.currentBuyItemConditionFactor = buyItemConditionFactor;
    }

    // Not defined or not time to update yet:
    if ($isNil(tradeDescriptor.buySupplies) || tradeDescriptor.resupplyAt > now) {
      return;
    }

    const buySupplies: Nillable<TSection> = pickSectionFromCondList(
      registry.actor,
      object,
      tradeDescriptor.buySupplies
    );

    assertNonEmptyString(buySupplies, "Wrong section in buy_supplies condlist for object '%s'.", object.name());

    // Traders restock every resupply period, whether the supplies section changed or not.
    logger.info("Resupply object: %s %s", object.name(), buySupplies);
    object.buy_supplies(tradeDescriptor.config, buySupplies);
    tradeDescriptor.currentBuySupplies = buySupplies;
    tradeDescriptor.resupplyAt = now + tradeConfig.RESUPPLY_PERIOD;
  }

  /**
   * @param objectId - Target object ID to get buy discount for.
   * @returns Discount rate for object ID based on currently active trading section.
   */
  public getBuyDiscountForObject(objectId: TNumberId): TRate {
    const tradeDescriptor: ITradeManagerDescriptor = registry.trade.get(objectId);

    return $isNil(tradeDescriptor.discounts)
      ? 1
      : readIniNumber(
          tradeDescriptor.config,
          pickSectionFromCondList(registry.actor, null, tradeDescriptor.discounts)!,
          "buy",
          false,
          1
        );
  }

  /**
   * @param objectId - Target object ID to get sell discount for.
   * @returns Discount rate for object ID based on currently active trading section.
   */
  public getSellDiscountForObject(objectId: TNumberId): TRate {
    const tradeDescriptor: ITradeManagerDescriptor = registry.trade.get(objectId);

    return $isNil(tradeDescriptor.discounts)
      ? 1
      : readIniNumber(
          tradeDescriptor.config,
          pickSectionFromCondList(registry.actor, null, tradeDescriptor.discounts)!,
          "sell",
          false,
          1
        );
  }

  /**
   * @param owner - Item owner game object.
   * @param item - Target item to check.
   * @returns Whether item can be traded (script logics overriding).
   */
  public isItemAvailableForTrade(owner: GameObject, item: GameObject): boolean {
    return true;
  }

  /**
   * Save object state in net processor.
   *
   * @param object - Game object to save data for.
   * @param packet - Net packet to save data in.
   */
  public saveObjectState(object: GameObject, packet: NetPacket): void {
    const tradeDescriptor: ITradeManagerDescriptor = registry.trade.get(object.id());

    openSaveMarker(packet, TradeManager.name);

    if ($isNil(tradeDescriptor)) {
      packet.w_bool(false);
    } else {
      packet.w_bool(true);

      packet.w_stringZ(tradeDescriptor.configPath);
      packet.w_stringZ($isNil(tradeDescriptor.currentBuyCondition) ? "" : tradeDescriptor.currentBuyCondition);
      packet.w_stringZ($isNil(tradeDescriptor.currentSellCondition) ? "" : tradeDescriptor.currentSellCondition);
      packet.w_stringZ($isNil(tradeDescriptor.currentBuySupplies) ? "" : tradeDescriptor.currentBuySupplies);

      const now: TTimestamp = time_global();

      packet.w_s32(tradeDescriptor.updateAt - now);
      packet.w_s32(tradeDescriptor.resupplyAt - now);
    }

    closeSaveMarker(packet, TradeManager.name);
  }

  /**
   * Load state for object and store in registry.
   *
   * @param object - Game object to read for.
   * @param reader - Net processor to read from.
   */
  public loadObjectState(object: GameObject, reader: NetProcessor): void {
    openLoadMarker(reader, TradeManager.name);

    const hasTrade: boolean = reader.r_bool();

    if (hasTrade) {
      const descriptor: ITradeManagerDescriptor = this.createDescriptor(object, reader.r_stringZ());

      registry.trade.set(object.id(), descriptor);

      const buyCondition: string = reader.r_stringZ();

      if (buyCondition !== "") {
        descriptor.currentBuyCondition = buyCondition;
        object.buy_condition(descriptor.config, buyCondition);
      }

      const sellCondition: string = reader.r_stringZ();

      if (sellCondition !== "") {
        descriptor.currentSellCondition = sellCondition;
        object.sell_condition(descriptor.config, sellCondition);
      }

      const buySupplies: string = reader.r_stringZ();

      if (buySupplies !== "") {
        descriptor.currentBuySupplies = buySupplies;
      }

      const now: TTimestamp = time_global();

      // The engine keeps no buy item condition factor, which is 0 until an update applies it, so update at once.
      reader.r_s32(); // updatedAt from save.

      descriptor.updateAt = now;
      descriptor.resupplyAt = now + reader.r_s32();
    }

    closeLoadMarker(reader, TradeManager.name);
  }

  /**
   * Handle dump data event.
   *
   * @param data - Data to dump into file.
   */
  public onDebugDump(data: AnyObject): AnyObject {
    data[this.constructor.name] = {
      tradeConfig: tradeConfig,
    };

    return data;
  }
}
