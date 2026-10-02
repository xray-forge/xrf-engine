import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, describe, expect, it } from "@jest/globals";

import { bankSave, isValidSaveName, listBankedSaves, readBankedSave, restoreSave } from "#/mcp/save_bank";

describe("save bank", () => {
  const directories: Array<string> = [];

  /**
   * @returns Fresh folder.
   */
  function createFolder(): string {
    const directory: string = fs.mkdtempSync(path.join(os.tmpdir(), "xrf-mcp-saves-"));

    directories.push(directory);

    return directory;
  }

  afterEach(() => {
    directories.splice(0).forEach((it) => fs.rmSync(it, { recursive: true, force: true }));
  });

  it("should take names the game console and the bank both accept", () => {
    expect(isValidSaveName("mcp_skadovsk_2")).toBe(true);
    expect(isValidSaveName("nelor - autosave")).toBe(false);
    expect(isValidSaveName("../escape")).toBe(false);
  });

  it("should bank a save with its companion files and bring it back over the game's copy", () => {
    const savedgames: string = createFolder();
    const bank: string = path.join(createFolder(), "saves");

    fs.writeFileSync(path.join(savedgames, "mcp_bar.scop"), "save");
    fs.writeFileSync(path.join(savedgames, "mcp_bar.scopx"), "xrf");

    const banked = bankSave(savedgames, bank, {
      name: "mcp_bar",
      bankedAt: "2026-10-02T00:00:00.000Z",
      level: "zaton",
      gameTime: "09:50 08/03/2012",
      note: "Skadovsk bar",
    });

    expect(banked.files).toEqual(["mcp_bar.scop", "mcp_bar.scopx"]);
    expect(readBankedSave(bank, "mcp_bar")).toEqual(banked);
    expect(listBankedSaves(bank)).toEqual([banked]);

    fs.writeFileSync(path.join(savedgames, "mcp_bar.scop"), "overwritten by the game");

    expect(restoreSave(bank, savedgames, "mcp_bar")).toBe(true);
    expect(fs.readFileSync(path.join(savedgames, "mcp_bar.scop"), "utf8")).toBe("save");
    expect(restoreSave(bank, savedgames, "mcp_missing")).toBe(false);
  });

  it("should refuse to bank a save the game did not write and list an empty bank", () => {
    expect(() =>
      bankSave(createFolder(), createFolder(), { name: "mcp_none", bankedAt: "2026-10-02T00:00:00.000Z" })
    ).toThrow("The game wrote no save 'mcp_none'.");
    expect(listBankedSaves(path.join(createFolder(), "missing"))).toEqual([]);
  });
});
