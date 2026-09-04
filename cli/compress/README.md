# [XRF](../../) / CLI / COMPRESS

`compress` converts an existing `target/gamedata` build into game archives. Run `build` first.

```sh
npm run cli -- compress [options]
```

## Options

- `-i, --include <targets...>` compresses only named archive targets. Valid names are defined in
  `cli/compress/configs/compress.json`.
- `-c, --clean` removes the previous compression destination and its pack logs before writing archives.
- `-v, --verbose` echoes each target's packing log to the terminal after it is written.

## Logs

Every target writes two files below `target/logs/db/`, whatever the verbosity:

- `<target>.log` is the full `xrf-cli archive pack --verbose` output: one line per directory, excluded directory,
  skipped file, placed entry with its outcome and sizes, and volume opened or closed. It is written as the packer runs,
  so a failed pack still names the volume it opened and the last entry it reached.
- `<target>.json` is the `--report` envelope with the pack totals: files, sizes, duration and speed.

`target/logs/xrf_db_compress.log` is the build-level log. It names both files for every target it packed and records
each target's verdict. A run that includes only some targets rewrites only their files, so the directory always
describes the archives currently in `target/db/`. A missing or unreadable report fails the build.

## Examples

```sh
npm run cli -- compress --clean
npm run cli -- compress --include scripts
```
