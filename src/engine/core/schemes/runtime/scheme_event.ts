import { GameObject } from "xray16/alias";
import { AnyArgs, AnyContextualCallable, Nillable, TName } from "xray16/lib";
import { $isNotNil } from "xray16/macros";

import { IRegistryObjectState } from "@/engine/core/database/database_types";
import { registry } from "@/engine/core/database/registry";
import { getActiveSchemeState, IBaseSchemeState, TSchemeSignals } from "@/engine/core/schemes/state";
import { ESchemeEvent } from "@/engine/core/schemes/types";

/**
 * Emit scheme event for active `actions` list in scheme state.
 *
 * @param state - Scheme state for emitting.
 * @param event - Event type to emit.
 * @param rest - Event args.
 */
export function emitSchemeEvent(state: IBaseSchemeState, event: ESchemeEvent, ...rest: AnyArgs): void {
  if (!state || !state.actions) {
    return;
  }

  for (const [actionHandler, _isHandlerActive] of state.actions) {
    if (actionHandler[event]) {
      // Forwarded as varargs, packing them would allocate a table on every update of every object.
      (actionHandler[event] as AnyContextualCallable).call(actionHandler, ...rest);
    }
  }
}

/**
 * Set currently active scheme signal as activated for the object.
 *
 * @param object - Object to set signal in state for.
 * @param signal - Name of the signal to set.
 */
export function setObjectActiveSchemeSignal(object: GameObject, signal: TName): void {
  const state: Nillable<IRegistryObjectState> = registry.objects.get(object.id());
  const signals: Nillable<TSchemeSignals> = $isNotNil(state) ? getActiveSchemeState(state)?.signals : null;

  if (signals) {
    signals.set(signal, true);
  }
}
