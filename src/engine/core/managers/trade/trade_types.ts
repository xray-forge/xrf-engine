import { IniFile } from "xray16/alias";
import { Nillable, TPath, TRate, TSection, TTimestamp } from "xray16/lib";

import { TConditionList } from "@/engine/core/ini";

/**
 * Descriptor of current trading state of game objects.
 */
export interface ITradeManagerDescriptor {
  config: IniFile;
  configPath: TPath;
  // By condition sections:
  buyCondition: TConditionList;
  buyItemFactorCondition: TConditionList;
  sellCondition: TConditionList;
  buySupplies: Nillable<TConditionList>;
  // Discounts section picker, parsed once as the engine asks for discounts on every item price.
  discounts: Nillable<TConditionList>;
  // Lifecycle configuration:
  updateAt: TTimestamp;
  resupplyAt: TTimestamp;
  // Currently used buy condition.
  currentBuyCondition: Nillable<TSection>;
  currentSellCondition: Nillable<TSection>;
  currentBuyItemConditionFactor: Nillable<TRate>;
  currentBuySupplies: Nillable<TSection>;
}
