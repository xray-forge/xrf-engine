import { Nullable } from "#/utils/types";

/**
 * Generic primitive type used in LTX configs.
 */
export type TPrimitive = string | number | boolean | symbol | Array<TPrimitive>;

/**
 * Enumeration of possible field descriptor types.
 */
export enum ELtxFieldType {
  STRING,
  INTEGER,
  BOOLEAN,
  FLOAT,
  CONDLIST,
  STRING_ARRAY,
  INTEGER_ARRAY,
  FLOAT_ARRAY,
}

/**
 * Field descriptor metadata used for LTX files generation.
 */
export interface ILtxFieldMeta {
  comment?: Nullable<string>;
  isBinding?: boolean;
}

/**
 * Generic field descriptor used for LTX files generation.
 */
export interface ILtxFieldDescriptor<T> {
  $isField: boolean;
  type: ELtxFieldType;
  value: T;
  meta?: ILtxFieldMeta;
}

/**
 * Generic descriptor of config object before transformation to LTX file.
 */
export interface ILtxConfigDescriptor extends Record<
  string,
  | ILtxConfigDescriptor
  | Record<string, ILtxFieldDescriptor<unknown> | TPrimitive | null | undefined>
  | TPrimitive
  | null
  | undefined
> {
  [index: symbol]:
    Record<string, ILtxFieldDescriptor<unknown> | TPrimitive | null | undefined> | TPrimitive | null | undefined;
}

/**
 * Meta symbol to mark LTX root fields not belonging to any section.
 */
export const LTX_ROOT: unique symbol = Symbol("LTX_ROOT");

/**
 * Meta symbol to mark LTX extending syntax for custom sections.
 */
export const LTX_EXTEND: unique symbol = Symbol("LTX_EXTEND");

/**
 * Meta symbol to mark include section to import other files in built LTX file.
 */
export const LTX_INCLUDE: unique symbol = Symbol("LTX_INCLUDE");

/**
 * Descriptor of condition list for building.
 */
export interface IConditionListDescriptor {
  condition?: Array<string>;
  action?: Array<string>;
  value?: Nullable<string | number | boolean>;
}
