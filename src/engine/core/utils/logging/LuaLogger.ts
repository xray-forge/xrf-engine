import { log, print_stack, time_global } from "xray16";
import { AnyArgs, AnyObject, Nillable, TLabel } from "xray16/lib";

import { forgeConfig } from "@/engine/core/database/forge_config";
import { openLogFile } from "@/engine/core/utils/logging/logging_files";
import { ELuaLoggerMode, ILuaLoggerConfig } from "@/engine/core/utils/logging/logging_types";
import { toJSON } from "@/engine/core/utils/transform/json";

/**
 * Localised engine console log, cached from `_G.log` at module load.
 */
const luaLog: Nillable<(message: string) => void> = log;

/**
 * Lua logger class.
 * Stores prefix, enabled-disabled flags and uses shared statics to print data.
 *
 * Note: if building in optimized mode, game logging is stripped from lua scripts and does not make it to the code.
 */
export class LuaLogger {
  public readonly prefix: TLabel;

  public isEnabled: boolean;
  public mode: ELuaLoggerMode;

  protected loggerFile: Nillable<LuaFile>;
  protected luaFile: LuaFile;

  public constructor(prefix: TLabel, { isEnabled = true, mode = ELuaLoggerMode.SINGLE, file }: ILuaLoggerConfig = {}) {
    this.isEnabled = isEnabled;
    this.mode = mode;
    this.prefix = prefix;
    this.loggerFile = file ? openLogFile(file) : null;
    this.luaFile = openLogFile("lua");

    if (forgeConfig.DEBUG.IS_RESOLVE_LOG_ENABLED) {
      this.info("Declared logger: '%s'", prefix);
    }
  }

  /**
   * Print generic info level message.
   *
   * @param base - Base string for interpolation.
   * @param args - Variadic list of values to log.
   */
  public info(base: string, ...args: AnyArgs): void {
    // Log is disabled globally or for this instance.
    if (!forgeConfig.DEBUG.IS_LOG_ENABLED || !this.isEnabled) {
      return;
    }

    const result: string = string.format("[%s][%s][info] %s", time_global(), this.prefix, string.format(base, ...args));

    if (luaLog) {
      luaLog(result);
    }

    // Write into custom file if it is defined for current logger.
    if (forgeConfig.DEBUG.IS_SEPARATE_LUA_LOG_ENABLED) {
      // Write into custom file if it is defined for current logger.
      if (this.loggerFile) {
        this.loggerFile.write(result);
        this.loggerFile.write("\n");
      }

      this.luaFile.write(result);
      this.luaFile.write("\n");
    }
  }

  /**
   * Print stringified as JSON table into logs file.
   */
  public table(table: AnyObject): void;
  public table(table: LuaTable): void {
    if (forgeConfig.DEBUG.IS_LOG_ENABLED && this.isEnabled) {
      this.info("[table] %s", toJSON(table));
    }
  }

  /**
   * Push empty line in logs for readability.
   */
  public pushEmptyLine(): void {
    return this.info(" ");
  }

  /**
   * Push line separator in logs for readability.
   */
  public pushSeparator(): void {
    return this.info("=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-");
  }

  /**
   * Print current lua call stack in game logs.
   */
  public printStack(): void {
    return print_stack();
  }

  /**
   * Get full string prefix for current logger instance.
   *
   * @returns Current logger prefix string.
   */
  public getFullPrefix(): TLabel {
    return string.format("[%s][%s]", time_global(), this.prefix);
  }
}
