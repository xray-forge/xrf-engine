import { GameObject } from "xray16/alias";
import { extern, Nillable } from "xray16/lib";

import { EDeimosBound, isDeimosPhaseActive } from "@/engine/core/schemes/restrictor/sr_deimos";

/**
 * Check if deimos phase is active in restrictor object.
 *
 * Params:
 * - bounds - deimos phase bounds
 * - direction - deimos phase direction.
 */
extern(
  "xr_conditions.check_deimos_phase",
  (
    _: GameObject,
    object: GameObject,
    [bounds, direction]: [Nillable<EDeimosBound>, Nillable<"increasing" | "decreasing">]
  ): boolean => {
    return bounds && direction ? isDeimosPhaseActive(object, bounds, direction === "increasing") : false;
  }
);
