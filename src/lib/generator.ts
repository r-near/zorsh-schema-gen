import type { BorshSchemaContainer, Definition, StructFields } from "./types.js"
import { isStruct, isEnum, isNamedFields, isUnnamedFields, isEmptyFields } from "./types.js"
import { SchemaAnalyzer } from "./analyzer.js"
import { DependencyResolver } from "./resolver.js"
import { TypeParser } from "./parser.js"

class CodeGenerator {
  private parser = new TypeParser()

  generate(
    container: BorshSchemaContainer,
    sortedTypes: string[],
    recursiveTypes: Set<string> = new Set(),
  ): string {
    const output: string[] = []

    if (recursiveTypes.size > 0) {
      output.push('import { type Schema, b } from "@zorsh/zorsh";\n')
    } else {
      output.push('import { b } from "@zorsh/zorsh";\n')
    }

    for (const type of sortedTypes) {
      const def = container.definitions[type]
      if (!def) continue

      // When generating a recursive type, enable lazy wrapping for self-references
      if (recursiveTypes.has(type)) {
        this.parser.setLazyTypes(recursiveTypes)
      } else {
        this.parser.clearLazyTypes()
      }

      const schema = this.generateTypeSchema(type, def, container, recursiveTypes.has(type))
      output.push(schema)
    }

    this.parser.clearLazyTypes()
    return output.join("\n\n")
  }

  private generateTypeSchema(
    name: string,
    def: Definition,
    container: BorshSchemaContainer,
    isRecursive = false,
  ): string {
    let schema: string
    if (isStruct(def)) {
      schema = this.generateStructSchema(name, def.Struct, isRecursive)
    } else if (isEnum(def)) {
      schema = this.generateEnumSchema(name, def.Enum, container, isRecursive)
    } else {
      throw new Error(`Unsupported top-level definition type for ${name}: ${JSON.stringify(def)}`)
    }

    if (isRecursive) {
      return `${schema}\nexport type ${name} = b.infer<typeof ${name}Schema>;`
    }
    return `${schema}\nexport type ${name} = b.infer<typeof ${name}Schema>;`
  }

  private generateStructSchema(name: string, fields: StructFields, isRecursive = false): string {
    const constDecl = isRecursive
      ? `export const ${name}Schema: Schema<unknown> = `
      : `export const ${name}Schema = `

    if (isEmptyFields(fields)) {
      return `${constDecl}b.struct({});`
    }

    if (isNamedFields(fields)) {
      const fieldLines = fields.map(
        ([fieldName, declaration]) =>
          `  ${fieldName}: ${this.parser.parse(declaration)}`,
      )
      return `${constDecl}b.struct({\n${fieldLines.join(",\n")}\n});`
    }

    if (isUnnamedFields(fields)) {
      if (fields.length === 1) {
        return `${constDecl}${this.parser.parse(fields[0]!)};`
      }
      const elements = fields.map((d) => this.parser.parse(d))
      return `${constDecl}b.tuple(${elements.join(", ")});`
    }

    return `${constDecl}b.struct({});`
  }

  private generateEnumSchema(
    name: string,
    enumDef: { tag_width: number; variants: [number, string, string][] },
    container: BorshSchemaContainer,
    isRecursive = false,
  ): string {
    const variants: string[] = []

    for (const [, variantName, variantDeclaration] of enumDef.variants) {
      let variantSchema: string

      if (variantDeclaration === "()" || !variantDeclaration) {
        variantSchema = "b.unit()"
      } else {
        const variantDef = container.definitions[variantDeclaration]
        if (!variantDef) {
          variantSchema = "b.unit()"
        } else if (isStruct(variantDef)) {
          variantSchema = this.generateVariantContent(variantDef.Struct)
        } else {
          variantSchema = "b.unit()"
        }
      }

      variants.push(`  ${variantName}: ${variantSchema}`)
    }

    const constDecl = isRecursive
      ? `export const ${name}Schema: Schema<unknown> = `
      : `export const ${name}Schema = `

    return `${constDecl}b.enum({\n${variants.join(",\n")}\n});`
  }

  private generateVariantContent(fields: StructFields): string {
    if (isEmptyFields(fields)) {
      return "b.unit()"
    }

    if (isUnnamedFields(fields)) {
      if (fields.length === 1) {
        // Single-element tuple variant → use inner type directly
        return this.parser.parse(fields[0]!)
      }
      // Multi-element tuple variant → b.tuple(...)
      const elements = fields.map((d) => this.parser.parse(d))
      return `b.tuple(${elements.join(", ")})`
    }

    if (isNamedFields(fields)) {
      // Struct variant → inline b.struct({...})
      const fieldLines = fields.map(
        ([fieldName, declaration]) =>
          `    ${fieldName}: ${this.parser.parse(declaration)}`,
      )
      return `b.struct({\n${fieldLines.join(",\n")}\n  })`
    }

    return "b.unit()"
  }
}

export class ZorshGenerator {
  generate(container: BorshSchemaContainer): string {
    const analyzer = new SchemaAnalyzer()
    const originalTypes = analyzer.findOriginalTypes(container)

    const resolver = new DependencyResolver(originalTypes)
    const sortedTypes = resolver.buildDependencyGraph(container)

    const generator = new CodeGenerator()
    return generator.generate(container, sortedTypes, resolver.recursiveTypes)
  }

  /**
   * Generate from multiple containers (multiple root types).
   * Merges all definitions and generates code for all original types.
   */
  generateMulti(containers: BorshSchemaContainer[]): string {
    // Merge all definitions
    const merged: BorshSchemaContainer = {
      declaration: containers[0]?.declaration ?? "",
      definitions: {},
    }

    for (const container of containers) {
      Object.assign(merged.definitions, container.definitions)
    }

    return this.generate(merged)
  }
}
