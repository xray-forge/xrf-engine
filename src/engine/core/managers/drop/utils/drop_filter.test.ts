import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { clsid } from "xray16";
import { GameObject } from "xray16/alias";
import { MockGameObject, MockIniFile } from "xray16/mocks";

import { ammo } from "@/engine/constants/items/ammo";
import { artefacts } from "@/engine/constants/items/artefacts";
import { drugs, medkits } from "@/engine/constants/items/drugs";
import { food } from "@/engine/constants/items/food";
import { misc } from "@/engine/constants/items/misc";
import { weapons } from "@/engine/constants/items/weapons";
import { registerSimulator, registry } from "@/engine/core/database";
import { dropConfig } from "@/engine/core/managers/drop/DropConfig";
import { filterObjectDeathLoot, shouldFilterLootItem } from "@/engine/core/managers/drop/utils/drop_filter";
import { mockInSimulator, resetRegistry } from "@/fixtures/engine";

describe("filterObjectDeathLoot", () => {
  beforeEach(() => {
    resetRegistry();
    registerSimulator();
  });

  it("should keep items of objects marked with keep items except the equipment excluded from loot", () => {
    const [ak74u, ak74uServer] = mockInSimulator({ section: weapons.wpn_ak74u, clsid: clsid.wpn_ak74_s });
    const [akAmmo] = mockInSimulator({ section: ammo["ammo_5.45x39_ap"], clsid: clsid.wpn_ammo });
    const [pda, pdaServer] = mockInSimulator({ section: misc.device_pda, clsid: clsid.device_pda });
    const object: GameObject = MockGameObject.mock({
      spawnIni: MockIniFile.mock("test.ltx", { keep_items: {} }),
      inventory: [
        [ak74u.id(), ak74u],
        [akAmmo.id(), akAmmo],
        [pda.id(), pda],
      ],
    });

    filterObjectDeathLoot(object);

    expect(registry.simulator.release).toHaveBeenCalledTimes(1);
    expect(registry.simulator.release).toHaveBeenCalledWith(pdaServer, true);
    // Kept weapons are not degraded either.
    expect(ak74u.set_condition).not.toHaveBeenCalled();
    expect(registry.simulator.release).not.toHaveBeenCalledWith(ak74uServer, true);
  });

  it("should filter items with empty inventory", () => {
    const object: GameObject = MockGameObject.mock();

    filterObjectDeathLoot(object);

    expect(object.iterate_inventory).toHaveBeenCalledTimes(1);
    expect(registry.simulator.release).toHaveBeenCalledTimes(0);
  });

  it("should filter items and release", () => {
    const [ak74u] = mockInSimulator({ section: weapons.wpn_ak74u, clsid: clsid.wpn_ak74_s });
    const [akAmmo, akAmmoServer] = mockInSimulator({
      section: ammo["ammo_5.45x39_ap"],
      clsid: clsid.wpn_ammo,
    });
    const [concerva] = mockInSimulator({ section: food.conserva, clsid: clsid.obj_food_s });
    const [pda, pdaServer] = mockInSimulator({ section: misc.device_pda, clsid: clsid.device_pda });
    const [bolt] = mockInSimulator({ section: misc.bolt, clsid: clsid.obj_bolt });
    const [artefact] = mockInSimulator({
      section: artefacts.af_dummy_dummy,
      clsid: clsid.art_dummy,
    });

    const object: GameObject = MockGameObject.mock({
      inventory: [
        [ak74u.id(), ak74u],
        [akAmmo.id(), akAmmo],
        [concerva.id(), concerva],
        [pda.id(), pda],
        [bolt.id(), bolt],
        [artefact.id(), artefact],
      ],
    });

    filterObjectDeathLoot(object);

    expect(object.iterate_inventory).toHaveBeenCalledTimes(1);
    expect(registry.simulator.release).toHaveBeenCalledTimes(2);
    expect(registry.simulator.release).toHaveBeenCalledWith(pdaServer, true);
    expect(registry.simulator.release).toHaveBeenCalledWith(akAmmoServer, true);
  });

  it("should leave the ammo of the weapon in hands, which the engine destroys after death", () => {
    const [ak74u] = mockInSimulator({ section: weapons.wpn_ak74u, clsid: clsid.wpn_ak74_s });
    const [akAmmo] = mockInSimulator({ section: ammo["ammo_5.45x39_ap"], clsid: clsid.wpn_ammo });
    const [pistolAmmo, pistolAmmoServer] = mockInSimulator({ section: ammo["ammo_9x19_fmj"], clsid: clsid.wpn_ammo });
    const object: GameObject = MockGameObject.mock({
      inventory: [
        [ak74u.id(), ak74u],
        [akAmmo.id(), akAmmo],
        [pistolAmmo.id(), pistolAmmo],
      ],
    });

    jest.mocked(object.active_item).mockReturnValue(ak74u as never);

    filterObjectDeathLoot(object);

    expect(registry.simulator.release).toHaveBeenCalledTimes(1);
    expect(registry.simulator.release).toHaveBeenCalledWith(pistolAmmoServer, true);
  });

  it("should set weapon conditions and skip grenades", () => {
    const ak74u: GameObject = MockGameObject.mock({ section: weapons.wpn_ak74u, clsid: clsid.wpn_ak74_s });
    const f1: GameObject = MockGameObject.mock({ section: weapons.grenade_f1, clsid: clsid.wpn_grenade_f1_s });

    const object: GameObject = MockGameObject.mock({
      inventory: [
        [ak74u.id(), ak74u],
        [f1.id(), f1],
      ],
    });

    filterObjectDeathLoot(object);

    expect(ak74u.set_condition).toHaveBeenCalledTimes(1);
    expect(f1.set_condition).toHaveBeenCalledTimes(0);
  });
});

describe("shouldFilterLootItem", () => {
  beforeEach(() => {
    resetRegistry();
  });

  it("should correctly verify items to filter", () => {
    expect(
      shouldFilterLootItem(MockGameObject.mock({ section: weapons.grenade_f1, clsid: clsid.wpn_grenade_f1_s }))
    ).toBe(false);
    expect(
      shouldFilterLootItem(MockGameObject.mock({ section: weapons.wpn_desert_eagle, clsid: clsid.wpn_hpsa_s }))
    ).toBe(false);
    expect(shouldFilterLootItem(MockGameObject.mock({ section: misc.bolt }))).toBe(false);
    expect(
      shouldFilterLootItem(MockGameObject.mock({ section: artefacts.af_dummy_dummy, clsid: clsid.art_dummy }))
    ).toBe(false);
    expect(shouldFilterLootItem(MockGameObject.mock({ section: medkits.medkit, clsid: clsid.obj_medkit_s }))).toBe(
      false
    );
    expect(shouldFilterLootItem(MockGameObject.mock({ section: food.conserva, clsid: clsid.obj_food_s }))).toBe(false);
    expect(shouldFilterLootItem(MockGameObject.mock({ section: drugs.drug_booster, clsid: clsid.obj_food_s }))).toBe(
      false
    );

    expect(shouldFilterLootItem(MockGameObject.mock({ section: ammo.ammo_9x39_ap, clsid: clsid.wpn_ammo }))).toBe(true);
    expect(shouldFilterLootItem(MockGameObject.mock({ section: misc.device_pda }))).toBe(true);
    expect(shouldFilterLootItem(MockGameObject.mock({ section: misc.guitar_a }))).toBe(true);
    expect(shouldFilterLootItem(MockGameObject.mock({ section: misc.device_torch }))).toBe(true);
    expect(shouldFilterLootItem(MockGameObject.mock({ section: misc.harmonica_a }))).toBe(true);
    expect(shouldFilterLootItem(MockGameObject.mock({ section: weapons.wpn_binoc }))).toBe(true);
  });

  it("should handle keep items", () => {
    dropConfig.ITEMS_KEEP.set(misc.device_pda, true);
    expect(shouldFilterLootItem(MockGameObject.mock({ section: misc.device_pda }))).toBe(true);
    dropConfig.ITEMS_KEEP.delete(misc.device_pda);
  });
});
