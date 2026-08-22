import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { yellow } from "chalk";

import { getGamePaths } from "#/utils/fs/get_game_paths";
import { readLastLinesOfFile } from "#/utils/fs/read_last_lines_of_file";
import { NodeLogger } from "#/utils/logging";
import { Nullable } from "#/utils/types";

const log: NodeLogger = NodeLogger.forFile(__filename);

/**
 * Print last 'n' lines from logs file.
 */
export async function printLastLogLines(count: number): Promise<void> {
  const linesCount: number = Math.min(Number.isInteger(count) && count > 0 ? count : 15, 200);

  log.info("Printing logs last lines:", linesCount);

  const path: Nullable<string> = await getLogFilePath();

  if (path) {
    log.info("Checking logs in:", yellow(path));

    const lines: string = await readLastLinesOfFile(path, linesCount);

    log.info("\n");

    console.info(lines);
  } else {
    log.info("No active logs found, exit");
  }
}

/**
 * Get path of log file.
 */
async function getLogFilePath(): Promise<Nullable<string>> {
  const { logs, binJson } = await getGamePaths();
  const username: string = os.userInfo().username.toLowerCase();

  const openXRayLogPath: string = path.resolve(logs, `openxray_${username}.log`);
  const baseXRayLogPath: string = path.resolve(logs, `xray_${username}.log`);

  if (!fs.existsSync(logs)) {
    log.info("Provided invalid game logs folder or log do not exist:", yellow(logs));

    return null;
  }

  if (fs.existsSync(binJson)) {
    const binDescriptor: Record<string, unknown> = await import(binJson);

    log.info(
      "Open x-ray engine usage detected:",
      yellow(`${binDescriptor.type} ${binDescriptor.version} ${binDescriptor.release}`)
    );

    if (fs.existsSync(openXRayLogPath)) {
      return openXRayLogPath;
    } else {
      log.warn("Using custom engine, but no logs for it found:", yellow(openXRayLogPath));

      return null;
    }
  }

  if (fs.existsSync(baseXRayLogPath)) {
    return baseXRayLogPath;
  } else {
    log.warn("No logs for engine found in:", yellow(openXRayLogPath));

    return null;
  }
}
