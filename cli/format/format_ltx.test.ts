import * as cp from "node:child_process";

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { replaceFunctionMock } from "xray16/testing/utils";

import { formatLtx } from "#/format/format_ltx";
import { GAME_DATA_LTX_CONFIGS_DIR, XRF_UTILS_PATH } from "#/globals";

jest.mock("node:child_process");

describe("formatLtx", () => {
  beforeEach(() => {
    jest.resetAllMocks();

    replaceFunctionMock(cp.execFileSync, () => Buffer.from(""));
  });

  it("should format whole configs folder when no paths provided", async () => {
    await formatLtx();

    expect(cp.execFileSync).toHaveBeenCalledWith(XRF_UTILS_PATH, ["ltx", "format", "-p", GAME_DATA_LTX_CONFIGS_DIR], {
      stdio: "inherit",
    });
  });

  it("should format only provided paths", async () => {
    await formatLtx({ paths: ["first.ltx", "second.ltx"] });

    expect(cp.execFileSync).toHaveBeenCalledWith(XRF_UTILS_PATH, ["ltx", "format", "-p", "first.ltx", "second.ltx"], {
      stdio: "inherit",
    });
  });

  it("should not run formatter when provided paths list is empty", async () => {
    await formatLtx({ paths: [] });

    expect(cp.execFileSync).not.toHaveBeenCalled();
  });

  it("should run formatter in check mode", async () => {
    await formatLtx({ check: true });

    expect(cp.execFileSync).toHaveBeenCalledWith(
      XRF_UTILS_PATH,
      ["ltx", "format", "-p", GAME_DATA_LTX_CONFIGS_DIR, "-c"],
      { stdio: "inherit" }
    );
  });

  it("should run formatter in verbose mode", async () => {
    await formatLtx({ paths: ["first.ltx"], verbose: true });

    expect(cp.execFileSync).toHaveBeenCalledWith(XRF_UTILS_PATH, ["ltx", "format", "-p", "first.ltx", "-v"], {
      stdio: "inherit",
    });
  });

  it("should throw when formatter fails", async () => {
    replaceFunctionMock(cp.execFileSync, () => {
      throw new Error("Format failed");
    });

    await expect(formatLtx({ paths: ["first.ltx"] })).rejects.toThrow("Format failed");
  });
});
