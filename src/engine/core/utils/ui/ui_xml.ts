import { CScriptXmlInit, getFS } from "xray16";
import { XmlInit } from "xray16/alias";
import { abort, isWideScreen, TPath } from "xray16/lib";
import { $isNotNil } from "xray16/macros";

import { roots } from "@/engine/constants/roots";
import { forgeConfig } from "@/engine/core/database/forge_config";

/**
 * Util to get XML file for current screen resolution.
 *
 * Todo: Respect dot-separated files in XRAY.
 * Todo: Respect folders in XRAY.
 *
 * @param path - Target path to parse xml from.
 * @param hasWideScreenSupport - If should check existence of `.16.xml` alternative and use it in wide screen.
 * @returns Normalized xml form file path.
 */
export function resolveXmlFormPath(path: TPath, hasWideScreenSupport: boolean = false): TPath {
  const base: string = path.endsWith(".xml") ? path.slice(0, path.length - 4) : path;
  const wideBase: string = base + ".16.xml";
  const canBeWide: boolean = hasWideScreenSupport && isWideScreen();

  /**
   * Warn about bad path in dev mode.
   */
  if (forgeConfig.DEBUG.IS_ENABLED) {
    const [hasNonWindowsChars] = string.find(path, "/");

    if ($isNotNil(hasNonWindowsChars)) {
      abort("Non-windows path for XML supplied:", path);
    }
  }

  return canBeWide && getFS().exist(roots.gameConfig, "ui\\" + wideBase) ? wideBase : base + ".xml";
}

/**
 * Resolve xml file by path and try parsing it.
 *
 * @param path - Xml form file path.
 * @param xml - Target xml form initializer, or it will be created from empty.
 * @param hasWideScreenSupport - If should check existence of `.16.xml` alternative and use it in wide screen.
 * @returns Xml initialized based on provided path.
 */
export function resolveXmlFile(
  path: TPath,
  xml: XmlInit = new CScriptXmlInit(),
  hasWideScreenSupport: boolean = false
): XmlInit {
  xml.ParseFile(resolveXmlFormPath(path, hasWideScreenSupport));

  return xml;
}
