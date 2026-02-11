// Legacy: Zorsh-based binary schema deserializer (for .bin files)
// This uses @zorsh/zorsh to deserialize BorshSchemaContainer from Borsh binary format.
import { b } from "@zorsh/zorsh"

const RangeSchema = b.struct({
  start: b.u64(),
  end: b.u64(),
})

const SequenceSchema = b.struct({
  lengthWidth: b.u8(),
  lengthRange: RangeSchema,
  elements: b.string(),
})

const TupleSchema = b.struct({
  elements: b.vec(b.string()),
})

const VariantSchema = b.struct({
  discriminant: b.i64(),
  name: b.string(),
  declaration: b.string(),
})

const EnumSchema = b.struct({
  tagWidth: b.u8(),
  variants: b.vec(VariantSchema),
})

const NamedFieldSchema = b.struct({
  name: b.string(),
  declaration: b.string(),
})

const StructFieldsSchema = b.enum({
  NamedFields: b.vec(NamedFieldSchema),
  UnnamedFields: b.vec(b.string()),
  Empty: b.unit(),
})

const StructSchema = b.struct({
  fields: StructFieldsSchema,
})

const DefinitionSchema = b.enum({
  Primitive: b.struct({ size: b.u8() }),
  Sequence: SequenceSchema,
  Tuple: TupleSchema,
  Enum: EnumSchema,
  Struct: StructSchema,
})

export const BorshSchemaContainerSchema = b.struct({
  declaration: b.string(),
  definitions: b.hashMap(b.string(), DefinitionSchema),
})

// --- Converter: binary-deserialized shapes → JSON types ---

import type {
  BorshSchemaContainer,
  Definition,
  StructFields,
  SequenceDefinition,
  EnumDefinition,
} from "./types.js"

/**
 * Converts the Zorsh-deserialized binary container to the JSON-based
 * BorshSchemaContainer type expected by the generator.
 *
 * Binary format differences from JSON:
 * - definitions is a Map, not Record
 * - Primitive: {size: N} → N
 * - Sequence: camelCase → snake_case, bigint → number
 * - Tuple: {elements: [...]} → [...]
 * - Enum: camelCase, variant objects → snake_case, variant tuples
 * - Struct fields: {NamedFields/UnnamedFields/Empty: ...} → array/null
 */
export function convertBinaryContainer(
  container: b.infer<typeof BorshSchemaContainerSchema>,
): BorshSchemaContainer {
  const definitions: Record<string, Definition> = {}
  const defs =
    container.definitions instanceof Map
      ? container.definitions
      : new Map(Object.entries(container.definitions))

  for (const [key, def] of defs) {
    definitions[key as string] = convertDefinition(def)
  }

  return {
    declaration: container.declaration as string,
    definitions,
  }
}

// biome-ignore lint/suspicious/noExplicitAny: dynamic binary shapes
function convertDefinition(def: any): Definition {
  if ("Primitive" in def) {
    return { Primitive: Number(def.Primitive.size) }
  }
  if ("Sequence" in def) {
    const seq = def.Sequence
    return {
      Sequence: {
        length_width: Number(seq.lengthWidth),
        length_range: {
          start: Number(seq.lengthRange.start),
          end: Number(seq.lengthRange.end),
        },
        elements: seq.elements as string,
      } satisfies SequenceDefinition,
    }
  }
  if ("Tuple" in def) {
    return { Tuple: (def.Tuple.elements as string[]).slice() }
  }
  if ("Enum" in def) {
    const e = def.Enum
    return {
      Enum: {
        tag_width: Number(e.tagWidth),
        variants: e.variants.map(
          // biome-ignore lint/suspicious/noExplicitAny: binary variant shape
          (v: any) =>
            [Number(v.discriminant), v.name as string, v.declaration as string] as [
              number,
              string,
              string,
            ],
        ),
      } satisfies EnumDefinition,
    }
  }
  if ("Struct" in def) {
    return { Struct: convertStructFields(def.Struct.fields) }
  }
  throw new Error(`Unknown definition variant: ${JSON.stringify(def)}`)
}

// biome-ignore lint/suspicious/noExplicitAny: dynamic binary shapes
function convertStructFields(fields: any): StructFields {
  if ("NamedFields" in fields) {
    // biome-ignore lint/suspicious/noExplicitAny: binary field shape
    return fields.NamedFields.map((f: any) => [f.name as string, f.declaration as string])
  }
  if ("UnnamedFields" in fields) {
    return fields.UnnamedFields as string[]
  }
  // Empty
  return null
}
