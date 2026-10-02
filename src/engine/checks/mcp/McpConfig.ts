/**
 * Configuration of the game MCP endpoint, a dev-only pipe built by `mcp build` that never ships.
 */
export const mcpConfig = {
  // Engine launch argument arming the endpoint, passed by `start_game --mcp`.
  LAUNCH_FLAG: "-xrf_mcp",
  // Pipe the MCP server connects to.
  PIPE_NAME: "\\\\.\\pipe\\xrf-game",
  // Bytes the pipe buffers each way.
  PIPE_BUFFER_SIZE: 65_536,
  // Longest request line accepted, a longer one is dropped and answered with an error.
  MAX_REQUEST_LENGTH: 1_048_576,
  // Nesting the JSON encoder follows before writing a placeholder.
  MAX_JSON_DEPTH: 12,
};
