import { describe, expect, it } from "@jest/globals";
import { consoleCommands } from "xray16/lib";

describe("console_commands constants integrity", () => {
  it("should match key-value entries", () => {
    Object.entries(consoleCommands).forEach(([key, value]) => expect(key).toBe(value));
  });
});
