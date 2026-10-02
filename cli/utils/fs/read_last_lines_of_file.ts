import * as fsp from "node:fs/promises";

import { exists } from "#/utils/fs/exists";

const NEW_LINE: number = 0x0a;
const CHUNK_SIZE: number = 65_536;

/**
 * Read last lines of some text file, in chunks from its end.
 *
 * @param filePath - Full path to read file.
 * @param maxLineCount - Number of lines to read from EOF.
 * @param encoding - Encoding to use when reading file as text.
 * @returns Last lines of text file.
 */
export async function readLastLinesOfFile(
  filePath: string,
  maxLineCount: number,
  encoding: BufferEncoding = "utf8"
): Promise<string> {
  if (!(await exists(filePath))) {
    throw new Error("File does not exist");
  }

  const file: fsp.FileHandle = await fsp.open(filePath, "r");

  try {
    const { size } = await file.stat();
    const chunks: Array<Buffer> = [];
    let position: number = size;
    let lineCount: number = 0;
    let start: number = -1;

    while (position > 0 && start < 0 && maxLineCount > 0) {
      const length: number = Math.min(CHUNK_SIZE, position);
      const chunk: Buffer = Buffer.alloc(length);

      position -= length;
      await file.read(chunk, 0, length, position);
      chunks.unshift(chunk);

      // The newline ending the last line does not start one.
      for (let index: number = length - 1; index >= 0; index--) {
        if (chunk[index] === NEW_LINE && position + index !== size - 1 && ++lineCount >= maxLineCount) {
          start = index + 1;
          break;
        }
      }
    }

    const tail: Buffer = Buffer.concat(chunks);
    // Lines start after the newline the count stopped at, or at the file start without its leading newline.
    const offset: number = start >= 0 ? start : tail[0] === NEW_LINE ? 1 : 0;

    return maxLineCount > 0 ? tail.subarray(offset).toString(encoding) : "";
  } finally {
    await file.close();
  }
}
