import { beforeEach, describe, expect, it } from "@jest/globals";
import { level } from "xray16";
import { GameObject, ServerObject } from "xray16/alias";
import { MockAlifeObject, MockGameObject } from "xray16/mocks";
import { replaceFunctionMock, resetFunctionMock } from "xray16/testing/utils";

import { registerSimulator } from "@/engine/core/database";
import { IDebugTarget } from "@/engine/core/managers/debug/debug_types";
import { debugConfig } from "@/engine/core/managers/debug/DebugConfig";
import {
  clearDebugTarget,
  pickDebugTargetOnOpen,
  pinDebugTarget,
  pruneDebugTargets,
  selectDebugTarget,
} from "@/engine/core/managers/debug/utils/debug_target";
import { resetRegistry } from "@/fixtures/engine";

/**
 * @param ids - Recent ids, newest first.
 * @returns Target state with no current target.
 */
function createTarget(ids: Array<number> = []): IDebugTarget {
  const recentIds: LuaTable<number, number> = new LuaTable();

  ids.forEach((id, index) => recentIds.set(index + 1, id));

  return { id: null, isPinned: false, recentIds };
}

/**
 * @param target - Target state.
 * @returns Recent ids as an array, newest first.
 */
function getRecentIds(target: IDebugTarget): Array<number> {
  const ids: Array<number> = [];

  for (const index of $range(1, target.recentIds.length())) {
    ids.push(target.recentIds.get(index));
  }

  return ids;
}

beforeEach(() => {
  resetRegistry();
  registerSimulator();
  resetFunctionMock(level.get_target_obj);
});

describe("selectDebugTarget", () => {
  it("should move the target to the front of the recent ones", () => {
    const target: IDebugTarget = createTarget([1, 2, 3]);

    selectDebugTarget(target, 3);

    expect(target.id).toBe(3);
    expect(getRecentIds(target)).toEqual([3, 1, 2]);

    selectDebugTarget(target, 4);

    expect(getRecentIds(target)).toEqual([4, 3, 1, 2]);
  });

  it("should keep a limited number of recent targets", () => {
    const target: IDebugTarget = createTarget([1, 2, 3, 4, 5, 6, 7, 8]);

    selectDebugTarget(target, 9);

    expect(getRecentIds(target)).toHaveLength(debugConfig.RECENT_TARGETS_LIMIT);
    expect(getRecentIds(target)).toEqual([9, 1, 2, 3, 4, 5, 6, 7]);
  });
});

describe("clearDebugTarget", () => {
  it("should forget the target and its pin", () => {
    const target: IDebugTarget = createTarget([1]);

    target.id = 1;
    target.isPinned = true;

    clearDebugTarget(target);

    expect(target.id).toBeNull();
    expect(target.isPinned).toBe(false);
    expect(getRecentIds(target)).toEqual([1]);
  });
});

describe("pinDebugTarget", () => {
  it("should pin only a target", () => {
    const target: IDebugTarget = createTarget();

    expect(pinDebugTarget(target, true)).toBe(false);
    expect(target.isPinned).toBe(false);

    target.id = 1;

    expect(pinDebugTarget(target, true)).toBe(true);
    expect(target.isPinned).toBe(true);

    expect(pinDebugTarget(target, false)).toBe(false);
    expect(target.isPinned).toBe(false);
  });
});

describe("pickDebugTargetOnOpen", () => {
  it("should take the crosshair object unless the target is pinned", () => {
    const object: GameObject = MockGameObject.mock();
    const target: IDebugTarget = createTarget();

    pickDebugTargetOnOpen(target);

    expect(target.id).toBeNull();

    replaceFunctionMock(level.get_target_obj, () => object);
    pickDebugTargetOnOpen(target);

    expect(target.id).toBe(object.id());

    target.id = 1;
    target.isPinned = true;
    pickDebugTargetOnOpen(target);

    expect(target.id).toBe(1);
  });
});

describe("pruneDebugTargets", () => {
  it("should forget objects that no longer exist", () => {
    const existing: ServerObject = MockAlifeObject.mock();
    const target: IDebugTarget = createTarget([existing.id, 60_000]);

    target.id = 60_000;
    target.isPinned = true;

    pruneDebugTargets(target);

    expect(getRecentIds(target)).toEqual([existing.id]);
    expect(target.id).toBeNull();
    expect(target.isPinned).toBe(false);
  });
});
