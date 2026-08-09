import { describe, expect, it, jest } from "@jest/globals";
import { flags32 } from "xray16";
import { Flags32, GameObject } from "xray16/alias";
import { EMPTY_LUA_ARRAY, extern, LuaArray, NIL } from "xray16/lib";
import { MockFlags32, MockGameObject } from "xray16/mocks";

import { registerActor } from "@/engine/core/database";
import { pickSectionFromCondList } from "@/engine/core/ini/ini_config";
import {
  getSchemeFromSection,
  parseBoneStateDescriptors,
  parseConditionsList,
  parseFunctionParams,
  parseInfoPortions,
  parseNumberOptional,
  parseNumbersList,
  parseParameters,
  parseSpawnDetails,
  parseStringOptional,
  parseStringsList,
  parseStringsSet,
  parseWaypointData,
  parseWaypointsData,
  parseWaypointsDataFromList,
} from "@/engine/core/ini/ini_parse";
import { IConfigCondition } from "@/engine/core/ini/ini_types";
import { disableInfoPortion, giveInfoPortion, hasInfoPortion } from "@/engine/core/utils/info_portion";

describe("parseStringsList", () => {
  it("should correctly parse names array", () => {
    expect(parseStringsList("a, b, c")).toEqualLuaArrays(["a", "b", "c"]);
    expect(parseStringsList("a b c")).toEqualLuaArrays(["a", "b", "c"]);
    expect(parseStringsList("name_1, example_b, name_complex_here")).toEqualLuaArrays([
      "name_1",
      "example_b",
      "name_complex_here",
    ]);
    expect(parseStringsList("-1, 2, -3")).toEqualLuaArrays(["-1", "2", "-3"]);
    expect(parseStringsList("-1 2 -3")).toEqualLuaArrays(["-1", "2", "-3"]);
    expect(parseStringsList("-1.5 2.255")).toEqualLuaArrays(["-1.5", "2.255"]);
    expect(parseStringsList("a_b, c_d")).toEqualLuaArrays(["a_b", "c_d"]);
  });

  it("should parse values containing dots and backslashes as single entries", () => {
    // Asset paths and ammo sections both rely on this, so a split here would silently corrupt them.
    expect(parseStringsList("ammo_11.43x23_fmj, ammo_11.43x23_hydro")).toEqualLuaArrays([
      "ammo_11.43x23_fmj",
      "ammo_11.43x23_hydro",
    ]);
    expect(parseStringsList("weapons\\pm\\pm_shoot")).toEqualLuaArrays(["weapons\\pm\\pm_shoot"]);
  });

  it("should return an empty list for empty and nil input", () => {
    expect(parseStringsList("")).toEqualLuaArrays([]);
    expect(parseStringsList(" ")).toEqualLuaArrays([]);
    expect(parseStringsList(",")).toEqualLuaArrays([]);
    // Readers hand back nil for an absent field, and gfind would throw on it rather than yield
    // nothing, so the guard is what lets callers pass a lookup result straight through.
    expect(parseStringsList(null as unknown as string)).toEqualLuaArrays([]);
    expect(parseStringsList(undefined as unknown as string)).toEqualLuaArrays([]);
  });
});

describe("parseStringsSet", () => {
  it("should correctly parse names array", () => {
    expect(parseStringsSet("a, b, c")).toEqualLuaTables({ a: true, b: true, c: true });
    expect(parseStringsSet("a b c")).toEqualLuaTables({ a: true, b: true, c: true });
    expect(parseStringsSet("name_1, example_b, name_complex_here")).toEqualLuaTables({
      name_1: true,
      example_b: true,
      name_complex_here: true,
    });
    expect(parseStringsSet("-1, 2, -3")).toEqualLuaTables({ "-1": true, "2": true, "-3": true });
    expect(parseStringsSet("-1 2 -3")).toEqualLuaTables({ "-1": true, "2": true, "-3": true });
    expect(parseStringsSet("-1.5 2.255")).toEqualLuaTables({ "-1.5": true, "2.255": true });
    expect(parseStringsSet("a_b, c_d")).toEqualLuaTables({ a_b: true, c_d: true });
  });
});

describe("parseNumbersList", () => {
  it("should correctly parse numbers array", () => {
    expect(parseNumbersList("1, 2, 3, 4")).toEqualLuaArrays([1, 2, 3, 4]);
    expect(parseNumbersList("1.5, 2.33, 3.0")).toEqualLuaArrays([1.5, 2.33, 3.0]);
    expect(parseNumbersList("1.5 2.33 3.0")).toEqualLuaArrays([1.5, 2.33, 3.0]);
    expect(parseNumbersList("1.5 2.33, 3.0")).toEqualLuaArrays([1.5, 2.33, 3.0]);
    expect(parseNumbersList("15, 0, -43, 9999")).toEqualLuaArrays([15, 0, -43, 9999]);
    expect(parseNumbersList("15 0 -43 9999")).toEqualLuaArrays([15, 0, -43, 9999]);
  });
});

describe("parseSpawnDetails", () => {
  it("should correctly parse spawn details", () => {
    expect(parseSpawnDetails("")).toEqualLuaArrays([]);
    expect(parseSpawnDetails("1,1")).toEqualLuaArrays([
      {
        count: 1,
        probability: 1,
      },
    ]);
    expect(parseSpawnDetails("2, 0.2")).toEqualLuaArrays([
      {
        count: 2,
        probability: 0.2,
      },
    ]);
    expect(parseSpawnDetails("5,0.5,4,0.3")).toEqualLuaArrays([
      {
        count: 5,
        probability: 0.5,
      },
      {
        count: 4,
        probability: 0.3,
      },
    ]);
  });
});

describe("parseParameters", () => {
  it("should correctly parse call parameters", () => {
    expect(parseParameters(NIL)).toEqualLuaArrays([NIL]);
    expect(parseParameters("abcd")).toEqualLuaArrays(["abcd"]);
    expect(parseParameters("a|b|c|d")).toEqualLuaArrays(["a", "b", "c", "d"]);
    expect(parseParameters("a|{+ex_info =some_cb(true:d:1) !is_rainy} abc")).toEqualLuaArrays([
      "a",
      "{+ex_info =some_cb(true:d:1) !is_rainy} abc",
    ]);
  });
});

describe("parseConditionsList", () => {
  it("should correctly parse condition lists", () => {
    // Memo check.
    expect(parseConditionsList("{+zat_b104_task_end}4,0")).toBe(parseConditionsList("{+zat_b104_task_end}4,0"));
    expect(parseConditionsList("{+zat_b104_task_end}4,0")).toStrictEqualLuaArrays([
      { infop_check: { 1: { name: "zat_b104_task_end", required: true } }, infop_set: {}, section: "4" },
      { infop_check: {}, section: "0", infop_set: {} },
    ]);

    // Check with spacings etc.
    expect(parseConditionsList("  {   +zat_b104_task_end  +another }   4 ,  0   ")).toStrictEqualLuaArrays([
      {
        infop_check: { 1: { name: "zat_b104_task_end", required: true }, 2: { name: "another", required: true } },
        infop_set: {},
        section: "4 ",
      },
      { infop_check: {}, section: "0   ", infop_set: {} },
    ]);

    expect(parseConditionsList("zat_b28_heli_3_crash_name")).toStrictEqualLuaArrays([
      { infop_check: {}, section: "zat_b28_heli_3_crash_name", infop_set: {} },
    ]);

    expect(
      parseConditionsList(
        "{+jup_b218_pripyat_group_gathering}0,{+zat_b28_heli_3_searched}4," +
          "{+zat_b100_heli_2_searched}4,{+zat_b101_heli_5_searched}4,0"
      )
    ).toStrictEqualLuaArrays([
      {
        infop_check: { 1: { name: "jup_b218_pripyat_group_gathering", required: true } },
        section: "0",
        infop_set: {},
      },
      { infop_check: { 1: { name: "zat_b28_heli_3_searched", required: true } }, section: "4", infop_set: {} },
      { infop_check: { 1: { name: "zat_b100_heli_2_searched", required: true } }, section: "4", infop_set: {} },
      { infop_check: { 1: { name: "zat_b101_heli_5_searched", required: true } }, section: "4", infop_set: {} },
      { infop_check: {}, section: "0", infop_set: {} },
    ]);

    expect(
      parseConditionsList(
        "{+zat_b57_bloodsucker_lair_clear}0,{+zat_b38_disappearance_stalkers_meet_cop_later_give}1," +
          "{+zat_b38_failed}3,0"
      )
    ).toStrictEqualLuaArrays([
      { infop_check: { 1: { name: "zat_b57_bloodsucker_lair_clear", required: true } }, section: "0", infop_set: {} },
      {
        infop_check: { 1: { name: "zat_b38_disappearance_stalkers_meet_cop_later_give", required: true } },
        section: "1",
        infop_set: {},
      },
      { infop_check: { 1: { name: "zat_b38_failed", required: true } }, section: "3", infop_set: {} },
      { infop_check: {}, section: "0", infop_set: {} },
    ]);

    expect(parseConditionsList("sr_idle@end%=create_squad(zat_b56_polter_squad:zat_b56)%")).toStrictEqualLuaArrays([
      {
        infop_check: {},
        section: "sr_idle@end",
        infop_set: {
          1: { func: "create_squad", expected: true, params: { 1: "zat_b56_polter_squad", 2: "zat_b56" } },
        },
      },
    ]);

    expect(
      parseConditionsList(
        "{-zat_b42_mayron_spawn}sr_idle%=spawn_corpse(zat_b42_mayron:zat_b42_mayron_walk)+zat_b42_mayron_spawn%"
      )
    ).toStrictEqualLuaArrays([
      {
        infop_check: { "1": { name: "zat_b42_mayron_spawn", required: false } },
        section: "sr_idle",
        infop_set: {
          "1": { func: "spawn_corpse", expected: true, params: { "1": "zat_b42_mayron", "2": "zat_b42_mayron_walk" } },
          "2": { name: "zat_b42_mayron_spawn", required: true },
        },
      },
    ]);
  });
});

describe("parseInfoPortions", () => {
  it("should correctly parse info", () => {
    const first: LuaArray<IConfigCondition> = parseInfoPortions(
      new LuaTable(),
      "=spawn_corpse(zat_b42_mayron:zat_b42_mayron_walk)+zat_b42_mayron_spawn"
    );

    expect(first).toEqualLuaTables({
      "1": {
        expected: true,
        func: "spawn_corpse",
        params: {
          "1": "zat_b42_mayron",
          "2": "zat_b42_mayron_walk",
        },
      },
      "2": {
        name: "zat_b42_mayron_spawn",
        required: true,
      },
    });

    const second: LuaArray<IConfigCondition> = parseInfoPortions(
      new LuaTable(),
      "+save_zat_b42_arrived_to_controler_lair =scenario_autosave(st_save_zat_b42_arrived_to_controler_lair)" +
        " ~50 !another"
    );

    expect(second).toEqualLuaTables({
      "1": {
        name: "save_zat_b42_arrived_to_controler_lair",
        required: true,
      },
      "2": {
        expected: true,
        func: "scenario_autosave",
        params: {
          "1": "st_save_zat_b42_arrived_to_controler_lair",
        },
      },
      "3": {
        prob: 50,
      },
      "4": {
        expected: false,
        func: "another",
        params: null,
      },
    });

    const third: LuaArray<IConfigCondition> = new LuaTable();

    expect(parseInfoPortions(third, null)).toBe(third);
    expect(parseInfoPortions(third, null)).toEqualLuaTables({});
  });
});

describe("parseFunctionParams", () => {
  it("should correctly parse list of parameters for condlists", () => {
    expect(parseFunctionParams("zat_b42_mayron:zat_b42_mayron_walk")).toEqualLuaArrays([
      "zat_b42_mayron",
      "zat_b42_mayron_walk",
    ]);
    expect(parseFunctionParams("1:zat_b42_mayron_walk:2")).toEqualLuaArrays([1, "zat_b42_mayron_walk", 2]);
    expect(parseFunctionParams("1:-2:3.5:-5.5:-2.3a:c")).toEqualLuaArrays([1, -2, 3.5, -5.5, "-2.3a", "c"]);
  });
});

describe("parseWaypointData", () => {
  it("should correctly parse generic paths to waypoint data", () => {
    const flags: Flags32 = new flags32();

    expect(parseWaypointData("zat_b53_particle_play_point_5", flags, "wp00")).toEqualLuaTables({
      flags,
      a: null,
      p: null,
      ret: null,
      sig: null,
      t: null,
    });
    expect(parseWaypointData("zat_b53_particle_play_point_5", flags, "wp02|a=patrol")).toEqualLuaTables({
      flags,
      p: null,
      ret: null,
      sig: null,
      t: null,
      a: {
        "1": {
          infop_check: {},
          infop_set: {},
          section: "patrol",
        },
      },
    });
    expect(parseWaypointData("zat_b53_particle_play_point_5", flags, "wp00|p=30|t=10000")).toEqualLuaTables({
      flags,
      p: "30",
      t: "10000",
      a: null,
      ret: null,
      sig: null,
    });
    expect(parseWaypointData("zat_b53_particle_play_point_5", flags, "wp09|p=70|t=10000")).toEqualLuaTables({
      flags,
      p: "70",
      t: "10000",
      a: null,
      ret: null,
      sig: null,
    });
    expect(parseWaypointData("zat_b53_particle_play_point_5", flags, "wp10|t=10000|a=search")).toEqualLuaTables({
      flags,
      a: {
        "1": {
          infop_check: {},
          infop_set: {},
          section: "search",
        },
      },
      t: "10000",
      p: null,
      ret: null,
      sig: null,
    });
  });

  it("should correctly parse generic paths to waypoint data", () => {
    const flags: Flags32 = new flags32();

    expect(parseWaypointsData(null)).toBeNull();
    expect(parseWaypointsData("zat_b40_smart_terrain_zat_b40_merc_01_walk")).toEqualLuaTables({
      "0": {
        a: {
          "1": {
            infop_check: {},
            infop_set: {},
            section: "patrol",
          },
        },
        flags,
        p: null,
        ret: null,
        sig: null,
        t: null,
      },
      "1": {
        a: {
          "1": {
            infop_check: {},
            infop_set: {},
            section: "patrol",
          },
        },
        flags,
        p: null,
        ret: null,
        sig: null,
        t: null,
      },
      "2": {
        a: {
          "1": {
            infop_check: {},
            infop_set: {},
            section: "patrol",
          },
        },
        flags,
        p: null,
        ret: null,
        sig: null,
        t: null,
      },
    });

    expect(parseWaypointsData("zat_b40_smart_terrain_zat_b40_merc_02_look")).toEqualLuaTables({
      "0": {
        a: null,
        flags: MockFlags32.mock(),
        p: "30",
        ret: null,
        sig: null,
        t: "10000",
      },
      "1": {
        a: null,
        flags: MockFlags32.mock(),
        p: "70",
        ret: null,
        sig: null,
        t: "10000",
      },
      "2": {
        a: null,
        flags: MockFlags32.mock(),
        p: "30",
        ret: null,
        sig: null,
        t: "10000",
      },
      "3": {
        a: null,
        flags: MockFlags32.mock(),
        p: "50",
        ret: null,
        sig: null,
        t: "10000",
      },
      "4": {
        a: {
          "1": {
            infop_check: {},
            infop_set: {},
            section: "search",
          },
        },
        flags: MockFlags32.mock(),
        p: null,
        ret: null,
        sig: null,
        t: "10000",
      },
    });
  });
});

describe("parseWaypointsDataFromList", () => {
  it("should correctly parse generic paths to waypoint data", () => {
    expect(
      parseWaypointsDataFromList(
        "zat_b40_smart_terrain_zat_b40_merc_01_walk",
        3,
        [0, "wp55|a=patrol"],
        [1, "wp66|a=patrol"],
        [2, "wp77|a=patrol"]
      )
    ).toEqualLuaArrays([
      {
        a: {
          "1": {
            infop_check: {},
            infop_set: {},
            section: "patrol",
          },
        },
        flags: MockFlags32.mock(),
        p: null,
        ret: null,
        sig: null,
        t: null,
      },
      {
        a: {
          "1": {
            infop_check: {},
            infop_set: {},
            section: "patrol",
          },
        },
        flags: MockFlags32.mock(1),
        p: null,
        ret: null,
        sig: null,
        t: null,
      },
      {
        a: {
          "1": {
            infop_check: {},
            infop_set: {},
            section: "patrol",
          },
        },
        flags: MockFlags32.mock(2),
        p: null,
        ret: null,
        sig: null,
        t: null,
      },
    ]);
  });
});

describe("parseBoneStateDescriptors", () => {
  it("should correctly parse bones data", () => {
    expect(
      parseBoneStateDescriptors(
        "4|ph_door@open_2 %+lx8_toilet_door_open_again%|2|ph_door@open_2 %+lx8_toilet_door_open_again%"
      )
    ).toEqualLuaArrays([
      { index: 4, state: parseConditionsList("ph_door@open_2 %+lx8_toilet_door_open_again%") },
      { index: 2, state: parseConditionsList("ph_door@open_2 %+lx8_toilet_door_open_again%") },
    ]);
    expect(parseBoneStateDescriptors("1|ph_door@free|2|ph_door@free")).toEqualLuaArrays([
      { index: 1, state: parseConditionsList("ph_door@free") },
      { index: 2, state: parseConditionsList("ph_door@free") },
    ]);
  });
});

describe("pickSectionFromCondList", () => {
  it("should correctly throw on unexpected callbacks", () => {
    const actor: GameObject = MockGameObject.mockActor();
    const target: GameObject = MockGameObject.mock();

    registerActor(actor);

    expect(() => pickSectionFromCondList(actor, target, parseConditionsList("{=not_existing_cb}simple"))).toThrow();
    expect(() => {
      pickSectionFromCondList(actor, target, parseConditionsList("simple%=not_existing_cb(a|b)%"));
    }).toThrow();
  });

  it("should correctly check probability", () => {
    const actor: GameObject = MockGameObject.mockActor();
    const target: GameObject = MockGameObject.mock();

    registerActor(actor);

    jest.spyOn(math, "random").mockImplementation(() => 50);

    expect(pickSectionFromCondList(actor, target, parseConditionsList("{~0}a,b"))).toBe("b");
    expect(pickSectionFromCondList(actor, target, parseConditionsList("{~10}a,{~100}b, c"))).toBe("b");
    expect(pickSectionFromCondList(actor, target, parseConditionsList("{~10}a,{~10}b, c"))).toBe("c");
    expect(pickSectionFromCondList(actor, target, parseConditionsList("{~10}a,{~1000}b, c"))).toBe("b");
    expect(pickSectionFromCondList(actor, target, parseConditionsList("{~100}a,{~1000}b, c"))).toBe("a");
    expect(pickSectionFromCondList(actor, target, parseConditionsList("{~40}a,{~50}b, c"))).toBe("b");

    jest.spyOn(math, "random").mockImplementation(() => 70);

    expect(pickSectionFromCondList(actor, target, parseConditionsList("{~60}a,{~50}b, {~75}c, d"))).toBe("c");
  });

  it("should correctly check condition callbacks and call effects", () => {
    const actor: GameObject = MockGameObject.mockActor();
    const target: GameObject = MockGameObject.mock();

    registerActor(actor);

    const firstEffect = jest.fn();
    const secondEffect = jest.fn();
    const thirdEffect = jest.fn();

    extern("xr_effects.first", firstEffect);
    extern("xr_effects.second", secondEffect);
    extern("xr_effects.third", secondEffect);

    const firstCondition = jest.fn(() => true);
    const secondCondition = jest.fn(() => false);

    extern("xr_conditions.first", firstCondition);
    extern("xr_conditions.second", secondCondition);

    expect(pickSectionFromCondList(actor, target, parseConditionsList("{=first !second}a,b"))).toBe("a");
    expect(pickSectionFromCondList(actor, target, parseConditionsList("{!first !second}a,b"))).toBe("b");
    expect(pickSectionFromCondList(actor, target, parseConditionsList("{!first =second}a,b"))).toBe("b");
    expect(pickSectionFromCondList(actor, target, parseConditionsList("{=first =second}a,b"))).toBe("b");

    expect(pickSectionFromCondList(actor, target, parseConditionsList("{=first !second}a%=first(a:1)%,b"))).toBe("a");
    expect(pickSectionFromCondList(actor, target, parseConditionsList("{!first !second}a,b%=second%"))).toBe("b");
    expect(pickSectionFromCondList(actor, target, parseConditionsList("{!first =second}a%=third%,b"))).toBe("b");

    expect(firstEffect.mock.calls[0]).toEqualLuaArrays([actor, target, { "1": "a", "2": 1 }]);
    expect(secondEffect).toHaveBeenCalledWith(actor, target, EMPTY_LUA_ARRAY);
    expect(thirdEffect).not.toHaveBeenCalled();
  });

  it("should correctly pick and process info from list", () => {
    const actor: GameObject = MockGameObject.mockActor();
    const target: GameObject = MockGameObject.mock();

    registerActor(actor);

    expect(pickSectionFromCondList(actor, target, parseConditionsList("simple"))).toBe("simple");
    expect(
      pickSectionFromCondList(
        actor,
        target,
        parseConditionsList("{+test_info -unexpected_info} simple %+another_info -available_info%, fallback")
      )
    ).toBe("fallback");

    giveInfoPortion("available_info");
    giveInfoPortion("test_info");
    giveInfoPortion("unexpected_info");

    expect(
      pickSectionFromCondList(
        actor,
        target,
        parseConditionsList("{+test_info -unexpected_info} simple %+another_info -available_info%, fallback")
      )
    ).toBe("fallback");

    disableInfoPortion("unexpected_info");

    expect(hasInfoPortion("test_info")).toBe(true);
    expect(hasInfoPortion("unexpected_info")).toBe(false);
    expect(hasInfoPortion("available_info")).toBe(true);
    expect(
      pickSectionFromCondList(
        actor,
        target,
        parseConditionsList("{+test_info -unexpected_info} simple %+another_info -available_info%, fallback")
      )
    ).toBe("simple ");

    expect(hasInfoPortion("another_info")).toBe(true);
    expect(hasInfoPortion("available_info")).toBe(false);
  });

  it("should correctly handle combination of all factors", () => {
    const actor: GameObject = MockGameObject.mockActor();
    const target: GameObject = MockGameObject.mock();

    registerActor(actor);
    giveInfoPortion("test_info");

    jest.spyOn(math, "random").mockImplementation(() => 50);

    const firstEffect = jest.fn();
    const firstCondition = jest.fn(() => true);
    const secondCondition = jest.fn(() => false);

    extern("xr_effects.first", firstEffect);
    extern("xr_conditions.first", firstCondition);
    extern("xr_conditions.second", secondCondition);

    expect(
      pickSectionFromCondList(
        actor,
        target,
        parseConditionsList(
          "{+test_info -unexpected_info =first !second ~45}a,{+test_info +unexpected_info ~60}b," +
            "{+test_info -unexpected_info =first =second}c,{+test_info -unexpected_info =first !second ~51}d,e"
        )
      )
    ).toBe("d");
  });
});

describe("parseStringOptional", () => {
  it("should correctly handle values", () => {
    expect(parseStringOptional(NIL)).toBeNull();
    expect(parseStringOptional("nil")).toBeNull();
    expect(parseStringOptional("null")).toBe("null");
    expect(parseStringOptional("test")).toBe("test");
    expect(parseStringOptional("12345")).toBe("12345");
  });
});

describe("parseNumberOptional", () => {
  it("should correctly handle values", () => {
    expect(parseNumberOptional(NIL)).toBeNull();
    expect(parseNumberOptional("nil")).toBeNull();
    expect(parseNumberOptional("10")).toBe(10);
    expect(parseNumberOptional("15.5")).toBe(15.5);
  });
});

describe("getSchemeFromSection", () => {
  it("should correctly return scheme", () => {
    expect(getSchemeFromSection("test")).toBe("test");
    expect(getSchemeFromSection("test@example")).toBe("test");
    expect(getSchemeFromSection("combat@first")).toBe("combat");
    expect(getSchemeFromSection("")).toBeNull();
    expect(getSchemeFromSection("@")).toBeNull();
    expect(getSchemeFromSection("@abc")).toBeNull();
  });
});
