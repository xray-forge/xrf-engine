import { default as assert } from "node:assert";
import * as cp from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

import { blue, blueBright, yellow, yellowBright } from "chalk";

import { default as config } from "#/compress/configs/compress.json";
import {
  TARGET_DATABASE_DIR,
  TARGET_DATABASE_LOGS_DIR,
  TARGET_GAME_DATA_DIR,
  TARGET_LOGS_DIR,
  XRF_UTILS_PATH,
} from "#/globals";
import { createDirIfNoExisting } from "#/utils/fs/create_dir_if_no_existing";
import { deleteFileIfExists } from "#/utils/fs/delete_file_if_exists";
import { NodeLogger } from "#/utils/logging";
import { TimeTracker } from "#/utils/timing";
import { Nullable } from "#/utils/types";

const log: NodeLogger = NodeLogger.forFile(__filename);

/**
 * Extension patterns every target keeps out.
 */
const EXCLUDED_EXTENSIONS: Array<string> = ["*.txt", "*.json"];

/**
 * Header written into every archive this step publishes.
 *
 * The engine reads these keys out of chunk 666, so they keep its own spelling. `entry_point` is what decides where the
 * contents mount; without it the loader treats a `.db` as an encrypted Shadow of Chernobyl archive.
 */
const ARCHIVE_HEADER: Array<[string, string]> = [
  ["auto_load", "true"],
  ["level_name", "single"],
  ["level_ver", "1.0"],
  ["entry_point", "$fs_root$\\gamedata\\"],
  ["creator", '"gsc game world"'],
  ["link", '"www.gsc-game.com"'],
];

export interface ICompressParameters {
  include: "all" | Array<string>;
  verbose?: boolean;
  clean?: boolean;
}

/**
 * The `--report` envelope `xrf-cli archive pack` writes, as far as this step reads it.
 */
interface IPackReport {
  outcome: "success" | "checkFailed" | "executionFailed";
  exitCode: number;
  error: Nullable<string>;
  result: Nullable<IPackReportResult>;
}

interface IPackReportResult {
  volumes: Array<string>;
  filesTotal: number;
  filesSkipped: number;
  filesCompressed: number;
  filesStored: number;
  filesAliased: number;
  sizeSource: number;
  sizeWritten: number;
  duration: number;
  speed: number;
}

/**
 * Where one target's pack report and log land.
 */
interface IPackArtifacts {
  report: string;
  log: string;
}

/**
 * Perform compression with xrf-cli.
 */
export function compress(parameters: ICompressParameters): void {
  NodeLogger.IS_VERBOSE = Boolean(parameters.verbose);

  const timeTracker: TimeTracker = new TimeTracker().start();

  log.info("XRF compress");
  log.debug("Current params:", JSON.stringify(parameters));

  if (parameters.clean) {
    log.info("Perform package cleanup:", yellowBright(TARGET_DATABASE_DIR));
    fs.rmSync(TARGET_DATABASE_DIR, { recursive: true, force: true });

    // The reports and logs describe the archives, so they go with them.
    log.info("Perform pack logs cleanup:", yellowBright(TARGET_DATABASE_LOGS_DIR));
    fs.rmSync(TARGET_DATABASE_LOGS_DIR, { recursive: true, force: true });
  }

  assert(fs.existsSync(TARGET_GAME_DATA_DIR), "Expected gamedata build directory to exist.");

  if (parameters.include !== "all") {
    parameters.include.forEach((it) => {
      assert(
        config[it as keyof typeof config],
        `Expected include to list existing field, got '${it}'. Valid options: '${Object.keys(config).join(",")}'.`
      );
    });
  }

  try {
    timeTracker.addMark("COMPRESS_PREPARATION");

    createDirIfNoExisting(TARGET_DATABASE_DIR);
    createDirIfNoExisting(TARGET_DATABASE_LOGS_DIR);

    for (const [key, descriptor] of Object.entries(config)) {
      if (parameters.include === "all" || parameters.include.includes(key)) {
        compressWithConfig(key, {
          fast: Boolean((descriptor as Record<string, unknown>)["fast"]),
          store: Boolean((descriptor as Record<string, unknown>)["store"]),
          folders: descriptor.folders,
          files: descriptor.files,
        });

        timeTracker.addMark(`COMPRESS_${key.toUpperCase()}`);
      } else {
        timeTracker.addMark(`COMPRESS_${key.toUpperCase()}_SKIP`);
      }
    }

    timeTracker.end();

    log.info("Successfully executed compress command, took:", timeTracker.getDuration() / 1000, "sec");
  } catch (error) {
    log.error("Failed to execute compression commands:", error);

    /**
     * A half written database is worse than none: packaging on would ship archives that do not match
     * the build. Let the failure reach the caller so `pack` stops instead of copying what is there.
     */
    throw error;
  } finally {
    collectLog();
  }
}

/**
 * Handle compression config with a separate xrf-cli call.
 */
function compressWithConfig(
  configName: string,
  { store, folders, files }: { fast?: boolean; store?: boolean; files: Array<string>; folders: Array<string> }
): void {
  log.info("Starting compression for:", blue(configName));
  log.info("Current workdir:", yellowBright(process.cwd()));

  log.info("Files:", blue(files.length));
  log.debug("Files:", yellow(JSON.stringify(files)));
  log.info("Folders:", blue(folders.length));
  log.debug("Folders:", yellow(JSON.stringify(JSON.stringify(folders))));

  const artifacts: IPackArtifacts = {
    report: path.resolve(TARGET_DATABASE_LOGS_DIR, `${configName}.json`),
    log: path.resolve(TARGET_DATABASE_LOGS_DIR, `${configName}.log`),
  };

  const args: Array<string> = [
    "archive",
    "pack",
    "-p",
    TARGET_GAME_DATA_DIR,
    "-d",
    TARGET_DATABASE_DIR,
    "-n",
    configName,
    /**
     * The packer refuses a destination already holding the set it would publish. This step owns the database
     * directory and rebuilds it every run, so replacing what an earlier run left there is the intent - without
     * `--clean` that is exactly what a second run does.
     */
    "--force",
  ];

  /**
   * Every folder is taken with its subtree, which is what the generated `<folder> = true` used to say.
   */
  for (const folder of folders) {
    args.push("--include-directory", folder);
  }

  for (const file of files) {
    args.push("--include-file", file);
  }

  for (const extension of EXCLUDED_EXTENSIONS) {
    args.push("--exclude-extension", extension);
  }

  for (const [key, value] of ARCHIVE_HEADER) {
    args.push("--header", `${key}=${value}`);
  }

  /**
   * `fast` is not passed on: it selected an LZO level xrCompress alone offered, and the packer has one.
   */
  if (store) {
    args.push("--store");
  }

  /**
   * Always verbose and always reported: the detail goes to the target's own files, not to the terminal.
   */
  args.push("--verbose", "--report", artifacts.report);

  log.info("Execute:", blue([XRF_UTILS_PATH, ...args].join(" ")));

  deleteFileIfExists(artifacts.report);

  runPack(args, artifacts);

  const report: IPackReport = readPackReport(artifacts.report);

  log.info("Pack report:", yellowBright(artifacts.report));
  log.info("Pack log:", yellowBright(artifacts.log));

  assert(report.result, `Expected pack report for '${configName}' to carry a result, got outcome '${report.outcome}'.`);

  logPackVerdict(report.result);

  log.info("Compression finished for:", yellow(configName));
}

/**
 * Run one pack, streaming everything the child says into the target's log file.
 */
function runPack(args: Array<string>, artifacts: IPackArtifacts): void {
  const descriptor: number = fs.openSync(artifacts.log, "w");
  let failure: unknown = null;

  try {
    cp.execFileSync(XRF_UTILS_PATH, args, { stdio: ["ignore", descriptor, descriptor] });
  } catch (error) {
    failure = error;
  } finally {
    fs.closeSync(descriptor);
  }

  if (NodeLogger.IS_VERBOSE) {
    process.stdout.write(fs.readFileSync(artifacts.log, "utf8"));
  }

  if (failure) {
    log.error("Compression failed, see pack log:", yellowBright(artifacts.log));

    throw failure;
  }
}

/**
 * Read the report a pack was asked to write.
 *
 * Missing or unreadable is a build failure, the same as the CLI's own contract for an undeliverable `--report`: the
 * step asked for it and downstream reads it, so a build without one is not a build that succeeded.
 */
function readPackReport(reportPath: string): IPackReport {
  assert(fs.existsSync(reportPath), `Expected pack report to be written at '${reportPath}'.`);

  try {
    return JSON.parse(fs.readFileSync(reportPath, "utf8")) as IPackReport;
  } catch (error) {
    throw new Error(`Expected pack report at '${reportPath}' to be valid JSON: ${String(error)}`);
  }
}

/**
 * Record the verdict of one pack in the build log, in the same totals the CLI prints and reports.
 */
function logPackVerdict(result: IPackReportResult): void {
  log.info("Volumes:", blue(result.volumes.length), yellow(JSON.stringify(result.volumes)));
  log.info(
    "Files:",
    blue(result.filesTotal),
    `(${result.filesCompressed} compressed, ${result.filesStored} stored, ${result.filesAliased} aliased,`,
    `${result.filesSkipped} skipped)`
  );
  log.info("Size:", blue(result.sizeSource), "source bytes,", blue(result.sizeWritten), "written bytes");
  log.info("Took:", blue(result.duration), "ms at", blue(result.speed), "bytes/s");
}

/**
 * Collect build detailed build log file.
 */
export function collectLog(): void {
  const fileLogPath: string = path.resolve(TARGET_LOGS_DIR, "xrf_db_compress.log");

  try {
    createDirIfNoExisting(TARGET_LOGS_DIR);
    deleteFileIfExists(fileLogPath);

    fs.writeFileSync(fileLogPath, NodeLogger.LOG_FILE_BUFFER.join(""));

    log.info(blueBright("File log collected:"), yellowBright(fileLogPath), "\n");
  } catch (error) {
    log.error("Failed to collect log:", error);
  }
}
