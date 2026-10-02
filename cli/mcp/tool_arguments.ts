import { IToolArgumentSchema, IToolInputSchema } from "#/mcp/mcp_tool_types";
import { Nullable } from "#/utils/types";

/**
 * @param name - Argument name.
 * @param schema - Argument schema.
 * @param value - Value given.
 * @returns Why the value does not fit the schema, or null when it does.
 */
function describeMismatch(name: string, schema: IToolArgumentSchema, value: unknown): Nullable<string> {
  switch (schema.type) {
    case "boolean":
      return typeof value === "boolean" ? null : `'${name}' must be a boolean`;

    case "integer":
      if (typeof value !== "number" || !Number.isInteger(value)) {
        return `'${name}' must be an integer`;
      }

      if (
        (schema.minimum !== undefined && value < schema.minimum) ||
        (schema.maximum !== undefined && value > schema.maximum)
      ) {
        return `'${name}' must be from ${schema.minimum ?? "-inf"} to ${schema.maximum ?? "inf"}`;
      }

      return null;

    case "string":
      if (typeof value !== "string") {
        return `'${name}' must be a string`;
      }

      if (schema.enum && !schema.enum.includes(value)) {
        return `'${name}' must be one of ${schema.enum.join(", ")}`;
      }

      if (schema.minLength !== undefined && value.length < schema.minLength) {
        return `'${name}' must not be empty`;
      }

      return null;
  }
}

/**
 * Check tool arguments against the tool schema and fill in defaults, as a tool body expects them.
 *
 * @param schema - Tool input schema.
 * @param args - Arguments the client sent.
 * @returns Arguments with defaults applied.
 * @throws An error naming every argument that does not fit.
 */
export function readToolArguments(schema: IToolInputSchema, args: unknown): Record<string, unknown> {
  if (args !== undefined && (typeof args !== "object" || args === null || Array.isArray(args))) {
    throw new Error("Invalid arguments: expected an object.");
  }

  const given: Record<string, unknown> = (args ?? {}) as Record<string, unknown>;
  const problems: Array<string> = Object.keys(given)
    .filter((name) => !(name in schema.properties))
    .map((name) => `'${name}' is not an argument`);
  const result: Record<string, unknown> = {};

  for (const [name, property] of Object.entries(schema.properties)) {
    const value: unknown = given[name] ?? property.default;

    if (value === undefined) {
      if (schema.required?.includes(name)) {
        problems.push(`'${name}' is required`);
      }

      continue;
    }

    const mismatch: Nullable<string> = describeMismatch(name, property, value);

    if (mismatch) {
      problems.push(mismatch);
    } else {
      result[name] = value;
    }
  }

  if (problems.length > 0) {
    throw new Error(`Invalid arguments: ${problems.join("; ")}.`);
  }

  return result;
}
