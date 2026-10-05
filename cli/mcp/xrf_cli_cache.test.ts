import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";

import { IXrfCliEnvelope } from "#/mcp/xrf_cli";
import { cacheXrfCli, stampDirectory } from "#/mcp/xrf_cli_cache";

describe("xrf-cli cache", () => {
  let directory: string;

  beforeEach(() => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), "xrf-mcp-cli-cache-"));
  });

  afterEach(() => {
    fs.rmSync(directory, { recursive: true, force: true });
  });

  it("should change the stamp of a folder whenever a file in it changes", () => {
    const file: string = path.join(directory, "gameplay", "dialogs.xml");

    expect(stampDirectory(path.join(directory, "missing"))).toBe("");

    fs.mkdirSync(path.dirname(file));
    fs.writeFileSync(file, "<a/>");

    const written: string = stampDirectory(directory);

    expect(written).toContain("dialogs.xml");
    expect(stampDirectory(directory)).toBe(written);

    fs.writeFileSync(file, "<a></a>");

    expect(stampDirectory(directory)).not.toBe(written);
  });

  it("should answer a repeated query from memory until its sources change", async () => {
    let stamp: string = "first";
    const run = jest.fn(async (parameters: Array<string>): Promise<IXrfCliEnvelope> => {
      return { exitCode: 0, error: null, result: { asked: parameters } };
    });
    const cached = cacheXrfCli(run, () => stamp);

    expect(await cached(["dialog", "list"])).toEqual({
      exitCode: 0,
      error: null,
      result: { asked: ["dialog", "list"] },
    });
    await cached(["dialog", "list"]);
    await cached(["dialog", "inspect", "a"]);

    expect(run).toHaveBeenCalledTimes(2);

    stamp = "second";
    await cached(["dialog", "list"]);

    expect(run).toHaveBeenCalledTimes(3);
  });

  it("should ask again for a query that answered no result", async () => {
    const run = jest.fn(async (): Promise<IXrfCliEnvelope> => ({ exitCode: 1, error: "broken", result: null }));
    const cached = cacheXrfCli(run, () => "same");

    await cached(["dialog", "list"]);
    await cached(["dialog", "list"]);

    expect(run).toHaveBeenCalledTimes(2);
  });
});
