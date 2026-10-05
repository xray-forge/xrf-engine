import { describe, expect, it, jest } from "@jest/globals";
import { log, print_stack, time_global } from "xray16";
import { toJSON } from "xray16/lib";
import { replaceFunctionMock, resetFunctionMock } from "xray16/testing/utils";

import { forgeConfig } from "@/engine/core/database/forge_config";
import { LuaLogger } from "@/engine/core/utils/logging/LuaLogger";

describe("LuaLogger", () => {
  const logging: { LuaLogger: typeof LuaLogger } = jest.requireActual("@/engine/core/utils/logging/LuaLogger");
  const Logger: typeof LuaLogger = logging.LuaLogger;

  it("LuaLogger should correctly initialize", () => {
    const logger: LuaLogger = new Logger("tst");

    expect(logger.prefix).toBe("tst");
    expect(logger.isEnabled).toBe(true);

    expect(new Logger("another", { isEnabled: false }).isEnabled).toBe(false);
  });

  it("LuaLogger should correctly handle enabled-disabled state", () => {
    const logger: LuaLogger = new Logger("tst");

    resetFunctionMock(log);

    logger.isEnabled = false;
    forgeConfig.DEBUG.IS_LOG_ENABLED = false;

    logger.info("test");
    expect(log).not.toHaveBeenCalled();

    logger.isEnabled = true;

    logger.info("test");
    expect(log).not.toHaveBeenCalled();

    forgeConfig.DEBUG.IS_LOG_ENABLED = true;

    logger.info("test");
    expect(log).toHaveBeenCalled();
  });

  it("LuaLogger should correctly call log", () => {
    const logger: LuaLogger = new Logger("tst");

    resetFunctionMock(log);
    replaceFunctionMock(time_global, () => 1000);

    logger.info("test");
    logger.pushEmptyLine();
    logger.pushSeparator();

    expect(log).toHaveBeenCalledTimes(3);
    expect(log).toHaveBeenNthCalledWith(1, "[1000][tst][info] test");
    expect(log).toHaveBeenNthCalledWith(2, "[1000][tst][info]  ");
    expect(log).toHaveBeenNthCalledWith(3, "[1000][tst][info] =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-");
  });

  it("LuaLogger should correctly generate prefix", () => {
    replaceFunctionMock(time_global, () => 1000);

    expect(new Logger("tst").getFullPrefix()).toBe("[1000][tst]");
    expect(new Logger("another").getFullPrefix()).toBe("[1000][another]");
  });

  it("LuaLogger should correctly print stack", () => {
    new Logger("tst").printStack();
    expect(print_stack).toHaveBeenCalledTimes(1);
  });

  it("LuaLogger should correctly print table", () => {
    const logger: LuaLogger = new Logger("tst");

    jest.spyOn(logger, "info").mockImplementation(() => {});

    logger.table({ test: true, another: 10 });

    expect(logger.info).toHaveBeenCalledWith("[table] %s", toJSON({ test: true, another: 10 }));
  });
});
