<img src="https://xray-forge.github.io/xrf-book/images/xrf-engine-banner%400.5x.png" alt="XRF Engine">

# XRF Engine

[![book](https://img.shields.io/badge/docs-book-blue.svg?style=flat)](https://xray-forge.github.io/xrf-book)
[![types](https://img.shields.io/badge/docs-types-blue.svg?style=flat)](https://xray-forge.github.io/xrf-xray16-sdk/index.html)
[![language-ts](https://img.shields.io/badge/language-typescript-blue.svg?style=flat)](https://www.typescriptlang.org/)
[![license](https://img.shields.io/badge/license-MIT-blue.svg?style=flat)](./LICENSE)
<br/>
[![status](https://github.com/xray-forge/xrf-engine/actions/workflows/build_and_test.yml/badge.svg)](https://github.com/xray-forge/xrf-engine/actions/workflows/build_and_test.yml)
[![codecov](https://codecov.io/gh/xray-forge/xrf-engine/graph/badge.svg?token=4D1ZLNG8YJ)](https://codecov.io/gh/xray-forge/xrf-engine)

XRF Engine is a TypeScript scripting layer and build toolchain for S.T.A.L.K.E.R.: Call of Pripyat–style X-Ray 1.6.
It compiles scripts to Lua, assembles game data, and provides the workflows needed to develop, validate, and
package a mod.

## In short

- TypeScript scripts compiled to Lua with [TypeScriptToLua](https://typescripttolua.github.io/docs/getting-started) and
  static type checks.
- A project [CLI](https://xray-forge.github.io/xrf-book/xrf/cli/cli.html) and
  [build pipeline](https://xray-forge.github.io/xrf-book/xrf/building/building.html) that assemble scripts, configs,
  JSX UI forms, translations, and resources into `target/gamedata`.
- [Mod and game packaging](https://xray-forge.github.io/xrf-book/xrf/cli/commands/pack.html), plus local game links and
  engine-variant management for development.
- [Modular extensions](https://xray-forge.github.io/xrf-book/xrf/extensions.html) for opt-in behavior changes.
- Jest unit tests, project and game-data verification, and consistent code, LTX, and configuration checks.
- [XRF Tools](https://github.com/xray-forge/xrf-tools) for archive, spawn, sprite, translation, and other asset
  workflows.

## Purpose

- Provide a typed, documented foundation for X-Ray 1.6 mod development.
- Keep source code, configuration, SDK references, and project tooling readable and maintainable.
- Automate repeatable build, validation, local-game, and packaging steps.

---

## Links

- [Start an XRF project](https://xray-forge.github.io/xrf-book/INSTALLATION.html)
- [CLI commands](https://xray-forge.github.io/xrf-book/xrf/cli/cli.html)
- [Build pipeline](https://xray-forge.github.io/xrf-book/xrf/building/building.html)
- [XRF Book](https://xray-forge.github.io/xrf-book/)
- [X-Ray 16 SDK](https://xray-forge.github.io/xrf-xray16-sdk/index.html) and
  [source](https://github.com/xray-forge/xrf-xray16-sdk)

## What is used

- [Node.js](https://nodejs.org/)
- [TypeScript](https://www.typescriptlang.org/)
- [TypeScriptToLua](https://typescripttolua.github.io/docs/getting-started)
- [Jest](https://jestjs.io/)
- [X-Ray 16 TypeScript SDK](https://github.com/xray-forge/xrf-xray16-sdk)
- [OpenXRay](https://github.com/OpenXRay/xray-16)
- [XRF Tools](https://github.com/xray-forge/xrf-tools)

## Changes / differences from original

See the complete [change list](https://xray-forge.github.io/xrf-book/CHANGES.html).

XRF aims to make mod development easier without changing the original plot by default. Improvements to performance,
quality, and gameplay logic belong in the core project when they preserve that goal. Larger or incompatible behavior
changes belong in extensions.

## Credits

[Credits](https://xray-forge.github.io/xrf-book/CREDITS.html)

## License

XRF Engine is available under the [MIT License](./LICENSE). This community project is not affiliated with GSC Game World.
When using XRF Engine and OpenXRay to modify S.T.A.L.K.E.R. games, follow the applicable official EULA and Fan Content
Creation Guidelines:

- https://www.gsc-game.com/eula/
- https://www.gsc-game.com/guidelines/
