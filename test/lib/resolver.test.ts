import { describe, expect, it } from "vitest"
import { DependencyResolver } from "../../src/lib/resolver.js"
import type { BorshSchemaContainer } from "../../src/lib/types.js"

describe("DependencyResolver", () => {
  it("should resolve simple dependencies in correct order", () => {
    const container: BorshSchemaContainer = {
      declaration: "Item",
      definitions: {
        Stats: { Struct: [["value", "u32"]] },
        ItemType: {
          Enum: {
            tag_width: 1,
            variants: [
              [0, "Basic", "()"],
              [1, "Special", "()"],
            ],
          },
        },
        Item: {
          Struct: [
            ["type", "ItemType"],
            ["stats", "Stats"],
          ],
        },
      },
    }

    const resolver = new DependencyResolver(["Stats", "ItemType", "Item"])
    const sorted = resolver.buildDependencyGraph(container)

    expect(sorted).toHaveLength(3)
    expect(sorted).toContain("Stats")
    expect(sorted).toContain("ItemType")
    expect(sorted[2]).toBe("Item")
  })

  it("should handle complex nested dependencies", () => {
    const container: BorshSchemaContainer = {
      declaration: "Character",
      definitions: {
        Stats: { Struct: [["value", "u32"]] },
        Equipment: { Struct: [["item", "Item"]] },
        Item: { Struct: [["stats", "Stats"]] },
        Character: {
          Struct: [
            ["equipment", "Equipment"],
            ["stats", "Stats"],
          ],
        },
      },
    }

    const resolver = new DependencyResolver(["Stats", "Item", "Equipment", "Character"])
    const sorted = resolver.buildDependencyGraph(container)

    expect(sorted.indexOf("Stats")).toBeLessThan(sorted.indexOf("Item"))
    expect(sorted.indexOf("Item")).toBeLessThan(sorted.indexOf("Equipment"))
    expect(sorted.indexOf("Equipment")).toBeLessThan(sorted.indexOf("Character"))
  })

  it("should handle circular dependencies gracefully", () => {
    const container: BorshSchemaContainer = {
      declaration: "A",
      definitions: {
        A: { Struct: [["b", "B"]] },
        B: { Struct: [["a", "A"]] },
      },
    }

    const resolver = new DependencyResolver(["A", "B"])
    const sorted = resolver.buildDependencyGraph(container)
    expect(sorted).toContain("A")
    expect(sorted).toContain("B")
    expect(resolver.recursiveTypes.size).toBeGreaterThan(0)
  })

  it("should detect self-referential recursive types", () => {
    const container: BorshSchemaContainer = {
      declaration: "Tree",
      definitions: {
        Tree: {
          Enum: {
            tag_width: 1,
            variants: [
              [0, "Leaf", "()"],
              [1, "Node", "Tree__Node"],
            ],
          },
        },
        Tree__Node: { Struct: [["left", "Tree"], ["right", "Tree"]] },
      },
    }

    const resolver = new DependencyResolver(["Tree"])
    const sorted = resolver.buildDependencyGraph(container)
    expect(sorted).toEqual(["Tree"])
    expect(resolver.recursiveTypes.has("Tree")).toBe(true)
  })

  it("should handle enum variant dependencies", () => {
    const container: BorshSchemaContainer = {
      declaration: "Effect",
      definitions: {
        Stats: { Struct: [["value", "u32"]] },
        Effect: {
          Enum: {
            tag_width: 1,
            variants: [
              [0, "StatBoost", "EffectStatBoost"],
              [1, "None", "()"],
            ],
          },
        },
        EffectStatBoost: {
          Struct: [["stats", "Stats"]],
        },
      },
    }

    const resolver = new DependencyResolver(["Stats", "Effect"])
    const sorted = resolver.buildDependencyGraph(container)

    expect(sorted.indexOf("Stats")).toBeLessThan(sorted.indexOf("Effect"))
  })

  it("should resolve dependencies through nested generics", () => {
    const container: BorshSchemaContainer = {
      declaration: "Inventory",
      definitions: {
        Item: { Struct: [["id", "String"]] },
        Inventory: {
          Struct: [
            ["items", "Vec<Item>"],
            ["counts", "HashMap<String, u32>"],
          ],
        },
      },
    }

    const resolver = new DependencyResolver(["Item", "Inventory"])
    const sorted = resolver.buildDependencyGraph(container)

    expect(sorted).toEqual(["Item", "Inventory"])
  })

  it("should resolve deeply nested generic dependencies", () => {
    const container: BorshSchemaContainer = {
      declaration: "Game",
      definitions: {
        Player: { Struct: [["name", "String"]] },
        Game: {
          Struct: [
            ["players", "Vec<Option<HashMap<String, Player>>>"],
          ],
        },
      },
    }

    const resolver = new DependencyResolver(["Player", "Game"])
    const sorted = resolver.buildDependencyGraph(container)

    expect(sorted.indexOf("Player")).toBeLessThan(sorted.indexOf("Game"))
  })
})
