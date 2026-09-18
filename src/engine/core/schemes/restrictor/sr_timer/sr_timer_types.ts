import type { CUIStatic } from "xray16";
import type { LuaArray, Nillable, TCount, TDuration, TLabel, TStringId } from "xray16/lib";

import type { TConditionList } from "@/engine/core/ini";
import type { IBaseSchemeState } from "@/engine/core/schemes/state";
import type { EScheme } from "@/engine/core/schemes/types";

/**
 * Timer behaviour mode.
 */
export const enum ETimerType {
  INCREMENT = "inc",
  DECREMENT = "dec",
}

/**
 * Timer threshold in milliseconds and the conditions evaluated when it is reached.
 */
export interface ITimerThreshold {
  value: TDuration;
  condlist: TConditionList;
}

/**
 * Timer scheme state.
 */
export interface ISchemeTimerState extends IBaseSchemeState {
  type: ETimerType;
  startValue: TCount;
  /** Evaluated in configuration order on every update until a section switch succeeds. */
  onValue: LuaArray<ITimerThreshold>;
  timerId: TStringId;
  string: Nillable<TLabel>;
  timer: CUIStatic;
}

declare module "@/engine/core/schemes/state/types" {
  interface ISchemeStateMap {
    [EScheme.SR_TIMER]: ISchemeTimerState;
  }
}
