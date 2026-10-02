import { AnyArgs, AnyObject, Nillable } from "xray16/lib";
import { $isNotNil } from "xray16/macros";

import { mcpConfig } from "@/engine/checks/mcp/McpConfig";

/**
 * Raise a decoding error without a Lua source position, as the MCP server shows the message as it is.
 *
 * @param format - Message format.
 * @param args - Format arguments.
 */
function failJson(format: string, ...args: AnyArgs): never {
  return error(string.format(format, ...args), 0);
}

const HEX_DIGITS: Array<string> = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "a", "b", "c", "d", "e", "f"];

/**
 * @returns Escape of every character a JSON string may not hold raw.
 */
function createEscapes(): Record<string, string> {
  const escapes: Record<string, string> = {};

  for (const code of $range(0, 31)) {
    escapes[String.fromCharCode(code)] = "\\u00" + HEX_DIGITS[math.floor(code / 16)] + HEX_DIGITS[code % 16];
  }

  escapes["\b"] = "\\b";
  escapes["\f"] = "\\f";
  escapes["\n"] = "\\n";
  escapes["\r"] = "\\r";
  escapes["\t"] = "\\t";
  escapes['"'] = '\\"';
  escapes["\\"] = "\\\\";

  return escapes;
}

const ESCAPES: Record<string, string> = createEscapes();

/**
 * Encode a Lua value as one line of JSON.
 * Tables starting at index 1 are arrays, other tables objects; functions and userdata become placeholder strings.
 *
 * @param value - Value to encode.
 * @returns JSON text without line breaks.
 */
export function encodeJson(value: unknown): string {
  return encodeValue(value, 0, new LuaTable());
}

/**
 * @param value - Value to encode.
 * @param depth - Nesting of the value.
 * @param seen - Tables on the current path, to cut cycles.
 * @returns JSON text of the value.
 */
function encodeValue(value: unknown, depth: number, seen: LuaTable<AnyNotNil, boolean>): string {
  const valueType: string = type(value);

  if (valueType === "nil") {
    return "null";
  } else if (valueType === "boolean") {
    return value ? "true" : "false";
  } else if (valueType === "number") {
    const number: number = value as number;

    // NaN and infinities have no JSON form.
    return number !== number || number - number !== 0 ? "null" : tostring(number);
  } else if (valueType === "string") {
    return encodeString(value as string);
  } else if (valueType !== "table") {
    return encodeString(`<${valueType}>`);
  }

  if (depth >= mcpConfig.MAX_JSON_DEPTH) {
    return encodeString("<depth_limit>");
  } else if (seen.has(value as AnyNotNil)) {
    return encodeString("<circular>");
  }

  seen.set(value as AnyNotNil, true);

  const parts: Array<string> = [];
  let text: string;

  if (Array.isArray(value)) {
    for (const item of value as Array<unknown>) {
      parts.push(encodeValue(item, depth + 1, seen));
    }

    text = "[" + parts.join(",") + "]";
  } else {
    for (const [key, item] of pairs(value as AnyObject)) {
      parts.push(encodeString(tostring(key)) + ":" + encodeValue(item, depth + 1, seen));
    }

    text = "{" + parts.join(",") + "}";
  }

  seen.delete(value as AnyNotNil);

  return text;
}

/**
 * @param value - String to quote.
 * @returns Quoted string with control characters, quotes and backslashes escaped.
 */
function encodeString(value: string): string {
  const parts: Array<string> = [];
  let start: number = 0;

  for (let index = 0; index < value.length; index++) {
    const escape: Nillable<string> = ESCAPES[value.charAt(index)];

    if ($isNotNil(escape)) {
      parts.push(value.substring(start, index), escape);
      start = index + 1;
    }
  }

  parts.push(value.substring(start));

  return '"' + parts.join("") + '"';
}

/**
 * Reading position over a JSON text.
 */
interface IJsonReader {
  text: string;
  index: number;
}

/**
 * Decode one JSON value. Objects become tables, arrays sequences, `null` is nil.
 * Text arrives as bytes in the game text encoding; a `\u` escape above U+007F, which the MCP server never writes,
 * becomes UTF-8 bytes.
 *
 * @param text - JSON text.
 * @returns Decoded value.
 */
export function decodeJson(text: string): unknown {
  const reader: IJsonReader = { text, index: 0 };

  skipWhitespace(reader);

  const value: unknown = readValue(reader);

  skipWhitespace(reader);

  if (reader.index < text.length) {
    failJson("Invalid JSON: unexpected text at %s.", reader.index + 1);
  }

  return value;
}

/**
 * @param reader - Position to move past whitespace.
 */
function skipWhitespace(reader: IJsonReader): void {
  while (reader.index < reader.text.length) {
    const code: number = reader.text.charCodeAt(reader.index);

    if (code !== 32 && code !== 9 && code !== 10 && code !== 13) {
      return;
    }

    reader.index += 1;
  }
}

/**
 * @param reader - Position at the first character of a value.
 * @returns Decoded value.
 */
function readValue(reader: IJsonReader): unknown {
  const char: string = reader.text.charAt(reader.index);

  if (char === "{") {
    return readObject(reader);
  } else if (char === "[") {
    return readArray(reader);
  } else if (char === '"') {
    return readString(reader);
  } else if (char === "t") {
    return readLiteral(reader, "true", true);
  } else if (char === "f") {
    return readLiteral(reader, "false", false);
  } else if (char === "n") {
    return readLiteral(reader, "null", null);
  }

  return readNumber(reader);
}

/**
 * @param reader - Position at `{`.
 * @returns Decoded object.
 */
function readObject(reader: IJsonReader): AnyObject {
  const object: AnyObject = {};

  reader.index += 1;
  skipWhitespace(reader);

  if (reader.text.charAt(reader.index) === "}") {
    reader.index += 1;

    return object;
  }

  while (true) {
    skipWhitespace(reader);

    if (reader.text.charAt(reader.index) !== '"') {
      failJson("Invalid JSON: expected a key at %s.", reader.index + 1);
    }

    const key: string = readString(reader);

    skipWhitespace(reader);
    expectChar(reader, ":");
    skipWhitespace(reader);

    object[key] = readValue(reader);

    skipWhitespace(reader);

    if (reader.text.charAt(reader.index) === "}") {
      reader.index += 1;

      return object;
    }

    expectChar(reader, ",");
  }
}

/**
 * @param reader - Position at `[`.
 * @returns Decoded array.
 */
function readArray(reader: IJsonReader): Array<unknown> {
  const array: Array<unknown> = [];

  reader.index += 1;
  skipWhitespace(reader);

  if (reader.text.charAt(reader.index) === "]") {
    reader.index += 1;

    return array;
  }

  while (true) {
    skipWhitespace(reader);
    array.push(readValue(reader));
    skipWhitespace(reader);

    if (reader.text.charAt(reader.index) === "]") {
      reader.index += 1;

      return array;
    }

    expectChar(reader, ",");
  }
}

/**
 * @param reader - Position at the opening quote.
 * @returns Decoded string.
 */
function readString(reader: IJsonReader): string {
  const text: string = reader.text;
  const parts: Array<string> = [];
  let index: number = reader.index + 1;
  let start: number = index;

  while (index < text.length) {
    const char: string = text.charAt(index);

    if (char === '"') {
      parts.push(text.substring(start, index));
      reader.index = index + 1;

      return parts.join("");
    } else if (char === "\\") {
      parts.push(text.substring(start, index));

      const escaped: string = text.charAt(index + 1);

      if (escaped === "u") {
        parts.push(codePointToString(readHex(text, index + 2)));
        index += 6;
      } else {
        parts.push(readSimpleEscape(escaped, index));
        index += 2;
      }

      start = index;
    } else {
      index += 1;
    }
  }

  return failJson("Invalid JSON: unterminated string at %s.", reader.index + 1);
}

/**
 * @param escaped - Character after a backslash.
 * @param index - Position of the backslash, for the error.
 * @returns Character the escape stands for.
 */
function readSimpleEscape(escaped: string, index: number): string {
  if (escaped === '"' || escaped === "\\" || escaped === "/") {
    return escaped;
  } else if (escaped === "b") {
    return "\b";
  } else if (escaped === "f") {
    return "\f";
  } else if (escaped === "n") {
    return "\n";
  } else if (escaped === "r") {
    return "\r";
  } else if (escaped === "t") {
    return "\t";
  }

  return failJson("Invalid JSON: unknown escape at %s.", index + 1);
}

/**
 * @param text - JSON text.
 * @param index - Position of the first of four hex digits.
 * @returns Number the digits spell.
 */
function readHex(text: string, index: number): number {
  let value: number = 0;

  for (const offset of $range(0, 3)) {
    const digit: number = HEX_DIGITS.indexOf(text.charAt(index + offset).toLowerCase());

    if (digit < 0) {
      failJson("Invalid JSON: bad unicode escape at %s.", index + 1);
    }

    value = value * 16 + digit;
  }

  return value;
}

/**
 * @param code - Unicode code point.
 * @returns The code point as UTF-8 bytes.
 */
function codePointToString(code: number): string {
  if (code < 0x80) {
    return String.fromCharCode(code);
  } else if (code < 0x800) {
    return String.fromCharCode(0xc0 + math.floor(code / 64), 0x80 + (code % 64));
  }

  return String.fromCharCode(0xe0 + math.floor(code / 4096), 0x80 + (math.floor(code / 64) % 64), 0x80 + (code % 64));
}

/**
 * @param reader - Position at the first character of the literal.
 * @param word - Literal expected.
 * @param value - Value the literal stands for.
 * @returns The value.
 */
function readLiteral<T>(reader: IJsonReader, word: string, value: T): T {
  if (reader.text.substring(reader.index, reader.index + word.length) !== word) {
    failJson("Invalid JSON: unexpected text at %s.", reader.index + 1);
  }

  reader.index += word.length;

  return value;
}

/**
 * @param reader - Position at the first character of a number.
 * @returns Decoded number.
 */
function readNumber(reader: IJsonReader): number {
  const start: number = reader.index;

  while (reader.index < reader.text.length) {
    const char: string = reader.text.charAt(reader.index);

    if ("0123456789+-.eE".indexOf(char) < 0) {
      break;
    }

    reader.index += 1;
  }

  const value: Nillable<number> = start === reader.index ? null : tonumber(reader.text.substring(start, reader.index));

  if (value === null || value === undefined) {
    failJson("Invalid JSON: unexpected text at %s.", start + 1);
  }

  return value as number;
}

/**
 * @param reader - Position expected at the character.
 * @param char - Character expected.
 */
function expectChar(reader: IJsonReader, char: string): void {
  if (reader.text.charAt(reader.index) !== char) {
    failJson("Invalid JSON: expected '%s' at %s.", char, reader.index + 1);
  }

  reader.index += 1;
}
