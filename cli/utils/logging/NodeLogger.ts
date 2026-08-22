import * as path from "node:path";

import { green } from "chalk";

import { stringifyValue } from "#/utils/logging/stringify_value";
import { Nullable } from "#/utils/types";

/**
 * DebugLogger file that logs only in dev/flagged environment.
 * Allows to collect app logs in a file for future investigations or dev sharing.
 */
export class NodeLogger {
  public static LOG_FILE_BUFFER: Array<string> = [];
  public static LOG_FILE_BUFFER_LINES_LIMIT: number = 50_000;
  public static LOG_FILE_BUFFER_SPLICE: number = 100;

  public static IS_CONSOLE_ENABLED: boolean = true;
  public static IS_FILE_ENABLED: boolean = true;
  public static IS_VERBOSE: boolean = false;

  /**
   * Global log singleton.
   */
  private static GLOBAL: Nullable<NodeLogger> = null;

  private readonly prefix: string;
  private readonly isEnabled: boolean = true;

  /**
   * @returns Global logger singleton object to do inline printing.
   */
  public static getGlobal(): NodeLogger {
    if (!NodeLogger.GLOBAL) {
      NodeLogger.GLOBAL = new NodeLogger("🪐GLBL");
    }

    return NodeLogger.GLOBAL;
  }

  /**
   * @param filename - Full file name including path.
   * @returns Logger with prefix based on filename.
   */
  public static forFile(filename: string): NodeLogger {
    return new NodeLogger(path.basename(filename, ".ts").toUpperCase());
  }

  /**
   * Clear file logs and set string storing buffer as empty.
   */
  public static clearLogs(): void {
    this.LOG_FILE_BUFFER = [];
  }

  /**
   * Log in a file with limited count of lines to save reports with detailed info.
   */
  public static logInFile(text: string): void {
    if (NodeLogger.IS_FILE_ENABLED) {
      NodeLogger.LOG_FILE_BUFFER.push(text);

      if (NodeLogger.LOG_FILE_BUFFER.length > NodeLogger.LOG_FILE_BUFFER_LINES_LIMIT) {
        NodeLogger.LOG_FILE_BUFFER.splice(0, NodeLogger.LOG_FILE_BUFFER_SPLICE);
      }
    }
  }

  public constructor(prefix: string = "", isEnabled?: boolean) {
    this.prefix = `[${prefix}]`;

    if (isEnabled !== undefined) {
      this.isEnabled = isEnabled;
    }
  }

  public debug(...args: Array<unknown>): void {
    this.logAs("debug", args);
  }

  public warn(...args: Array<unknown>): void {
    this.logAs("warn", args);
  }

  public error(...args: Array<unknown>): void {
    this.logAs("error", args);
  }

  public info(...args: Array<unknown>): void {
    this.logAs("info", args);
  }

  public pushNewLine(): void {
    if (this.isEnabled) {
      if (NodeLogger.IS_CONSOLE_ENABLED) {
        console.info("");
      }

      if (NodeLogger.IS_FILE_ENABLED) {
        NodeLogger.logInFile("\n");
      }
    }
  }

  /**
   * Generic log method for simple formatting and logging of information with shared logic.
   */
  private logAs(method: string, args: Array<unknown>): void {
    if (this.isEnabled) {
      const date: Date = new Date();
      const timestamp: string = `${date.toLocaleTimeString("en-GB")}:${String(date.getMilliseconds()).padStart(
        3,
        "0"
      )}`;

      if (NodeLogger.IS_CONSOLE_ENABLED && (NodeLogger.IS_VERBOSE ? true : method !== "debug")) {
        console[method as unknown as "info"](`${timestamp} ${green(this.prefix)}`, ...args);
      }

      if (NodeLogger.IS_FILE_ENABLED) {
        NodeLogger.logInFile(
          `${timestamp} [${method}] ${this.prefix} ${args.map((it) => stringifyValue(it)).join(" ")}\n`
        );
      }
    }
  }
}
