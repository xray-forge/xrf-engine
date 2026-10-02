import * as cp from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, describe, expect, it, jest } from "@jest/globals";

import { moveScreenshot, scaleScreenshot } from "#/mcp/game_screenshot";
import { Nullable } from "#/utils/types";

jest.mock("node:child_process");

type TExecFileCallback = (error: Nullable<Error>, result?: { stdout: string; stderr: string }) => void;

describe("game screenshots", () => {
  const directories: Array<string> = [];

  /**
   * @returns Fresh folder.
   */
  function createFolder(): string {
    const directory: string = fs.mkdtempSync(path.join(os.tmpdir(), "xrf-mcp-screenshot-"));

    directories.push(directory);

    return directory;
  }

  afterEach(() => {
    directories.splice(0).forEach((it) => fs.rmSync(it, { recursive: true, force: true }));
  });

  it("should move a screenshot out of the game folder into the agent folder", () => {
    const file: string = path.join(createFolder(), "ss_test_(zaton).jpg");
    const target: string = path.join(createFolder(), "mcp", "screenshots");

    fs.writeFileSync(file, Buffer.from([0xff, 0xd8]));

    const kept: string = moveScreenshot(file, target);

    expect(kept).toBe(path.join(target, "ss_test_(zaton).jpg"));
    expect(fs.readFileSync(kept)).toEqual(Buffer.from([0xff, 0xd8]));
    expect(fs.existsSync(file)).toBe(false);
  });

  it("should return the scaled picture Windows imaging wrote, passing paths and width through the environment", async () => {
    const file: string = path.join(createFolder(), "ss.jpg");

    fs.writeFileSync(file, Buffer.from([1]));
    jest.mocked(cp.execFile).mockImplementation(((
      _file: string,
      _args: Array<string>,
      options: { env: Record<string, string> },
      callback: TExecFileCallback
    ) => {
      fs.writeFileSync(options.env.XRF_SHOT_TARGET, Buffer.from([2]));
      callback(null, { stdout: "", stderr: "" });
    }) as unknown as typeof cp.execFile);

    expect(await scaleScreenshot(file, 1600)).toEqual(Buffer.from([2]));

    const [command, args, options] = jest.mocked(cp.execFile).mock.calls[0] as unknown as [
      string,
      Array<string>,
      { env: Record<string, string> },
    ];

    expect(command).toBe("powershell.exe");
    expect(args.slice(0, 3)).toEqual(["-NoProfile", "-NonInteractive", "-Command"]);
    expect(options.env).toMatchObject({ XRF_SHOT_SOURCE: file, XRF_SHOT_WIDTH: "1600" });
    expect(fs.existsSync(options.env.XRF_SHOT_TARGET)).toBe(false);
  });

  it("should return the picture unscaled where Windows imaging is unavailable", async () => {
    const file: string = path.join(createFolder(), "ss.jpg");

    fs.writeFileSync(file, Buffer.from([1]));
    jest
      .mocked(cp.execFile)
      .mockImplementation(((_file: string, _args: Array<string>, _options: unknown, callback: TExecFileCallback) =>
        callback(new Error("spawn powershell.exe ENOENT"))) as unknown as typeof cp.execFile);

    expect(await scaleScreenshot(file, 1600)).toEqual(Buffer.from([1]));
  });
});
