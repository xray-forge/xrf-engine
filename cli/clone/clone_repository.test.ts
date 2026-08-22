import { describe, expect, it } from "@jest/globals";

import { Nullable } from "#/utils/types";

import { MockNodeLogger } from "@/fixtures/cli/mocks";

describe("cloneRepository", () => {
  it("should list configured repositories when no repository name is provided", async () => {
    let cloneLog: Nullable<MockNodeLogger> = null;

    MockNodeLogger.forFile.mockImplementation((prefix: string) => {
      const logger: MockNodeLogger = new MockNodeLogger(prefix);

      cloneLog = logger;

      return logger;
    });

    const { cloneRepository } = await import("#/clone/clone_repository");

    await expect(cloneRepository(null, {})).rejects.toThrow(
      "A repository name is required. Choose one above or run 'clone --list' to show the available repositories."
    );

    if (!cloneLog) {
      throw new Error("Expected clone logger to be initialized.");
    }

    const log: MockNodeLogger = cloneLog as MockNodeLogger;

    expect(log.error).toHaveBeenCalledWith("No repository name provided.");
    expect(log.info).toHaveBeenCalledWith("Available repositories:");
    expect(log.info).toHaveBeenCalledWith(
      " -",
      expect.stringContaining("extended"),
      "—",
      "Full base gamedata assets for custom game repacks"
    );
    expect(log.info).toHaveBeenCalledWith("Example:", expect.stringContaining("npm run cli -- clone extended"));
  });
});
