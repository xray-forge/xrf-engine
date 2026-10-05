import * as fs from "node:fs";
import * as path from "node:path";

import { IXrfCliEnvelope } from "#/mcp/xrf_cli";
import { Optional } from "#/utils/types";

/**
 * Runner of `xrf-cli` commands, as the tools call it.
 */
export type TXrfCliRunner = (parameters: Array<string>) => Promise<IXrfCliEnvelope>;

/**
 * Describe a folder by the size and modification time of every file in it, so any change to it changes the stamp.
 *
 * @param directory - Folder to describe.
 * @returns Stamp of the folder, empty when it does not exist.
 */
export function stampDirectory(directory: string): string {
  if (!fs.existsSync(directory)) {
    return "";
  }

  return fs
    .readdirSync(directory, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => {
      const file: string = path.join(entry.parentPath, entry.name);
      const { size, mtimeMs } = fs.statSync(file);

      return `${file}:${size}:${mtimeMs}`;
    })
    .sort()
    .join("\n");
}

/**
 * Answer repeated `xrf-cli` queries from memory while the files they read stay unchanged.
 *
 * Each query spawns the tool and parses its sources anew, which costs far more than describing those sources. Only
 * answers holding a result are kept, so a failure is asked again.
 *
 * @param run - Runner spawning `xrf-cli`.
 * @param getSourceStamp - Stamp of the files the queries read, see {@link stampDirectory}.
 * @returns Runner answering a query asked before over unchanged files without spawning the tool.
 */
export function cacheXrfCli(run: TXrfCliRunner, getSourceStamp: () => string): TXrfCliRunner {
  const answers: Map<string, IXrfCliEnvelope> = new Map();
  let answersStamp: string = "";

  return async (parameters) => {
    const stamp: string = getSourceStamp();

    if (stamp !== answersStamp) {
      answers.clear();
      answersStamp = stamp;
    }

    const key: string = JSON.stringify(parameters);
    const known: Optional<IXrfCliEnvelope> = answers.get(key);

    if (known) {
      return known;
    }

    const envelope: IXrfCliEnvelope = await run(parameters);

    if (envelope.result !== null) {
      answers.set(key, envelope);
    }

    return envelope;
  };
}
