import * as fs from "node:fs/promises";
import * as path from "node:path";

import { MCP_USER_CONFIG } from "#/mcp/mcp_user_config";
import { exists } from "#/utils/fs/exists";
import { Optional } from "#/utils/types";

/**
 * Encoding of game text when the settings or string tables do not say, as most game languages use.
 */
export const DEFAULT_GAME_TEXT_ENCODING: string = "windows-1252";

const UTF8_DECODER: TextDecoder = new TextDecoder("utf-8", { fatal: true });

/**
 * Resolve the encoding of text the game shows and logs: string tables hold bytes in the encoding they declare, and the
 * engine passes them on unchanged.
 *
 * @param appdata - Game app data folder, holding the settings an MCP launch plays with.
 * @param gamedata - Game data folder, holding `configs/text/<language>/`.
 * @returns Encoding the string tables of the game language declare, the default one when they cannot be read.
 */
export async function resolveGameTextEncoding(appdata: string, gamedata: string): Promise<string> {
  const mcpSettings: string = path.join(appdata, MCP_USER_CONFIG);
  const settings: string = (await exists(mcpSettings)) ? mcpSettings : path.join(appdata, "user.ltx");

  if (!(await exists(settings))) {
    return DEFAULT_GAME_TEXT_ENCODING;
  }

  const language: Optional<string> = /^\s*g_language\s+(\S+)/m.exec(await fs.readFile(settings, "latin1"))?.[1];
  const textDir: string = path.join(gamedata, "configs", "text", language ?? "");

  if (!language || !(await exists(textDir))) {
    return DEFAULT_GAME_TEXT_ENCODING;
  }

  const table: Optional<string> = (await fs.readdir(textDir)).find((it) => it.endsWith(".xml"));

  if (!table) {
    return DEFAULT_GAME_TEXT_ENCODING;
  }

  const declaration: string = (await fs.readFile(path.join(textDir, table), "latin1")).slice(0, 200);
  const encoding: Optional<string> = /encoding="([^"]+)"/.exec(declaration)?.[1];

  try {
    return encoding ? new TextDecoder(encoding).encoding : DEFAULT_GAME_TEXT_ENCODING;
  } catch {
    return DEFAULT_GAME_TEXT_ENCODING;
  }
}

/**
 * Decode game text: as UTF-8 when it is valid UTF-8, as Lua string literals are, in the game encoding otherwise.
 *
 * @param bytes - Text as the game wrote it.
 * @param encoding - Game text encoding.
 * @returns Decoded text.
 */
export function decodeGameText(bytes: Uint8Array, encoding: string): string {
  try {
    return UTF8_DECODER.decode(bytes);
  } catch {
    return getDecoder(encoding).decode(bytes);
  }
}

/**
 * Encode text for the game in its encoding, so strings it compares or shows match its own; a character the encoding
 * lacks goes as UTF-8.
 *
 * @param text - Text to send.
 * @param encoding - Game text encoding, a single byte one.
 * @returns Bytes to send.
 */
export function encodeGameText(text: string, encoding: string): Buffer {
  const utf8: Buffer = Buffer.from(text, "utf8");

  // A byte per character means ASCII, which every game encoding writes the same.
  if (encoding === "utf-8" || utf8.length === text.length) {
    return utf8;
  }

  const bytesByCharacter: Map<string, number> = getEncodingBytes(encoding);
  const output: Array<number> = [];

  for (const character of text) {
    const byte: Optional<number> =
      (character.codePointAt(0) as number) < 0x80 ? character.codePointAt(0) : bytesByCharacter.get(character);

    if (byte === undefined) {
      output.push(...Buffer.from(character, "utf8"));
    } else {
      output.push(byte);
    }
  }

  return Buffer.from(output);
}

const DECODERS: Map<string, TextDecoder> = new Map();
const ENCODING_BYTES: Map<string, Map<string, number>> = new Map();

/**
 * @param encoding - Game text encoding.
 * @returns Decoder of the encoding, made once.
 */
function getDecoder(encoding: string): TextDecoder {
  let decoder: Optional<TextDecoder> = DECODERS.get(encoding);

  if (!decoder) {
    decoder = new TextDecoder(encoding);
    DECODERS.set(encoding, decoder);
  }

  return decoder;
}

/**
 * @param encoding - Single byte encoding.
 * @returns Byte of every character above ASCII the encoding holds, read off its decoder.
 */
function getEncodingBytes(encoding: string): Map<string, number> {
  let bytes: Optional<Map<string, number>> = ENCODING_BYTES.get(encoding);

  if (!bytes) {
    bytes = new Map();

    for (let byte: number = 0x80; byte <= 0xff; byte++) {
      const character: string = getDecoder(encoding).decode(Uint8Array.of(byte));

      if (character !== "�") {
        bytes.set(character, byte);
      }
    }

    ENCODING_BYTES.set(encoding, bytes);
  }

  return bytes;
}
