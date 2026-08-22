import * as fs from "node:fs";
import * as fsp from "node:fs/promises";
import * as path from "node:path";

import { blueBright, yellowBright } from "chalk";

import { IBuildCommandParameters } from "#/build/build";
import { RESOURCES_DIR, TARGET_GAME_DATA_DIR } from "#/globals/paths";
import { getProjectAssetsRoots } from "#/utils/build";
import { getDiffs, IDiffs } from "#/utils/fs/get_diffs";
import { readFolderGen } from "#/utils/fs/read_dir_content_flat_gen";
import { NodeLogger } from "#/utils/logging";
import { Nullable } from "#/utils/types";

const log: NodeLogger = NodeLogger.forFile(__filename);

const UNEXPECTED_ENTITIES: Array<string> = ["core", "configs", "forms,", "lib", "scripts"];
const EXCLUDED_ENTITIES: Array<string> = [
  "README.md",
  "LICENSE",
  ".git",
  ".gitignore",
  ".gitattributes",
  "textures_unpacked",
  "particles_unpacked",
];

/**
 * Build mod statics from configured destinations.
 */
export async function buildResourcesStatics(parameters: IBuildCommandParameters): Promise<void> {
  log.info(blueBright("Build resources"));

  const resourceRoots: Array<string> = (
    parameters.assetOverrides ? [...getProjectAssetsRoots(parameters.language), RESOURCES_DIR] : [RESOURCES_DIR]
  ).filter((it) => {
    log.debug("Resources folder candidate check:", yellowBright(it));

    return fs.existsSync(it);
  });

  // todo: Build diff as static step and only then copy. Same resource can be present in few folders.
  // todo: Build diff as static step and only then copy. Same resource can be present in few folders.
  // todo: Build diff as static step and only then copy. Same resource can be present in few folders.

  if (resourceRoots.length) {
    log.info("Process folders with resources:", resourceRoots.length);

    for (const folderPath of resourceRoots) {
      const sourcePaths: Array<string> = await validateResources(folderPath);

      for (const sourcePath of sourcePaths) {
        const relativePath: string = sourcePath.slice(folderPath.length);
        const targetDir: string = path.join(TARGET_GAME_DATA_DIR, relativePath);
        const isDirectory: boolean = (await fsp.stat(sourcePath)).isDirectory();

        if (isDirectory) {
          await copyStaticResources(sourcePath, targetDir, parameters.filter);
        } else {
          await copyStaticResource(sourcePath, targetDir, parameters.filter);
        }
      }
    }
  } else {
    log.info("No resources sources found");
  }
}

/**
 * Get valid resources paths from provided folder directory.
 */
async function validateResources(folderPath: string): Promise<Array<string>> {
  const folders: Array<fs.Dirent> = await fsp.readdir(folderPath, { withFileTypes: true });

  function allowFiles(dirent: fs.Dirent): Nullable<string> {
    const name: string = dirent.name;
    const target: string = path.join(folderPath, name);

    if (EXCLUDED_ENTITIES.includes(name)) {
      log.debug("SKIP EXCLUDED:", name, "=>", target);

      return null;
    }

    if (dirent.isDirectory()) {
      // Do not allow copy of folders that overlap with auto-generated code.
      if (UNEXPECTED_ENTITIES.includes(name)) {
        throw new Error(`Provided not expected directory for resources copy: '${name}'.`);
      }

      // Do not copy hidden folders.
      if (name.startsWith(".")) {
        return null;
      }
    }

    return target;
  }

  return folders.map(allowFiles).filter(Boolean) as Array<string>;
}

/**
 * Copy provided asset resource.
 */
async function copyStaticResource(from: string, to: string, filters: Array<string> = []): Promise<void> {
  if (!filters.length || filters.some((filter) => from.match(filter))) {
    log.debug("CP:", yellowBright(from), "=>", yellowBright(to));
    await fsp.cp(from, to);
  } else {
    log.debug("SKIP:", yellowBright(from), "=>", yellowBright(to));
  }
}

/**
 * Copy provided assets directory resources if directory exists.
 */
async function copyStaticResources(from: string, to: string, filters: Array<string> = []): Promise<void> {
  const diffs: IDiffs = await getDiffs(from, to);
  const prefixLen: number = from.length + path.sep.length;
  const additions: Set<string> = new Set(diffs.additions.files.map(path.normalize));

  for await (const filePath of readFolderGen(from)) {
    const relPath: string = filePath.slice(prefixLen);
    const fromFile: string = path.join(from, relPath);
    const toFile: string = path.join(to, relPath);

    if (filters.length && !filters.some((filter) => fromFile.match(filter))) {
      log.debug("FILTERED OUT:", yellowBright(fromFile), "=>", yellowBright(to));
      continue;
    }

    if (!additions.has(relPath)) {
      log.debug("SKIP NO DIFF:", yellowBright(fromFile));
      continue;
    }

    log.debug("CP:", yellowBright(fromFile), "=>", yellowBright(to));
    await fsp.cp(fromFile, toFile);
  }
}
