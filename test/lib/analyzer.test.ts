import { describe, expect, it } from "vitest"
import { SchemaAnalyzer } from "../../src/lib/analyzer.js"
import type { BorshSchemaContainer } from "../../src/lib/types.js"

describe("SchemaAnalyzer", () => {
  it("should identify original types and exclude synthetic types", () => {
    const analyzer = new SchemaAnalyzer()
    const container: BorshSchemaContainer = {
      declaration: "Item",
      definitions: {
        Item: {
          Struct: [
            ["id", "String"],
            ["count", "u32"],
            ["tags", "Vec<String>"],
          ],
        },
        "Vec<String>": {
          Sequence: {
            length_width: 4,
            length_range: { start: 0, end: 4294967295 },
            elements: "String",
          },
        },
        String: {
          Sequence: {
            length_width: 4,
            length_range: { start: 0, end: 4294967295 },
            elements: "u8",
          },
        },
        u32: { Primitive: 4 },
        u8: { Primitive: 1 },
      },
    }

    const originalTypes = analyzer.findOriginalTypes(container)
    expect(originalTypes).toEqual(["Item"])
  })

  it("should handle enum variants correctly", () => {
    const analyzer = new SchemaAnalyzer()
    const container: BorshSchemaContainer = {
      declaration: "ItemEffect",
      definitions: {
        ItemEffect: {
          Enum: {
            tag_width: 1,
            variants: [
              [0, "Damage", "ItemEffectDamage"],
              [1, "None", "()"],
            ],
          },
        },
        ItemEffectDamage: {
          Struct: ["u32"],
        },
        Stats: {
          Struct: [["value", "u32"]],
        },
        "Option<Stats>": {
          Enum: {
            tag_width: 1,
            variants: [
              [0, "None", "()"],
              [1, "Some", "Stats"],
            ],
          },
        },
        u32: { Primitive: 4 },
      },
    }

    const originalTypes = analyzer.findOriginalTypes(container)
    expect(originalTypes).toContain("ItemEffect")
    expect(originalTypes).toContain("Stats")
    expect(originalTypes).not.toContain("ItemEffectDamage")
  })

  it("should exclude built-in and generated types", () => {
    const analyzer = new SchemaAnalyzer()
    const container: BorshSchemaContainer = {
      declaration: "Root",
      definitions: {
        String: {
          Sequence: {
            length_width: 4,
            length_range: { start: 0, end: 4294967295 },
            elements: "u8",
          },
        },
        u32: { Primitive: 4 },
        "Vec<String>": {
          Sequence: {
            length_width: 4,
            length_range: { start: 0, end: 4294967295 },
            elements: "String",
          },
        },
        "HashMap<String, u32>": {
          Sequence: {
            length_width: 4,
            length_range: { start: 0, end: 4294967295 },
            elements: "(String, u32)",
          },
        },
        "(String, u32)": { Tuple: ["String", "u32"] },
        "Option<String>": {
          Enum: {
            tag_width: 1,
            variants: [
              [0, "None", "()"],
              [1, "Some", "String"],
            ],
          },
        },
        Root: {
          Struct: [["data", "String"]],
        },
      },
    }

    const originalTypes = analyzer.findOriginalTypes(container)
    expect(originalTypes).toEqual(["Root"])
  })
})
