import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";

import { readFlowLevel } from "#/checks/utils/discover_checks";

describe("readFlowLevel", () => {
  let directory: string;

  function writeFlow(content: string): string {
    const file: string = path.join(directory, "test.flow.ts");

    fs.writeFileSync(file, content);

    return file;
  }

  beforeEach(() => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), "xrf-flow-"));
  });

  afterEach(() => {
    fs.rmSync(directory, { recursive: true, force: true });
  });

  it("should read the level the flow requires", () => {
    expect(
      readFlowLevel(writeFlow('requires({ level: "zaton", state: [] });\nstep("1", { reached: () => true });\n'))
    ).toBe("zaton");
  });

  it("should read no level from a flow that requires none", () => {
    expect(readFlowLevel(writeFlow('requires({ state: [] });\nstep("1", { reached: () => true });\n'))).toBeNull();
    expect(readFlowLevel(writeFlow('step("1", { reached: () => true });\n'))).toBeNull();
  });

  it("should read no level named other than with a string literal", () => {
    expect(readFlowLevel(writeFlow("requires({ level: levels.zaton });\n"))).toBeNull();
  });
});
