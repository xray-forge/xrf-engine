import * as fs from "node:fs";
import * as path from "node:path";

import { afterAll, afterEach, describe, expect, it, jest } from "@jest/globals";
import { replaceFunctionMock } from "xray16/testing/utils";

import { build } from "#/build/build";
import { TARGET_GAME_DATA_DIR, TARGET_MOD_PACKAGE_DIR } from "#/globals";
import { packMod } from "#/pack/pack_mod";

jest.mock("#/build/build");

jest.mock("#/globals", () => {
  const nodeFs: typeof import("node:fs") = jest.requireActual("node:fs");
  const nodeOs: typeof import("node:os") = jest.requireActual("node:os");
  const nodePath: typeof import("node:path") = jest.requireActual("node:path");
  const root: string = nodeFs.mkdtempSync(nodePath.join(nodeOs.tmpdir(), "xrf-pack-mod-"));

  return {
    ...jest.requireActual<object>("#/globals"),
    TARGET_GAME_DATA_DIR: nodePath.join(root, "gamedata"),
    TARGET_MOD_PACKAGE_DIR: nodePath.join(root, "package"),
  };
});

describe("packMod", () => {
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

  afterEach(() => {
    fs.rmSync(TARGET_GAME_DATA_DIR, { recursive: true, force: true });
    fs.rmSync(TARGET_MOD_PACKAGE_DIR, { recursive: true, force: true });
  });

  afterAll(() => {
    fs.rmSync(path.dirname(TARGET_GAME_DATA_DIR), { recursive: true, force: true });
  });

  it("should package built gamedata", async () => {
    writeFiles(TARGET_GAME_DATA_DIR, ["scripts/bind_stalker.script"]);

    await packMod({ build: false, skipEngine: true });

    expect(fs.existsSync(path.join(TARGET_MOD_PACKAGE_DIR, "gamedata/scripts/bind_stalker.script"))).toBe(true);
  });

  it("should refuse gamedata holding the game MCP endpoint before packaging anything", async () => {
    writeFiles(TARGET_GAME_DATA_DIR, ["scripts/bind_stalker.script", "extensions/xrf_mcp/main.script"]);

    await expect(packMod({ build: false, skipEngine: true })).rejects.toThrow("Refusing to package dev-only files");
    expect(fs.existsSync(TARGET_MOD_PACKAGE_DIR)).toBe(false);
  });

  it("should refuse a build that emits check flows", async () => {
    replaceFunctionMock(build, async () => writeFiles(TARGET_GAME_DATA_DIR, ["checks/quests/zat_b14_flow.script"]));

    await expect(packMod({ build: true, skipEngine: true })).rejects.toThrow("Refusing to package dev-only files");
    expect(build).toHaveBeenCalledTimes(1);
    expect(fs.existsSync(TARGET_MOD_PACKAGE_DIR)).toBe(false);
  });

  it("should refuse a package kept with a flow launcher from an earlier pack", async () => {
    writeFiles(TARGET_GAME_DATA_DIR, ["scripts/bind_stalker.script"]);
    writeFiles(TARGET_MOD_PACKAGE_DIR, ["gamedata/scripts/flow_quests_zat_b14.script"]);

    await expect(packMod({ build: false, skipEngine: true })).rejects.toThrow(
      `Refusing to package dev-only files in '${path.resolve(TARGET_MOD_PACKAGE_DIR, "gamedata")}'`
    );
  });

  it("should clear files of an earlier pack with clean", async () => {
    writeFiles(TARGET_GAME_DATA_DIR, ["scripts/bind_stalker.script"]);
    writeFiles(TARGET_MOD_PACKAGE_DIR, ["gamedata/scripts/flow_quests_zat_b14.script"]);

    await packMod({ build: false, clean: true, skipEngine: true });

    expect(fs.existsSync(path.join(TARGET_MOD_PACKAGE_DIR, "gamedata/scripts/flow_quests_zat_b14.script"))).toBe(false);
  });
});
