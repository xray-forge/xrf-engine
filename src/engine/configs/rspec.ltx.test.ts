import { describe, expect, it } from "@jest/globals";

import { readInGameTestLtxFromTest } from "@/fixtures/engine";

const SHARED_CONFIG: string = "rspec_shared.ltx";
const PRESET_CONFIGS: Array<string> = [
  "rspec_minimum.ltx",
  "rspec_low.ltx",
  "rspec_default.ltx",
  "rspec_high.ltx",
  "rspec_extreme.ltx",
];

/**  Console command name, as accepted by `Console->Execute`. */
const COMMAND_PATTERN: RegExp = /^[a-z][a-z\d_]*$/;

/**
 * These configs are not parsed as LTX by the engine, despite the extension.
 *
 * `_preset` runs them through `cfg_load`, which reads the file line by line and forwards each line straight to
 * `Console->Execute`. Anything that is not a console command is reported as `! Unknown command: ...` and silently
 * does nothing, so LTX syntax such as `#include`, `; comments`, `[sections]` or `key = value` must not appear here.
 */
describe("rspec configs", () => {
  describe.each([SHARED_CONFIG, ...PRESET_CONFIGS])("%s", (config: string) => {
    it("should contain console commands only", async () => {
      const content: string = await readInGameTestLtxFromTest(config);
      const lines: Array<string> = content.split("\n");

      lines.forEach((line, index) => {
        const trimmed: string = line.trim();

        if (!trimmed) {
          return;
        }

        const [command, value] = trimmed.split(/\s+/);
        const at: string = `${config}:${index + 1}`;

        expect({ at, command }).toEqual({ at, command: expect.stringMatching(COMMAND_PATTERN) });
        expect({ at, hasValue: value !== undefined }).toEqual({ at, hasValue: true });
        expect({ at, value }).not.toEqual({ at, value: "=" });
      });
    });
  });

  describe.each(PRESET_CONFIGS)("%s", (config: string) => {
    it("should load shared render settings before preset specific overrides", async () => {
      const content: string = await readInGameTestLtxFromTest(config);
      const lines: Array<string> = content.split("\n").filter((line) => line.trim());

      expect(lines[0]).toBe(`cfg_load gamedata\\configs\\${SHARED_CONFIG}`);
    });
  });

  it("should keep shared render settings free of keys every preset overrides", async () => {
    const content: string = await readInGameTestLtxFromTest(SHARED_CONFIG);
    const commands: Array<string> = content
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => line.trim().split(/\s+/)[0]);

    const overridden: Array<string> = [];

    for (const config of PRESET_CONFIGS) {
      const preset: string = await readInGameTestLtxFromTest(config);

      preset
        .split("\n")
        .filter((line) => line.trim())
        .map((line) => line.trim().split(/\s+/)[0])
        .forEach((command) => {
          if (commands.includes(command) && !overridden.includes(command)) {
            overridden.push(command);
          }
        });
    }

    expect(overridden).toEqual([]);
  });
});
