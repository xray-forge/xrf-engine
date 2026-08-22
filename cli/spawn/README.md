# [XRF](../../) / CLI / SPAWN

`spawn unpack` converts an ALife spawn file into LTX configurations.

```sh
npm run cli -- spawn unpack [options]
```

## Options

- `-p, --path <path>` selects the source spawn file.
- `-d, --dest <dest>` selects the output directory.
- `-f, --force` removes an existing unpacked destination when needed.
- `-v, --verbose` prints detailed logs.

## Example

```sh
npm run cli -- spawn unpack --path ../../xrf-resources-extended/spawns/all.spawn
```
