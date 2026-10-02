import * as fs from "node:fs";
import * as path from "node:path";

import { Nullable } from "#/utils/types";

/**
 * Files one game save is made of: the engine save, xrf's own data beside it, and its picture.
 */
export const SAVE_FILE_EXTENSIONS: ReadonlyArray<string> = [".scop", ".scopx", ".dds"];

/**
 * Save kept in the bank, with what was known when it was banked.
 */
export interface IBankedSave {
  name: string;
  files: Array<string>;
  bankedAt: string;
  level?: Nullable<string>;
  gameTime?: Nullable<string>;
  note?: Nullable<string>;
}

/**
 * @param name - Save name.
 * @returns Whether it is a name the bank and the game console both take: letters, digits and underscores.
 */
export function isValidSaveName(name: string): boolean {
  return /^[A-Za-z0-9_]+$/.test(name);
}

/**
 * Copy a save from the game's saves folder into the bank, with a description beside it.
 *
 * @param savedgames - Game's saves folder.
 * @param bank - Bank folder.
 * @param save - Description of the save; its files are filled in.
 * @returns The banked save.
 */
export function bankSave(savedgames: string, bank: string, save: Omit<IBankedSave, "files">): IBankedSave {
  const files: Array<string> = SAVE_FILE_EXTENSIONS.map((extension) => `${save.name}${extension}`).filter((file) =>
    fs.existsSync(path.join(savedgames, file))
  );

  if (!files.includes(`${save.name}.scop`)) {
    throw new Error(`The game wrote no save '${save.name}'.`);
  }

  fs.mkdirSync(bank, { recursive: true });
  files.forEach((file) => fs.copyFileSync(path.join(savedgames, file), path.join(bank, file)));

  const banked: IBankedSave = { ...save, files };

  fs.writeFileSync(path.join(bank, `${save.name}.json`), JSON.stringify(banked, null, 2) + "\n");

  return banked;
}

/**
 * Copy a banked save into the game's saves folder, replacing the game's copy, as the bank is the one tools rely on.
 *
 * @param bank - Bank folder.
 * @param savedgames - Game's saves folder.
 * @param name - Save name.
 * @returns Whether the bank had the save.
 */
export function restoreSave(bank: string, savedgames: string, name: string): boolean {
  const banked: Nullable<IBankedSave> = readBankedSave(bank, name);

  if (!banked) {
    return false;
  }

  fs.mkdirSync(savedgames, { recursive: true });
  banked.files.forEach((file) => fs.copyFileSync(path.join(bank, file), path.join(savedgames, file)));

  return true;
}

/**
 * @param bank - Bank folder.
 * @param name - Save name.
 * @returns The banked save, null when the bank lacks it.
 */
export function readBankedSave(bank: string, name: string): Nullable<IBankedSave> {
  const description: string = path.join(bank, `${name}.json`);

  return fs.existsSync(description) && fs.existsSync(path.join(bank, `${name}.scop`))
    ? (JSON.parse(fs.readFileSync(description, "utf8")) as IBankedSave)
    : null;
}

/**
 * @param bank - Bank folder.
 * @returns Banked saves by name.
 */
export function listBankedSaves(bank: string): Array<IBankedSave> {
  if (!fs.existsSync(bank)) {
    return [];
  }

  return fs
    .readdirSync(bank)
    .filter((file) => file.endsWith(".json"))
    .map((file) => readBankedSave(bank, path.basename(file, ".json")))
    .filter((it): it is IBankedSave => it !== null)
    .sort((left, right) => left.name.localeCompare(right.name));
}
