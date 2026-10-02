import { describe, expect, it } from "@jest/globals";

import { mcpConfig } from "@/engine/checks/mcp/McpConfig";
import { McpLineBuffer } from "@/engine/checks/mcp/McpLineBuffer";

describe("McpLineBuffer", () => {
  it("should split received text into lines, keeping an unfinished one", () => {
    const buffer: McpLineBuffer = new McpLineBuffer();

    buffer.push('{"id":"1"}\n{"id":');

    expect(buffer.next()).toBe('{"id":"1"}');
    expect(buffer.next()).toBeNull();

    buffer.push('"2"}\r\n');

    expect(buffer.next()).toBe('{"id":"2"}');
    expect(buffer.next()).toBeNull();
  });

  it("should drop an unfinished line longer than any request", () => {
    const buffer: McpLineBuffer = new McpLineBuffer();

    buffer.push("x".repeat(mcpConfig.MAX_REQUEST_LENGTH + 1));

    expect(buffer.next()).toBeNull();
    expect(buffer.isOverflowed).toBe(true);
    expect(buffer.pending).toBe("");
  });

  it("should forget everything on clear", () => {
    const buffer: McpLineBuffer = new McpLineBuffer();

    buffer.push("half");
    buffer.isOverflowed = true;
    buffer.clear();

    expect(buffer.pending).toBe("");
    expect(buffer.isOverflowed).toBe(false);
  });
});
