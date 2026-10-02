import { describe, expect, it } from "@jest/globals";

import { describeGameErrors, findGameErrors } from "#/mcp/game_log_errors";

describe("game log errors", () => {
  it("should group problems that differ only in numbers, leaving out warnings every launch writes", () => {
    const errors = findGameErrors([
      "Starting engine...",
      "! Unable to find Software\\GSC Game World\\STALKER-COP\\ in registry",
      "[LUA]  [186762][ReleaseBodyManager][info] Register corpse object: bandit, 6/15",
      "! SV:ge_destroy: [11222] not found on server",
      "! SV:ge_destroy: [13421] not found on server",
      "[LUA]  [5332][SurgeManager][error] Cannot find cover: zat_cover",
      "! [LUA]  SCRIPT RUNTIME ERROR",
      "! [LUA]   0 : [C  ] kill",
      "! [LUA]   1 : [Lua] ...surge_kill.script(124) : killAllSurgeUnhidden(68)",
    ]);

    expect(errors.fatal).toBeNull();
    expect(errors.groups).toEqual([
      {
        message: "! SV:ge_destroy: [#] not found on server",
        count: 2,
        firstLine: 4,
        example: "! SV:ge_destroy: [11222] not found on server",
      },
      {
        message: "[SurgeManager][error] Cannot find cover: zat_cover",
        count: 1,
        firstLine: 6,
        example: "[LUA]  [5332][SurgeManager][error] Cannot find cover: zat_cover",
      },
      { message: "! [LUA]  SCRIPT RUNTIME ERROR", count: 1, firstLine: 7, example: "! [LUA]  SCRIPT RUNTIME ERROR" },
    ]);
  });

  it("should keep the last fatal error and report an all-clear log", () => {
    const errors = findGameErrors(["Loading...", "FATAL ERROR", " ", "[error] Description   : Broken spawn"]);

    expect(errors.fatal).toBe("FATAL ERROR\n \n[error] Description   : Broken spawn");
    expect(describeGameErrors("engine log", errors)).toBe(
      "engine log: 0 problem lines in 0 kinds.\nFatal error:\nFATAL ERROR\n \n[error] Description   : Broken spawn"
    );
    expect(describeGameErrors("lua log", findGameErrors(["all fine"]))).toBe("lua log: no errors or warnings.");
  });
});
