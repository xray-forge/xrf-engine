import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { level } from "xray16";
import { LuaArray } from "xray16/lib";
import { MockVector } from "xray16/mocks";
import { replaceFunctionMock } from "xray16/testing/utils";

import { getManager } from "@/engine/core/database";
import { IDebugSavedPosition, IDebugWorldEntry } from "@/engine/core/managers/debug/debug_types";
import {
  deleteDebugPosition,
  giveAllDebugTreasures,
  giveDebugTreasure,
  giveRandomDebugTreasure,
  saveDebugPosition,
  teleportActorToDebugWorldEntry,
} from "@/engine/core/managers/debug/utils/debug_world_actions";
import { treasureConfig, TreasureManager } from "@/engine/core/managers/treasures";
import { teleportActorToVertex } from "@/engine/core/utils/position";
import { getTableKeys } from "@/engine/core/utils/table";
import { mockRegisteredActor, resetRegistry } from "@/fixtures/engine";

jest.mock("@/engine/core/utils/position", () => ({ teleportActorToVertex: jest.fn(() => false) }));

const entry: IDebugWorldEntry = {
  id: 1,
  savedIndex: null,
  level: "zaton",
  label: "test_smart (zaton)",
  search: "",
  position: MockVector.mock(1, 2, 3),
  levelVertexId: 10,
  gameVertexId: 20,
};

beforeEach(() => {
  resetRegistry();
  mockRegisteredActor({ position: MockVector.mock(4, 5, 6), levelVertexId: 30, gameVertexId: 40 });
  replaceFunctionMock(level.name, () => "zaton");

  for (const [, descriptor] of treasureConfig.TREASURES) {
    descriptor.given = false;
  }
});

describe("teleportActorToDebugWorldEntry", () => {
  it("should tell a teleport on the level from a level jump", () => {
    expect(teleportActorToDebugWorldEntry(entry)).toBe("teleported to test_smart (zaton)");
    expect(teleportActorToVertex).toHaveBeenCalledWith(entry.position, 10, 20);

    replaceFunctionMock(teleportActorToVertex, () => true);

    expect(teleportActorToDebugWorldEntry(entry)).toBe("jumping level to test_smart (zaton)");
  });
});

describe("saveDebugPosition", () => {
  it("should save where the actor stands, numbered when unnamed", () => {
    const saved: LuaArray<IDebugSavedPosition> = new LuaTable();

    expect(saveDebugPosition(saved, "")).toEqual({
      name: "zaton 1",
      level: "zaton",
      x: 4,
      y: 5,
      z: 6,
      levelVertexId: 30,
      gameVertexId: 40,
    });
    expect(saveDebugPosition(saved, "camp").name).toBe("camp");
    expect(saved.length()).toBe(2);
  });
});

describe("deleteDebugPosition", () => {
  it("should forget a saved position", () => {
    const saved: LuaArray<IDebugSavedPosition> = new LuaTable();

    saveDebugPosition(saved, "first");
    saveDebugPosition(saved, "second");

    expect(deleteDebugPosition(saved, 1)).toBe("first");
    expect(saved.length()).toBe(1);
    expect(saved.get(1).name).toBe("second");
  });
});

describe("giveDebugTreasure", () => {
  it("should give coordinates not given yet", () => {
    const manager: TreasureManager = getManager(TreasureManager);
    const name: string = getTableKeys(treasureConfig.TREASURES).get(1);

    jest.spyOn(manager, "giveActorTreasureCoordinates").mockImplementation(() => {
      treasureConfig.TREASURES.get(name).given = true;
    });

    expect(giveDebugTreasure(name)).toBe(`gave the coordinates of ${name}`);
    expect(giveDebugTreasure(name)).toBe(`${name} is already given`);
    expect(manager.giveActorTreasureCoordinates).toHaveBeenCalledTimes(1);
  });
});

describe("giveRandomDebugTreasure", () => {
  it("should report whether a treasure was left to give", () => {
    const manager: TreasureManager = getManager(TreasureManager);

    jest.spyOn(manager, "giveActorRandomTreasureCoordinates").mockImplementation(jest.fn());

    expect(giveRandomDebugTreasure()).toBe("every treasure is given");
  });
});

describe("giveAllDebugTreasures", () => {
  it("should report how many treasures it gave", () => {
    jest.spyOn(getManager(TreasureManager), "giveActorAllTreasureCoordinates").mockImplementation(() => {
      for (const [, descriptor] of treasureConfig.TREASURES) {
        descriptor.given = true;
      }
    });

    expect(giveAllDebugTreasures()).toBe(`gave ${treasureConfig.TREASURES.length()} treasures`);
  });
});
