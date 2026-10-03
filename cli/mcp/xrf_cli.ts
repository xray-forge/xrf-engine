import * as cp from "node:child_process";
import { promisify } from "node:util";

import { Nullable } from "#/utils/types";

const execFile = promisify(cp.execFile);

/**
 * Most an `xrf-cli` answer may print, far past the bounded answers the tools ask for.
 */
const XRF_CLI_OUTPUT_LIMIT: number = 64 * 1024 * 1024;

/**
 * The reporting envelope `xrf-cli` prints with `--json`, as far as the tools read it.
 */
export interface IXrfCliEnvelope<T = unknown> {
  exitCode: number;
  error: Nullable<string>;
  result: Nullable<T>;
}

/**
 * Run an `xrf-cli` command and read the envelope it prints.
 *
 * A command that fails still prints its envelope, so only a usage error or a binary that does not start throws.
 *
 * @param executable - The `xrf-cli` binary.
 * @param parameters - Command, subcommand and arguments, without the reporting flags.
 * @returns The envelope the command printed.
 */
export async function runXrfCli(executable: string, parameters: Array<string>): Promise<IXrfCliEnvelope> {
  let stdout: string;

  try {
    ({ stdout } = await execFile(executable, [...parameters, "--json", "--silent"], {
      maxBuffer: XRF_CLI_OUTPUT_LIMIT,
      windowsHide: true,
    }));
  } catch (error) {
    stdout = (error as { stdout?: string }).stdout ?? "";

    if (!stdout) {
      throw error;
    }
  }

  return JSON.parse(stdout) as IXrfCliEnvelope;
}
