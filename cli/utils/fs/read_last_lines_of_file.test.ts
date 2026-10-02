import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { afterAll, describe, expect, it } from "@jest/globals";

import { readLastLinesOfFile } from "#/utils/fs/read_last_lines_of_file";

describe("readLastLinesOfFile", () => {
  const directory: string = fs.mkdtempSync(path.join(os.tmpdir(), "xrf-last-lines-"));

  /**
   * @param content - File content.
   * @returns Path of a fresh file holding it.
   */
  function createFile(content: string | Buffer): string {
    const file: string = path.join(directory, `${fs.readdirSync(directory).length}.log`);

    fs.writeFileSync(file, content);

    return file;
  }

  afterAll(() => {
    fs.rmSync(directory, { recursive: true, force: true });
  });

  it("should read the last lines, keeping the newline that ends the file", async () => {
    const file: string = createFile("one\ntwo\nthree\n");

    expect(await readLastLinesOfFile(file, 2)).toBe("two\nthree\n");
    expect(await readLastLinesOfFile(file, 1)).toBe("three\n");
    expect(await readLastLinesOfFile(file, 3)).toBe("one\ntwo\nthree\n");
    expect(await readLastLinesOfFile(file, 10)).toBe("one\ntwo\nthree\n");
    expect(await readLastLinesOfFile(file, 0)).toBe("");
  });

  it("should read files without a final newline or with a leading one", async () => {
    expect(await readLastLinesOfFile(createFile("one\ntwo\nthree"), 2)).toBe("two\nthree");
    expect(await readLastLinesOfFile(createFile("\none\ntwo"), 10)).toBe("one\ntwo");
    expect(await readLastLinesOfFile(createFile(""), 10)).toBe("");
  });

  it("should read lines across chunks in the encoding given", async () => {
    const lines: Array<string> = Array.from({ length: 5_000 }, (_, index) => `line ${index} ${"x".repeat(40)}`);
    const file: string = createFile(lines.join("\n") + "\n");

    expect(await readLastLinesOfFile(file, 3_000)).toBe(lines.slice(-3_000).join("\n") + "\n");
    expect(await readLastLinesOfFile(createFile(Buffer.from([0x61, 0x0a, 0xe9, 0x0a])), 1, "latin1")).toBe("é\n");
  });

  it("should fail for a missing file", async () => {
    await expect(readLastLinesOfFile(path.join(directory, "missing.log"), 1)).rejects.toThrow("File does not exist");
  });
});
