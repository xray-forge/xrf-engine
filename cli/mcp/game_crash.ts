import * as fs from "node:fs";
import * as path from "node:path";

import { Nullable } from "#/utils/types";

// Lines kept from a fatal error on, which hold its expression, location and description.
const CRASH_LINES: number = 20;
// BugTrap writes its reports moments after the log's last line, and a full memory dump can take minutes.
const REPORT_WINDOW_BEFORE_MS: number = 60_000;
const REPORT_WINDOW_AFTER_MS: number = 300_000;

/**
 * Crash a run left behind, kept before the next run overwrites its logs.
 */
export interface IGameCrash {
  directory: string;
  reports: Array<string>;
}

/**
 * @param lines - Engine log lines, oldest first.
 * @returns Lines from the last fatal error on, or null when the log holds none.
 */
export function findCrashLines(lines: Array<string>): Nullable<Array<string>> {
  const fatalAt: number = lines.findLastIndex((line) => line.includes("FATAL ERROR"));

  return fatalAt >= 0 ? lines.slice(fatalAt, fatalAt + CRASH_LINES) : null;
}

/**
 * @param directory - Folder to list.
 * @param extension - File extension to keep.
 * @returns Paths of the folder's files with that extension, none when it does not exist.
 */
function listFiles(directory: string, extension: string): Array<string> {
  if (!fs.existsSync(directory)) {
    return [];
  }

  return fs
    .readdirSync(directory)
    .filter((file) => file.endsWith(extension))
    .map((file) => path.join(directory, file));
}

/**
 * Copy the logs of a run that ended in a fatal error and note its BugTrap reports, as the next run overwrites the logs.
 * The reports stay where BugTrap wrote them, as they persist and their memory dumps run to hundreds of megabytes.
 *
 * @param engineLog - Engine log of the run.
 * @param lines - Last lines of that log, decoded.
 * @param logsDirectory - Folder holding the run's logs.
 * @param reportsDirectory - Folder BugTrap writes its reports to.
 * @param crashesDirectory - Folder to keep crashes in, one folder each, named by when the log was last written.
 * @returns The kept crash, or null when the run did not crash or is kept already.
 */
export function keepGameCrash(
  engineLog: string,
  lines: Array<string>,
  logsDirectory: string,
  reportsDirectory: string,
  crashesDirectory: string
): Nullable<IGameCrash> {
  const crashLines: Nullable<Array<string>> = findCrashLines(lines);

  if (!crashLines) {
    return null;
  }

  const { birthtime: startedAt, mtime: writtenAt } = fs.statSync(engineLog);
  const directory: string = path.join(crashesDirectory, writtenAt.toISOString().slice(0, 19).replace(/:/g, "-"));

  if (fs.existsSync(directory)) {
    return null;
  }

  fs.mkdirSync(directory, { recursive: true });

  // The engine creates its log anew each run while the Lua logs are only truncated, so the run's logs are the ones
  // written since the engine log was created.
  const runLogs: Array<string> = listFiles(logsDirectory, ".log").filter((log) => fs.statSync(log).mtime >= startedAt);

  for (const log of new Set([engineLog, ...runLogs])) {
    fs.copyFileSync(log, path.join(directory, path.basename(log)));
  }

  const reports: Array<string> = listFiles(reportsDirectory, ".zip").filter((report) => {
    const offset: number = fs.statSync(report).mtime.getTime() - writtenAt.getTime();

    return offset >= -REPORT_WINDOW_BEFORE_MS && offset <= REPORT_WINDOW_AFTER_MS;
  });

  fs.writeFileSync(
    path.join(directory, "crash.txt"),
    [
      `Engine log last written ${writtenAt.toISOString()}.`,
      reports.length > 0
        ? `BugTrap reports:\n${reports.map((report) => `- ${report}`).join("\n")}`
        : "No BugTrap report.",
      "",
      ...crashLines,
    ].join("\n") + "\n"
  );

  return { directory, reports };
}
