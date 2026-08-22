import * as fs from "node:fs";
import * as fsp from "node:fs/promises";
import * as path from "node:path";

import { green, red, yellow, yellowBright } from "chalk";
import { XMLParser } from "fast-xml-parser";
import { decode, encodingExists } from "iconv-lite";

import { default as config } from "#/config.json";
import { TARGET_PARSED_DIR, WINDOWS_1251_LOCALES } from "#/globals";
import { createDirIfNoExisting } from "#/utils/fs/create_dir_if_no_existing";
import { exists } from "#/utils/fs/exists";
import { isDirectory } from "#/utils/fs/is_directory";
import { readDirContentFlat } from "#/utils/fs/read_dir_content_flat";
import { NodeLogger } from "#/utils/logging";
import {
  AnyObject,
  EAssetExtension,
  EEncoding,
  IJsonTranslationSchema,
  IXmlTranslationSchema,
  Nullable,
} from "#/utils/types";

const log: NodeLogger = NodeLogger.forFile(__filename);

const DEFAULT_TARGET_ENCODING_CHECK_LIMIT: number = 64;

interface IParseTranslationParameters {
  encoding?: string;
  output?: string;
  clean?: boolean;
  language?: string;
  verbose?: boolean;
}

/**
 * Parse provided file path as JSON.
 */
export async function parseTranslationAsJson(target: string, parameters: IParseTranslationParameters): Promise<void> {
  NodeLogger.IS_VERBOSE = Boolean(parameters.verbose);

  const locale: string = getTargetLocale(parameters);
  const encoding: string = String(parameters.encoding);
  const output: string = parameters.output ? path.resolve(parameters.output) : TARGET_PARSED_DIR;

  const isCustomOutput: boolean = output !== TARGET_PARSED_DIR;

  log.info("Parsing translation:", yellow(target), green(locale));
  log.debug("Running with parameters:", parameters);

  // Throw, no path exists.
  if (!(await exists(target))) {
    log.error("Cannot find path for parsing:", red(target));

    throw new Error("Provided path does not exist.");
  }

  const isSourceDirectory: boolean = await isDirectory(target);
  const isOutputDirectory: boolean = await isDirectory(output);

  if (isCustomOutput && isSourceDirectory && !isOutputDirectory) {
    throw new Error(`Trying to write whole translations directory to a single file: '${target}' -> '${output}'.`);
  }

  const files: Array<string> = isSourceDirectory
    ? (await readDirContentFlat(target)).filter((it) => path.extname(it) === EAssetExtension.XML)
    : [target];

  if (parameters.clean) {
    log.info("Clean target output:", yellow(output));
    fs.rmSync(output, isOutputDirectory ? { recursive: true, force: true } : { force: true });
  }

  try {
    for (const it of files) {
      const data: IJsonTranslationSchema = await parseXmlToJson(it, encoding, locale);
      const fileDetails: path.ParsedPath = path.parse(it);
      const destination: string = isOutputDirectory
        ? path.resolve(output, `${fileDetails.name}${EAssetExtension.JSON}`)
        : path.resolve(output);

      const isDestinationExisting: boolean = await exists(destination);

      if (createDirIfNoExisting(output)) {
        log.debug("MKDIR:", yellowBright(output));
      }

      log.debug("Write file:", yellow(destination));

      const base: AnyObject = isDestinationExisting ? JSON.parse((await fsp.readFile(destination)).toString()) : {};
      const content: string = JSON.stringify(transformXmlToJSON(data, locale, base), null, 2) + "\n";

      await fsp.writeFile(destination, content);

      log.info("Saved resulting file to:", yellow(destination));
    }
  } catch (error) {
    log.error("Parsing of translations failed:", error instanceof Error ? error?.message : error);
    throw error;
  }
}

/**
 * Transform XML to JSON translation.
 */
function transformXmlToJSON(schema: AnyObject, locale: string, base: AnyObject = {}): IJsonTranslationSchema {
  if (!isValidSchema(schema)) {
    throw new Error("Invalid XML schema file provided, expected XRay translations XML file.");
  }

  return schema["string_table"]["string"].reduce((acc: IJsonTranslationSchema, it) => {
    const currentTranslationId: string = it["@_id"];
    const currentTranslationRecord: AnyObject = acc[currentTranslationId] || {};

    acc[currentTranslationId] = config.available_locales.reduce(
      (translation: Record<string, string | Array<string>>, lang: string) => {
        if (lang === locale) {
          translation[lang] = it.text.includes("\\n") ? it.text.split("\\n") : (it.text ?? null);
        } else {
          translation[lang] = currentTranslationRecord[lang] ?? null;
        }

        return translation;
      },
      {}
    );

    return acc;
  }, base);
}

/**
 * Check whether provided XML is valid.
 */
function isValidSchema(record: AnyObject): record is IXmlTranslationSchema {
  return (
    record["string_table"] &&
    typeof record["string_table"] === "object" &&
    Array.isArray(record["string_table"]["string"])
  );
}

/**
 * Parse provided file content to JSON.
 */
async function parseXmlToJson(file: string, encoding: string, locale: string): Promise<Record<string, any>> {
  const parser: XMLParser = new XMLParser({
    ignoreAttributes: false,
    isArray: (tag) => tag === "string",
    stopNodes: ["*.text"],
  });
  const data: Buffer = fs.readFileSync(file);

  const defaultEncoding: EEncoding = WINDOWS_1251_LOCALES.includes(locale)
    ? EEncoding.WINDOWS_1251
    : EEncoding.WINDOWS_1250;
  const usedEncoding: EEncoding = (encoding ?? readEncodingFromBuffer(data) ?? defaultEncoding) as EEncoding;

  log.info("Parsing file with encoding:", green(usedEncoding), yellowBright(file));

  return parser.parse(decode(data, usedEncoding));
}

/**
 * Get locale to use as a key.
 */
function getTargetLocale(parameters: IParseTranslationParameters): string {
  const locale: string = parameters.language ?? "";

  if (config.available_locales.includes(locale)) {
    log.debug("Using parameter locale:", locale);

    return locale;
  } else {
    throw new Error(`Unknown locale supplied with --language parameter: '${locale}'.`);
  }
}

/**
 * Try to guess encoding from the XML file.
 */
function readEncodingFromBuffer(buffer: Buffer): Nullable<string> {
  const beginning: string = buffer.toString(EEncoding.UTF_8, 0, DEFAULT_TARGET_ENCODING_CHECK_LIMIT);
  const matches: Nullable<RegExpMatchArray> = beginning.match(/encoding="(.+)"/);

  if (matches && matches.length > 1 && encodingExists(matches[1])) {
    log.debug("Guessed encoding from XML heading:", matches[1]);

    return matches[1];
  } else {
    log.debug("No matching encoding found in parsed file", buffer.length);

    return null;
  }
}
