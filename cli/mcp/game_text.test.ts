import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, describe, expect, it } from "@jest/globals";

import { decodeGameText, DEFAULT_GAME_TEXT_ENCODING, encodeGameText, resolveGameTextEncoding } from "#/mcp/game_text";
import { MCP_USER_CONFIG } from "#/mcp/mcp_user_config";

describe("game text", () => {
  const directories: Array<string> = [];

  /**
   * @param files - Files to create, by path relative to the folder.
   * @returns Fresh folder holding the files.
   */
  function createFolder(files: Record<string, string>): string {
    const directory: string = fs.mkdtempSync(path.join(os.tmpdir(), "xrf-mcp-text-"));

    directories.push(directory);

    for (const [file, content] of Object.entries(files)) {
      fs.mkdirSync(path.dirname(path.join(directory, file)), { recursive: true });
      fs.writeFileSync(path.join(directory, file), content, "latin1");
    }

    return directory;
  }

  afterEach(() => {
    directories.splice(0).forEach((it) => fs.rmSync(it, { recursive: true, force: true }));
  });

  it("should resolve the encoding the string tables of the game language declare", async () => {
    const appdata: string = createFolder({
      "user.ltx": "g_language eng\r\n",
      [MCP_USER_CONFIG]: "bind jump kSPACE\r\ng_language rus\r\ng_language_ltx ukr\r\n",
    });
    const gamedata: string = createFolder({
      "configs/text/eng/st_game.xml": '<?xml version="1.0" encoding="windows-1252" ?>\n<string_table/>',
      "configs/text/rus/st_game.xml": '<?xml version="1.0" encoding="windows-1251" ?>\n<string_table/>',
    });

    expect(await resolveGameTextEncoding(appdata, gamedata)).toBe("windows-1251");

    fs.rmSync(path.join(appdata, MCP_USER_CONFIG));

    expect(await resolveGameTextEncoding(appdata, gamedata)).toBe("windows-1252");
  });

  it("should fall back to the default encoding when the settings or string tables do not say", async () => {
    const gamedata: string = createFolder({
      "configs/text/rus/st_game.xml": "<string_table/>",
      "configs/text/ger/st_game.xml": '<?xml version="1.0" encoding="no-such-encoding" ?>',
    });

    expect(await resolveGameTextEncoding(createFolder({}), gamedata)).toBe(DEFAULT_GAME_TEXT_ENCODING);
    expect(await resolveGameTextEncoding(createFolder({ "user.ltx": "bind jump kSPACE\r\n" }), gamedata)).toBe(
      DEFAULT_GAME_TEXT_ENCODING
    );
    expect(await resolveGameTextEncoding(createFolder({ "user.ltx": "g_language ukr\r\n" }), gamedata)).toBe(
      DEFAULT_GAME_TEXT_ENCODING
    );
    expect(await resolveGameTextEncoding(createFolder({ "user.ltx": "g_language rus\r\n" }), gamedata)).toBe(
      DEFAULT_GAME_TEXT_ENCODING
    );
    expect(await resolveGameTextEncoding(createFolder({ "user.ltx": "g_language ger\r\n" }), gamedata)).toBe(
      DEFAULT_GAME_TEXT_ENCODING
    );
  });

  it("should decode UTF-8 as UTF-8 and other text in the game encoding", () => {
    expect(decodeGameText(Buffer.from("сталкер — ok", "utf8"), "windows-1251")).toBe("сталкер — ok");
    expect(decodeGameText(Buffer.from([0xc0, 0xe2, 0xe3, 0xf3, 0xf1, 0xf2, 0xe0]), "windows-1251")).toBe("Августа");
    expect(decodeGameText(Buffer.from([0x63, 0x61, 0x66, 0xe9]), "windows-1252")).toBe("café");
  });

  it("should encode text in the game encoding, with characters it lacks as UTF-8", () => {
    expect(encodeGameText('{"code":"1"}', "windows-1251")).toEqual(Buffer.from('{"code":"1"}'));
    expect(encodeGameText("Август — 😀", "windows-1251")).toEqual(
      Buffer.concat([Buffer.from([0xc0, 0xe2, 0xe3, 0xf3, 0xf1, 0xf2, 0x20, 0x97, 0x20]), Buffer.from("😀", "utf8")])
    );
    expect(encodeGameText("café", "windows-1252")).toEqual(Buffer.from([0x63, 0x61, 0x66, 0xe9]));
    expect(encodeGameText("Август", "utf-8")).toEqual(Buffer.from("Август", "utf8"));
    expect(decodeGameText(encodeGameText("Выброс: найти укрытие", "windows-1251"), "windows-1251")).toBe(
      "Выброс: найти укрытие"
    );
  });
});
