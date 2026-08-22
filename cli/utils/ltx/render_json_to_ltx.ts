import { ILtxConfigDescriptor, ILtxFieldDescriptor, LTX_EXTEND, LTX_INCLUDE, LTX_ROOT, renderField } from "#/utils/ltx";
import { Nullable } from "#/utils/types";

type TPossibleFieldDescriptorBase = Record<string, ILtxFieldDescriptor<unknown>> | Array<ILtxFieldDescriptor<unknown>>;
type TPossibleFieldDescriptorFull = TPossibleFieldDescriptorBase | (() => TPossibleFieldDescriptorBase);

const LTX_EOL: string = "\r\n";

/**
 * Render section name based on provided descriptors and metadata.
 * Based on parameters may return section header, empty value for roots and header combined with 'extend' syntax.
 */
function renderSectionName(name: string | typeof LTX_ROOT, descriptorRaw: TPossibleFieldDescriptorFull): string {
  if (name === LTX_ROOT) {
    return LTX_EOL;
  } else {
    const extendsMeta: Nullable<string | Array<string>> = (descriptorRaw as Record<symbol, string | Array<string>>)[
      LTX_EXTEND
    ];

    if (extendsMeta) {
      return `${LTX_EOL}[${name}]:${Array.isArray(extendsMeta) ? extendsMeta.join(",") : extendsMeta}${LTX_EOL}`;
    } else {
      return `${LTX_EOL}[${name}]${LTX_EOL}`;
    }
  }
}

/**
 * Render list of imports for LTX file.
 */
export function renderLtxImports(descriptorRaw: TPossibleFieldDescriptorFull): string {
  if (!Array.isArray(descriptorRaw)) {
    throw new Error(`Expected array of files to import, received '${typeof descriptorRaw}' instead.`);
  }

  return LTX_EOL + descriptorRaw.map((it) => `#include "${it}"`).join(LTX_EOL) + LTX_EOL;
}

/**
 * Render LTX section based on descriptor and metadata.
 */
function renderLtxSection(name: string | typeof LTX_ROOT, descriptorRaw: TPossibleFieldDescriptorFull): string {
  const sectionName: string = renderSectionName(name, descriptorRaw);
  const descriptor: TPossibleFieldDescriptorBase =
    typeof descriptorRaw === "function" ? descriptorRaw() : descriptorRaw;

  if (Array.isArray(descriptor)) {
    const content: string = descriptor.map((it) => renderField(null, it)).join(LTX_EOL);

    return `${sectionName}${content ? content + LTX_EOL : ""}`;
  }

  return Object.entries(descriptor).reduce(
    (result, [key, value]) => result + renderField(key, value) + LTX_EOL,
    sectionName
  );
}

/**
 * Based on provided JSON/javascript object generate new LTX file content.
 */
export function renderJsonToLtx(filename: string, object: ILtxConfigDescriptor): string {
  let header: string = `; ${filename} @ generated ${new Date().toString()}${LTX_EOL}`;

  if (object[LTX_INCLUDE]) {
    header += renderLtxImports(object[LTX_INCLUDE] as TPossibleFieldDescriptorFull);
  }

  if (object[LTX_ROOT]) {
    header += renderLtxSection(LTX_ROOT, object[LTX_ROOT] as TPossibleFieldDescriptorFull);
  }

  return (
    header +
    Object.entries(object).reduce((result, [key, object]) => {
      return result + renderLtxSection(key, object as TPossibleFieldDescriptorFull);
    }, "")
  );
}
