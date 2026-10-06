import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { LuaArray, Nillable, TCount, TLabel, TName } from "xray16/lib";

import { registry } from "@/engine/core/database";
import {
  applyGameModifierHook,
  getGameGuardHookRejection,
  getGameHookRegistrations,
  registerGameHook,
  unregisterGameHook,
} from "@/engine/core/hooks/hooks";
import { EGameHook, EGameHookPhase, IGameHookRegistration } from "@/engine/core/hooks/hooks_types";
import { SmartTerrain } from "@/engine/core/objects/smart_terrain";
import { Squad } from "@/engine/core/objects/squad";
import { MockSmartTerrain, MockSquad, resetRegistry } from "@/fixtures/engine";

/**
 * @param hook - Hook to list.
 * @returns Owners of the hook's handlers, in the order they run.
 */
function getOwners(hook: EGameHook): Array<TName> {
  const registrations: LuaArray<IGameHookRegistration> = getGameHookRegistrations(hook);
  const owners: Array<TName> = [];

  for (const index of $range(1, registrations.length())) {
    owners.push(registrations.get(index).owner);
  }

  return owners;
}

beforeEach(() => {
  resetRegistry();
});

describe("registerGameHook", () => {
  it("should run handlers by phase, then in registration order, whatever order they register in", () => {
    function limit(value: TCount): TCount {
      return value;
    }

    function adjust(value: TCount): TCount {
      return value;
    }

    function set(value: TCount): TCount {
      return value;
    }

    function late(value: TCount): TCount {
      return value;
    }

    registerGameHook(EGameHook.SMART_TERRAIN_RESPAWN_IDLE, limit, { owner: "limit", phase: EGameHookPhase.LIMIT });
    registerGameHook(EGameHook.SMART_TERRAIN_RESPAWN_IDLE, adjust, { owner: "adjust" });
    registerGameHook(EGameHook.SMART_TERRAIN_RESPAWN_IDLE, set, { owner: "set", phase: EGameHookPhase.SET });
    registerGameHook(EGameHook.SMART_TERRAIN_RESPAWN_IDLE, late, { owner: "late", phase: EGameHookPhase.ADJUST });

    expect(getOwners(EGameHook.SMART_TERRAIN_RESPAWN_IDLE)).toEqual(["set", "adjust", "late", "limit"]);

    registerGameHook(EGameHook.SMART_TERRAIN_RESPAWN_IDLE, adjust, { owner: "moved", phase: EGameHookPhase.LIMIT });

    expect(getOwners(EGameHook.SMART_TERRAIN_RESPAWN_IDLE)).toEqual(["set", "late", "limit", "moved"]);
  });

  it("should refuse a handler without owner", () => {
    expect(() => registerGameHook(EGameHook.SIMULATION_TARGET_REJECTION, () => null, { owner: "" })).toThrow();
    expect(registry.hooks.has(EGameHook.SIMULATION_TARGET_REJECTION)).toBe(false);
  });
});

describe("unregisterGameHook", () => {
  it("should remove a handler, dropping the hook with its last one, without changing a dispatch in progress", () => {
    const terrain: SmartTerrain = MockSmartTerrain.mock();
    const calls: Array<string> = [];

    function second(idle: number): number {
      calls.push("second");

      return idle + 1;
    }

    function first(idle: number): number {
      calls.push("first");
      unregisterGameHook(EGameHook.SMART_TERRAIN_RESPAWN_IDLE, second);

      return idle;
    }

    registerGameHook(EGameHook.SMART_TERRAIN_RESPAWN_IDLE, first, { owner: "first" });
    registerGameHook(EGameHook.SMART_TERRAIN_RESPAWN_IDLE, second, { owner: "second" });

    expect(applyGameModifierHook(EGameHook.SMART_TERRAIN_RESPAWN_IDLE, 10, terrain)).toBe(11);
    expect(calls).toEqual(["first", "second"]);
    expect(getOwners(EGameHook.SMART_TERRAIN_RESPAWN_IDLE)).toEqual(["first"]);

    unregisterGameHook(EGameHook.SMART_TERRAIN_RESPAWN_IDLE, first);
    unregisterGameHook(EGameHook.SMART_TERRAIN_RESPAWN_IDLE, first);

    expect(registry.hooks.has(EGameHook.SMART_TERRAIN_RESPAWN_IDLE)).toBe(false);
  });
});

describe("getGameHookRegistrations", () => {
  it("should list a hook's registrations with their owner, phase and context", () => {
    const context: { scale: number } = { scale: 2 };

    function scale(this: { scale: number }, value: TCount): TCount {
      return value * this.scale;
    }

    expect(getGameHookRegistrations(EGameHook.SMART_TERRAIN_RESPAWN_LIMIT).length()).toBe(0);

    registerGameHook(EGameHook.SMART_TERRAIN_RESPAWN_LIMIT, scale, { owner: "test", context });

    expect(getGameHookRegistrations(EGameHook.SMART_TERRAIN_RESPAWN_LIMIT)).toEqualLuaArrays([
      { handler: scale, context, owner: "test", phase: EGameHookPhase.ADJUST },
    ]);
  });
});

describe("applyGameModifierHook", () => {
  it("should return the core's value without handlers, and chain it through handlers in order", () => {
    const terrain: SmartTerrain = MockSmartTerrain.mock();
    const context: { factor: number } = { factor: 3 };

    expect(applyGameModifierHook(EGameHook.SMART_TERRAIN_RESPAWN_LIMIT, 4, terrain, "test_section")).toBe(4);

    registerGameHook(
      EGameHook.SMART_TERRAIN_RESPAWN_LIMIT,
      function (this: { factor: number }, limit: TCount): TCount {
        return limit * this.factor;
      },
      { owner: "scale", context }
    );
    registerGameHook(
      EGameHook.SMART_TERRAIN_RESPAWN_LIMIT,
      (limit: TCount, it: SmartTerrain, section: string) => (it === terrain && section === "test_section" ? 2 : limit),
      { owner: "set", phase: EGameHookPhase.SET }
    );
    registerGameHook(EGameHook.SMART_TERRAIN_RESPAWN_LIMIT, (limit: TCount) => math.min(limit, 5), {
      owner: "limit",
      phase: EGameHookPhase.LIMIT,
    });

    expect(applyGameModifierHook(EGameHook.SMART_TERRAIN_RESPAWN_LIMIT, 4, terrain, "test_section")).toBe(5);
    expect(applyGameModifierHook(EGameHook.SMART_TERRAIN_RESPAWN_LIMIT, 1, terrain, "other_section")).toBe(3);
  });
});

describe("getGameGuardHookRejection", () => {
  it("should allow without handlers, and give the first handler's reason to refuse", () => {
    const target: Squad = MockSquad.mock();
    const squad: Squad = MockSquad.mock();
    const last = jest.fn((): Nillable<TLabel> => "last");
    const context: { reason: TLabel } = { reason: "first" };

    expect(getGameGuardHookRejection(EGameHook.SIMULATION_TARGET_REJECTION, target, squad)).toBeNull();

    registerGameHook(EGameHook.SIMULATION_TARGET_REJECTION, () => null, { owner: "allow" });

    expect(getGameGuardHookRejection(EGameHook.SIMULATION_TARGET_REJECTION, target, squad)).toBeNull();

    registerGameHook(
      EGameHook.SIMULATION_TARGET_REJECTION,
      function (this: { reason: TLabel }, it: unknown, by: Squad): Nillable<TLabel> {
        return it === target && by === squad ? this.reason : null;
      },
      { owner: "first", context }
    );
    registerGameHook(EGameHook.SIMULATION_TARGET_REJECTION, last, { owner: "last" });

    expect(getGameGuardHookRejection(EGameHook.SIMULATION_TARGET_REJECTION, target, squad)).toBe("first");
    expect(last).not.toHaveBeenCalled();
    expect(getGameGuardHookRejection(EGameHook.SIMULATION_TARGET_REJECTION, squad, target)).toBe("last");
  });
});
