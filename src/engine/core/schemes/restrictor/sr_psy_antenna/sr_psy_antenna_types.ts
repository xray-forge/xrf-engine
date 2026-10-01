import type { IPsyZoneEffects } from "@/engine/core/managers/psy/psy_antenna_types";
import type { IBaseSchemeState } from "@/engine/core/schemes/state";
import type { EScheme } from "@/engine/core/schemes/types";

/**
 * State of psy antenna scheme: the psy effects of its zone.
 */
export interface ISchemePsyAntennaState extends IBaseSchemeState, IPsyZoneEffects {}

/**
 * Possible states of psy antenna.
 */
export const enum EAntennaState {
  OUTSIDE = 0,
  INSIDE = 1,
  VOID = 2,
}

declare module "@/engine/core/schemes/state/types" {
  interface ISchemeStateMap {
    [EScheme.SR_PSY_ANTENNA]: ISchemePsyAntennaState;
  }
}
