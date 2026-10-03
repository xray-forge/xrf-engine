import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "@jest/globals";

import { IXrfCliEnvelope, runXrfCli } from "#/mcp/xrf_cli";

describe("runXrfCli", () => {
  let directory: string;
  let script: string;

  beforeAll(() => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), "xrf-cli-"));
    script = path.join(directory, "fake_xrf_cli.js");

    // Answers as `xrf-cli` does: an envelope on stdout for a run, none for a usage error.
    fs.writeFileSync(
      script,
      [
        "const parameters = process.argv.slice(2);",
        "if (parameters[0] === 'usage') { console.error('error: unexpected argument'); process.exit(2); }",
        "const isFailed = parameters[0] === 'fail';",
        "console.log(JSON.stringify({ exitCode: isFailed ? 1 : 0, error: isFailed ? 'Not found' : null, " +
          "result: isFailed ? null : { parameters } }));",
        "process.exit(isFailed ? 1 : 0);",
      ].join("\n")
    );
  });

  afterAll(() => {
    fs.rmSync(directory, { recursive: true, force: true });
  });

  it("should run a command with the reporting flags and read its envelope", async () => {
    const envelope: IXrfCliEnvelope = await runXrfCli(process.execPath, [script, "dialog", "list"]);

    expect(envelope).toEqual({
      exitCode: 0,
      error: null,
      result: { parameters: ["dialog", "list", "--json", "--silent"] },
    });
  });

  it("should read the envelope of a command that failed", async () => {
    const envelope: IXrfCliEnvelope = await runXrfCli(process.execPath, [script, "fail"]);

    expect(envelope).toEqual({ exitCode: 1, error: "Not found", result: null });
  });

  it("should throw for a usage error, which prints no envelope", async () => {
    await expect(runXrfCli(process.execPath, [script, "usage"])).rejects.toThrow("unexpected argument");
  });
});
