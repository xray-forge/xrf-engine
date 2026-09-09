import * as fsp from "node:fs/promises";
import * as path from "node:path";

import { expect } from "@jest/globals";
import { Nillable } from "xray16/lib";

/**
 * Resolve a path relative to the test currently executed by Jest.
 *
 * @param parts - Path parts relative to the current test file.
 * @returns Resolved test-relative path.
 */
export function resolveInGameTestPath(...parts: Array<string>): string {
  const testPath: Nillable<string> = expect.getState().testPath;

  if (!testPath) {
    throw new Error("Cannot resolve test-relative path outside a Jest test.");
  }

  return path.resolve(path.dirname(testPath), ...parts);
}

/**
 * Read file by path and transform it to in-game LTX separated with new lines.
 *
 * @param file - Path to file.
 * @returns Promise resolving to ltx file content separated with \n.
 */
export async function readInGameTestLtx(file: string): Promise<string> {
  return (await fsp.readFile(path.resolve(file))).toString().replace(/\r\n/g, "\n");
}

/**
 * Read an LTX file relative to the test currently executed by Jest.
 *
 * @param parts - Path parts relative to the current test file.
 * @returns Promise resolving to LTX content separated with \n.
 */
export function readInGameTestLtxFromTest(...parts: Array<string>): Promise<string> {
  return readInGameTestLtx(resolveInGameTestPath(...parts));
}

/**
 * Read an LTX file relative to the test currently executed by Jest.
 *
 * @param content - LTX file raw text content.
 * @returns Trimmed file without empty lines.
 */
export function trimInGameTestLtxFromTest(content: string): string {
  return content.split("\n").filter(Boolean).join("\n") + "\n";
}
