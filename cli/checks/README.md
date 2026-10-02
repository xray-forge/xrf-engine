# [XRF](../../.) / CLI / CHECKS

`checks` manages on-demand in-game verification flows. These flow scripts are kept out of the regular build and are
transpiled into `gamedata` only when requested.

```sh
npm run cli -- checks <command> [options]
```

## Commands

- `build` transpiles available flows and writes their game-console launchers.
- `clean` removes generated flow scripts and launchers.
- `list` prints available flows and the console command for each one.

`build` and `clean` accept `-v, --verbose`. `pack mod` and `pack game` refuse gamedata holding flows or launchers, so run
`clean` before packaging from already built assets.

## Examples

```sh
npm run cli -- checks list
npm run cli -- checks build --verbose
npm run cli -- checks clean
```
