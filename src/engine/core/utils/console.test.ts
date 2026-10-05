import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { get_console } from "xray16";
import { Console } from "xray16/alias";
import { MockConsole } from "xray16/mocks";

import { consoleCommands } from "@/engine/constants/console_commands";
import { isConsoleCommandAvailable } from "@/engine/core/utils/console";

describe("isConsoleCommandAvailable", () => {
  beforeEach(() => {
    MockConsole.reset();
  });

  it("should check whether the console knows a command", () => {
    const console: Console = get_console();

    expect(isConsoleCommandAvailable(consoleCommands.g_god)).toBe(true);

    jest.spyOn(console, "get_string").mockImplementation(() => null);

    expect(isConsoleCommandAvailable(consoleCommands.g_god)).toBe(false);
    expect(console.get_string).toHaveBeenCalledWith(consoleCommands.g_god);
  });
});
