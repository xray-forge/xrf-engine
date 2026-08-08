import * as path from "node:path";

import { describe, expect, it } from "@jest/globals";

import { GAME_DATA_LTX_CONFIGS_DIR } from "#/globals";
import { filterStagedLtxPaths } from "#/hooks/filter_staged_ltx_paths";

describe("filterStagedLtxPaths", () => {
  it("should keep ltx files inside the configs folder", () => {
    const first: string = path.join(GAME_DATA_LTX_CONFIGS_DIR, "system.ltx");
    const second: string = path.join(GAME_DATA_LTX_CONFIGS_DIR, "misc", "items", "outfit.ltx");

    expect(filterStagedLtxPaths([first, second], GAME_DATA_LTX_CONFIGS_DIR)).toEqual([first, second]);
  });

  it("should drop ltx files outside the configs folder", () => {
    const fixture: string = path.resolve(
      GAME_DATA_LTX_CONFIGS_DIR,
      "../core/objects/smart_terrain/job/__test__/job_create.default.ltx"
    );
    const compress: string = path.resolve(GAME_DATA_LTX_CONFIGS_DIR, "../../../cli/compress/configs/fsgame.ltx");

    expect(filterStagedLtxPaths([fixture, compress], GAME_DATA_LTX_CONFIGS_DIR)).toEqual([]);
  });

  it("should drop files that are not ltx", () => {
    const ini: string = path.join(GAME_DATA_LTX_CONFIGS_DIR, "system.ini");
    const script: string = path.join(GAME_DATA_LTX_CONFIGS_DIR, "system.ts");

    expect(filterStagedLtxPaths([ini, script], GAME_DATA_LTX_CONFIGS_DIR)).toEqual([]);
  });

  it("should handle uppercase ltx extension", () => {
    const upper: string = path.join(GAME_DATA_LTX_CONFIGS_DIR, "System.LTX");

    expect(filterStagedLtxPaths([upper], GAME_DATA_LTX_CONFIGS_DIR)).toEqual([upper]);
  });

  it("should handle relative paths", () => {
    const relative: string = path.relative(process.cwd(), path.join(GAME_DATA_LTX_CONFIGS_DIR, "system.ltx"));

    expect(filterStagedLtxPaths([relative], GAME_DATA_LTX_CONFIGS_DIR)).toEqual([relative]);
  });

  it("should drop the configs folder itself", () => {
    expect(filterStagedLtxPaths([GAME_DATA_LTX_CONFIGS_DIR], GAME_DATA_LTX_CONFIGS_DIR)).toEqual([]);
  });

  it("should return empty list for empty input", () => {
    expect(filterStagedLtxPaths([], GAME_DATA_LTX_CONFIGS_DIR)).toEqual([]);
  });
});
