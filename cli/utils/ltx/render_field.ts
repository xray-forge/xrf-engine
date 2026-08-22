import { ELtxFieldType, ILtxFieldDescriptor } from "#/utils/ltx/types";
import { Nullable } from "#/utils/types";

/**
 * Assert whether provided value is number.
 */
function assertIsNumber(it: unknown): asserts it is number {
  if (typeof it !== "number") {
    throw new Error(`Invalid number supplied: '${it}'.`);
  }
}

/**
 * Assert whether provided value is boolean.
 */
function assertIsBoolean(it: unknown): asserts it is boolean {
  if (typeof it !== "boolean") {
    throw new Error(`Invalid boolean supplied: '${it}'.`);
  }
}

/**
 * Assert whether provided value is array.
 */
function assertIsArray(it: unknown): asserts it is Array<unknown> {
  if (!Array.isArray(it)) {
    throw new Error(`Invalid array supplied, got '${typeof it}' type instead.`);
  }
}

/**
 * Assert whether provided value is integer.
 */
function assertIsInteger(it: unknown): asserts it is number {
  if (typeof it !== "number" || !Number.isInteger(it)) {
    throw new Error(`Invalid integer number supplied: '${it}'.`);
  }
}

/**
 * Assert whether provided value is float.
 */
function toFloat(it: number, precision: number = 1): string {
  return Number.isInteger(it) ? it.toFixed(precision) : String(it);
}

/**
 * Render LTX field link based on data / descriptor.
 */
function link(name: Nullable<string>, data: string, descriptor?: Nullable<ILtxFieldDescriptor<unknown>>): string {
  const comment: string = descriptor?.meta?.comment ? ` ; ${descriptor.meta.comment}` : "";
  const key: string = name ? name : "";

  if (descriptor === null) {
    return key + comment;
  } else if (descriptor?.meta?.isBinding) {
    return (key ? `${key}${data ? ` ${data}` : ""}` : data) + comment;
  }

  return (key ? `${name} =${data ? ` ${data}` : ""}` : data) + comment;
}

/**
 * Render LTX field for provided section metadata.
 */
export function renderField(name: Nullable<string>, value: any): string;
export function renderField(name: Nullable<string>, value: Nullable<ILtxFieldDescriptor<unknown>>): string {
  // In case of empty fields without data or placeholders.
  if (value === null || value === undefined) {
    return link(name, "", null);
  } else if (typeof value !== "object") {
    return link(name, String(value));
  } else if (Array.isArray(value)) {
    return link(name, value.join(", "));
  }

  switch (value.type) {
    case ELtxFieldType.STRING:
    case ELtxFieldType.CONDLIST:
      return link(name, String(value.value), value);

    case ELtxFieldType.INTEGER:
      assertIsInteger(value.value);

      return link(name, String(value.value), value);

    case ELtxFieldType.FLOAT:
      assertIsNumber(value.value);

      return link(name, toFloat(value.value), value);

    case ELtxFieldType.BOOLEAN:
      assertIsBoolean(value.value);

      return link(name, String(value.value), value);

    case ELtxFieldType.STRING_ARRAY:
      assertIsArray(value.value);

      return link(name, (value.value as Array<string>).join(", "), value);

    case ELtxFieldType.INTEGER_ARRAY:
      assertIsArray(value.value);

      return link(
        name,
        (value.value as Array<number>)
          .map((it) => {
            assertIsInteger(it);

            return it;
          })
          .join(", "),
        value
      );

    case ELtxFieldType.FLOAT_ARRAY:
      assertIsArray(value.value);

      return link(
        name,
        (value.value as Array<number>)
          .map((it) => {
            assertIsNumber(it);

            return toFloat(it);
          })
          .join(", "),
        value
      );
  }

  throw new Error(`Unexpected LTX values supplied: '${JSON.stringify(value)}'.`);
}
