import { beforeAll, beforeEach, describe, expect, it } from "@jest/globals";
import { GameObject } from "xray16/alias";
import { AnyArgs, AnyObject, TCount, TName, TSection } from "xray16/lib";
import { MockAlifeSimulator, MockGameObject } from "xray16/mocks";

import { infoPortions, TInfoPortion } from "@/engine/constants/info_portions";
import { artefacts } from "@/engine/constants/items/artefacts";
import { detectors } from "@/engine/constants/items/detectors";
import { questItems } from "@/engine/constants/items/quest_items";
import { registry } from "@/engine/core/database";
import { giveInfoPortion } from "@/engine/core/utils/info_portion";
import { callBinding, mockRegisteredActor, resetRegistry } from "@/fixtures/engine";

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

beforeEach(() => {
  resetRegistry();
  mockRegisteredActor();
  registry.simulator = MockAlifeSimulator.getInstance();
});

beforeAll(() => {
  require("@/engine/declarations/dialogs/zaton/zat_b30/owl-items");
});

describe("zat_b30_owl_stalker_trader_actor_has_item_to_sell", () => {
  it("should report nothing to sell with an empty inventory", () => {
    expect(callDialogsBinding("zat_b30_owl_stalker_trader_actor_has_item_to_sell")).toBe(false);
  });

  it("should accept a plain sellable quest item", () => {
    mockActorWith([questItems.zat_b20_noah_pda]);

    expect(callDialogsBinding("zat_b30_owl_stalker_trader_actor_has_item_to_sell")).toBe(true);
  });

  it("should only offer the gated items while their discussion info portion is unset", () => {
    const gated: Array<[TSection, TInfoPortion]> = [
      [questItems.jup_b1_half_artifact, infoPortions.zat_b30_owl_stalker_about_halfart_jup_b6_asked],
      [artefacts.af_quest_b14_twisted, infoPortions.zat_b30_owl_stalker_about_halfart_zat_b14_asked],
      [artefacts.af_oasis_heart, infoPortions.zat_b30_owl_stalker_trader_about_osis_art],
    ];

    for (const [section, askedPortion] of gated) {
      mockActorWith([section]);
      expect(callDialogsBinding("zat_b30_owl_stalker_trader_actor_has_item_to_sell")).toBe(true);

      giveInfoPortion(askedPortion);
      expect(callDialogsBinding("zat_b30_owl_stalker_trader_actor_has_item_to_sell")).toBe(false);
    }
  });

  it("should ignore the scientific detector until the second detector info portion is set", () => {
    mockActorWith([detectors.detector_scientific]);
    expect(callDialogsBinding("zat_b30_owl_stalker_trader_actor_has_item_to_sell")).toBe(false);

    giveInfoPortion(infoPortions.zat_b30_second_detector);
    expect(callDialogsBinding("zat_b30_owl_stalker_trader_actor_has_item_to_sell")).toBe(true);
  });
});
describe("zat_b30_owl_can_say_about_heli", () => {
  it("should stop offering the topic once all three helicopters are known", () => {
    const pairs: Array<[TInfoPortion, TInfoPortion]> = [
      [infoPortions.zat_b28_heli_3_searched, infoPortions.zat_b30_owl_scat_1],
      [infoPortions.zat_b100_heli_2_searched, infoPortions.zat_b30_owl_scat_2],
      [infoPortions.zat_b101_heli_5_searched, infoPortions.zat_b30_owl_scat_3],
    ];

    for (const [searched] of pairs) {
      expect(callDialogsBinding("zat_b30_owl_can_say_about_heli")).toBe(true);
      giveInfoPortion(searched);
    }

    expect(callDialogsBinding("zat_b30_owl_can_say_about_heli")).toBe(false);
  });

  it("should also count an already scattered topic as known", () => {
    for (const portion of [
      infoPortions.zat_b30_owl_scat_1,
      infoPortions.zat_b30_owl_scat_2,
      infoPortions.zat_b30_owl_scat_3,
    ]) {
      giveInfoPortion(portion);
    }

    expect(callDialogsBinding("zat_b30_owl_can_say_about_heli")).toBe(false);
  });
});
describe("zat_b30_actor_has_1000", () => {
  it("should check the 1000 money threshold", () => {
    checkMoneyPredicate("zat_b30_actor_has_1000", 1000);
  });
});
describe("zat_b30_actor_has_200", () => {
  it("should check the 200 money threshold", () => {
    checkMoneyPredicate("zat_b30_actor_has_200", 200);
  });
});
describe("zat_b30_actor_has_pri_b36_monolith_hiding_place_pda", () => {
  it("should check the monolith hiding place PDA", () => {
    checkHasItemPredicate(
      "zat_b30_actor_has_pri_b36_monolith_hiding_place_pda",
      questItems.pri_b36_monolith_hiding_place_pda
    );
  });
});
describe("zat_b30_actor_has_pri_b306_envoy_pda", () => {
  it("should check the envoy PDA", () => {
    checkHasItemPredicate("zat_b30_actor_has_pri_b306_envoy_pda", questItems.pri_b306_envoy_pda);
  });
});
describe("zat_b30_actor_has_jup_b10_strelok_notes_1", () => {
  it("should check the first Strelok note", () => {
    checkHasItemPredicate("zat_b30_actor_has_jup_b10_strelok_notes_1", questItems.jup_b10_notes_01);
  });
});
describe("zat_b30_actor_has_jup_b10_strelok_notes_2", () => {
  it("should check the second Strelok note", () => {
    checkHasItemPredicate("zat_b30_actor_has_jup_b10_strelok_notes_2", questItems.jup_b10_notes_02);
  });
});
describe("zat_b30_actor_has_jup_b10_strelok_notes_3", () => {
  it("should check the third Strelok note", () => {
    checkHasItemPredicate("zat_b30_actor_has_jup_b10_strelok_notes_3", questItems.jup_b10_notes_03);
  });
});
describe("zat_b30_actor_has_detector_scientific", () => {
  it("should check the scientific detector", () => {
    checkHasItemPredicate("zat_b30_actor_has_detector_scientific", detectors.detector_scientific);
  });
});
describe("zat_b30_actor_has_device_flash_snag", () => {
  it("should check the flash snag device", () => {
    checkHasItemPredicate("zat_b30_actor_has_device_flash_snag", questItems.device_flash_snag);
  });
});
describe("zat_b30_actor_has_device_pda_port_bandit_leader", () => {
  it("should check the bandit leader PDA", () => {
    checkHasItemPredicate("zat_b30_actor_has_device_pda_port_bandit_leader", questItems.device_pda_port_bandit_leader);
  });
});
describe("zat_b30_actor_has_jup_b10_ufo_memory", () => {
  it("should check the second UFO memory", () => {
    checkHasItemPredicate("zat_b30_actor_has_jup_b10_ufo_memory", questItems.jup_b10_ufo_memory_2);
  });
});
describe("zat_b30_actor_has_jup_b202_bandit_pda", () => {
  it("should check the b202 bandit PDA", () => {
    checkHasItemPredicate("zat_b30_actor_has_jup_b202_bandit_pda", questItems.jup_b202_bandit_pda);
  });
});
