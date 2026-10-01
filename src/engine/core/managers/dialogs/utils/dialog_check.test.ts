import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { level } from "xray16";
import { GameObject } from "xray16/alias";
import { MAX_U8, TRUE } from "xray16/lib";
import { $fromArray } from "xray16/macros";
import { MockGameObject } from "xray16/mocks";
import { replaceFunctionMock } from "xray16/testing/utils";

import { communities } from "@/engine/constants/communities";
import { getManager, registry } from "@/engine/core/database";
import { DialogManager } from "@/engine/core/managers/dialogs";
import {
  EGenericPhraseCategory,
  IPhrasesDescriptor,
  TPhrasesAvailableMap,
  TPhrasesPriorityMap,
} from "@/engine/core/managers/dialogs/dialog_types";
import { dialogConfig } from "@/engine/core/managers/dialogs/DialogConfig";
import { processPhraseAction } from "@/engine/core/managers/dialogs/utils/dialog_action";
import {
  isHighestPriorityPhrase,
  shouldHidePhraseCategory,
  shouldShowPhrase,
} from "@/engine/core/managers/dialogs/utils/dialog_check";
import {
  calculatePhrasePriority,
  fillPhrasesPriorities,
  resetPhrasePriority,
} from "@/engine/core/managers/dialogs/utils/dialog_priority";
import { getObjectCommunity } from "@/engine/core/utils/community";
import { giveInfoPortion } from "@/engine/core/utils/info_portion";
import { mockRegisteredActor, resetRegistry } from "@/fixtures/engine";

/**
 * Build an unrestricted phrase descriptor that any object matches.
 */
function createPhrase(id: string, overrides: Partial<IPhrasesDescriptor> = {}): IPhrasesDescriptor {
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
    ...overrides,
  } as IPhrasesDescriptor;
}

describe("shouldShowPhrase", () => {
  beforeEach(() => {
    resetRegistry();
    mockRegisteredActor();
  });

  it("should hide phrases for objects that already told their line", () => {
    const object: GameObject = MockGameObject.mock();
    const phrases: TPhrasesAvailableMap = new LuaTable();
    const priorities: TPhrasesPriorityMap = new LuaTable();

    priorities.set(object.id(), new LuaTable());
    // Meta flags are read as plain fields by the engine code, unlike the keyed phrase priorities.
    priorities.get(object.id()).told = true;

    expect(shouldShowPhrase(object, phrases, priorities, "phrase")).toBe(false);
  });

  it("should show the phrase holding the highest priority", () => {
    const object: GameObject = MockGameObject.mock();
    const phrases: TPhrasesAvailableMap = new LuaTable();
    const priorities: TPhrasesPriorityMap = new LuaTable();

    phrases.set("first", createPhrase("first"));
    phrases.set("second", createPhrase("second"));
    priorities.set(object.id(), new LuaTable());

    fillPhrasesPriorities(object, phrases, priorities);
    // Explicit overrides survive recalculation, unlike plain numeric priorities.
    priorities.get(object.id()).set("second", MAX_U8);

    expect(shouldShowPhrase(object, phrases, priorities, "second")).toBe(true);
    expect(shouldShowPhrase(object, phrases, priorities, "first")).toBe(false);
  });
});

describe("isHighestPriorityPhrase", () => {
  beforeEach(() => {
    resetRegistry();
    mockRegisteredActor();
  });

  it("should reset priorities and report false for unknown objects", () => {
    const object: GameObject = MockGameObject.mock();
    const phrases: TPhrasesAvailableMap = new LuaTable();
    const priorities: TPhrasesPriorityMap = new LuaTable();

    phrases.set("phrase", createPhrase("phrase"));

    expect(isHighestPriorityPhrase(phrases, priorities, object, "phrase")).toBe(false);
    expect(priorities.has(object.id())).toBe(true);
  });

  it("should reject negatively prioritized phrases", () => {
    const object: GameObject = MockGameObject.mock();
    const phrases: TPhrasesAvailableMap = new LuaTable();
    const priorities: TPhrasesPriorityMap = new LuaTable();

    priorities.set(object.id(), new LuaTable());
    priorities.get(object.id()).set("phrase", -1);

    expect(isHighestPriorityPhrase(phrases, priorities, object, "phrase")).toBe(false);
  });

  it("should ignore meta keys when comparing priorities", () => {
    const object: GameObject = MockGameObject.mock();
    const phrases: TPhrasesAvailableMap = new LuaTable();
    const priorities: TPhrasesPriorityMap = new LuaTable();
    const objectPriorities: LuaTable<string, unknown> = new LuaTable();

    objectPriorities.set("ignoreOnce", MAX_U8);
    objectPriorities.set("told", MAX_U8);
    objectPriorities.set("phrase", 1);
    priorities.set(object.id(), objectPriorities as never);

    expect(isHighestPriorityPhrase(phrases, priorities, object, "phrase")).toBe(true);

    objectPriorities.set("other", 2);

    expect(isHighestPriorityPhrase(phrases, priorities, object, "phrase")).toBe(false);
  });
});

describe("shouldHidePhraseCategory", () => {
  beforeEach(() => {
    resetRegistry();
    mockRegisteredActor();
  });

  it("should hide categories without any positively prioritized phrase", () => {
    const object: GameObject = MockGameObject.mock();
    const manager: DialogManager = getManager(DialogManager);
    const priorities: TPhrasesPriorityMap = new LuaTable();

    priorities.set(object.id(), new LuaTable());

    manager.priorityTable.set(EGenericPhraseCategory.HELLO, priorities);
    dialogConfig.PHRASES.set(EGenericPhraseCategory.HELLO, new LuaTable());

    expect(shouldHidePhraseCategory(object, EGenericPhraseCategory.HELLO)).toBe(true);
  });

  it("should hide categories of an object with no priorities recorded yet", () => {
    const object: GameObject = MockGameObject.mock();
    const manager: DialogManager = getManager(DialogManager);

    manager.priorityTable.set(EGenericPhraseCategory.HELLO, new LuaTable());
    dialogConfig.PHRASES.set(EGenericPhraseCategory.HELLO, new LuaTable());

    expect(shouldHidePhraseCategory(object, EGenericPhraseCategory.HELLO)).toBe(true);
    expect(manager.priorityTable.get(EGenericPhraseCategory.HELLO).get(object.id())).toEqualLuaTables({});
  });

  it("should show categories holding a positively prioritized phrase", () => {
    const object: GameObject = MockGameObject.mock();
    const manager: DialogManager = getManager(DialogManager);
    const priorities: TPhrasesPriorityMap = new LuaTable();

    priorities.set(object.id(), new LuaTable());
    priorities.get(object.id()).set("phrase", 3);

    manager.priorityTable.set(EGenericPhraseCategory.HELLO, priorities);
    dialogConfig.PHRASES.set(EGenericPhraseCategory.HELLO, new LuaTable());

    expect(shouldHidePhraseCategory(object, EGenericPhraseCategory.HELLO)).toBe(false);
  });
});

describe("processPhraseAction", () => {
  beforeEach(() => {
    resetRegistry();
    mockRegisteredActor();
  });

  it("should mark once-only phrases with the highest priority", () => {
    const object: GameObject = MockGameObject.mock();
    const phrases: TPhrasesAvailableMap = new LuaTable();
    const priorities: TPhrasesPriorityMap = new LuaTable();

    phrases.set("phrase", createPhrase("phrase", { once: TRUE }));
    priorities.set(object.id(), new LuaTable());

    processPhraseAction(object.id(), phrases, priorities, "phrase");

    expect(priorities.get(object.id()).get("phrase")).toBe(MAX_U8);
    expect(priorities.get(object.id()).ignoreOnce).toBe(true);
  });

  it("should only mark repeatable phrases as processed", () => {
    const object: GameObject = MockGameObject.mock();
    const phrases: TPhrasesAvailableMap = new LuaTable();
    const priorities: TPhrasesPriorityMap = new LuaTable();

    phrases.set("phrase", createPhrase("phrase"));
    priorities.set(object.id(), new LuaTable());

    processPhraseAction(object.id(), phrases, priorities, "phrase");

    expect(priorities.get(object.id()).get("phrase")).toBeNull();
    expect(priorities.get(object.id()).ignoreOnce).toBe(true);
  });

  it("should skip phrases already processed once", () => {
    const object: GameObject = MockGameObject.mock();
    const phrases: TPhrasesAvailableMap = new LuaTable();
    const priorities: TPhrasesPriorityMap = new LuaTable();

    phrases.set("phrase", createPhrase("phrase", { once: TRUE }));
    priorities.set(object.id(), new LuaTable());
    priorities.get(object.id()).ignoreOnce = true;

    processPhraseAction(object.id(), phrases, priorities, "phrase");

    expect(priorities.get(object.id()).get("phrase")).toBeNull();
  });
});

describe("resetPhrasePriority", () => {
  beforeEach(() => {
    resetRegistry();
    mockRegisteredActor();
  });

  it("should mark known objects phrases as unavailable", () => {
    const object: GameObject = MockGameObject.mock();
    const phrases: TPhrasesAvailableMap = new LuaTable();
    const priorities: TPhrasesPriorityMap = new LuaTable();

    priorities.set(object.id(), new LuaTable());

    resetPhrasePriority(phrases, priorities, object, "phrase");

    expect(priorities.get(object.id()).get("phrase")).toBe(-1);
  });

  it("should recalculate priority for objects seen for the first time", () => {
    const object: GameObject = MockGameObject.mock();
    const phrases: TPhrasesAvailableMap = new LuaTable();
    const priorities: TPhrasesPriorityMap = new LuaTable();

    phrases.set("phrase", createPhrase("phrase"));

    resetPhrasePriority(phrases, priorities, object, "phrase");

    expect(priorities.get(object.id()).get("phrase")).toBe(0);
  });
});

describe("calculatePhrasePriority conditions", () => {
  beforeEach(() => {
    resetRegistry();
    mockRegisteredActor();
  });

  /**
   * Evaluate a phrase for a freshly created object with an empty priority map.
   */
  function evaluate(overrides: Partial<IPhrasesDescriptor>, object: GameObject = MockGameObject.mock()): number {
    const priorities: TPhrasesPriorityMap = new LuaTable();
    const phrase: IPhrasesDescriptor = createPhrase("phrase", overrides);

    priorities.set(object.id(), new LuaTable());

    return calculatePhrasePriority(phrase, priorities, object, phrase.id);
  }

  it("should raise priority for wildcard community, level and actor community", () => {
    expect(
      evaluate({
        npcCommunity: $fromArray(["all"]) as never,
        level: $fromArray(["all"]) as never,
        actorCommunity: "all" as never,
      })
    ).toBe(3);
  });

  it("should raise priority for an exactly matching npc community", () => {
    const object: GameObject = MockGameObject.mockStalker();

    jest.spyOn(object, "character_community").mockImplementation(() => communities.stalker);

    expect(evaluate({ npcCommunity: $fromArray([communities.stalker]) as never }, object)).toBe(1);
  });

  it("should reject objects of another community", () => {
    const object: GameObject = MockGameObject.mockStalker();

    jest.spyOn(object, "character_community").mockImplementation(() => communities.bandit);

    expect(evaluate({ npcCommunity: $fromArray([communities.dolg]) as never }, object)).toBe(-1);
  });

  it("should raise priority for a matching level and reject others", () => {
    replaceFunctionMock(level.name, () => "zaton");

    expect(evaluate({ level: $fromArray(["zaton"]) as never })).toBe(2);
    expect(evaluate({ level: $fromArray(["pripyat"]) as never })).toBe(-1);
  });

  it("should raise priority for a matching actor community", () => {
    const actorCommunity: string = getObjectCommunity(registry.actor);

    expect(evaluate({ actorCommunity: $fromArray([actorCommunity]) as never })).toBe(2);
    expect(evaluate({ actorCommunity: $fromArray([communities.monolith]) as never })).toBe(0);
  });

  it("should gate phrases on the wounded state", () => {
    const object: GameObject = MockGameObject.mock();

    expect(evaluate({ wounded: true }, object)).toBe(-1);
    expect(evaluate({ wounded: false }, object)).toBe(0);
  });

  it("should reject once-only phrases already processed", () => {
    const object: GameObject = MockGameObject.mock();
    const priorities: TPhrasesPriorityMap = new LuaTable();
    const phrase: IPhrasesDescriptor = createPhrase("phrase", { once: TRUE });

    priorities.set(object.id(), new LuaTable());
    // Read back through the keyed accessor by this code path, unlike `processPhraseAction`.
    priorities.get(object.id()).set("ignoreOnce", true as never);

    expect(calculatePhrasePriority(phrase, priorities, object, phrase.id)).toBe(-1);
  });

  it("should keep an explicit highest priority override", () => {
    const object: GameObject = MockGameObject.mock();
    const priorities: TPhrasesPriorityMap = new LuaTable();
    const phrase: IPhrasesDescriptor = createPhrase("phrase");

    priorities.set(object.id(), new LuaTable());
    priorities.get(object.id()).set(phrase.id, MAX_U8);

    expect(calculatePhrasePriority(phrase, priorities, object, phrase.id)).toBe(MAX_U8);
  });

  it("should apply required and forbidden info portion conditions", () => {
    const object: GameObject = MockGameObject.mock();

    expect(evaluate({ info: $fromArray([{ name: "test_info", required: true }]) as never }, object)).toBe(-1);

    giveInfoPortion("test_info");

    expect(evaluate({ info: $fromArray([{ name: "test_info", required: true }]) as never }, object)).toBe(0);
    expect(evaluate({ info: $fromArray([{ name: "test_info", required: false }]) as never }, object)).toBe(-1);
    expect(evaluate({ info: $fromArray([{ name: null, required: true }]) as never }, object)).toBe(0);
  });
});
