import { beforeAll, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { GameObject } from "xray16/alias";
import { AnyArgs, AnyObject, TCount, TName, TSection } from "xray16/lib";
import { MockGameObject } from "xray16/mocks";
import { resetFunctionMock } from "xray16/testing/utils";

import { questItems } from "@/engine/constants/items/quest_items";
import { registry } from "@/engine/core/database";
import { giveInfoPortion } from "@/engine/core/utils/info_portion";
import {
  giveItemsToActor,
  giveMoneyToActor,
  transferItemsFromActor,
  transferItemsToActor,
  transferMoneyFromActor,
} from "@/engine/core/utils/reward";
import { callBinding, mockRegisteredActor, resetRegistry } from "@/fixtures/engine";

function callDialogsBinding<T = boolean>(name: TName, args: AnyArgs = []): T {
  return callBinding(name, args, (_G as AnyObject)["dialogs_jupiter"]);
}

/**
 * Re-register the actor carrying the provided sections, dropping any previously given info portions.
 *
 * Inventory keys are index-suffixed so repeating the same section registers separate items, while
 * `object(section)` lookups still resolve by section.
 */
function mockActorWith(sections: Array<TSection>, config: AnyObject = {}): GameObject {
  resetRegistry();

  return mockRegisteredActor({
    ...config,
    inventory: sections.map((section, index) => [`${section}_${index}`, MockGameObject.mock({ section })]),
  }).actorGameObject;
}

/**
 * Verify a predicate flips once the provided section is in the actor inventory.
 */
function checkHasItemPredicate(name: TName, section: TSection, expected: boolean = true): void {
  mockActorWith([]);
  expect(callDialogsBinding(name, [registry.actor, MockGameObject.mock()])).toBe(!expected);

  mockActorWith([section]);
  expect(callDialogsBinding(name, [registry.actor, MockGameObject.mock()])).toBe(expected);
}

/**
 * Verify an action transfers the expected section from the actor to the NPC speaker.
 */
function checkTransferFromActor(name: TName, section: TSection, count?: TCount): void {
  const npc: GameObject = MockGameObject.mock();

  callDialogsBinding(name, [registry.actor, npc]);

  if (count === undefined) {
    expect(transferItemsFromActor).toHaveBeenCalledWith(npc, section);
  } else {
    expect(transferItemsFromActor).toHaveBeenCalledWith(npc, section, count);
  }
}

jest.mock("@/engine/core/utils/reward");

beforeAll(() => {
  require("@/engine/declarations/dialogs/jupiter/jup_b9/black_box");
});

beforeEach(() => {
  resetRegistry();
  mockRegisteredActor();
  resetFunctionMock(giveItemsToActor);
  resetFunctionMock(giveMoneyToActor);
  resetFunctionMock(transferItemsFromActor);
  resetFunctionMock(transferItemsToActor);
  resetFunctionMock(transferMoneyFromActor);
});

describe("jup_b9_actor_has_money", () => {
  it("should ask the full price while no materials counter is set", () => {
    mockActorWith([], { money: 2999 });
    expect(callDialogsBinding("jup_b9_actor_has_money")).toBe(false);

    mockActorWith([], { money: 3000 });
    expect(callDialogsBinding("jup_b9_actor_has_money")).toBe(true);
  });

  it("should scale the required price down as more materials are brought", () => {
    const prices: Array<[TName, TCount]> = [
      ["jup_b200_tech_materials_brought_counter_1", 2850],
      ["jup_b200_tech_materials_brought_counter_5", 2250],
      ["jup_b200_tech_materials_brought_counter_9", 1650],
    ];

    for (const [portion, price] of prices) {
      mockActorWith([], { money: price - 1 });
      giveInfoPortion(portion);
      expect(callDialogsBinding("jup_b9_actor_has_money")).toBe(false);

      mockActorWith([], { money: price });
      giveInfoPortion(portion);
      expect(callDialogsBinding("jup_b9_actor_has_money")).toBe(true);
    }
  });
});

describe("jup_b9_actor_has_not_money", () => {
  it("should invert the blackbox affordability check", () => {
    mockActorWith([], { money: 2849 });
    giveInfoPortion("jup_b200_tech_materials_brought_counter_1");
    expect(callDialogsBinding("jup_b9_actor_has_not_money", [registry.actor, MockGameObject.mock()])).toBe(true);

    mockActorWith([], { money: 2850 });
    giveInfoPortion("jup_b200_tech_materials_brought_counter_1");
    expect(callDialogsBinding("jup_b9_actor_has_not_money", [registry.actor, MockGameObject.mock()])).toBe(false);
  });
});

describe("jupiter_b9_relocate_money", () => {
  it("should take the price matching the materials counter", () => {
    const npc: GameObject = MockGameObject.mock();

    callDialogsBinding("jupiter_b9_relocate_money", [registry.actor, npc]);
    expect(transferMoneyFromActor).toHaveBeenLastCalledWith(npc, 3000);

    giveInfoPortion("jup_b200_tech_materials_brought_counter_1");
    callDialogsBinding("jupiter_b9_relocate_money", [registry.actor, npc]);
    expect(transferMoneyFromActor).toHaveBeenLastCalledWith(npc, 2850);

    giveInfoPortion("jup_b200_tech_materials_brought_counter_9");
    callDialogsBinding("jupiter_b9_relocate_money", [registry.actor, npc]);
    expect(transferMoneyFromActor).toHaveBeenLastCalledWith(npc, 1650);
  });
});

describe("give_jup_b9_blackbox", () => {
  it("should take the blackbox from the actor", () => {
    checkTransferFromActor("give_jup_b9_blackbox", questItems.jup_b9_blackbox);
  });
});

describe("if_actor_has_jup_b9_blackbox", () => {
  it("should check the blackbox", () => {
    checkHasItemPredicate("if_actor_has_jup_b9_blackbox", questItems.jup_b9_blackbox);
  });
});
