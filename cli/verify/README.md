# [XRF](../../) / CLI / VERIFY

`verify` runs focused validation commands for the project and generated game data.

```sh
npm run cli -- verify <command> [options]
```

## Commands

- `project` checks the configured LTX project state.
- `gamedata` validates the assembled `target/gamedata`; `--strict` also validates expensive asset payloads.
- `externs` compares the tracked extern manifest with declaration sources.
- `ltx` validates LTX project integrity and types.
- `particles-packed` validates packed particles.
- `particles-unpacked` validates unpacked particles.
- `translations` lists missing or invalid entries in the project translation dictionaries.

`gamedata`, `ltx`, `particles-packed`, `particles-unpacked`, and `translations` support `-v, --verbose`. `gamedata`
and `translations` support `-s, --strict`. Only `translations` supports `-l, --language <locale>`.

## Examples

```sh
npm run cli -- verify project
npm run cli -- verify externs
npm run cli -- verify ltx --verbose
npm run cli -- verify gamedata --strict
npm run cli -- verify translations --language ukr --strict
```
