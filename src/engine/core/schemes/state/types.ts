import type { IniFile } from "xray16/alias";
import type { AnyObject, LuaArray, Nillable, TDuration, TName, TNumberId, TSection, TStringifiedNil } from "xray16/lib";

import type { TConditionList } from "@/engine/core/ini";
import type { EScheme, ESchemeCondition, ISchemeEventHandler } from "@/engine/core/schemes/types";

/**
 * Descriptor of a single parsed scheme logic entry with its condition list and parameters.
 */
export interface IBaseSchemeLogic {
  /**
   * Internal field, not for direct access.
   * Scheme condition type memoized on first switch evaluation, `name` field without numeric suffix.
   */
  $condition?: Nillable<ESchemeCondition | TStringifiedNil>;
  name: TName;
  condlist: TConditionList;
  objectId: Nillable<TNumberId>;
  p1: Nillable<string | number>;
  p2: Nillable<string | number>;
}

/**
 * List of scheme logic signals used by script scenarios.
 */
export type TSchemeSignals = LuaTable<TName, boolean>;

/**
 * Overrides applied on top of an object's active logic section.
 */
export interface ILogicsOverrides {
  heliHunter: Nillable<TConditionList>;
  combatIgnore: Nillable<IBaseSchemeLogic>;
  combatIgnoreKeepWhenAttacked: Nillable<boolean>;
  combatType: Nillable<IBaseSchemeLogic>;
  scriptCombatType: Nillable<TName>;
  minPostCombatTime: TDuration;
  maxPostCombatTime: TDuration;
  onCombat: Nillable<IBaseSchemeLogic>;
  onOffline: Nillable<TConditionList>;
  soundgroup: Nillable<TName>;
}

/**
 * Generic state stored for an object's scheme logic.
 */
export interface IBaseSchemeState {
  ini: IniFile;
  /**
   * List of switch conditions.
   * Based on logic check one scheme section can be switched to another if condlists provide next section.
   */
  logic: Nillable<LuaArray<IBaseSchemeLogic>>;
  /**
   * List of signals in active scheme state.
   * Signals are flags indicating whether some action/thing happened.
   */
  signals: Nillable<TSchemeSignals>;
  scheme: EScheme;
  section: Nillable<TSection>;
  // Handlers subscribed to scheme events.
  actions?: LuaTable<AnyObject, boolean>;
  // Subscribed handlers in subscription order, rebuilt on every change so an emit can walk the one it started with.
  actionsList?: LuaArray<ISchemeEventHandler>;
  overrides: Nillable<ILogicsOverrides>;
}

/**
 * Type-only extension point associating stateful schemes with their concrete state.
 *
 * Each state-owning scheme augments this interface beside its state declaration. Schemes without an entry do not own a
 * value in the per-object scheme-state registry.
 */
export interface ISchemeStateMap {}

/**
 * Scheme keys that have registered a concrete state type.
 */
export type TStatefulScheme = keyof ISchemeStateMap & EScheme;
