import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import type { BorshSchemaContainer } from "../../src/lib/types.js"
import {
  BorshSchemaContainerSchema,
  convertBinaryContainer,
  ZorshGenerator,
} from "../../src/lib/index.js"

describe("ZorshGenerator Integration", () => {
  function loadJsonFixture(): BorshSchemaContainer {
    const schemaPath = join(__dirname, "..", "fixtures", "complex_schema.json")
    return JSON.parse(readFileSync(schemaPath, "utf-8"))
  }

  function loadBinFixture(): BorshSchemaContainer {
    const schemaPath = join(__dirname, "..", "fixtures", "complex_schema.bin")
    const data = readFileSync(schemaPath)
    const container = BorshSchemaContainerSchema.deserialize(data)
    return convertBinaryContainer(container)
  }

  it("should generate valid schema from JSON input", () => {
    const container = loadJsonFixture()
    const generator = new ZorshGenerator()
    const code = generator.generate(container)

    // Basic structure
    expect(code).toContain('import { b } from "@zorsh/zorsh"')

    // Check all expected types
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

    // Check specific patterns
    expect(code).toMatch(
      /export const LocationSchema = b\.struct\(\{[\s\S]*?lat: b\.f64\(\)[\s\S]*?\}\)/,
    )

    expect(code).toMatch(
      /export const ItemRaritySchema = b\.enum\(\{[\s\S]*?Common: b\.unit\(\)[\s\S]*?\}\)/,
    )

    // Complex nested types
    expect(code).toContain("b.vec(ItemSchema)")
    expect(code).toContain("b.hashMap(b.string(), ItemSchema)")
    expect(code).toContain("b.option(StatsSchema)")

    // Tuple types
    expect(code).toContain("b.tuple(b.u64(), LocationSchema, b.string())")

    // Tuple in HashMap value
    expect(code).toContain("b.tuple(b.u16(), b.f32())")
  })

  it("should generate valid schema from legacy .bin input", () => {
    const container = loadBinFixture()
    const generator = new ZorshGenerator()
    const code = generator.generate(container)

    // Should produce the same types
    expect(code).toContain("export const PlayerCharacterSchema")
    expect(code).toContain("export const LocationSchema")
  })

  it("should handle enum variants correctly", () => {
    const container = loadJsonFixture()
    const generator = new ZorshGenerator()
    const code = generator.generate(container)

    // ItemEffect has: Damage(u32), Heal{amount, duration}, Status{...}, None
    expect(code).toMatch(/Damage: b\.u32\(\)/)
    expect(code).toMatch(/Heal: b\.struct/)
    expect(code).toMatch(/Status: b\.struct/)
    expect(code).toMatch(/None: b\.unit\(\)/)

    // CharacterClass has: Warrior(Stats), Mage{...}, Rogue{...}
    expect(code).toMatch(/Warrior: StatsSchema/)
    expect(code).toMatch(/Mage: b\.struct/)
    expect(code).toMatch(/Rogue: b\.struct/)
  })

  it("should handle empty schema", () => {
    const emptyContainer: BorshSchemaContainer = {
      declaration: "Empty",
      definitions: {},
    }

    const generator = new ZorshGenerator()
    expect(() => generator.generate(emptyContainer)).not.toThrow()
  })

  it("should preserve order of fields in structs", () => {
    const container = loadJsonFixture()
    const generator = new ZorshGenerator()
    const code = generator.generate(container)

    const statsMatch = code.match(/export const StatsSchema = b\.struct\(\{[\s\S]*?\}\)/)
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

  it("should support multi-container generation", () => {
    const container = loadJsonFixture()
    const generator = new ZorshGenerator()

    // Pass same container twice (simulating multi-root)
    const code = generator.generateMulti([container])
    expect(code).toContain("export const PlayerCharacterSchema")
  })

  it("should snapshot the full output", () => {
    const container = loadJsonFixture()
    const generator = new ZorshGenerator()
    const code = generator.generate(container)
    expect(code).toMatchSnapshot()
  })
})

describe("Nightmare Contract Stress Test", () => {
  function loadNightmareFixture(): BorshSchemaContainer {
    const schemaPath = join(__dirname, "..", "fixtures", "nightmare_contract.json")
    return JSON.parse(readFileSync(schemaPath, "utf-8"))
  }

  it("should generate code from 127-definition nightmare contract", () => {
    const container = loadNightmareFixture()
    expect(Object.keys(container.definitions).length).toBe(127)

    const generator = new ZorshGenerator()
    const code = generator.generate(container)

    expect(code).toContain('import { type Schema, b } from "@zorsh/zorsh"')
    expect(code).toContain("export const ContractStateSchema")
  })

  it("should handle all original types", () => {
    const container = loadNightmareFixture()
    const generator = new ZorshGenerator()
    const code = generator.generate(container)

    const expectedTypes = [
      "TokenAmount",
      "AssetId",
      "PriceOracle",
      "LiquidityPool",
      "VoteWeight",
      "ProposalAction",
      "ProposalCondition",
      "Vote",
      "ProposalStatus",
      "Proposal",
      "Attribute",
      "TokenMetadata",
      "Royalty",
      "NftToken",
      "TokenOffer",
      "ContractState",
      "StakingTier",
      "StakingReward",
      "AuditAction",
    ]

    for (const type of expectedTypes) {
      expect(code).toContain(`export const ${type}Schema`)
      expect(code).toContain(`export type ${type} = b.infer<typeof ${type}Schema>`)
    }
  })

  it("should handle tuple map keys", () => {
    const container = loadNightmareFixture()
    const generator = new ZorshGenerator()
    const code = generator.generate(container)

    // pool_index: HashMap<(String, String), u64>
    expect(code).toContain("b.hashMap(b.tuple(b.string(), b.string()), b.u64())")
  })

  it("should handle deeply nested collections", () => {
    const container = loadNightmareFixture()
    const generator = new ZorshGenerator()
    const code = generator.generate(container)

    // user_positions: HashMap<String, Vec<(u64, u128)>>
    expect(code).toContain("b.hashMap(b.string(), b.vec(b.tuple(b.u64(), b.u128())))")

    // delegation_map: HashMap<String, Vec<(String, u128)>>
    expect(code).toContain("b.hashMap(b.string(), b.vec(b.tuple(b.string(), b.u128())))")
  })

  it("should handle tuple of structs", () => {
    const container = loadNightmareFixture()
    const generator = new ZorshGenerator()
    const code = generator.generate(container)

    // amounts: (TokenAmount, TokenAmount)
    expect(code).toContain("b.tuple(TokenAmountSchema, TokenAmountSchema)")
  })

  it("should handle 4-element tuples in Vec", () => {
    const container = loadNightmareFixture()
    const generator = new ZorshGenerator()
    const code = generator.generate(container)

    // transfer_history: Vec<(u64, String, String, Option<String>)>
    expect(code).toContain(
      "b.vec(b.tuple(b.u64(), b.string(), b.string(), b.option(b.string())))",
    )
  })

  it("should handle deeply nested audit log", () => {
    const container = loadNightmareFixture()
    const generator = new ZorshGenerator()
    const code = generator.generate(container)

    // audit_log: Vec<(u64, String, AuditAction, Option<HashMap<String, String>>)>
    expect(code).toContain("AuditActionSchema")
    expect(code).toContain("b.option(b.hashMap(b.string(), b.string()))")
  })

  it("should detect recursive types", () => {
    const container = loadNightmareFixture()
    const generator = new ZorshGenerator()
    const code = generator.generate(container)

    // These 3 types are recursive and should use b.lazy() + Schema<unknown>
    expect(code).toContain("const AuditActionSchema: Schema<unknown>")
    expect(code).toContain("const ProposalConditionSchema: Schema<unknown>")
    expect(code).toContain("const ProposalActionSchema: Schema<unknown>")
    expect(code).toContain("b.lazy(() => AuditActionSchema)")
    expect(code).toContain("b.lazy(() => ProposalConditionSchema)")
    expect(code).toContain("b.lazy(() => ProposalActionSchema)")
  })

  it("should handle cross-domain type reuse", () => {
    const container = loadNightmareFixture()
    const generator = new ZorshGenerator()
    const code = generator.generate(container)

    // ProposalCondition is used in both TokenOffer and StakingTier
    expect(code).toMatch(/TokenOfferSchema[\s\S]*ProposalConditionSchema/)
    expect(code).toMatch(/StakingTierSchema[\s\S]*ProposalConditionSchema/)
  })

  it("should handle HashMap<bool, u128>", () => {
    const container = loadNightmareFixture()
    const generator = new ZorshGenerator()
    const code = generator.generate(container)

    // vote_counts: HashMap<bool, u128>
    expect(code).toContain("b.hashMap(b.bool(), b.u128())")
  })

  it("should handle nested Option<HashMap>", () => {
    const container = loadNightmareFixture()
    const generator = new ZorshGenerator()
    const code = generator.generate(container)

    // split_owners: Option<HashMap<String, u32>>
    expect(code).toContain("b.option(b.hashMap(b.string(), b.u32()))")
  })

  it("should handle HashMap<String, HashSet<String>>", () => {
    const container = loadNightmareFixture()
    const generator = new ZorshGenerator()
    const code = generator.generate(container)

    // tokens_per_owner: HashMap<String, HashSet<String>>
    expect(code).toContain("b.hashMap(b.string(), b.hashSet(b.string()))")
  })

  it("should handle semver tuple (u8, u8, u8)", () => {
    const container = loadNightmareFixture()
    const generator = new ZorshGenerator()
    const code = generator.generate(container)

    // version: (u8, u8, u8)
    expect(code).toContain("b.tuple(b.u8(), b.u8(), b.u8())")
  })

  it("should handle Box<T> as transparent", () => {
    const container = loadNightmareFixture()
    const generator = new ZorshGenerator()
    const code = generator.generate(container)

    // Box<ProposalAction> should just be ProposalActionSchema
    // Box<ProposalCondition> should just be ProposalConditionSchema
    // (Box is transparent in BorshSchema)
    expect(code).not.toContain("Box")
  })

  it("should snapshot nightmare contract output", () => {
    const container = loadNightmareFixture()
    const generator = new ZorshGenerator()
    const code = generator.generate(container)
    expect(code).toMatchSnapshot()
  })
})
