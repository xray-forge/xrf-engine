import { Nillable } from "xray16/lib";

import { mcpConfig } from "@/engine/checks/mcp/McpConfig";

/**
 * Split received text into the newline-delimited messages it carries.
 */
export class McpLineBuffer {
  public pending: string = "";
  // Whether an unfinished line outgrew any request and was dropped since last asked.
  public isOverflowed: boolean = false;

  /**
   * @param chunk - Text as it arrived.
   */
  public push(chunk: string): void {
    this.pending += chunk;
  }

  /**
   * @returns Next complete line without its line break, or null while none is complete.
   */
  public next(): Nillable<string> {
    const end: number = this.pending.indexOf("\n");

    if (end < 0) {
      // Dropped rather than kept, so a client that never ends a line cannot grow the buffer without bound.
      if (this.pending.length > mcpConfig.MAX_REQUEST_LENGTH) {
        this.pending = "";
        this.isOverflowed = true;
      }

      return null;
    }

    let line: string = this.pending.substring(0, end);

    this.pending = this.pending.substring(end + 1);

    if (line.endsWith("\r")) {
      line = line.substring(0, line.length - 1);
    }

    return line;
  }

  /**
   * Forget everything received, as when a client leaves.
   */
  public clear(): void {
    this.pending = "";
    this.isOverflowed = false;
  }
}
