import { Nillable } from "xray16/lib";
import { $filename } from "xray16/macros";

import { IMcpTransport } from "@/engine/checks/mcp/mcp_types";
import { mcpConfig } from "@/engine/checks/mcp/McpConfig";
import { LuaLogger } from "@/engine/core/utils/logging";

const logger: LuaLogger = new LuaLogger($filename);

const PIPE_ACCESS_DUPLEX: number = 0x3;
const PIPE_NOWAIT: number = 0x1;
const PIPE_REJECT_REMOTE_CLIENTS: number = 0x8;
const ERROR_BROKEN_PIPE: number = 109;
const ERROR_NO_DATA: number = 232;
const ERROR_PIPE_CONNECTED: number = 535;
const ERROR_PIPE_LISTENING: number = 536;

const KERNEL32_DECLARATIONS: string = `
typedef void* HANDLE;
typedef unsigned long DWORD;
typedef int BOOL;
HANDLE CreateNamedPipeA(const char* name, DWORD openMode, DWORD pipeMode, DWORD maxInstances, DWORD outSize,
  DWORD inSize, DWORD timeout, void* security);
BOOL ConnectNamedPipe(HANDLE pipe, void* overlapped);
BOOL DisconnectNamedPipe(HANDLE pipe);
BOOL PeekNamedPipe(HANDLE pipe, void* buffer, DWORD size, DWORD* read, DWORD* available, DWORD* left);
BOOL ReadFile(HANDLE file, void* buffer, DWORD toRead, DWORD* read, void* overlapped);
BOOL WriteFile(HANDLE file, const void* buffer, DWORD toWrite, DWORD* written, void* overlapped);
BOOL CloseHandle(HANDLE handle);
DWORD GetLastError(void);
`;

/**
 * FFI view of a `DWORD[1]` out parameter.
 */
interface IDwordBox {
  [index: number]: number;
}

/**
 * The kernel32 functions the transport declares.
 */
interface IKernel32 {
  CreateNamedPipeA(
    this: void,
    name: string,
    openMode: number,
    pipeMode: number,
    maxInstances: number,
    outSize: number,
    inSize: number,
    timeout: number,
    security: null
  ): unknown;
  ConnectNamedPipe(this: void, pipe: unknown, overlapped: null): number;
  DisconnectNamedPipe(this: void, pipe: unknown): number;
  PeekNamedPipe(
    this: void,
    pipe: unknown,
    buffer: null,
    size: number,
    read: null,
    available: IDwordBox,
    left: null
  ): number;
  ReadFile(this: void, file: unknown, buffer: unknown, toRead: number, read: IDwordBox, overlapped: null): number;
  WriteFile(this: void, file: unknown, buffer: string, toWrite: number, written: IDwordBox, overlapped: null): number;
  CloseHandle(this: void, handle: unknown): number;
  GetLastError(this: void): number;
}

/**
 * The LuaJIT `ffi` module, as far as the transport uses it.
 */
interface IFfi {
  C: IKernel32;
  cdef(this: void, declarations: string): void;
  new: (this: void, ctype: string) => IDwordBox;
  string(this: void, pointer: unknown, length: number): string;
  cast(this: void, ctype: string, value: unknown): unknown;
  gc<T>(this: void, cdata: T, finalizer: Nillable<(this: void, handle: unknown) => number>): T;
}

/**
 * Windows named pipe the game listens on, polled each frame through LuaJIT FFI.
 * The pipe never blocks (`PIPE_NOWAIT`) and refuses remote clients; closing the Lua state closes it.
 */
export class NamedPipeTransport implements IMcpTransport {
  public readonly ffi: IFfi;
  public readonly pipe: Nillable<unknown>;
  public readonly buffer: unknown;
  public readonly bytes: IDwordBox;
  public readonly available: IDwordBox;

  public isClientConnected: boolean = false;
  public queue: string = "";

  public constructor() {
    this.ffi = require("ffi") as IFfi;

    // A module required again in the same Lua state declares nothing new, which LuaJIT reports as an error.
    pcall(this.ffi.cdef, KERNEL32_DECLARATIONS);

    this.buffer = this.ffi.new(string.format("char[%d]", mcpConfig.PIPE_BUFFER_SIZE));
    this.bytes = this.ffi.new("DWORD[1]");
    this.available = this.ffi.new("DWORD[1]");

    const pipe: unknown = this.ffi.C.CreateNamedPipeA(
      mcpConfig.PIPE_NAME,
      PIPE_ACCESS_DUPLEX,
      PIPE_NOWAIT + PIPE_REJECT_REMOTE_CLIENTS,
      1,
      mcpConfig.PIPE_BUFFER_SIZE,
      mcpConfig.PIPE_BUFFER_SIZE,
      0,
      null
    );

    if (tonumber(this.ffi.cast("intptr_t", pipe)) === -1) {
      // Another game instance holds the pipe; this one stays without a channel.
      logger.info("Cannot create pipe '%s': %s", mcpConfig.PIPE_NAME, this.ffi.C.GetLastError());
      this.pipe = null;
    } else {
      this.pipe = this.ffi.gc(pipe, this.ffi.C.CloseHandle);
      logger.info("Listening on '%s'", mcpConfig.PIPE_NAME);
    }
  }

  public accept(): boolean {
    if (this.pipe === null || this.isClientConnected) {
      return false;
    }

    if (this.ffi.C.ConnectNamedPipe(this.pipe, null) === 0) {
      const error: number = this.ffi.C.GetLastError();

      if (error === ERROR_PIPE_LISTENING) {
        return false;
      } else if (error === ERROR_NO_DATA) {
        // A client connected and left before this poll.
        this.ffi.C.DisconnectNamedPipe(this.pipe);

        return false;
      } else if (error !== ERROR_PIPE_CONNECTED) {
        logger.info("Cannot accept a client: %s", error);

        return false;
      }
    }

    this.isClientConnected = true;

    return true;
  }

  public isConnected(): boolean {
    return this.isClientConnected;
  }

  public read(): Nillable<string> {
    if (!this.isClientConnected) {
      return null;
    }

    if (this.ffi.C.PeekNamedPipe(this.pipe, null, 0, null, this.available, null) === 0) {
      this.disconnect(this.ffi.C.GetLastError());

      return null;
    }

    if (this.available[0] === 0) {
      return null;
    }

    const parts: Array<string> = [];
    let left: number = this.available[0];

    while (left > 0) {
      if (
        this.ffi.C.ReadFile(this.pipe, this.buffer, math.min(left, mcpConfig.PIPE_BUFFER_SIZE), this.bytes, null) === 0
      ) {
        this.disconnect(this.ffi.C.GetLastError());

        return null;
      }

      parts.push(this.ffi.string(this.buffer, this.bytes[0]));
      left -= this.bytes[0];
    }

    return parts.join("");
  }

  public write(data: string): void {
    if (this.isClientConnected) {
      this.queue += data;
    }
  }

  public flush(): boolean {
    while (this.isClientConnected && this.queue.length > 0) {
      // A non-blocking write larger than the pipe buffer takes nothing at all, so at most one buffer goes per call.
      const size: number = math.min(this.queue.length, mcpConfig.PIPE_BUFFER_SIZE);

      if (this.ffi.C.WriteFile(this.pipe, this.queue, size, this.bytes, null) === 0) {
        this.disconnect(this.ffi.C.GetLastError());

        return true;
      }

      // A full pipe takes nothing now; the rest goes on a later frame.
      if (this.bytes[0] === 0) {
        return false;
      }

      this.queue = this.queue.substring(this.bytes[0]);
    }

    return true;
  }

  /**
   * Drop a client that left and listen for the next one.
   *
   * @param error - Error the pipe reported.
   */
  protected disconnect(error: number): void {
    if (error !== ERROR_BROKEN_PIPE && error !== ERROR_NO_DATA) {
      logger.info("Pipe failed: %s", error);
    }

    this.ffi.C.DisconnectNamedPipe(this.pipe);
    this.isClientConnected = false;
    this.queue = "";
  }
}
