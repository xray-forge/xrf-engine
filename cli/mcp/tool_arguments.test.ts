import { describe, expect, it } from "@jest/globals";

import { IToolInputSchema } from "#/mcp/mcp_tool_types";
import { readToolArguments } from "#/mcp/tool_arguments";

const SCHEMA: IToolInputSchema = {
  type: "object",
  properties: {
    mode: { type: "string", enum: ["new", "load"], default: "new", description: "Mode." },
    save: { type: "string", minLength: 1, description: "Save." },
    lines: { type: "integer", minimum: 1, maximum: 10, default: 5, description: "Lines." },
    verbose: { type: "boolean", description: "Verbose." },
  },
  required: ["save"],
  additionalProperties: false,
};

describe("readToolArguments", () => {
  it("should fill in defaults and keep given arguments", () => {
    expect(readToolArguments(SCHEMA, { save: "quick" })).toEqual({ mode: "new", save: "quick", lines: 5 });
    expect(readToolArguments(SCHEMA, { save: "quick", mode: "load", lines: 10, verbose: true })).toEqual({
      mode: "load",
      save: "quick",
      lines: 10,
      verbose: true,
    });
    expect(readToolArguments({ type: "object", properties: {}, additionalProperties: false }, undefined)).toEqual({});
  });

  it("should name every argument that does not fit", () => {
    expect(() => readToolArguments(SCHEMA, { mode: "other", lines: 1.5, verbose: "yes", extra: 1 })).toThrow(
      "Invalid arguments: 'extra' is not an argument; 'mode' must be one of new, load; 'save' is required; " +
        "'lines' must be an integer; 'verbose' must be a boolean."
    );
    expect(() => readToolArguments(SCHEMA, { save: "", lines: 11 })).toThrow(
      "Invalid arguments: 'save' must not be empty; 'lines' must be from 1 to 10."
    );
    expect(() => readToolArguments(SCHEMA, ["save"])).toThrow("Invalid arguments: expected an object.");
  });
});
