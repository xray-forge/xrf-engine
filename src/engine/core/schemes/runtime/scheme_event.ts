import { GameObject } from "xray16/alias";
import { AnyArgs, AnyContextualCallable, AnyObject, LuaArray, Nillable, TName } from "xray16/lib";
import { $isNotNil } from "xray16/macros";

import { IRegistryObjectState } from "@/engine/core/database/database_types";
import { registry } from "@/engine/core/database/registry";
import { getActiveSchemeState, IBaseSchemeState, TSchemeSignals } from "@/engine/core/schemes/state";
import { ESchemeEvent, ISchemeEventHandler } from "@/engine/core/schemes/types";

/**
 * Emit scheme event for active `actions` list in scheme state.
 *
 * @param state - Scheme state for emitting.
 * @param event - Event type to emit.
 * @param rest - Event args.
 */
export function emitSchemeEvent(state: IBaseSchemeState, event: ESchemeEvent, ...rest: AnyArgs): void {
  if (!state || !state.actionsList) {
    return;
  }

  // Runs on every update of every object, so it walks an array and forwards varargs, both of which LuaJIT compiles.
  // Subscribing rebuilds the list, so this one stays as it started, skipping handlers unsubscribed meanwhile.
  const handlers: LuaArray<ISchemeEventHandler> = state.actionsList;
  const subscribed: LuaTable<AnyObject, boolean> = state.actions as LuaTable<AnyObject, boolean>;

  for (const index of $range(1, handlers.length())) {
    const handler: AnyObject = handlers.get(index);
    const callback: Nillable<AnyContextualCallable> = handler[event];

    if (callback && subscribed.get(handler)) {
      callback.call(handler, ...rest);
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
