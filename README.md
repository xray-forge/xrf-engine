<img src="https://xray-forge.github.io/xrf-book/images/xrf-engine-banner%400.5x.png">

# XRF Engine

[![book](https://img.shields.io/badge/docs-book-blue.svg?style=flat)](https://xray-forge.github.io/xrf-book)
[![types](https://img.shields.io/badge/docs-types-blue.svg?style=flat)](https://xray-forge.github.io/xrf-xray16-sdk/index.html)
[![language-ts](https://img.shields.io/badge/language-typescript-blue.svg?style=flat)](https://github.com/xray-forge/xrf-engine/search?l=typescript)
[![license](https://img.shields.io/badge/license-MIT-blue.svg?style=flat)](https://github.com/Neloreck/dreamstate/blob/master/LICENSE)
<br/>
![status](https://github.com/xray-forge/xrf-engine/actions/workflows/build_and_test.yml/badge.svg)
[![codecov](https://codecov.io/gh/xray-forge/xrf-engine/graph/badge.svg?token=4D1ZLNG8YJ)](https://codecov.io/gh/xray-forge/xrf-engine)

<p>
Fully rewritten stalker script engine with typescript. <br/>
</p>

## In short

- Faster development with typescript and static analysis
- Custom [CLI](https://xray-forge.github.io/xrf-book/xrf/cli/cli.html) and [build pipeline](https://xray-forge.github.io/xrf-book/xrf/building/building.html), [dev tools](https://github.com/xray-forge/xrf-tools)
  - Scripts engine rewritten with typescript ([tstl](https://typescripttolua.github.io/docs/getting-started))
  - [Generation UI forms from JSX](https://xray-forge.github.io/xrf-book/xrf/building/building_ui.html)
  - [Building game configs](https://xray-forge.github.io/xrf-book/xrf/building/building_configs.html)
  - [Simple translations generation](https://xray-forge.github.io/xrf-book/xrf/building/building_translations.html)
- [Creation of custom modded game packages](https://xray-forge.github.io/xrf-book/xrf/cli/commands/pack.html)
- [Modular extensions](https://xray-forge.github.io/xrf-book/xrf/extensions.html)
- [Unit testing](https://xray-forge.github.io/xrf-book/xrf/cli/commands/test.html)
- Consistent code [formatting](https://xray-forge.github.io/xrf-book/xrf/cli/commands/format.html),
  [linting](https://xray-forge.github.io/xrf-book/xrf/cli/commands/lint.html),
  [configs format and verification](https://xray-forge.github.io/xrf-book/tools/cli/cli.html)

## Purpose

- Provide shared up-to-date template and tools for mod development
- Produce documented and readable code, document xray SDK
- Simplify development and building process, automate some steps

---

## Links

- [Starting work](https://xray-forge.github.io/xrf-book/INSTALLATION.html)
- [CLI commands](https://xray-forge.github.io/xrf-book/xrf/cli/commands.html)
- [Docs](https://xray-forge.github.io/xrf-book/GENERAL.html)
- [X-Ray 16 SDK](https://xray-forge.github.io/xrf-xray16-sdk/modules.html), [source](https://github.com/xray-forge/xrf-xray16-sdk)

## What is used

- [NodeJS](https://nodejs.org/en/)
- [Typescript](https://www.typescriptlang.org/)
- [TypeScriptToLua](https://typescripttolua.github.io/docs/getting-started)
- [Jest](https://jestjs.io/)
- [Fengari Lua VM](https://github.com/fengari-lua/fengari)
- [Open-X-Ray](https://github.com/OpenXRay/xray-16)
- [XRF tools](https://github.com/xray-forge/xrf-tools)

## Changes / differences from original

Full changes list: [changelist](https://xray-forge.github.io/xrf-book/CHANGES.html)

The intention of this engine is to allow easier modding without introducing breaking changes to the original plot. <br/>
Optimizations, quality and logics updates are welcome.

Breaking / radical changes can be implemented as extensions.

## Credits

[Link.](https://xray-forge.github.io/xrf-book/CREDITS.html)

## License

This community project is not affiliated with GSC Game World in any way.\
When using XRF script engine and OpenXRay for making modifications for S.T.A.L.K.E.R. games developed by GSC Game World,
follow the official EULA and Fan Content Creation Guidelines:

- https://www.gsc-game.com/eula/
- https://www.gsc-game.com/guidelines/
