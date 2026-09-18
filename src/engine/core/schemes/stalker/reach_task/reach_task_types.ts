import type { Vector } from "xray16/alias";
import type { TDistance } from "xray16/lib";

import type { IBaseSchemeState } from "@/engine/core/schemes/state";
import type { EScheme } from "@/engine/core/schemes/types";

export interface IReachTaskFormationSlot {
  dir: Vector;
  dist: TDistance;
}

/**
 * State of scheme implementing reach task logics.
 */
export interface ISchemeReachTaskState extends IBaseSchemeState {
  //
}

declare module "@/engine/core/schemes/state/types" {
  interface ISchemeStateMap {
    [EScheme.REACH_TASK]: ISchemeReachTaskState;
  }
}
