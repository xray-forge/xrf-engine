import * as cp from "node:child_process";
import { promisify } from "node:util";

const execFile = promisify(cp.execFile);

/**
 * @param names - Executable names of the game, as `xrEngine.exe`.
 * @returns Whether a process with one of the names runs, false where processes cannot be listed.
 */
export async function isGameProcessRunning(names: ReadonlyArray<string>): Promise<boolean> {
  let listing: string;

  try {
    listing = (await execFile("tasklist", ["/FO", "CSV", "/NH"])).stdout;
  } catch {
    return false;
  }

  const running: Set<string> = new Set(
    listing.split(/\r?\n/).map((line) => (/^"([^"]+)"/.exec(line)?.[1] ?? "").toLowerCase())
  );

  return names.some((name) => running.has(name.toLowerCase()));
}
