import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { BorshSchemaContainerSchema, ZorshGenerator } from "../../src/lib/index.js"

describe("ZorshGenerator Integration", () => {
  it("should generate valid schema from complex example", () => {
    const schemaPath = join(__dirname, "..", "fixtures", "complex_schema.bin")
    const data = readFileSync(schemaPath)
    const container = BorshSchemaContainerSchema.deserialize(data)

    const generator = new ZorshGenerator()
    const code = generator.generate(container)

    // Basic structure
    expect(code).toContain('import { b } from "@zorsh/zorsh"')

    // Check all expected type definitions are present
    const expectedTypes = [
      "Location",
      "ItemRarity",
      "Stats",
      "ItemEffect",
      "Item",
      "Achievement",
      "CharacterClass",
      "GuildMembership",
      "Trade",
      "QuestProgress",
      "PlayerCharacter",
    ]

    for (const type of expectedTypes) {
      expect(code).toContain(`export const ${type}Schema`)
      expect(code).toContain(`export type ${type} = b.infer<typeof ${type}Schema>`)
    }

    // Check specific type definitions and their structure
    // Location
    expect(code).toMatch(
      /export const LocationSchema = b\.struct\({[\s\S]*?lat: b\.f64\(\)[\s\S]*?}\)/,
    )

    // ItemRarity enum
    expect(code).toMatch(
      /export const ItemRaritySchema = b\.enum\({[\s\S]*?Common: b\.unit\(\)[\s\S]*?}\)/,
    )

    // Check complex nested types
    expect(code).toContain("b.vec(ItemSchema)") // Vec<Item>
    expect(code).toContain("b.hashMap(b.string(), ItemSchema)") // HashMap<String, Item>
    expect(code).toContain("b.option(StatsSchema)") // Option<Stats>

    // Check tuple types
    expect(code).toContain("b.tuple([b.u64(), LocationSchema, b.string()])")

    // Verify the code is valid TypeScript
    // Note: We could add ts-node to actually verify it compiles
  })

  it("should handle empty schema", () => {
    const emptyContainer = {
      declaration: "Empty",
      definitions: new Map(),
    }

    const generator = new ZorshGenerator()
    expect(() => generator.generate(emptyContainer)).not.toThrow()
  })

  it("should preserve order of fields in structs", () => {
    const schemaPath = join(__dirname, "..", "fixtures", "complex_schema.bin")
    const data = readFileSync(schemaPath)
    const container = BorshSchemaContainerSchema.deserialize(data)

    const generator = new ZorshGenerator()
    const code = generator.generate(container)

    // Check that Stats fields are in the correct order
    const statsMatch = code.match(/export const StatsSchema = b\.struct\({[\s\S]*?}\)/)
    expect(statsMatch).toBeTruthy()
    if (!statsMatch) throw new Error("Stats schema not found")

    const statsCode = statsMatch[0]

    const orderOfFields = ["strength", "dexterity", "intelligence", "health", "mana"]

    let lastIndex = -1
    for (const field of orderOfFields) {
      const fieldIndex = statsCode.indexOf(field)
      expect(fieldIndex).toBeGreaterThan(lastIndex)
      lastIndex = fieldIndex
    }
  })
})
