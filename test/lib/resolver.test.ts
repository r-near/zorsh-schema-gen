import { describe, expect, it } from "vitest"
import { DependencyResolver } from "../../src/lib/resolver.js"
import type { BorshSchemaContainer } from "../../src/lib/types.js"

describe("DependencyResolver", () => {
  it("should resolve simple dependencies in correct order", () => {
    const container: BorshSchemaContainer = {
      declaration: "Item",
      definitions: new Map([
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
          "ItemType",
          {
            Enum: {
              tagWidth: 1,
              variants: [
                { discriminant: 0n, name: "Basic", declaration: "()" },
                { discriminant: 1n, name: "Special", declaration: "()" },
              ],
            },
          },
        ],
        [
          "Item",
          {
            Struct: {
              fields: {
                NamedFields: [
                  { name: "type", declaration: "ItemType" },
                  { name: "stats", declaration: "Stats" },
                ],
              },
            },
          },
        ],
      ]),
    }

    const resolver = new DependencyResolver(["Stats", "ItemType", "Item"])
    const sorted = resolver.buildDependencyGraph(container)

    // Stats and ItemType can be in either order, but Item must be last
    expect(sorted).toHaveLength(3)
    expect(sorted).toContain("Stats")
    expect(sorted).toContain("ItemType")
    expect(sorted[2]).toBe("Item")
  })

  it("should handle complex nested dependencies", () => {
    const container: BorshSchemaContainer = {
      declaration: "Character",
      definitions: new Map([
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
          "Equipment",
          {
            Struct: {
              fields: {
                NamedFields: [{ name: "item", declaration: "Item" }],
              },
            },
          },
        ],
        [
          "Item",
          {
            Struct: {
              fields: {
                NamedFields: [{ name: "stats", declaration: "Stats" }],
              },
            },
          },
        ],
        [
          "Character",
          {
            Struct: {
              fields: {
                NamedFields: [
                  { name: "equipment", declaration: "Equipment" },
                  { name: "stats", declaration: "Stats" },
                ],
              },
            },
          },
        ],
      ]),
    }

    const resolver = new DependencyResolver(["Stats", "Item", "Equipment", "Character"])
    const sorted = resolver.buildDependencyGraph(container)

    // Verify Stats comes before Item
    expect(sorted.indexOf("Stats")).toBeLessThan(sorted.indexOf("Item"))
    // Verify Item comes before Equipment
    expect(sorted.indexOf("Item")).toBeLessThan(sorted.indexOf("Equipment"))
    // Verify Equipment comes before Character
    expect(sorted.indexOf("Equipment")).toBeLessThan(sorted.indexOf("Character"))
  })

  it("should throw on circular dependencies", () => {
    const container: BorshSchemaContainer = {
      declaration: "A",
      definitions: new Map([
        [
          "A",
          {
            Struct: {
              fields: {
                NamedFields: [{ name: "b", declaration: "B" }],
              },
            },
          },
        ],
        [
          "B",
          {
            Struct: {
              fields: {
                NamedFields: [{ name: "a", declaration: "A" }],
              },
            },
          },
        ],
      ]),
    }

    const resolver = new DependencyResolver(["A", "B"])
    expect(() => resolver.buildDependencyGraph(container)).toThrow(/Circular dependency/)
  })

  it("should handle enum variant dependencies", () => {
    const container: BorshSchemaContainer = {
      declaration: "Effect",
      definitions: new Map([
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
          "Effect",
          {
            Enum: {
              tagWidth: 1,
              variants: [
                { discriminant: 0n, name: "StatBoost", declaration: "EffectStatBoost" },
                { discriminant: 1n, name: "None", declaration: "()" },
              ],
            },
          },
        ],
        [
          "EffectStatBoost",
          {
            Struct: {
              fields: {
                NamedFields: [{ name: "stats", declaration: "Stats" }],
              },
            },
          },
        ],
      ]),
    }

    const resolver = new DependencyResolver(["Stats", "Effect"])
    const sorted = resolver.buildDependencyGraph(container)

    // Stats must come before Effect because Effect's variant depends on Stats
    expect(sorted.indexOf("Stats")).toBeLessThan(sorted.indexOf("Effect"))
  })

  it("should ignore collection type dependencies", () => {
    const container: BorshSchemaContainer = {
      declaration: "Inventory",
      definitions: new Map([
        [
          "Item",
          {
            Struct: {
              fields: {
                NamedFields: [{ name: "id", declaration: "String" }],
              },
            },
          },
        ],
        [
          "Inventory",
          {
            Struct: {
              fields: {
                NamedFields: [
                  { name: "items", declaration: "Vec<Item>" },
                  { name: "counts", declaration: "HashMap<String, u32>" },
                ],
              },
            },
          },
        ],
      ]),
    }

    const resolver = new DependencyResolver(["Item", "Inventory"])
    const sorted = resolver.buildDependencyGraph(container)

    // Item should come before Inventory
    expect(sorted).toEqual(["Item", "Inventory"])
  })
})
