import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, describe, expect, it } from "@jest/globals";

import { MCP_USER_CONFIG, prepareMcpUserConfig } from "#/mcp/mcp_user_config";

describe("prepareMcpUserConfig", () => {
  const directories: Array<string> = [];

  /**
   * @returns Fresh app data folder.
   */
  function createAppdata(): string {
    const directory: string = fs.mkdtempSync(path.join(os.tmpdir(), "xrf-mcp-appdata-"));

    directories.push(directory);

    return directory;
  }

  afterEach(() => {
    directories.splice(0).forEach((it) => fs.rmSync(it, { recursive: true, force: true }));
  });

  it("should copy the owner's settings with the forced ones replacing theirs, without touching them", async () => {
    const appdata: string = createAppdata();
    const original: Buffer = Buffer.from(
      "bind jump kSPACE\r\nrs_always_active off\r\nkeypress_on_start 1\r\nrenderer renderer_rgl\r\nsnd_volume_eff 0.7\r\n" +
        "rs_stats on\r\nname \xe9\r\n",
      "latin1"
    );

    fs.writeFileSync(path.join(appdata, "user.ltx"), original);

    const written: string = await prepareMcpUserConfig(appdata);

    expect(written).toBe(path.join(appdata, MCP_USER_CONFIG));
    expect(fs.readFileSync(path.join(appdata, "user.ltx"))).toEqual(original);
    expect(fs.readFileSync(written)).toEqual(
      Buffer.from(
        "bind jump kSPACE\r\nsnd_volume_eff 0.7\r\nname \xe9\r\nrs_always_active on\r\nkeypress_on_start 0\r\n" +
          "renderer renderer_r4\r\nrs_stats off\r\n",
        "latin1"
      )
    );
  });

  it("should write the forced settings alone when the owner has no settings yet", async () => {
    const appdata: string = createAppdata();

    await prepareMcpUserConfig(appdata);

    expect(fs.readFileSync(path.join(appdata, MCP_USER_CONFIG), "latin1")).toBe(
      "rs_always_active on\r\nkeypress_on_start 0\r\nrenderer renderer_r4\r\nrs_stats off\r\n"
    );
  });
});
