import type {
  AnyCallable,
  AnyObject,
  LuaArray,
  Nillable,
  TCount,
  TDuration,
  TLabel,
  TName,
  TSection,
} from "xray16/lib";

import type { TSimulationObject } from "@/engine/core/managers/simulation/types";
import type { SmartTerrain } from "@/engine/core/objects/smart_terrain";
import type { Squad } from "@/engine/core/objects/squad";

/**
 * Points where extensions change what the core decides, beside the events it notifies them about.
 *
 * @inline
 */
export enum EGameHook {
  /**
   * Modifier: game seconds a smart terrain waits between respawn attempts.
   */
  SMART_TERRAIN_RESPAWN_IDLE = "smart_terrain_respawn_idle",
  /**
   * Modifier: squads a respawn section of a smart terrain may have alive, asked for a respawn attempt or for display.
   */
  SMART_TERRAIN_RESPAWN_LIMIT = "smart_terrain_respawn_limit",
  /**
   * Guard: why a squad may not take a simulation target, after the target's own rules allowed it.
   */
  SIMULATION_TARGET_REJECTION = "simulation_target_rejection",
}

/**
 * Order a hook's handlers run in, before their registration order: handlers setting a value run first, then ones
 * adjusting it, then ones limiting it, so extensions compose whatever order they load in.
 *
 * @inline
 */
export enum EGameHookPhase {
  SET = 1,
  ADJUST = 2,
  LIMIT = 3,
}

/**
 * Modifier hooks: each handler takes the value so far, followed by the hook's arguments, and returns the value.
 */
export interface IGameModifierHooks {
  [EGameHook.SMART_TERRAIN_RESPAWN_IDLE]: (this: void, idle: TDuration, terrain: SmartTerrain) => TDuration;
  [EGameHook.SMART_TERRAIN_RESPAWN_LIMIT]: (
    this: void,
    limit: TCount,
    terrain: SmartTerrain,
    section: TSection,
    isRespawnAttempt: boolean
  ) => TCount;
}

/**
 * Guard hooks: each handler returns why the decision is refused, `null` to allow it.
 */
export interface IGameGuardHooks {
  [EGameHook.SIMULATION_TARGET_REJECTION]: (this: void, target: TSimulationObject, squad: Squad) => Nillable<TLabel>;
}

/**
 * Handler signature of every hook.
 */
export type TGameHooks = IGameModifierHooks & IGameGuardHooks;

/**
 * Handler of a hook called with a context as `this`.
 */
export type TGameHookContextualHandler<H extends EGameHook, T> = (
  this: T,
  ...args: Parameters<TGameHooks[H]>
) => ReturnType<TGameHooks[H]>;

/**
 * Arguments a modifier hook passes after the value.
 */
export type TGameModifierHookArgs<H extends keyof IGameModifierHooks> =
  Parameters<IGameModifierHooks[H]> extends [unknown, ...infer R] ? R : never;

/**
 * How a handler is registered.
 */
export interface IGameHookOptions {
  // Who registers the handler, such as an extension's name, shown wherever hooks are listed.
  owner: TName;
  // Phase the handler runs in, `ADJUST` by default.
  phase?: EGameHookPhase;
}

/**
 * How a handler called with a context is registered.
 */
export interface IGameHookContextualOptions<T> extends IGameHookOptions {
  // Object the handler is called on, as `this`.
  context: T;
}

/**
 * Registered handler of a hook. A hook's registrations are kept by phase, then registration order, and replaced
 * rather than changed, so a dispatch in progress keeps the list it started with.
 */
export interface IGameHookRegistration {
  handler: AnyCallable;
  // Context the handler is called with, `false` for plain functions.
  context: AnyObject | false;
  owner: TName;
  phase: EGameHookPhase;
}

/**
 * Registrations of a hook, in the order its handlers run.
 */
export type TGameHookRegistrations = LuaArray<IGameHookRegistration>;
