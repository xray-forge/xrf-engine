# [XRF](../) / CLI

The XRF CLI builds and verifies the engine, manages a local game installation, and provides asset-maintenance tools.
Run every command from the repository root:

```sh
npm run cli -- <command> [options]
```

Run `npm run cli -- --help` to see the commands registered by the current checkout. Commands that access a game
installation use [`config.json`](config.json); review its paths before using `link`, `engine`, `start_game`, or `pack`.

## Commands

- [`build`](build/README.md) assembles scripts, configs, forms, translations, and resources into `target/gamedata`.
- [`checks`](checks/README.md) builds and removes on-demand in-game verification flows.
- [`clone`](clone/README.md) clones configured optional resource repositories.
- [`compress`](compress/README.md) compresses the built `gamedata` into archives.
- [`engine`](engine/README.md) selects, inspects, and restores bundled engine variants.
- [`format`](format/README.md) formats LTX files.
- [`link`](link/README.md) creates and removes development junctions for the game, `gamedata`, and logs.
- [`logs`](logs/README.md) prints the tail of the linked engine log.
- [`open`](open/README.md) opens the configured game or project directory in the operating system file manager.
- [`pack`](pack/README.md) produces `mod` or `game` packages.
- [`parse`](parse/README.md) writes a directory tree as JSON.
- [`particles`](particles/README.md) packs and unpacks `particles.xr` files.
- [`spawn`](spawn/README.md) unpacks ALife spawn files.
- [`sprites`](sprites/README.md) packs and unpacks the equipment sprite and UI description sprites.
- [`start`](start/README.md) launches the configured game executable.
- [`test`](test/README.md) runs the Jest test suite.
- [`utils`](utils/README.md) contains shared implementation helpers; it has no standalone command.
- [`verify`](verify/README.md) validates the project, built `gamedata`, LTX, particles, translations, and extern
  manifests.

## Related npm scripts

`npm run build` and `npm run verify` are shortcuts for the normal build and project-verification flows. Use
`npm run typecheck`, `npm run lint`, and `npm test` for the corresponding development checks.
