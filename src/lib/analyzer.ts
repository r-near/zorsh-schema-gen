import type { BorshSchemaContainer, Definition } from "./types.js"
import { isEnum, isStruct, isPrimitive, isSequence } from "./types.js"

export class SchemaAnalyzer {
  private enumVariants = new Set<string>()

  findOriginalTypes(container: BorshSchemaContainer): string[] {
    const defs = container.definitions

    // First pass: collect all enum variant declarations
    for (const [name, def] of Object.entries(defs)) {
      if (isEnum(def) && !name.startsWith("Option<")) {
        for (const [, , declaration] of def.Enum.variants) {
          this.enumVariants.add(declaration)
        }
      }
    }

    // Second pass: find original (user-defined) types
    const originalTypes: string[] = []
    for (const [name, def] of Object.entries(defs)) {
      if (this.isSyntheticType(name, def)) continue
      originalTypes.push(name)
    }

    return originalTypes
  }

  private isSyntheticType(name: string, def: Definition): boolean {
    // Enum variant inner types (e.g., "ItemEffect__Damage")
    if (this.enumVariants.has(name)) return true

    // Primitives (u8, i32, f64, bool, ())
    if (isPrimitive(def)) return true

    // Sequences (Vec<T>, String, [T; N]) are synthetic definitions
    if (isSequence(def)) return true

    // Generic wrappers: Vec<T>, HashMap<K,V>, Option<T>, HashSet<T>, etc.
    if (name.includes("<")) return true

    // Tuple types: (u32, String)
    if (name.startsWith("(")) return true

    // Built-in String type
    if (name === "String") return true

    return false
  }
}
