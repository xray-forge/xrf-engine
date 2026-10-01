import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { GameObject, ServerHumanObject } from "xray16/alias";
import { MAX_U32, TNumberId } from "xray16/lib";
import { $fromArray } from "xray16/macros";
import { MockAlifeHumanStalker, MockGameObject, MockIniFile } from "xray16/mocks";

import {
  IRegistryObjectState,
  registerObject,
  registerSimulator,
  registerStoryLink,
  registry,
} from "@/engine/core/database";
import { deathConfig } from "@/engine/core/managers/death/DeathConfig";
import { canReleaseObjectCorpse, getFarthestCorpseToRelease } from "@/engine/core/managers/death/utils/death_utils";
import { mockRegisteredActor, resetRegistry } from "@/fixtures/engine";

describe("canReleaseObjectCorpse", () => {
  beforeEach(() => {
    resetRegistry();
  });

  it("should check generic objects", () => {
    const object: GameObject = MockGameObject.mock();

    registerObject(object);

    expect(canReleaseObjectCorpse(object)).toBe(true);
  });

  it("should check objects with story ID", () => {
    const object: GameObject = MockGameObject.mock();

    registerObject(object);
    registerStoryLink(object.id(), "test_sid");

    expect(canReleaseObjectCorpse(object)).toBe(false);
  });

  it("should check objects with known info", () => {
    const object: GameObject = MockGameObject.mock();
    const state: IRegistryObjectState = registerObject(object);

    state.sectionLogic = "test_section";

    jest.spyOn(object, "spawn_ini").mockImplementation(() => {
      return MockIniFile.mock("test.ltx", {
        known_info: "test",
      });
    });

    expect(canReleaseObjectCorpse(object)).toBe(false);
  });

  it("should check objects with keep items", () => {
    const item: GameObject = MockGameObject.mock({ section: "keep_item_section" });
    const object: GameObject = MockGameObject.mock({ inventory: [[item.section(), item]] });

    registerObject(object);

    expect(canReleaseObjectCorpse(object)).toBe(false);
  });
});

describe("getFarthestCorpseToRelease", () => {
  beforeEach(() => {
    resetRegistry();
    registerSimulator();
    mockRegisteredActor();

    jest.spyOn(Date, "now").mockImplementation(() => 80_000);
  });

  it("should check empty lists", () => {
    expect(getFarthestCorpseToRelease(new LuaTable())).toEqual([null, null]);
  });

  it("should check objects without register in simulator", () => {
    expect(getFarthestCorpseToRelease($fromArray<TNumberId>([1, 5]))).toEqual([null, null]);
  });

  it("should check alive objects", () => {
    const object: ServerHumanObject = MockAlifeHumanStalker.mock({ alive: true });

    jest.spyOn(registry.actor.position(), "distance_to_sqr").mockImplementation(() => MAX_U32);

    expect(getFarthestCorpseToRelease($fromArray<TNumberId>([object.id]))).toEqual([null, null]);
  });

  it("selects an offline corpse when it is far enough", () => {
    const first: ServerHumanObject = MockAlifeHumanStalker.mock({ alive: false });
    const second: ServerHumanObject = MockAlifeHumanStalker.mock({ alive: false });

    jest.spyOn(registry.actor.position(), "distance_to_sqr").mockImplementation(() => MAX_U32);

    expect(getFarthestCorpseToRelease($fromArray<TNumberId>([first.id, second.id]))).toEqual([1, first]);

    jest.spyOn(registry.actor.position(), "distance_to_sqr").mockImplementation(() => deathConfig.MIN_DISTANCE_SQR);

    // Too close.
    expect(getFarthestCorpseToRelease($fromArray<TNumberId>([first.id, second.id]))).toEqual([null, null]);
  });

  it("selects an online corpse when it is idle and far enough", () => {
    const object: GameObject = MockGameObject.mock();
    const serverObject: ServerHumanObject = MockAlifeHumanStalker.mock({ id: object.id(), alive: false });

    registerObject(object);

    jest.spyOn(object, "death_time").mockImplementation(() => 15_000);
    jest.spyOn(registry.actor.position(), "distance_to_sqr").mockImplementation(() => MAX_U32);

    expect(getFarthestCorpseToRelease($fromArray<TNumberId>([object.id()]))).toEqual([1, serverObject]);

    jest.spyOn(object, "death_time").mockImplementation(() => 50_000);

    // Too soon.
    expect(getFarthestCorpseToRelease($fromArray<TNumberId>([object.id()]))).toEqual([null, null]);

    jest.spyOn(object, "death_time").mockImplementation(() => 15_000);
    jest.spyOn(registry.actor.position(), "distance_to_sqr").mockImplementation(() => deathConfig.MIN_DISTANCE_SQR);

    // Too close.
    expect(getFarthestCorpseToRelease($fromArray<TNumberId>([object.id()]))).toEqual([null, null]);
  });

  it("skips an online corpse that cannot be released", () => {
    const item: GameObject = MockGameObject.mock({ section: "keep_item_section" });
    const object: GameObject = MockGameObject.mock({ inventory: [[item.section(), item]] });

    MockAlifeHumanStalker.mock({ id: object.id(), alive: false });
    registerObject(object);

    jest.spyOn(object, "death_time").mockImplementation(() => 0);
    jest.spyOn(registry.actor.position(), "distance_to_sqr").mockImplementation(() => MAX_U32);

    expect(getFarthestCorpseToRelease($fromArray<TNumberId>([object.id()]))).toEqual([null, null]);
  });

  it("selects the farthest eligible corpse", () => {
    const first: ServerHumanObject = MockAlifeHumanStalker.mock({ alive: false });
    const second: ServerHumanObject = MockAlifeHumanStalker.mock({ alive: false });

    jest.spyOn(registry.actor.position(), "distance_to_sqr").mockImplementation((position) => {
      return position === first.position ? deathConfig.MIN_DISTANCE_SQR + 1 : deathConfig.MIN_DISTANCE_SQR + 2;
    });

    expect(getFarthestCorpseToRelease($fromArray<TNumberId>([first.id, second.id]))).toEqual([2, second]);
  });
});
