# [XRF](../../) / CLI / SPRITES

`sprites` packs and unpacks the equipment sprite and the sprites declared by XML texture descriptions. A sprite is the
whole sheet; an icon is one image inside it.

```sh
npm run cli -- sprites <command> [options]
```

## Commands

- `unpack-equipment` extracts the equipment sprite into separate icon files.
- `pack-equipment` creates the equipment sprite from separate icon files.
- `unpack-description` extracts the sprites an XML texture description declares.
- `pack-description` creates the sprites an XML texture description declares.

`pack-description` and `unpack-description` accept `-d, --description <name>`. All sprite commands accept
`-v, --verbose`; strict validation is enabled by default with `-s, --strict`.

## Examples

```sh
npm run cli -- sprites unpack-equipment
npm run cli -- sprites pack-equipment --verbose
npm run cli -- sprites unpack-description --description ui_actor_armor.xml
npm run cli -- sprites pack-description --description ui_actor_armor.xml
```
