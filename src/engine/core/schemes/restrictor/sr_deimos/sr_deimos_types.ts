import type { TDuration, TName, TRate, TStringId } from "xray16/lib";

import type { IBaseSchemeState } from "@/engine/core/schemes/state";
import type { EScheme } from "@/engine/core/schemes/types";

/**
 * Deimos intensity bounds checked by the `check_deimos_phase` condition.
 *
 * @inline
 */
export enum EDeimosBound {
  DISABLE = "disable_bound",
  LOWER = "lower_bound",
  UPPER = "upper_bound",
}

/**
 * State of the deimos scheme.
 */
export interface ISchemeDeimosState extends IBaseSchemeState {
  movementSpeed: TRate;
  growingRate: TRate;
  loweringRate: TRate;
  ppEffector: TStringId;
  ppEffector2: TStringId;
  camEffector: TStringId;
  camEffectorRepeatingTime: TDuration;
  noiseSound: TName;
  heartbeatSound: TName;
  healthLost: TRate;
  disableBound: TRate;
  switchLowerBound: TRate;
  switchUpperBound: TRate;
  intensity: TRate;
}

declare module "@/engine/core/schemes/state/types" {
  interface ISchemeStateMap {
    [EScheme.SR_DEIMOS]: ISchemeDeimosState;
  }
}
