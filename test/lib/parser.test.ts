import { describe, expect, test } from "vitest"
import { TypeParser } from "../../src/lib/parser.js"

describe("TypeParser", () => {
  const parser = new TypeParser()

  const testCases = [
    {
      input: "String",
      expected: "b.string()",
    },
    {
      input: "u32",
      expected: "b.u32()",
    },
    {
      input: "Vec<String>",
      expected: "b.vec(b.string())",
    },
    {
      input: "HashMap<String, u32>",
      expected: "b.hashMap(b.string(), b.u32())",
    },
    {
      input: "Option<Vec<String>>",
      expected: "b.option(b.vec(b.string()))",
    },
    {
      input: "(u16, f32)",
      expected: "b.tuple([b.u16(), b.f32()])",
    },
    {
      input: "HashMap<String, (u16, f32)>",
      expected: "b.hashMap(b.string(), b.tuple([b.u16(), b.f32()]))",
    },
    {
      input: "Vec<(u64, Location, String)>",
      expected: "b.vec(b.tuple([b.u64(), LocationSchema, b.string()]))",
    },
    {
      input: "[u8; 33]",
      expected: "b.array(b.u8(), 33)",
    },
    {
      input: "[String; 5]",
      expected: "b.array(b.string(), 5)",
    },
    {
      input: "[Vec<u8>; 10]",
      expected: "b.array(b.vec(b.u8()), 10)",
    },
  ]

  test.each(testCases)("parses and generates code for $input", ({ input, expected }) => {
    const generated = parser.parse(input)
    expect(generated).toBe(expected)
  })

  test("handles nested complex types", () => {
    const input = "HashMap<String, Vec<Option<(u32, String)>>>"
    const expected = "b.hashMap(b.string(), b.vec(b.option(b.tuple([b.u32(), b.string()]))))"

    const generated = parser.parse(input)
    expect(generated).toBe(expected)
  })

  test("handles complex array types", () => {
    const complexCases = [
      {
        input: "HashMap<String, [u8; 32]>",
        expected: "b.hashMap(b.string(), b.array(b.u8(), 32))",
      },
      {
        input: "Vec<[u8; 64]>",
        expected: "b.vec(b.array(b.u8(), 64))",
      },
    ]

    for (const { input, expected } of complexCases) {
      expect(parser.parse(input)).toBe(expected)
    }
  })
})
