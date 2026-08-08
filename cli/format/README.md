# [XRF](../../) / CLI / FORMAT

`format ltx` formats the project's LTX files.

```sh
npm run cli -- format ltx [paths...] [options]
```

When no paths are provided, the whole game configs folder is formatted. Provided paths may be
individual files or folders, and folders are searched recursively for `.ltx` files.

## Options

- `-c, --check` reports formatting differences without writing files.
- `-v, --verbose` prints detailed formatter logs.

## Examples

```sh
npm run cli -- format ltx --check
npm run cli -- format ltx
npm run cli -- format ltx src/engine/configs/misc/items/outfit.ltx
npm run cli -- format ltx src/engine/configs/misc --check
```
