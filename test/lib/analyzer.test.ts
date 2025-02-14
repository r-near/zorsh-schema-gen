import { describe, expect, it } from "vitest"
import { SchemaAnalyzer } from "../../src/lib/analyzer.js"
import type { BorshSchemaContainer } from "../../src/lib/types.js"

describe("SchemaAnalyzer", () => {
  it("should identify original types and exclude synthetic types", () => {
    const analyzer = new SchemaAnalyzer()
    const container: BorshSchemaContainer = {
      declaration: "Item",
      definitions: new Map([
        [
          "Item",
          {
            Struct: {
              fields: {
                NamedFields: [
                  { name: "id", declaration: "String" },
                  { name: "count", declaration: "u32" },
                  { name: "tags", declaration: "Vec<String>" },
                ],
              },
            },
          },
        ],
        [
          "Vec<String>",
          {
            Sequence: {
              lengthWidth: 4,
              lengthRange: { start: 0n, end: 4294967295n },
              elements: "String",
            },
          },
        ],
        [
          "String",
          {
            Sequence: {
              lengthWidth: 4,
              lengthRange: { start: 0n, end: 4294967295n },
              elements: "u8",
            },
          },
        ],
        ["u32", { Primitive: { size: 4 } }],
        ["u8", { Primitive: { size: 1 } }],
      ]),
    }

    const originalTypes = analyzer.findOriginalTypes(container)
    expect(originalTypes).toEqual(["Item"])
  })

  it("should handle enum variants correctly", () => {
    const analyzer = new SchemaAnalyzer()
    const container: BorshSchemaContainer = {
      declaration: "ItemEffect",
      definitions: new Map([
        [
          "ItemEffect",
          {
            Enum: {
              tagWidth: 1,
              variants: [
                { discriminant: 0n, name: "Damage", declaration: "ItemEffectDamage" },
                { discriminant: 1n, name: "None", declaration: "()" },
              ],
            },
          },
        ],
        [
          "ItemEffectDamage",
          {
            Struct: {
              fields: { UnnamedFields: ["u32"] },
            },
          },
        ],
        [
          "Stats",
          {
            Struct: {
              fields: {
                NamedFields: [{ name: "value", declaration: "u32" }],
              },
            },
          },
        ],
        [
          "Option<Stats>",
          {
            Enum: {
              tagWidth: 1,
              variants: [
                { discriminant: 0n, name: "None", declaration: "()" },
                { discriminant: 1n, name: "Some", declaration: "Stats" },
              ],
            },
          },
        ],
      ]),
    }

    const originalTypes = analyzer.findOriginalTypes(container)
    // Should include ItemEffect and Stats, but not ItemEffectDamage
    expect(originalTypes).toContain("ItemEffect")
    expect(originalTypes).toContain("Stats")
    expect(originalTypes).not.toContain("ItemEffectDamage")
  })

  it("should exclude built-in and generated types", () => {
    const analyzer = new SchemaAnalyzer()
    const container: BorshSchemaContainer = {
      declaration: "Root",
      definitions: new Map([
        // Built-in types
        [
          "String",
          {
            Sequence: {
              lengthWidth: 4,
              lengthRange: { start: 0n, end: 4294967295n },
              elements: "u8",
            },
          },
        ],
        ["u32", { Primitive: { size: 4 } }],

        // Generated collection types
        [
          "Vec<String>",
          {
            Sequence: {
              lengthWidth: 4,
              lengthRange: { start: 0n, end: 4294967295n },
              elements: "String",
            },
          },
        ],
        [
          "HashMap<String, u32>",
          {
            Sequence: {
              lengthWidth: 4,
              lengthRange: { start: 0n, end: 4294967295n },
              elements: "(String, u32)",
            },
          },
        ],

        // Tuple types
        ["(String, u32)", { Tuple: { elements: ["String", "u32"] } }],

        // Option types
        [
          "Option<String>",
          {
            Enum: {
              tagWidth: 1,
              variants: [
                { discriminant: 0n, name: "None", declaration: "()" },
                { discriminant: 1n, name: "Some", declaration: "String" },
              ],
            },
          },
        ],

        // Real type
        [
          "Root",
          {
            Struct: {
              fields: {
                NamedFields: [{ name: "data", declaration: "String" }],
              },
            },
          },
        ],
      ]),
    }

    const originalTypes = analyzer.findOriginalTypes(container)
    expect(originalTypes).toEqual(["Root"])
  })
})
