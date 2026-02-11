// JSON types matching the borsh-schema-export / near-abi JSON format.
// These are plain TypeScript interfaces — no Zorsh dependency needed for parsing.

export interface BorshSchemaContainer {
  declaration: string
  definitions: Record<string, Definition>
}

export type Definition =
  | { Primitive: number }
  | { Sequence: SequenceDefinition }
  | { Tuple: string[] }
  | { Enum: EnumDefinition }
  | { Struct: StructFields }

export interface SequenceDefinition {
  length_width: number
  length_range: { start: number; end: number }
  elements: string
}

export interface EnumDefinition {
  tag_width: number
  variants: [number, string, string][] // [discriminant, name, declaration]
}

// Untagged union matching near-abi's serde format:
// Named: [["field", "type"], ...]
// Unnamed: ["type", ...]
// Empty: null
export type StructFields =
  | [string, string][] // named fields
  | string[] // unnamed fields
  | null // empty/unit struct

// --- Helpers to distinguish struct field variants ---

export function isNamedFields(fields: StructFields): fields is [string, string][] {
  if (fields === null || fields.length === 0) return false
  const first = fields[0]
  return Array.isArray(first)
}

export function isUnnamedFields(fields: StructFields): fields is string[] {
  if (fields === null || fields.length === 0) return false
  const first = fields[0]
  return typeof first === "string"
}

export function isEmptyFields(fields: StructFields): boolean {
  return fields === null || fields.length === 0
}

// --- Helpers to identify definition variants ---

export function isPrimitive(def: Definition): def is { Primitive: number } {
  return "Primitive" in def
}

export function isSequence(def: Definition): def is { Sequence: SequenceDefinition } {
  return "Sequence" in def
}

export function isTuple(def: Definition): def is { Tuple: string[] } {
  return "Tuple" in def
}

export function isEnum(def: Definition): def is { Enum: EnumDefinition } {
  return "Enum" in def
}

export function isStruct(def: Definition): def is { Struct: StructFields } {
  return "Struct" in def
}

// --- Legacy binary support ---

// Re-export the Zorsh-based binary deserializer for backward compatibility
export { BorshSchemaContainerSchema, convertBinaryContainer } from "./types-binary.js"
