import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";

import { findCrashLines, IGameCrash, keepGameCrash } from "#/mcp/game_crash";
import { Nullable } from "#/utils/types";

describe("game crash", () => {
  let directory: string;
  let logs: string;
  let reports: string;
  let crashes: string;

  beforeEach(() => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), "xrf-mcp-crash-"));
    logs = path.join(directory, "logs");
    reports = path.join(directory, "reports");
    crashes = path.join(directory, "crashes");

    fs.mkdirSync(logs);
    fs.mkdirSync(reports);
  });

  afterEach(() => {
    fs.rmSync(directory, { recursive: true, force: true });
  });

  /**
   * Write a file and set when it was last written.
   */
  function writeFile(file: string, content: string, writtenAt: Date): string {
    fs.writeFileSync(file, content);
    fs.utimesSync(file, writtenAt, writtenAt);

    return file;
  }

  it("should find the lines from the last fatal error on", () => {
    expect(findCrashLines(["a", "FATAL ERROR", "first", "FATAL ERROR", "second"])).toEqual(["FATAL ERROR", "second"]);
    expect(findCrashLines(["a", "b"])).toBeNull();
  });

  it("should keep a crashed run's logs once and name the reports written around its end", () => {
    // The run ends after its engine log is created, as it does in the game.
    const writtenAt: Date = new Date(Math.ceil(Date.now() / 1_000) * 1_000 + 60_000);
    const lines: Array<string> = ["Loading...", "FATAL ERROR", "[error] Expression : !this->solution().empty()"];
    const engineLog: string = writeFile(path.join(logs, "openxray_test.log"), lines.join("\n"), writtenAt);

    writeFile(path.join(logs, "xrf_lua.log"), "lua", writtenAt);
    writeFile(path.join(logs, "xrf_profiling.log"), "an earlier run", new Date(writtenAt.getTime() - 86_400_000));
    writeFile(path.join(logs, "openxray_test.bkp"), "older run", writtenAt);

    const report: string = writeFile(path.join(reports, "report_crash.zip"), "", new Date(writtenAt.getTime() + 2_000));

    writeFile(path.join(reports, "report_older.zip"), "", new Date(writtenAt.getTime() - 3_600_000));

    const crash: Nullable<IGameCrash> = keepGameCrash(engineLog, lines, logs, reports, crashes);

    expect(crash).toEqual({
      directory: path.join(crashes, writtenAt.toISOString().slice(0, 19).replace(/:/g, "-")),
      reports: [report],
    });
    expect(fs.readdirSync(crash!.directory).sort()).toEqual(["crash.txt", "openxray_test.log", "xrf_lua.log"]);
    expect(fs.readFileSync(path.join(crash!.directory, "crash.txt"), "utf8")).toBe(
      `Engine log last written ${writtenAt.toISOString()}.\n` +
        `BugTrap reports:\n- ${report}\n\n` +
        "FATAL ERROR\n[error] Expression : !this->solution().empty()\n"
    );

    expect(keepGameCrash(engineLog, lines, logs, reports, crashes)).toBeNull();
  });

  it("should keep nothing for a run that did not crash", () => {
    const engineLog: string = writeFile(path.join(logs, "openxray_test.log"), "Loading...", new Date());

    expect(keepGameCrash(engineLog, ["Loading..."], logs, reports, crashes)).toBeNull();
    expect(fs.existsSync(crashes)).toBe(false);
  });
});
