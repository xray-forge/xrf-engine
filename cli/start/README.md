# [XRF](../../) / CLI / START_GAME

`start_game` launches the executable configured in [`cli/config.json`](../config.json).

```sh
npm run cli -- start_game [options]
```

`--new` and `--load` skip the main menu. They cannot be used together.

## Options

- `-n, --new` starts a new game directly.
- `-l, --load <save>` loads a named save directly.
- `-d, --difficulty <difficulty>` selects `gd_novice`, `gd_stalker`, `gd_veteran`, or `gd_master` for an instant start.
- `--ni, --no-intro` skips the logo video before the main menu, which an instant start skips anyway. The new game
  intro still plays: `-nogameintro` is never passed, as the engine checks `-nogame` by substring and would start
  without the game module.
- `--fl, --flushlog` flushes the engine log after every line, which helps diagnose crashes.

## Examples

```sh
npm run cli -- start_game
npm run cli -- start_game --new --difficulty gd_master
npm run cli -- start_game --load my_save --flushlog
```
