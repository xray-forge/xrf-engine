import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, describe, expect, it } from "@jest/globals";

import { assertNoDevOnlyArtifacts, findDevOnlyArtifacts } from "#/pack/pack_guard";

describe("pack guard", () => {
  const directories: Array<string> = [];

  /**
   * @param files - Files to create, relative to the gamedata tree.
   * @returns Fresh gamedata tree holding the files.
   */
  function createGamedata(files: Array<string>): string {
    const directory: string = fs.mkdtempSync(path.join(os.tmpdir(), "xrf-pack-guard-"));

    directories.push(directory);

    for (const file of files) {
      fs.mkdirSync(path.dirname(path.join(directory, file)), { recursive: true });
      fs.writeFileSync(path.join(directory, file), "");
    }

    return directory;
  }

  afterEach(() => {
    directories.splice(0).forEach((it) => fs.rmSync(it, { recursive: true, force: true }));
  });

  it("should pass a release gamedata tree", () => {
    const gamedata: string = createGamedata([
      "xray_bundle.script",
      "scripts/bind_stalker.script",
      "core/managers/surge/SurgeManager.script",
      "extensions/new_game_loadout/main.script",
    ]);

    expect(findDevOnlyArtifacts(gamedata)).toEqual([]);
    expect(() => assertNoDevOnlyArtifacts(gamedata)).not.toThrow();
  });

  it("should pass a missing gamedata tree", () => {
    expect(findDevOnlyArtifacts(path.join(os.tmpdir(), "xrf-pack-guard-missing"))).toEqual([]);
  });

  it("should find check flows, their launchers and the game MCP endpoint", () => {
    const gamedata: string = createGamedata([
      "checks/quests/zat_b14_flow.script",
      "checks/mcp/McpEndpoint.script",
      "extensions/xrf_mcp/main.script",
      "scripts/flow_quests_zat_b14.script",
      "scripts/bind_stalker.script",
    ]);

    expect(findDevOnlyArtifacts(gamedata)).toEqual([
      "checks",
      path.join("extensions", "xrf_mcp"),
      path.join("scripts", "flow_quests_zat_b14.script"),
    ]);
  });

  it("should find the endpoint extension left without the checks output", () => {
    const gamedata: string = createGamedata(["extensions/xrf_mcp/check.script"]);

    expect(findDevOnlyArtifacts(gamedata)).toEqual([path.join("extensions", "xrf_mcp")]);
  });

  it("should refuse a tree holding dev-only files, naming each of them", () => {
    const gamedata: string = createGamedata(["checks/mcp/McpEndpoint.script", "scripts/flow_surge.script"]);

    expect(() => assertNoDevOnlyArtifacts(gamedata)).toThrow(
      `Refusing to package dev-only files in '${gamedata}': checks, ${path.join("scripts", "flow_surge.script")}.`
    );
  });
});
