// Maps Borsh declaration strings to Zorsh builder expressions.
// E.g., "Vec<String>" → "b.vec(b.string())"
//       "HashMap<String, u32>" → "b.hashMap(b.string(), b.u32())"
//       "CustomType" → "CustomTypeSchema"

const PRIMITIVE_MAP: Record<string, string> = {
  String: "b.string()",
  "()": "b.unit()",
  bool: "b.bool()",
}

const NUMERIC_PATTERN = /^[uif]\d+$/

const GENERIC_BUILDERS: Record<string, (...args: string[]) => string> = {
  Vec: (arg: string) => `b.vec(${arg})`,
  HashMap: (key: string, value: string) => `b.hashMap(${key}, ${value})`,
  HashSet: (arg: string) => `b.hashSet(${arg})`,
  Option: (arg: string) => `b.option(${arg})`,
  BTreeMap: (key: string, value: string) => `b.hashMap(${key}, ${value})`,
  BTreeSet: (arg: string) => `b.hashSet(${arg})`,
}

export class TypeParser {
  private lazyTypes = new Set<string>()

  /**
   * Set which types should be wrapped in b.lazy() when referenced.
   * Used for recursive/self-referential types.
   */
  setLazyTypes(types: Set<string>): void {
    this.lazyTypes = types
  }

  clearLazyTypes(): void {
    this.lazyTypes = new Set()
  }

  parse(input: string): string {
    const clean = input.trim()

    if (this.isArray(clean)) return this.parseArray(clean)
    if (this.isTuple(clean)) return this.parseTuple(clean)
    if (this.isGeneric(clean)) return this.parseGeneric(clean)
    return this.parsePrimitive(clean)
  }

  private isArray(input: string): boolean {
    return input.startsWith("[") && input.includes(";") && input.endsWith("]")
  }

  private isTuple(input: string): boolean {
    return input.startsWith("(") && input.endsWith(")")
  }

  private isGeneric(input: string): boolean {
    return input.includes("<") && input.endsWith(">")
  }

  private parseArray(input: string): string {
    const match = input.match(/^\[(.*?)\s*;\s*(\d+)\]$/)
    if (!match?.[1]) throw new Error(`Invalid array type: ${input}`)
    const elementType = this.parse(match[1])
    return `b.array(${elementType}, ${match[2]})`
  }

  private parseTuple(input: string): string {
    const inner = input.slice(1, -1)
    if (inner.trim() === "") return "b.unit()"
    const elements = this.splitTopLevel(inner, ",")
    const parsed = elements.map((e) => this.parse(e))
    return `b.tuple(${parsed.join(", ")})`
  }

  private parseGeneric(input: string): string {
    const baseType = input.slice(0, input.indexOf("<"))
    const argsString = input.slice(input.indexOf("<") + 1, -1)

    const builder = GENERIC_BUILDERS[baseType]
    if (!builder) throw new Error(`Unknown generic type: ${baseType}`)

    const args = this.splitTopLevel(argsString, ",")
    const parsedArgs = args.map((arg) => this.parse(arg))

    // biome-ignore lint/suspicious/noExplicitAny: dynamic arity
    return (builder as any)(...parsedArgs)
  }

  private parsePrimitive(input: string): string {
    if (input in PRIMITIVE_MAP) return PRIMITIVE_MAP[input]!
    if (NUMERIC_PATTERN.test(input)) return `b.${input}()`
    // Custom type → append "Schema" suffix
    const ref = `${input}Schema`
    if (this.lazyTypes.has(input)) {
      return `b.lazy(() => ${ref})`
    }
    return ref
  }

  /** Split by delimiter while respecting nested brackets */
  private splitTopLevel(input: string, delimiter: string): string[] {
    const results: string[] = []
    let current = ""
    let depth = 0

    for (const char of input) {
      if (char === "(" || char === "<" || char === "[") depth++
      if (char === ")" || char === ">" || char === "]") depth--

      if (char === delimiter && depth === 0) {
        results.push(current.trim())
        current = ""
      } else {
        current += char
      }
    }

    const trimmed = current.trim()
    if (trimmed) results.push(trimmed)

    return results
  }
}
