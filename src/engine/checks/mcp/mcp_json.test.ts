import { describe, expect, it, jest } from "@jest/globals";
import { GameObject, Time } from "xray16/alias";
import { AnyObject } from "xray16/lib";
import { MockCTime, MockGameObject, mockType } from "xray16/mocks";

import { decodeJson, encodeJson } from "@/engine/checks/mcp/mcp_json";

type TLuaType = ReturnType<typeof type>;

/**
 * @param value - Value to name the Lua type of.
 * @returns Its Lua type, as the jest globals answer it.
 */
function mockLuaType(value: unknown): TLuaType {
  return mockType(value) as TLuaType;
}

describe("encodeJson", () => {
  it("should encode primitives", () => {
    expect(encodeJson(null)).toBe("null");
    expect(encodeJson(undefined)).toBe("null");
    expect(encodeJson(true)).toBe("true");
    expect(encodeJson(false)).toBe("false");
    expect(encodeJson(42)).toBe("42");
    expect(encodeJson(-1.5)).toBe("-1.5");
    expect(encodeJson("text")).toBe('"text"');
  });

  it("should encode numbers without a JSON form as null", () => {
    expect(encodeJson(NaN)).toBe("null");
    expect(encodeJson(Infinity)).toBe("null");
    expect(encodeJson(-Infinity)).toBe("null");
  });

  it("should escape quotes, backslashes and control characters so a value stays one line", () => {
    expect(encodeJson('say "hi"')).toBe('"say \\"hi\\""');
    expect(encodeJson("C:\\games")).toBe('"C:\\\\games"');
    expect(encodeJson("one\ntwo\r\tend")).toBe('"one\\ntwo\\r\\tend"');
    expect(encodeJson("bell\u0007")).toBe('"bell\\u0007"');
    expect(encodeJson("line\nbreak")).not.toContain("\n");
  });

  it("should encode arrays and objects", () => {
    expect(encodeJson([1, "two", false])).toBe('[1,"two",false]');
    expect(encodeJson({ a: 1 })).toBe('{"a":1}');
    expect(JSON.parse(encodeJson({ a: { b: [1, 2] }, c: "d" }))).toEqual({ a: { b: [1, 2] }, c: "d" });
  });

  it("should write placeholders for functions, cycles and deep nesting", () => {
    const cyclic: AnyObject = { name: "loop" };

    cyclic.self = cyclic;

    expect(encodeJson(() => 1)).toBe('"<function>"');
    expect(JSON.parse(encodeJson(cyclic))).toEqual({ name: "loop", self: "<circular>" });

    let deep: AnyObject = { value: 1 };

    for (let it = 0; it < 20; it++) {
      deep = { deep };
    }

    expect(encodeJson(deep)).toContain("<depth_limit>");
  });

  it("should name engine objects", () => {
    const time: Time = MockCTime.mock(2012, 8, 3, 9, 0, 59, 0);
    const object: GameObject = MockGameObject.mock({ id: 7, name: "bandit" });

    jest
      .mocked(type)
      .mockImplementation((value: unknown) => (value === time || value === object ? "userdata" : mockLuaType(value)));

    expect(JSON.parse(encodeJson({ at: time, who: [object] }))).toEqual({
      at: "<CTime 2012-08-03 09:00:59.000>",
      who: ["<game_object 7 bandit>"],
    });

    jest.mocked(type).mockImplementation(mockLuaType);
  });

  it("should encode the same table twice when it is not a cycle", () => {
    const shared: AnyObject = { x: 1 };

    expect(JSON.parse(encodeJson({ first: shared, second: shared }))).toEqual({ first: { x: 1 }, second: { x: 1 } });
  });
});

describe("decodeJson", () => {
  it("should decode literals, numbers and strings", () => {
    expect(decodeJson("true")).toBe(true);
    expect(decodeJson("false")).toBe(false);
    expect(decodeJson("null")).toBeNull();
    expect(decodeJson("12")).toBe(12);
    expect(decodeJson("-0.5e2")).toBe(-50);
    expect(decodeJson('"text"')).toBe("text");
  });

  it("should decode string escapes", () => {
    expect(decodeJson('"a\\"b\\\\c\\/d"')).toBe('a"b\\c/d');
    expect(decodeJson('"one\\ntwo\\r\\tend\\b\\f"')).toBe("one\ntwo\r\tend\b\f");
    expect(decodeJson('"\\u0041\\u0007"')).toBe("A\u0007");
  });

  it("should decode objects and arrays with whitespace", () => {
    expect(decodeJson(' { "id" : "1", "kind": "lua", "args": [ 1, "two", { "x": true } ] } ')).toEqual({
      id: "1",
      kind: "lua",
      args: [1, "two", { x: true }],
    });
    expect(decodeJson("{}")).toEqual({});
    expect(decodeJson("[]")).toEqual([]);
  });

  it("should decode what the MCP server sends", () => {
    const request: AnyObject = { id: "a-1", kind: "lua", code: 'return "x\\ny"\nend' };

    expect(decodeJson(JSON.stringify(request))).toEqual(request);
  });

  it("should round trip what it encodes", () => {
    const value: AnyObject = { id: "1", ok: true, result: { text: 'q"\\\n', list: [1, 2.5, "x"] } };

    expect(decodeJson(encodeJson(value))).toEqual(value);
  });

  it("should fail on malformed text", () => {
    expect(() => decodeJson("")).toThrow("Invalid JSON");
    expect(() => decodeJson("{")).toThrow("Invalid JSON");
    expect(() => decodeJson('{"a" 1}')).toThrow("Invalid JSON: expected ':'");
    expect(() => decodeJson('"open')).toThrow("Invalid JSON: unterminated string");
    expect(() => decodeJson('"\\x"')).toThrow("Invalid JSON: unknown escape");
    expect(() => decodeJson("[1,]")).toThrow("Invalid JSON");
    expect(() => decodeJson("true false")).toThrow("Invalid JSON: unexpected text");
    expect(() => decodeJson("tru")).toThrow("Invalid JSON: unexpected text");
  });
});
