import { beforeAll, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { level } from "xray16";
import { GameObject } from "xray16/alias";
import { AnyArgs, AnyObject, TCount, TName, TSection } from "xray16/lib";
import { MockAlifeSimulator, MockGameObject } from "xray16/mocks";
import { resetFunctionMock } from "xray16/testing/utils";

import { infoPortions } from "@/engine/constants/info_portions";
import { weapons } from "@/engine/constants/items/weapons";
import { registry } from "@/engine/core/database";
import { TreasureManager } from "@/engine/core/managers/treasures";
import { giveInfoPortion } from "@/engine/core/utils/info_portion";
import { giveMoneyToActor, transferItemsToActor } from "@/engine/core/utils/reward";
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

function checkMoneyReward(name: TName, amount: TCount): void {
  callDialogsBinding(name, [registry.actor, MockGameObject.mock()]);

  expect(giveMoneyToActor).toHaveBeenCalledTimes(1);
  expect(giveMoneyToActor).toHaveBeenCalledWith(amount);
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
  resetFunctionMock(giveMoneyToActor);
  resetFunctionMock(transferItemsToActor);
});

beforeAll(() => {
  require("@/engine/declarations/dialogs/zaton/zat_b106/soroka");
});

describe("is_zat_b106_hunting_time", () => {
  it("should only accept the late night hunting window", () => {
    jest.spyOn(level, "get_time_hours").mockImplementation(() => 1);
    expect(callDialogsBinding("is_zat_b106_hunting_time")).toBe(false);

    jest.spyOn(level, "get_time_hours").mockImplementation(() => 3);
    expect(callDialogsBinding("is_zat_b106_hunting_time")).toBe(true);

    jest.spyOn(level, "get_time_hours").mockImplementation(() => 5);
    expect(callDialogsBinding("is_zat_b106_hunting_time")).toBe(false);
  });

  it("should open the window part way through the second hour", () => {
    jest.spyOn(level, "get_time_hours").mockImplementation(() => 2);

    jest.spyOn(level, "get_time_minutes").mockImplementation(() => 44);
    expect(callDialogsBinding("is_zat_b106_hunting_time")).toBe(false);

    jest.spyOn(level, "get_time_minutes").mockImplementation(() => 45);
    expect(callDialogsBinding("is_zat_b106_hunting_time")).toBe(true);
  });
});
describe("is_not_zat_b106_hunting_time", () => {
  it("should invert the hunting window", () => {
    jest.spyOn(level, "get_time_hours").mockImplementation(() => 3);
    expect(callDialogsBinding("is_not_zat_b106_hunting_time")).toBe(false);

    jest.spyOn(level, "get_time_hours").mockImplementation(() => 5);
    expect(callDialogsBinding("is_not_zat_b106_hunting_time")).toBe(true);
  });
});
describe("zat_b106_soroka_reward", () => {
  it("should pay the full reward while Flint was not blamed", () => {
    checkMoneyReward("zat_b106_soroka_reward", 3000);
  });

  it("should reduce the reward once Flint was blamed to either faction", () => {
    for (const portion of [
      infoPortions.jup_b25_flint_blame_done_to_duty,
      infoPortions.jup_b25_flint_blame_done_to_freedom,
    ]) {
      mockActorWith([]);
      resetFunctionMock(giveMoneyToActor);
      giveInfoPortion(portion);

      callDialogsBinding("zat_b106_soroka_reward");

      expect(giveMoneyToActor).toHaveBeenCalledWith(1000);
    }
  });
});
describe("zat_b106_transfer_weap_to_actor", () => {
  it("should give the shotgun", () => {
    checkTransferToActor("zat_b106_transfer_weap_to_actor", weapons.wpn_spas12);
  });
});
describe("zat_b106_give_reward", () => {
  it("should reveal the treasure", () => {
    const giveTreasureCoordinates = jest
      .spyOn(TreasureManager, "giveTreasureCoordinates")
      .mockImplementation(jest.fn());

    callDialogsBinding("zat_b106_give_reward");

    expect(giveTreasureCoordinates).toHaveBeenCalledWith("zat_hiding_place_50");

    giveTreasureCoordinates.mockRestore();
  });
});
describe("zat_b106_soroka_gone", () => {
  it("should follow either Flint blame outcome", () => {
    expect(callDialogsBinding("zat_b106_soroka_gone")).toBe(false);

    for (const portion of [
      infoPortions.jup_b25_flint_blame_done_to_duty,
      infoPortions.jup_b25_flint_blame_done_to_freedom,
    ]) {
      mockActorWith([]);
      giveInfoPortion(portion);
      expect(callDialogsBinding("zat_b106_soroka_gone")).toBe(true);
    }
  });
});
describe("zat_b106_soroka_not_gone", () => {
  it("should invert the Flint blame outcome", () => {
    expect(callDialogsBinding("zat_b106_soroka_not_gone", [registry.actor, MockGameObject.mock()])).toBe(true);

    giveInfoPortion(infoPortions.jup_b25_flint_blame_done_to_duty);
    expect(callDialogsBinding("zat_b106_soroka_not_gone", [registry.actor, MockGameObject.mock()])).toBe(false);
  });
});
