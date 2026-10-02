import * as fs from "node:fs";
import * as path from "node:path";

import { afterAll, afterEach, beforeAll, describe, expect, it, jest } from "@jest/globals";
import { replaceFunctionMock } from "xray16/testing/utils";

import { build } from "#/build/build";
import { compress } from "#/compress/compress";
import { isValidEngine } from "#/engine/list_engines";
import { OPEN_XRAY_ENGINES_DIR, TARGET_GAME_DATA_DIR, TARGET_GAME_PACKAGE_DIR } from "#/globals";
import { packGame } from "#/pack/pack_game";

jest.mock("#/build/build");
jest.mock("#/compress/compress");
jest.mock("#/engine/list_engines");

jest.mock("#/globals", () => {
  const nodeFs: typeof import("node:fs") = jest.requireActual("node:fs");
  const nodeOs: typeof import("node:os") = jest.requireActual("node:os");
  const nodePath: typeof import("node:path") = jest.requireActual("node:path");
  const root: string = nodeFs.mkdtempSync(nodePath.join(nodeOs.tmpdir(), "xrf-pack-game-"));

  return {
    ...jest.requireActual<object>("#/globals"),
    OPEN_XRAY_ENGINES_DIR: nodePath.join(root, "engines"),
    TARGET_GAME_DATA_DIR: nodePath.join(root, "gamedata"),
    TARGET_GAME_PACKAGE_DIR: nodePath.join(root, "package"),
  };
});

describe("packGame", () => {
  /**
   * @param directory - Root to create the files under.
   * @param files - Files to create, relative to it.
   */
  function writeFiles(directory: string, files: Array<string>): void {
    for (const file of files) {
      fs.mkdirSync(path.dirname(path.join(directory, file)), { recursive: true });
      fs.writeFileSync(path.join(directory, file), "");
    }
  }

  beforeAll(() => {
    replaceFunctionMock(isValidEngine, () => true);
    writeFiles(OPEN_XRAY_ENGINES_DIR, ["test/bin/xrEngine.exe"]);
  });

  afterEach(() => {
    fs.rmSync(TARGET_GAME_DATA_DIR, { recursive: true, force: true });
    fs.rmSync(TARGET_GAME_PACKAGE_DIR, { recursive: true, force: true });
  });

  afterAll(() => {
    fs.rmSync(path.dirname(TARGET_GAME_DATA_DIR), { recursive: true, force: true });
  });

  it("should refuse a build that emits the game MCP endpoint before compressing it", async () => {
    replaceFunctionMock(build, async () => writeFiles(TARGET_GAME_DATA_DIR, ["extensions/xrf_mcp/main.script"]));

    await expect(packGame({ build: true, compress: true, engine: "test", skipEngine: false })).rejects.toThrow(
      "Refusing to package dev-only files"
    );
    expect(build).toHaveBeenCalledTimes(1);
    expect(compress).not.toHaveBeenCalled();
    expect(fs.existsSync(TARGET_GAME_PACKAGE_DIR)).toBe(false);
  });

  it("should refuse built gamedata holding a flow launcher before packaging anything", async () => {
    writeFiles(TARGET_GAME_DATA_DIR, ["scripts/bind_stalker.script", "scripts/flow_quests_zat_b14.script"]);

    await expect(packGame({ build: false, compress: false, engine: "test", skipEngine: false })).rejects.toThrow(
      "Refusing to package dev-only files"
    );
    expect(fs.existsSync(TARGET_GAME_PACKAGE_DIR)).toBe(false);
  });

  it("should refuse a package kept with check flows from an earlier pack", async () => {
    writeFiles(TARGET_GAME_DATA_DIR, ["scripts/bind_stalker.script"]);
    writeFiles(TARGET_GAME_PACKAGE_DIR, ["gamedata/checks/quests/zat_b14_flow.script"]);

    await expect(packGame({ build: false, compress: false, engine: "test", skipEngine: false })).rejects.toThrow(
      `Refusing to package dev-only files in '${path.resolve(TARGET_GAME_PACKAGE_DIR, "gamedata")}': checks.`
    );
  });
});
