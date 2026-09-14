import { beforeAll, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { GameObject } from "xray16/alias";
import { AnyArgs, AnyObject, TName, TSection } from "xray16/lib";
import { MockAlifeSimulator, MockGameObject } from "xray16/mocks";
import { resetFunctionMock } from "xray16/testing/utils";

import { TInfoPortion } from "@/engine/constants/info_portions";
import { weapons } from "@/engine/constants/items/weapons";
import { AnomalyZoneBinder } from "@/engine/core/binders/zones/AnomalyZoneBinder";
import { registry } from "@/engine/core/database";
import { giveInfoPortion } from "@/engine/core/utils/info_portion";
import { giveMoneyToActor, transferItemsFromActor, transferItemsToActor } from "@/engine/core/utils/reward";
import {
  zatB29AfTable,
  zatB29InfopBringTable,
  zatB29InfopTable,
} from "@/engine/scripts/quests/zaton/zat_b29/advanced_artefacts_data";
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

beforeEach(() => {
  resetRegistry();
  mockRegisteredActor();
  registry.simulator = MockAlifeSimulator.getInstance();
  resetFunctionMock(giveMoneyToActor);
  resetFunctionMock(transferItemsFromActor);
  resetFunctionMock(transferItemsToActor);
});

beforeAll(() => {
  require("@/engine/declarations/dialogs/zaton/zat_b29/advanced-artefacts");
});

describe("zat_b29_create_af_in_anomaly", () => {
  it("should force the requested artefact into a zone matching the anomaly type", () => {
    const zone = { setForcedSpawnOverride: jest.fn() } as unknown as AnomalyZoneBinder;

    // Index 16 maps to the `gravi` anomaly type, whose first zone is zat_b14.
    giveInfoPortion(zatB29InfopBringTable.get(16) as TInfoPortion);
    registry.anomalyZones.set("zat_b14_anomal_zone", zone);
    jest.spyOn(math, "random").mockImplementation(() => 1);

    callDialogsBinding("zat_b29_create_af_in_anomaly");

    expect(zone.setForcedSpawnOverride).toHaveBeenCalledWith(zatB29AfTable.get(16));
  });

  it("should resolve a different anomaly type for a later index", () => {
    const zone = { setForcedSpawnOverride: jest.fn() } as unknown as AnomalyZoneBinder;

    // Index 19 maps to the `electra` anomaly type, whose second zone is zat_b100.
    giveInfoPortion(zatB29InfopBringTable.get(19) as TInfoPortion);
    registry.anomalyZones.set("zat_b100_anomal_zone", zone);
    jest.spyOn(math, "random").mockImplementation(() => 2);

    callDialogsBinding("zat_b29_create_af_in_anomaly");

    expect(zone.setForcedSpawnOverride).toHaveBeenCalledWith(zatB29AfTable.get(19));
  });
});
describe("zat_b29_linker_give_adv_task", () => {
  it("should list every requested artefact and clear the bring markers", () => {
    giveInfoPortion(zatB29InfopTable.get(16));
    giveInfoPortion(zatB29InfopTable.get(17));
    giveInfoPortion(zatB29InfopBringTable.get(16) as TInfoPortion);

    const result: string = callDialogsBinding<string>("zat_b29_linker_give_adv_task", [
      registry.actor,
      MockGameObject.mock(),
    ]);

    expect(result.endsWith(".")).toBe(true);
    expect(result.split(", ")).toHaveLength(2);
    expect(registry.actor.has_info(zatB29InfopBringTable.get(16) as TInfoPortion)).toBe(false);
  });

  it("should return just the terminator when nothing is requested", () => {
    expect(callDialogsBinding<string>("zat_b29_linker_give_adv_task", [registry.actor, MockGameObject.mock()])).toBe(
      "."
    );
  });
});
describe("zat_b29_actor_has_adv_task_af", () => {
  it("should require both the bring marker and the artefact", () => {
    expect(callDialogsBinding("zat_b29_actor_has_adv_task_af")).toBe(false);

    mockActorWith([zatB29AfTable.get(16)]);
    expect(callDialogsBinding("zat_b29_actor_has_adv_task_af")).toBe(false);

    giveInfoPortion(zatB29InfopBringTable.get(16) as TInfoPortion);
    expect(callDialogsBinding("zat_b29_actor_has_adv_task_af")).toBe(true);
  });
});
describe("zat_b29_actor_do_not_has_adv_task_af", () => {
  it("should invert the requested artefact check", () => {
    expect(callDialogsBinding("zat_b29_actor_do_not_has_adv_task_af")).toBe(true);

    mockActorWith([zatB29AfTable.get(16)]);
    giveInfoPortion(zatB29InfopBringTable.get(16) as TInfoPortion);
    expect(callDialogsBinding("zat_b29_actor_do_not_has_adv_task_af")).toBe(false);
  });
});
describe("zat_b29_linker_get_adv_task_af", () => {
  it("should pay the lower tier reward for an early artefact", () => {
    const npc: GameObject = MockGameObject.mock();

    mockActorWith([zatB29AfTable.get(16)]);
    giveInfoPortion(zatB29InfopBringTable.get(16) as TInfoPortion);

    callDialogsBinding("zat_b29_linker_get_adv_task_af", [registry.actor, npc]);

    expect(transferItemsFromActor).toHaveBeenCalledWith(npc, zatB29AfTable.get(16));
    expect(giveMoneyToActor).toHaveBeenCalledWith(18000);
  });

  it("should pay the higher tier reward for a later artefact", () => {
    const npc: GameObject = MockGameObject.mock();

    mockActorWith([zatB29AfTable.get(20)]);
    giveInfoPortion(zatB29InfopBringTable.get(20) as TInfoPortion);

    callDialogsBinding("zat_b29_linker_get_adv_task_af", [registry.actor, npc]);

    expect(giveMoneyToActor).toHaveBeenCalledWith(24000);
  });

  it("should reduce both rewards when the artefact came from a rival", () => {
    mockActorWith([zatB29AfTable.get(16)]);
    giveInfoPortion(zatB29InfopBringTable.get(16) as TInfoPortion);
    giveInfoPortion("zat_b29_linker_take_af_from_rival" as TInfoPortion);
    callDialogsBinding("zat_b29_linker_get_adv_task_af", [registry.actor, MockGameObject.mock()]);
    expect(giveMoneyToActor).toHaveBeenLastCalledWith(12000);

    mockActorWith([zatB29AfTable.get(20)]);
    giveInfoPortion(zatB29InfopBringTable.get(20) as TInfoPortion);
    giveInfoPortion("zat_b29_linker_take_af_from_rival" as TInfoPortion);
    callDialogsBinding("zat_b29_linker_get_adv_task_af", [registry.actor, MockGameObject.mock()]);
    expect(giveMoneyToActor).toHaveBeenLastCalledWith(18000);
  });
});
describe("zat_b29_actor_has_exchange_item", () => {
  it("should remember a valuable weapon found in the actor inventory", () => {
    expect(callDialogsBinding("zat_b29_actor_has_exchange_item")).toBe(false);

    mockActorWith([weapons.wpn_groza]);

    expect(callDialogsBinding("zat_b29_actor_has_exchange_item")).toBe(true);
    expect((registry.actor as AnyObject).goodGun).toBe(weapons.wpn_groza);
  });

  it("should ignore weapons that are not on the valuable list", () => {
    mockActorWith([weapons.wpn_pm]);

    expect(callDialogsBinding("zat_b29_actor_has_exchange_item")).toBe(false);
  });
});
describe("zat_b29_actor_exchange", () => {
  it("should swap the remembered weapon for the requested artefact", () => {
    const npc: GameObject = MockGameObject.mock();

    mockActorWith([weapons.wpn_groza]);
    giveInfoPortion(zatB29InfopBringTable.get(16) as TInfoPortion);
    (registry.actor as AnyObject).goodGun = weapons.wpn_groza;

    callDialogsBinding("zat_b29_actor_exchange", [registry.actor, npc]);

    expect(transferItemsFromActor).toHaveBeenCalledWith(npc, weapons.wpn_groza);
    expect(transferItemsToActor).toHaveBeenCalledWith(npc, zatB29AfTable.get(16));
    expect((registry.actor as AnyObject).goodGun).toBeNull();
  });

  it("should do nothing without a remembered weapon", () => {
    (registry.actor as AnyObject).goodGun = null;
    giveInfoPortion(zatB29InfopBringTable.get(16) as TInfoPortion);

    callDialogsBinding("zat_b29_actor_exchange", [registry.actor, MockGameObject.mock()]);

    expect(transferItemsFromActor).not.toHaveBeenCalled();
  });
});
