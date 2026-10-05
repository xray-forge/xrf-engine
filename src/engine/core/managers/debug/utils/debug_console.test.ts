import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { AnyObject } from "xray16/lib";

import { registry } from "@/engine/core/database";
import {
  createDebugConsoleEnvironment,
  evaluateDebugLua,
  formatDebugValue,
} from "@/engine/core/managers/debug/utils/debug_console";
import { mockRegisteredActor, resetRegistry } from "@/fixtures/engine";

const globals: AnyObject = globalThis as AnyObject;

beforeEach(() => {
  resetRegistry();
  mockRegisteredActor();

  globals.setfenv = jest.fn();
  globals.setmetatable = jest.fn((table: AnyObject) => table);
});

afterEach(() => {
  delete globals.loadstring;
  delete globals.setfenv;
  delete globals.setmetatable;
});

describe("formatDebugValue", () => {
  it("should show values and tables as text, cutting long text", () => {
    expect(formatDebugValue(5)).toBe("5");
    expect(formatDebugValue(null)).toBe("nil");
    expect(formatDebugValue({ a: 1 })).toContain('"a"');
    expect(formatDebugValue("x".repeat(700))).toMatch(/ \.\.\.$/);
  });
});

describe("createDebugConsoleEnvironment", () => {
  it("should set the actor, the target and the registry", () => {
    const environment: AnyObject = createDebugConsoleEnvironment(null);

    expect(environment.actor).toBe(registry.actor);
    expect(environment.registry).toBe(registry);
    expect(environment.target).toBeNull();
  });
});

describe("evaluateDebugLua", () => {
  it("should run expressions first, then chunks, in the console environment", () => {
    globals.loadstring = jest.fn((code: string) =>
      code === "return 1 + 1" ? [() => 2] : code === "local x = 3 return x" ? [() => 3] : [null, "syntax"]
    );

    const environment: AnyObject = createDebugConsoleEnvironment(null);

    expect(evaluateDebugLua("1 + 1", environment)).toBe("2");
    expect(evaluateDebugLua("local x = 3 return x", environment)).toBe("3");
    expect(globals.setfenv).toHaveBeenCalledWith(expect.any(Function), environment);
  });

  it("should report compile and run errors", () => {
    globals.loadstring = jest.fn((code: string) =>
      code === "return fail()"
        ? [
            () => {
              throw "boom";
            },
          ]
        : [null, "syntax"]
    );

    expect(evaluateDebugLua("???", createDebugConsoleEnvironment(null))).toBe("error: syntax");
    expect(evaluateDebugLua("fail()", createDebugConsoleEnvironment(null))).toMatch(/^error: .*boom/);
  });
});
