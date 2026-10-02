import * as cp from "node:child_process";
import * as path from "node:path";

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { replaceFunctionMock } from "xray16/testing/utils";

import { prepareMcpUserConfig } from "#/mcp/mcp_user_config";
import { EGameDifficulty, startGame } from "#/start/start_game";
import { exists } from "#/utils/fs/exists";
import { getGamePaths } from "#/utils/fs/get_game_paths";

jest.mock("node:child_process");
jest.mock("#/mcp/mcp_user_config", () => ({ MCP_USER_CONFIG: "user_mcp.ltx", prepareMcpUserConfig: jest.fn() }));
jest.mock("#/utils/fs/exists");
jest.mock("#/utils/fs/get_game_paths");

describe("startGame", () => {
  beforeEach(() => {
    jest.resetAllMocks();

    replaceFunctionMock(getGamePaths, async () => ({
      app: "app-path",
      appdata: "appdata-path",
      bin: "bin-path",
      root: "root-path",
      savedgames: "savedgames-path",
    }));
    replaceFunctionMock(exists, async () => true);
    replaceFunctionMock(cp.spawn, () => ({ once: jest.fn(), unref: jest.fn() }));
  });

  it("should start game executable without world start by default", async () => {
    await startGame();

    expect(cp.spawn).toHaveBeenCalledWith(path.join("bin-path", "xrEngine.exe"), ["-dump_bindings"], {
      cwd: "root-path",
      detached: true,
      stdio: "ignore",
    });
  });

  it("should fallback to configured app when engine executable does not exist", async () => {
    replaceFunctionMock(exists, async () => false);

    await startGame();

    expect(cp.spawn).toHaveBeenCalledWith("app-path", ["-dump_bindings"], expect.anything());
  });

  it("should start game executable with log flushing when requested", async () => {
    await startGame({ flushlog: true });

    expect(cp.spawn).toHaveBeenCalledWith(expect.any(String), ["-dump_bindings", "-force_flushlog"], expect.anything());
  });

  it("should start new game world", async () => {
    await startGame({ new: true });

    expect(cp.spawn).toHaveBeenCalledWith(
      expect.any(String),
      ["-dump_bindings", "-start", "server(all/single/alife/new)", "client(localhost)"],
      expect.anything()
    );
  });

  it("should start to the main menu without the logo video", async () => {
    await startGame({ intro: false });

    expect(cp.spawn).toHaveBeenCalledWith(expect.any(String), ["-dump_bindings", "-nointro"], expect.anything());
  });

  it("should start new game world with difficulty and without intro", async () => {
    await startGame({ difficulty: EGameDifficulty.MASTER, intro: false, new: true });

    expect(cp.spawn).toHaveBeenCalledWith(
      expect.any(String),
      [
        "-dump_bindings",
        "-nointro",
        "-$g_game_difficulty",
        "gd_master",
        "-start",
        "server(all/single/alife/new)",
        "client(localhost)",
      ],
      expect.anything()
    );
  });

  it("should start game world from provided save", async () => {
    await startGame({ load: "test_save" });

    expect(exists).toHaveBeenCalledWith(path.join("savedgames-path", "test_save.scop"));
    expect(cp.spawn).toHaveBeenCalledWith(
      expect.any(String),
      ["-dump_bindings", "-start", "server(test_save/single/alife/load)", "client(localhost)"],
      expect.anything()
    );
  });

  it("should fail when provided save does not exist", async () => {
    replaceFunctionMock(exists, async (target: unknown) => target !== path.join("savedgames-path", "test_save.scop"));

    await expect(startGame({ load: "test_save", mcp: true })).rejects.toThrow();
    expect(cp.spawn).not.toHaveBeenCalled();
    expect(prepareMcpUserConfig).not.toHaveBeenCalled();
  });

  it("should arm the game MCP endpoint with its own settings ahead of the world start", async () => {
    await startGame({ mcp: true, new: true, flushlog: true });

    expect(prepareMcpUserConfig).toHaveBeenCalledWith("appdata-path");
    expect(cp.spawn).toHaveBeenCalledWith(
      expect.any(String),
      [
        "-dump_bindings",
        "-force_flushlog",
        "-xrf_mcp",
        "-ltx",
        "user_mcp.ltx",
        "-start",
        "server(all/single/alife/new)",
        "client(localhost)",
      ],
      expect.anything()
    );
  });

  it("should fail when new game and save load are mixed", async () => {
    await expect(startGame({ load: "test_save", new: true })).rejects.toThrow();
    expect(cp.spawn).not.toHaveBeenCalled();
  });
});
