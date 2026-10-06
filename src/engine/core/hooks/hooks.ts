import { AnyCallable, AnyContextualCallable, AnyObject, assert, Nillable, TLabel } from "xray16/lib";
import { $isNil, $isNotNil } from "xray16/macros";

import { registry } from "@/engine/core/database/registry";
import {
  EGameHook,
  EGameHookPhase,
  IGameGuardHooks,
  IGameHookContextualOptions,
  IGameHookOptions,
  IGameHookRegistration,
  IGameModifierHooks,
  TGameHookContextualHandler,
  TGameHookRegistrations,
  TGameHooks,
  TGameModifierHookArgs,
} from "@/engine/core/hooks/hooks_types";

/**
 * Register a hook handler. Handlers run by phase, then in registration order; registering one again replaces its
 * options.
 *
 * @param hook - Hook to handle.
 * @param handler - Handler of the hook's signature.
 * @param options - Owner, phase and context of the handler.
 */
export function registerGameHook<H extends EGameHook, T extends AnyObject>(
  hook: H,
  handler: TGameHookContextualHandler<H, T>,
  options: IGameHookContextualOptions<T>
): void;
export function registerGameHook<H extends EGameHook>(hook: H, handler: TGameHooks[H], options: IGameHookOptions): void;
export function registerGameHook(
  hook: EGameHook,
  handler: AnyCallable,
  options: IGameHookOptions & { context?: AnyObject }
): void {
  assert(type(options.owner) === "string" && options.owner !== "", "Game hook '%s' registered without owner.", hook);

  const record: IGameHookRegistration = {
    handler,
    context: options.context ?? false,
    owner: options.owner,
    phase: options.phase ?? EGameHookPhase.ADJUST,
  };
  const current: TGameHookRegistrations = getGameHookRegistrations(hook);
  const next: TGameHookRegistrations = new LuaTable();
  let isInserted: boolean = false;

  for (const index of $range(1, current.length())) {
    const it: IGameHookRegistration = current.get(index);

    if (it.handler !== handler) {
      if (!isInserted && it.phase > record.phase) {
        table.insert(next, record);
        isInserted = true;
      }

      table.insert(next, it);
    }
  }

  if (!isInserted) {
    table.insert(next, record);
  }

  registry.hooks.set(hook, next);
}

/**
 * Unregister a hook handler.
 *
 * @param hook - Hook the handler handles.
 * @param handler - Registered handler.
 */
export function unregisterGameHook<H extends EGameHook, T extends AnyObject>(
  hook: H,
  handler: TGameHookContextualHandler<H, T>
): void;
export function unregisterGameHook<H extends EGameHook>(hook: H, handler: TGameHooks[H]): void;
export function unregisterGameHook(hook: EGameHook, handler: AnyCallable): void {
  const current: Nillable<TGameHookRegistrations> = registry.hooks.get(hook);

  if ($isNil(current)) {
    return;
  }

  const next: TGameHookRegistrations = new LuaTable();

  for (const index of $range(1, current.length())) {
    const it: IGameHookRegistration = current.get(index);

    if (it.handler !== handler) {
      table.insert(next, it);
    }
  }

  if (next.length() === 0) {
    registry.hooks.delete(hook);
  } else {
    registry.hooks.set(hook, next);
  }
}

/**
 * @param hook - Hook to list.
 * @returns Registrations of the hook in the order its handlers run, empty without any.
 */
export function getGameHookRegistrations(hook: EGameHook): TGameHookRegistrations {
  return registry.hooks.get(hook) ?? new LuaTable();
}

/**
 * Pass a value through a modifier hook's handlers, in their order.
 *
 * @param hook - Modifier hook.
 * @param value - Value the core decided.
 * @param args - Arguments of the hook, after the value.
 * @returns The value after every handler, the core's own without handlers.
 */
export function applyGameModifierHook<H extends keyof IGameModifierHooks>(
  hook: H,
  value: ReturnType<IGameModifierHooks[H]>,
  ...args: TGameModifierHookArgs<H>
): ReturnType<IGameModifierHooks[H]> {
  const registrations: Nillable<TGameHookRegistrations> = registry.hooks.get(hook);

  if ($isNil(registrations)) {
    return value;
  }

  let result: ReturnType<IGameModifierHooks[H]> = value;

  for (const index of $range(1, registrations.length())) {
    const it: IGameHookRegistration = registrations.get(index);

    result = it.context
      ? (it.handler as unknown as AnyContextualCallable).call(it.context, result, ...args)
      : it.handler(result, ...args);
  }

  return result;
}

/**
 * Ask a guard hook's handlers whether to refuse a decision, in their order.
 *
 * @param hook - Guard hook.
 * @param args - Arguments of the hook.
 * @returns The first handler's reason to refuse, `null` when every handler allows it or there are none.
 */
export function getGameGuardHookRejection<H extends keyof IGameGuardHooks>(
  hook: H,
  ...args: Parameters<IGameGuardHooks[H]>
): Nillable<TLabel> {
  const registrations: Nillable<TGameHookRegistrations> = registry.hooks.get(hook);

  if ($isNil(registrations)) {
    return null;
  }

  for (const index of $range(1, registrations.length())) {
    const it: IGameHookRegistration = registrations.get(index);
    const reason: Nillable<TLabel> = it.context
      ? (it.handler as unknown as AnyContextualCallable).call(it.context, ...args)
      : it.handler(...args);

    if ($isNotNil(reason)) {
      return reason;
    }
  }

  return null;
}
