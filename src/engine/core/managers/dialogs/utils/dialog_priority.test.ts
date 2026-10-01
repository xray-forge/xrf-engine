import { beforeEach, describe, expect, it } from "@jest/globals";
import { GameObject } from "xray16/alias";
import { MAX_U8 } from "xray16/lib";
import { MockGameObject } from "xray16/mocks";

import {
  IPhrasesDescriptor,
  TPhrasesAvailableMap,
  TPhrasesPriorityMap,
} from "@/engine/core/managers/dialogs/dialog_types";
import {
  calculatePhrasePriority,
  getHighestPriorityPhrase,
  setPhraseHighestPriority,
} from "@/engine/core/managers/dialogs/utils/dialog_priority";
import { resetRegistry } from "@/fixtures/engine";

function createPhrase(id: string): IPhrasesDescriptor {
  return {
    actorCommunity: "not_set",
    id,
    info: new LuaTable(),
    level: "not_set",
    name: id,
    npcCommunity: "not_set",
    once: "always",
    smart: null,
    wounded: false,
  };
}

describe("calculatePhrasePriority", () => {
  beforeEach(() => {
    resetRegistry();
  });

  it("should store priority for a phrase matching unrestricted requirements", () => {
    const object: GameObject = MockGameObject.mock();
    const priorities: TPhrasesPriorityMap = new LuaTable();
    const phrase: IPhrasesDescriptor = createPhrase("phrase");

    priorities.set(object.id(), new LuaTable());

    expect(calculatePhrasePriority(phrase, priorities, object, phrase.id)).toBe(0);
    expect(priorities.get(object.id()).get(phrase.id)).toBe(0);
  });
});

describe("setPhraseHighestPriority", () => {
  it("should retain the explicit highest priority override", () => {
    const priorities: TPhrasesPriorityMap = new LuaTable();

    setPhraseHighestPriority(priorities, 100, "phrase");

    expect(priorities.get(100).get("phrase")).toBe(MAX_U8);
  });
});

describe("getHighestPriorityPhrase", () => {
  it("should return the highest non-meta phrase priority for an object", () => {
    const object: GameObject = MockGameObject.mock({ id: 100 });
    const phrases: TPhrasesAvailableMap = new LuaTable();
    const priorities: TPhrasesPriorityMap = new LuaTable();
    const objectPriorities: LuaTable<string, number> = new LuaTable();

    objectPriorities.set("ignoreOnce", MAX_U8);
    objectPriorities.set("told", MAX_U8);
    objectPriorities.set("first", 2);
    objectPriorities.set("second", 3);
    priorities.set(object.id(), objectPriorities as never);

    expect(getHighestPriorityPhrase(phrases, priorities, object)).toEqual([3, "second"]);
  });

  it("should start empty priorities for objects without them", () => {
    const object: GameObject = MockGameObject.mock();
    const priorities: TPhrasesPriorityMap = new LuaTable();

    expect(getHighestPriorityPhrase(new LuaTable(), priorities, object)).toEqual([-1, 0]);
    expect(priorities.get(object.id())).toEqualLuaTables({});
  });
});
