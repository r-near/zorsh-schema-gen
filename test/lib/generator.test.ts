import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { BorshSchemaContainerSchema, ZorshGenerator } from "../../src/lib/index.js"

describe("ZorshGenerator", () => {
  it("should generate valid schema from complex example", () => {
    // Read the schema.bin
    const schemaPath = join(__dirname, "..", "fixtures", "complex_schema.bin")
    const data = readFileSync(schemaPath)

    // Parse it
    const container = BorshSchemaContainerSchema.deserialize(data)

    // Generate code
    const generator = new ZorshGenerator()
    const code = generator.generate(container)

    expect(code).toMatchSnapshot()

    // Basic validation
    expect(code).toContain('import { b } from "@zorsh/zorsh"')

    // Check for expected type definitions
    expect(code).toContain("export const LocationSchema = b.struct({")
    expect(code).toContain("export const ItemRaritySchema = b.enum({")
    expect(code).toContain("export const StatsSchema = b.struct({")
    expect(code).toContain("export const PlayerCharacterSchema = b.struct({")

    // Check specific field types
    expect(code).toContain("lat: b.f64()")
    expect(code).toContain("lng: b.f64()")
    expect(code).toContain("altitude: b.option(b.u32())")

    // Check enum variants
    expect(code).toContain("Common: b.unit()")
    expect(code).toContain("Legendary: b.unit()")

    // Check collection types
    expect(code).toContain("b.vec(")
    expect(code).toContain("b.hashMap(")
    expect(code).toContain("b.hashSet(")

    // Check that generated code exports types
    expect(code).toContain("export type Location = b.infer<typeof LocationSchema>;")
  })
})
