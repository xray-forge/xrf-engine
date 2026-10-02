# [XRF](../../.) / CLI / MCP

`mcp` manages the game MCP, which lets agents drive a running game: an endpoint inside the game, polled on every actor
update through a named pipe, and an MCP server on the host. The endpoint is kept out of the regular build and every
release package; it is transpiled into `gamedata` only on request, and it stays inert unless the engine is launched with
`-xrf_mcp`. `pack mod` and `pack game` refuse to package it.

```sh
npm run cli -- mcp <command> [options]
```

## Commands

- `build` transpiles the endpoint and writes the `extensions/xrf_mcp` extension that starts it.
- `clean` removes the endpoint and its extension, leaving flows in place.
- `serve` serves the game tools to an MCP client over stdio, with a JSON-RPC server of its own and no dependency.
  An MCP client runs it from the repository root as
  `node node_modules/ts-node/dist/bin.js -T -P cli/tsconfig.json cli/run.ts mcp serve`, as `npm run` would print to
  stdout. In the XRF workspace, `npm run context:install` in `xrf-agents` writes an untracked `.mcp.json` here that
  registers it as `xrf-game`.

`build` and `clean` accept `-v, --verbose`. `checks clean` removes the extension too, as it loads modules from the checks
output.

## Tools

- `game_start` starts the game armed (`start_game --mcp`), in a new game or a save, and waits until a level runs. It
  refuses while any game process runs.
- `game_status` reports the session, level, game time, actor, and the time since the previous actor update.
- `game_console` runs a console command after answering; follow a `load` with `game_wait_ready`.
- `game_lua` runs Lua and returns its value as JSON, trying it as an expression first.
- `game_flow` runs an in-game check flow by identity, source path or launcher name, and returns its report lines.
- `game_screenshot` returns the image scaled down to `width` (1600 by default) and keeps the full one under
  `target/mcp/screenshots`.
- `game_log` reads the last lines of the engine, xrf Lua or check flow log, also while loading, paused or crashed.
- `game_wait_ready` waits until the game greets again after a load, a level change or a start.
- `game_quit` quits the game and waits until it is gone.

The game answers in a level and, once a game has started, in the main menu; it is silent while loading and during
intros, the outro and credits. The pipe takes one client, so a second session reports that another
one is connected. Text goes both ways in the encoding the string tables of the game language declare.

## Examples

```sh
npm run cli -- mcp build
npm run cli -- start_game --mcp --new
npm run cli -- mcp clean
```
