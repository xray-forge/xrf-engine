import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import { AnyObject, LuaArray } from "xray16/lib";

import { SYSTEM_INI } from "@/engine/core/database";
import { EDebugSpawnKind, IDebugSpawnEntry } from "@/engine/core/managers/debug/debug_types";
import {
  buildDebugCatalogue,
  getDebugSpawnKind,
  isDebugItemKind,
  TDebugCatalogue,
} from "@/engine/core/managers/debug/utils/debug_catalogue";

const sections: AnyObject = {
  test_rifle: { class: "WP_AK74", inv_name: "test_rifle_name", visual: "rifle.ogf" },
  test_rifle_base: { class: "WP_AK74" },
  test_medkit: { class: "S_FOOD", inv_name: "test_medkit_name", visual: "medkit.ogf" },
  test_monster: { class: "SM_BLOOD", visual: "monster.ogf" },
  test_story_stalker: { class: "AI_STL_S", story_id: "test_story_stalker" },
  test_squad: { class: "ON_OFF_S", npc: "test_stalker" },
  test_squad_base: { class: "ON_OFF_S" },
  test_projectile: { class: "G_FAKE", inv_name: "test_projectile_name", visual: "projectile.ogf" },
};

function getSections(entries: LuaArray<IDebugSpawnEntry>): Array<string> {
  const list: Array<string> = [];

  for (const index of $range(1, entries.length())) {
    list.push(entries.get(index).section);
  }

  return list;
}

beforeEach(() => {
  Object.assign((SYSTEM_INI as unknown as { data: AnyObject }).data, sections);
});

afterEach(() => {
  for (const section of Object.keys(sections)) {
    delete (SYSTEM_INI as unknown as { data: AnyObject }).data[section];
  }
});

describe("isDebugItemKind", () => {
  it("should tell items from creatures and squads", () => {
    expect(isDebugItemKind(EDebugSpawnKind.WEAPONS)).toBe(true);
    expect(isDebugItemKind(EDebugSpawnKind.OTHER)).toBe(true);
    expect(isDebugItemKind(EDebugSpawnKind.MONSTERS)).toBe(false);
    expect(isDebugItemKind(EDebugSpawnKind.STALKERS)).toBe(false);
    expect(isDebugItemKind(EDebugSpawnKind.SQUADS)).toBe(false);
  });
});

describe("getDebugSpawnKind", () => {
  it("should classify spawnable sections by their class", () => {
    expect(getDebugSpawnKind("test_rifle")).toBe(EDebugSpawnKind.WEAPONS);
    expect(getDebugSpawnKind("test_medkit")).toBe(EDebugSpawnKind.CONSUMABLES);
    expect(getDebugSpawnKind("test_monster")).toBe(EDebugSpawnKind.MONSTERS);
    expect(getDebugSpawnKind("test_squad")).toBe(EDebugSpawnKind.SQUADS);
  });

  it("should leave out bases, story objects and classes it does not spawn", () => {
    expect(getDebugSpawnKind("test_rifle_base")).toBeNull();
    expect(getDebugSpawnKind("test_story_stalker")).toBeNull();
    expect(getDebugSpawnKind("test_squad_base")).toBeNull();
    expect(getDebugSpawnKind("test_projectile")).toBeNull();
    expect(getDebugSpawnKind("not_existing_section")).toBeNull();
  });
});

describe("buildDebugCatalogue", () => {
  it("should group spawnable sections by kind with their names", () => {
    const catalogue: TDebugCatalogue = buildDebugCatalogue();

    expect(getSections(catalogue.get(EDebugSpawnKind.WEAPONS))).toContain("test_rifle");
    expect(getSections(catalogue.get(EDebugSpawnKind.WEAPONS))).not.toContain("test_rifle_base");
    expect(getSections(catalogue.get(EDebugSpawnKind.MONSTERS))).toContain("test_monster");
    expect(getSections(catalogue.get(EDebugSpawnKind.SQUADS))).toContain("test_squad");

    for (const index of $range(1, catalogue.get(EDebugSpawnKind.WEAPONS).length())) {
      const entry: IDebugSpawnEntry = catalogue.get(EDebugSpawnKind.WEAPONS).get(index);

      if (entry.section === "test_rifle") {
        expect(entry).toEqual({
          section: "test_rifle",
          kind: EDebugSpawnKind.WEAPONS,
          label: "translated_test_rifle_name",
          search: "test_rifle translated_test_rifle_name",
        });
      }
    }
  });
});
