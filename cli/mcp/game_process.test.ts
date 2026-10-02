import * as cp from "node:child_process";

import { describe, expect, it, jest } from "@jest/globals";

import { isGameProcessRunning } from "#/mcp/game_process";
import { Nullable } from "#/utils/types";

jest.mock("node:child_process");

type TExecFileCallback = (error: Nullable<Error>, result?: { stdout: string; stderr: string }) => void;

/**
 * @param result - What `tasklist` prints, or the error it fails with.
 */
function mockTasklist(result: string | Error): void {
  jest.mocked(cp.execFile).mockImplementation(((_file: string, _args: Array<string>, callback: TExecFileCallback) => {
    if (result instanceof Error) {
      callback(result);
    } else {
      callback(null, { stdout: result, stderr: "" });
    }
  }) as unknown as typeof cp.execFile);
}

describe("isGameProcessRunning", () => {
  it("should find a game process by any of its names, whatever the case", async () => {
    mockTasklist('"System","4","Services","0","1,234 K"\r\n"XRENGINE.EXE","28784","Console","1","3,358,468 K"\r\n');

    expect(await isGameProcessRunning(["xrEngine.exe", "Stalker-COP.exe"])).toBe(true);
    expect(cp.execFile).toHaveBeenCalledWith("tasklist", ["/FO", "CSV", "/NH"], expect.any(Function));
    expect(await isGameProcessRunning(["Stalker-COP.exe"])).toBe(false);
  });

  it("should report no game where processes cannot be listed", async () => {
    mockTasklist(new Error("spawn tasklist ENOENT"));

    expect(await isGameProcessRunning(["xrEngine.exe"])).toBe(false);
  });
});
