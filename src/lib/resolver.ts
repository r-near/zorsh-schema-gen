import type { BorshSchemaContainer, Definition } from "./types.js"
import { isStruct, isEnum, isNamedFields, isUnnamedFields } from "./types.js"

export class DependencyResolver {
  private dependencies = new Map<string, Set<string>>()
  private originalTypes: Set<string>

  constructor(originalTypes: string[]) {
    this.originalTypes = new Set(originalTypes)
  }

  buildDependencyGraph(container: BorshSchemaContainer): string[] {
    for (const type of this.originalTypes) {
      const def = container.definitions[type]
      if (!def) continue
      const deps = this.collectDependencies(def, container)
      this.dependencies.set(type, deps)
    }

    return this.topologicalSort()
  }

  private collectDependencies(
    def: Definition,
    container: BorshSchemaContainer,
  ): Set<string> {
    const deps = new Set<string>()

    if (isStruct(def)) {
      const fields = def.Struct
      if (isNamedFields(fields)) {
        for (const [, declaration] of fields) {
          this.extractDependencies(declaration, deps)
        }
      } else if (isUnnamedFields(fields)) {
        for (const declaration of fields) {
          this.extractDependencies(declaration, deps)
        }
      }
    }

    if (isEnum(def)) {
      for (const [, , variantDeclaration] of def.Enum.variants) {
        if (variantDeclaration === "()") continue
        const variantDef = container.definitions[variantDeclaration]
        if (variantDef) {
          const variantDeps = this.collectDependencies(variantDef, container)
          for (const dep of variantDeps) {
            deps.add(dep)
          }
        }
      }
    }

    return deps
  }

  /**
   * Recursively extract all original type references from a declaration string.
   * Handles arbitrarily nested generics like Vec<Option<HashMap<String, CustomType>>>.
   */
  private extractDependencies(declaration: string, deps: Set<string>): void {
    // Strip the declaration to find all referenced type names
    const typeNames = this.extractTypeNames(declaration)
    for (const name of typeNames) {
      if (this.originalTypes.has(name)) {
        deps.add(name)
      }
    }
  }

  /**
   * Extract all type names from a potentially nested declaration string.
   * E.g., "HashMap<String, Vec<CustomType>>" → ["HashMap", "String", "Vec", "CustomType"]
   */
  private extractTypeNames(declaration: string): string[] {
    const names: string[] = []
    let current = ""

    for (const char of declaration) {
      if (char === "<" || char === ">" || char === "," || char === " " || char === "(" || char === ")") {
        const trimmed = current.trim()
        if (trimmed && !trimmed.match(/^\d+$/)) {
          names.push(trimmed)
        }
        current = ""
      } else {
        current += char
      }
    }

    const trimmed = current.trim()
    if (trimmed && !trimmed.match(/^\d+$/)) {
      names.push(trimmed)
    }

    return names
  }

  /**
   * Types that reference themselves (directly or transitively).
   * These require lazy() support for runtime serialization.
   */
  recursiveTypes = new Set<string>()

  private topologicalSort(): string[] {
    const sorted: string[] = []
    const visited = new Set<string>()
    const temp = new Set<string>()

    const visit = (node: string) => {
      if (temp.has(node)) {
        // Circular dependency — mark as recursive and skip
        this.recursiveTypes.add(node)
        return
      }
      if (visited.has(node)) return

      temp.add(node)
      const nodeDeps = this.dependencies.get(node) ?? new Set()
      for (const dep of nodeDeps) {
        visit(dep)
      }
      temp.delete(node)
      visited.add(node)
      sorted.push(node)
    }

    for (const node of this.originalTypes) {
      if (!visited.has(node)) {
        visit(node)
      }
    }

    return sorted
  }
}
