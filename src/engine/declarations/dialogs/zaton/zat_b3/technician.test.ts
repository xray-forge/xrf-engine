import { beforeAll, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { GameObject } from "xray16/alias";
import { AnyArgs, AnyObject, TCount, TName, TSection } from "xray16/lib";
import { MockAlifeSimulator, MockGameObject } from "xray16/mocks";
import { resetFunctionMock } from "xray16/testing/utils";

import { infoPortions } from "@/engine/constants/info_portions";
import { ammo } from "@/engine/constants/items/ammo";
import { food } from "@/engine/constants/items/food";
import { misc } from "@/engine/constants/items/misc";
import { registry } from "@/engine/core/database";
import { giveInfoPortion } from "@/engine/core/utils/info_portion";
import { transferItemsFromActor, transferItemsToActor, transferMoneyFromActor } from "@/engine/core/utils/reward";
import { callBinding, mockRegisteredActor, resetRegistry } from "@/fixtures/engine";

jest.mock("@/engine/core/utils/reward");

function callDialogsBinding<T = boolean>(name: TName, args: AnyArgs = []): T {
  return callBinding(name, args, (_G as AnyObject)["dialogs_zaton"]);
}

function mockActorWith(sections: Array<TSection>, config: AnyObject = {}): GameObject {
  resetRegistry();

  return mockRegisteredActor({
    ...config,
    inventory: sections.map((section, index) => [`${section}_${index}`, MockGameObject.mock({ section })]),
  }).actorGameObject;
}

function checkHasItemPredicate(name: TName, section: TSection, expected: boolean = true): void {
  mockActorWith([]);
  expect(callDialogsBinding(name, [registry.actor, MockGameObject.mock()])).toBe(!expected);

  mockActorWith([section]);
  expect(callDialogsBinding(name, [registry.actor, MockGameObject.mock()])).toBe(expected);
}

function checkMoneyPredicate(name: TName, amount: TCount, expectedWhenEnough: boolean = true): void {
  mockActorWith([], { money: amount - 1 });
  expect(callDialogsBinding(name, [registry.actor, MockGameObject.mock()])).toBe(!expectedWhenEnough);

  mockActorWith([], { money: amount });
  expect(callDialogsBinding(name, [registry.actor, MockGameObject.mock()])).toBe(expectedWhenEnough);
}

function checkMoneyTransfer(name: TName, amount: TCount): void {
  const npc: GameObject = MockGameObject.mock();

  callDialogsBinding(name, [registry.actor, npc]);

  expect(transferMoneyFromActor).toHaveBeenCalledTimes(1);
  expect(transferMoneyFromActor).toHaveBeenCalledWith(npc, amount);
}

function checkTransferFromActor(name: TName, section: TSection, count?: TCount): void {
  const npc: GameObject = MockGameObject.mock();

  callDialogsBinding(name, [registry.actor, npc]);

  if (count === undefined) {
    expect(transferItemsFromActor).toHaveBeenCalledWith(npc, section);
  } else {
    expect(transferItemsFromActor).toHaveBeenCalledWith(npc, section, count);
  }
}

function checkTransferToActor(name: TName, section: TSection, count?: TCount): void {
  const npc: GameObject = MockGameObject.mock();

  callDialogsBinding(name, [registry.actor, npc]);

  if (count === undefined) {
    expect(transferItemsToActor).toHaveBeenCalledWith(npc, section);
  } else {
    expect(transferItemsToActor).toHaveBeenCalledWith(npc, section, count);
  }
}

beforeEach(() => {
  resetRegistry();
  mockRegisteredActor();
  registry.simulator = MockAlifeSimulator.getInstance();
  resetFunctionMock(transferItemsFromActor);
  resetFunctionMock(transferItemsToActor);
  resetFunctionMock(transferMoneyFromActor);
});

beforeAll(() => {
  require("@/engine/declarations/dialogs/zaton/zat_b3/technician");
});

describe("zat_b3_actor_got_toolkit", () => {
  it("should detect a toolkit that has not been brought yet", () => {
    expect(callDialogsBinding("zat_b3_actor_got_toolkit")).toBe(false);

    mockActorWith([misc.toolkit_2]);
    expect(callDialogsBinding("zat_b3_actor_got_toolkit")).toBe(true);
  });

  it("should ignore a toolkit that was already brought", () => {
    mockActorWith([misc.toolkit_1]);
    giveInfoPortion(infoPortions.zat_b3_tech_instrument_1_brought);

    expect(callDialogsBinding("zat_b3_actor_got_toolkit")).toBe(false);
  });
});
describe("give_vodka", () => {
  it("should take the vodka", () => {
    checkTransferFromActor("give_vodka", food.vodka);
  });
});
describe("if_actor_has_vodka", () => {
  it("should check the vodka", () => {
    checkHasItemPredicate("if_actor_has_vodka", food.vodka);
  });
});
describe("actor_has_more_then_need_money_to_buy_battery", () => {
  it("should check the battery price threshold", () => {
    checkMoneyPredicate("actor_has_more_then_need_money_to_buy_battery", 2000);
  });
});
describe("actor_has_less_then_need_money_to_buy_battery", () => {
  it("should invert the battery price threshold", () => {
    checkMoneyPredicate("actor_has_less_then_need_money_to_buy_battery", 2000, false);
  });
});
describe("relocate_need_money_to_buy_battery", () => {
  it("should take the battery price", () => {
    checkMoneyTransfer("relocate_need_money_to_buy_battery", 2000);
  });
});
describe("give_actor_battery", () => {
  it("should give the gauss battery", () => {
    checkTransferToActor("give_actor_battery", ammo.ammo_gauss_cardan);
  });
});
describe("zat_b3_tech_drinks_precond", () => {
  it("should open while the tech has not seen the produce", () => {
    expect(callDialogsBinding("zat_b3_tech_drinks_precond")).toBe(true);

    giveInfoPortion(infoPortions.zat_b3_tech_see_produce_62);
    expect(callDialogsBinding("zat_b3_tech_drinks_precond")).toBe(false);
  });

  it("should reopen after the gauss repair until the tech stops drinking", () => {
    giveInfoPortion(infoPortions.zat_b3_tech_see_produce_62);
    giveInfoPortion(infoPortions.zat_b3_gauss_repaired);
    expect(callDialogsBinding("zat_b3_tech_drinks_precond")).toBe(true);

    giveInfoPortion(infoPortions.zat_b3_tech_drink_no_more);
    expect(callDialogsBinding("zat_b3_tech_drinks_precond")).toBe(false);
  });
});
