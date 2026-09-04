import { default as assert } from "node:assert";
import * as fs from "node:fs";
import * as path from "node:path";

import { blue, yellow, yellowBright } from "chalk";

import { build } from "#/build/build";
import { compress } from "#/compress/compress";
import { default as config } from "#/config.json";
import { isValidEngine } from "#/engine/list_engines";
import {
  CLI_DIR,
  OPEN_XRAY_ENGINES_DIR,
  TARGET_DATABASE_DIR,
  TARGET_GAME_DATA_DIR,
  TARGET_GAME_PACKAGE_DIR,
  WARNING_SIGN,
} from "#/globals";
import { IPackParameters } from "#/pack/pack";
import { createDirIfNoExisting } from "#/utils/fs/create_dir_if_no_existing";
import { NodeLogger } from "#/utils/logging";
import { TimeTracker } from "#/utils/timing";

const log: NodeLogger = NodeLogger.forFile(__filename);

/**
 * Pack engine and gamedata into the complete game, ensure everything works correctly.
 */
export async function packGame(parameters: IPackParameters): Promise<void> {
  NodeLogger.IS_VERBOSE = Boolean(parameters.verbose);

  try {
    log.info("Packaging new game:", blue(new Date().toLocaleString()));
    log.debug("Running with parameters:", parameters);

    const engine: string = String(parameters.engine || config.package.engine).trim();

    if (parameters.engine) {
      log.info("Using engine override:", blue(parameters.engine));
    } else {
      log.info("Using configured engine:", blue(engine));
    }

    if (parameters.skipEngine) {
      throw new Error("Cannot build game package without engine, unsupported --skip-engine supplied.");
    }

    if (parameters.optimize) {
      log.info("Using build with optimizations");
    } else {
      log.info("Using build without optimizations", WARNING_SIGN);
    }

    assert(isValidEngine(engine), `Expected engine to be valid, got '${engine}'.`);

    const timeTracker: TimeTracker = new TimeTracker().start();
    const isBuildRequired: boolean = Boolean(parameters.build);
    const isCompressionRequired: boolean = Boolean(parameters.compress);

    if (parameters.clean) {
      log.info("Perform package cleanup:", yellowBright(TARGET_GAME_PACKAGE_DIR));
      fs.rmSync(TARGET_GAME_PACKAGE_DIR, { recursive: true, force: true });
      timeTracker.addMark("PACKAGE_CLEANUP");
    } else {
      log.info("Skip package cleanup:", WARNING_SIGN);
      timeTracker.addMark("PACKAGE_CLEANUP_SKIP");
    }

    // If needed, proceed with full build and compression step.
    if (isBuildRequired) {
      log.info("Packaging from new assets, starting build");
      log.pushNewLine();

      await build({
        clean: true,
        assetOverrides: Boolean(parameters.assetOverrides),
        verbose: parameters.verbose,
        luaLogs: !parameters.optimize,
        include: "all",
        exclude: [],
        filter: [],
      });

      if (isCompressionRequired) {
        log.info("Starting assets DB compress", "\n");
        compress({ clean: true, verbose: parameters.verbose, include: "all" });
      } else {
        log.info("Skip compression step");
      }
    } else {
      log.info("Packaging from already built assets", WARNING_SIGN);
    }

    copyGameEngine(engine);
    timeTracker.addMark("PACKAGE_GAME_BIN");

    if (isCompressionRequired) {
      copyDatabaseAssets();
      timeTracker.addMark("PACKAGE_DB");

      copyGamedataAssets();
      timeTracker.addMark("PACKAGE_GAMEDATA_FILTERED");
    } else {
      timeTracker.addMark("SKIP_PACKAGE_DB");

      copyGamedataAssets(false);
      timeTracker.addMark("PACKAGE_GAMEDATA_ALL");
    }

    copyRootAssets();
    timeTracker.addMark("PACKAGE_CONFIGS");

    timeTracker.end();

    log.info("Successfully executed pack command, took:", timeTracker.getDuration() / 1000, "sec");
    log.info("Check game build at:", yellowBright(TARGET_GAME_PACKAGE_DIR), "\n");
  } catch (error) {
    log.error("Failed to execute packaging command:", error);

    throw error;
  }
}

/**
 * Copy engine binaries for package.
 */
function copyGameEngine(engine: string): void {
  const destinationPath: string = path.resolve(TARGET_GAME_PACKAGE_DIR, "bin");
  const enginePath: string = path.resolve(OPEN_XRAY_ENGINES_DIR, engine, "bin");
  const engineDescriptorPath: string = path.resolve(destinationPath, "bin.json");

  log.info("Copy game engine binaries:", yellow(enginePath), "->", yellowBright(destinationPath));
  log.info("Using game engine:", blue(config.package.engine));
  log.info("Engine path:", yellowBright(enginePath));

  assert(fs.existsSync(enginePath), "Expected engine directory to exist.");

  createDirIfNoExisting(destinationPath);
  fs.cpSync(enginePath, destinationPath, { recursive: true });

  /**
   * Remove bin.json with engine description.
   */
  if (fs.existsSync(engineDescriptorPath)) {
    fs.rmSync(engineDescriptorPath);
  }
}

/**
 * Copy gamedata assets needed for the game build.
 *
 * @param isFiltered - Whether gamedata should be copied with applied filtering based on compressed DBs content.
 */
function copyGamedataAssets(isFiltered: boolean = true): void {
  const destinationPath: string = path.resolve(TARGET_GAME_PACKAGE_DIR, "gamedata");

  log.info(
    "Copy gamedata assets:",
    yellow(TARGET_GAME_DATA_DIR),
    "->",
    yellowBright(destinationPath),
    "mode:",
    isFiltered ? "filtered" : "all"
  );

  assert(fs.existsSync(TARGET_GAME_DATA_DIR), "Expected gamedata directory to exist.");

  createDirIfNoExisting(destinationPath);

  if (isFiltered) {
    config.package.gamedata.forEach((it) => {
      log.debug("CP:", it);
      fs.cpSync(path.resolve(TARGET_GAME_DATA_DIR, it), path.resolve(destinationPath, it), { recursive: true });
    });
  } else {
    fs.cpSync(TARGET_GAME_DATA_DIR, destinationPath, { recursive: true });
  }
}

/**
 * Copy game resources / archives for database.
 */
function copyDatabaseAssets(): void {
  const destinationPath: string = path.resolve(TARGET_GAME_PACKAGE_DIR, "db");

  log.info("Copy game archives:", yellow(TARGET_DATABASE_DIR), "->", yellowBright(destinationPath));

  assert(
    fs.existsSync(TARGET_DATABASE_DIR),
    "Expected compressed db directory to exist. Did you forget to run compress step?"
  );

  createDirIfNoExisting(destinationPath);

  log.debug("CP:", TARGET_DATABASE_DIR);
  fs.cpSync(TARGET_DATABASE_DIR, destinationPath, { recursive: true });
}

/**
 * Copy game configs for root dir.
 * Default graphics settings and FS mappings.
 */
function copyRootAssets(): void {
  log.info("Copy static game root assets");

  for (const asset of config.package.rootAssets) {
    const fromPath: string = path.resolve(CLI_DIR, asset);
    const toPath: string = path.resolve(TARGET_GAME_PACKAGE_DIR, path.basename(fromPath));

    log.info("Copy game root asset:", yellow(fromPath), "->", yellowBright(toPath));

    assert(fs.existsSync(fromPath), `Expected '${asset}' to exist at '${fromPath}'.`);

    log.debug("CP:", toPath);
    fs.cpSync(fromPath, toPath);
  }
}
