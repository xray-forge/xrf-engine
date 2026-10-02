# [XRF](../../.) / CLI / MCP

`mcp` manages the game MCP, which lets agents drive a running game: an endpoint inside the game, polled on every actor
update through a named pipe, and an MCP server on the host. The endpoint is kept out of the regular build and every
release package; it is transpiled into `gamedata` only on request, and it stays inert unless the engine is launched with
`-xrf_mcp`. `pack mod` and `pack game` refuse to package it.

```sh
npm run cli -- mcp <command> [options]
```

## Commands

- `build` transpiles the endpoint and writes the `extensions/xrf_mcp` extension that starts it. With `-s, --scripts`
  it builds the game scripts first, with Lua logs, so one command picks up script changes too.
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
  refuses while any game process runs, and restores a save from the bank when the game has no copy of it.
- `game_status` reports the session, level, game time, actor, and the time since the previous actor update.
- `game_console` runs a console command after answering; follow a `load` with `game_wait_ready`.
- `game_lua` runs Lua and returns its value as JSON, trying it as an expression first. It takes the code itself or a
  probe `file` under `target/mcp/probes`. Chunks share one environment over the game's globals, so a global one
  chunk sets stays for the next until a load, and they see `mcp`, the in-game utilities
  `src/engine/checks/mcp/mcp_probe.ts` re-exports under their own names, such as `registry`, `getManagerByName`,
  `getNearestGameObject`, `getSquadMembers`, `teleportActorToPosition`, `giveItemsToActor` and `forwardGameTime`.
- `game_wait` lets the game run for `seconds`, or until the Lua expression `until` is truthy, checked every second.
- `game_flow` runs an in-game check flow by identity, source path or launcher name, and returns its report lines.
- `game_screenshot` returns the image scaled down to `width` (1600 by default) and keeps the full one under
  `target/mcp/screenshots`.
- `game_log` reads the last lines of the engine, xrf Lua or check flow log, also while loading, paused or crashed.
  With `match`, a case-insensitive pattern, it answers the last lines matching it with their line numbers.
- `game_errors` groups the errors and warnings of a log by message, counting each with its first line, and leaves out
  known engine noise and Lua stack frames.
- `game_dump` captures what every manager reports for debug dumps into `target/mcp/dumps/<name>.json` and answers its
  size per manager. With `compareWith` it compares the dump with an earlier one: lists of plain values compare as
  sets, engine object keys by name, timestamp fields (`...At`, `updateDelta`) are left out, and numeric fields moving
  together by one delta of a second or more are counted as the game clock moving between two loads. The full
  comparison goes to `<name>.diff.txt`; `managers` and `ignore` narrow it.
- `game_save` saves the game under a name and keeps a copy with a note in the save bank.
- `game_saves` lists the save bank.
- `game_load` loads a banked save: with `load` in a level, through `start server` in the main menu, or by starting the
  game when none runs.
- `game_wait_ready` waits until the game greets again after a load, a level change or a start.
- `game_quit` quits the game and waits until it is gone.

The game answers in a level and, once a game has started, in the main menu; it is silent while loading and during
intros, the outro and credits. The pipe takes one client, so a second session reports that another
one is connected. Text goes both ways in the encoding the string tables of the game language declare.

The endpoint names engine objects in answers and dumps by their class: `<CTime 2012-08-03 09:00:59.000>`,
`<game_object 0 actor>`, `<server_object 11219 bandit_sim_squad_novice11219>`, `<ini_file system.ltx>` and
`<vector 1.00 2.00 3.00>`; other userdata stays `<userdata>`.

## Workspace

`target/mcp` is the tools' workspace, kept out of git:

- `saves` is the save bank: each save's `.scop`, `.scopx` and `.dds` files with a `<name>.json` note of its level,
  game time and purpose. Bank saves are named with letters, digits and `_`, which the console takes.
- `probes` holds Lua probes for `game_lua`.
- `dumps` holds `game_dump` captures and their comparisons.
- `screenshots` holds full-size screenshots.

## Examples

```sh
npm run cli -- mcp build
npm run cli -- mcp build --scripts
npm run cli -- start_game --mcp --new
npm run cli -- mcp clean
```
