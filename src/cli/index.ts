import { readFileSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { dirname } from "node:path"
import { fileURLToPath } from "node:url"
import * as p from "@clack/prompts"
import { Command } from "commander"
import pc from "picocolors"
import * as prettier from "prettier"
import { BorshSchemaContainerSchema, ZorshGenerator } from "../lib/index.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const packageJson = JSON.parse(readFileSync(resolve(__dirname, "../../package.json"), "utf-8"))

async function generateSchema(inputPath: string, options: { prettier: boolean }) {
  const data = readFileSync(inputPath)
  const container = BorshSchemaContainerSchema.deserialize(data)

  const generator = new ZorshGenerator()
  let code = generator.generate(container)

  if (options.prettier) {
    const prettierConfig = process.env.ZORSH_PRETTIER_CONFIG
      ? JSON.parse(readFileSync(process.env.ZORSH_PRETTIER_CONFIG, "utf-8"))
      : await prettier.resolveConfig(process.cwd())

    code = await prettier.format(code, {
      ...prettierConfig,
      parser: "typescript",
    })
  }

  return code
}

async function main() {
  const program = new Command()
    .name(packageJson.name.split("/")[1])
    .description(packageJson.description)
    .version(packageJson.version)

  program
    .command("generate")
    .description("Generate Zorsh schema from a Borsh schema file")
    .argument("[input]", "Input .bin file containing Borsh schema")
    .option("-o, --output <file>", "Output file")
    .option("--prettier", "Run prettier on output")
    .option("--no-exports", "Don't export generated types")
    .action(async (providedInput, providedOptions) => {
      console.clear()
      p.intro(`${pc.bgCyan(pc.black(" zorsh schema gen "))}`)

      try {
        let input = providedInput
        if (!input) {
          input = await p.text({
            message: "Path to schema file:",
            placeholder: "./schema.bin",
            validate: (value) => {
              if (!value) return "Please enter a file path"
              try {
                readFileSync(value)
                return
              } catch {
                return "File not found"
              }
            },
          })

          if (p.isCancel(input)) {
            p.cancel("Operation cancelled")
            process.exit(0)
          }
        }

        let output = providedOptions.output
        if (!output) {
          const result = await p.text({
            message: "Where should we save the generated schema?",
            placeholder: "./schema.ts",
            defaultValue: "./schema.ts",
          })

          if (p.isCancel(result)) {
            p.cancel("Operation cancelled")
            process.exit(0)
          }

          output = result
        }

        let usePrettier = providedOptions.prettier
        if (usePrettier === undefined) {
          usePrettier = await p.confirm({
            message: "Format output with prettier?",
            initialValue: true,
          })

          if (p.isCancel(usePrettier)) {
            p.cancel("Operation cancelled")
            process.exit(0)
          }
        }

        await p.tasks([
          {
            title: "Generating schema",
            task: async () => {
              const code = await generateSchema(resolve(input), {
                prettier: usePrettier,
              })
              writeFileSync(output, code)
              return `Generated ${code.split("\n").length} lines`
            },
          },
        ])

        p.note(`Generated schema at ${pc.cyan(output)}`)
        p.outro(`${pc.green("✓")} Schema generated successfully!`)
      } catch (error) {
        console.log(
          `${pc.red("✕")} ${error instanceof Error ? error.message : "An unknown error occurred"}`,
        )

        if (process.env.DEBUG && error instanceof Error) {
          console.error(error.stack)
        }

        process.exit(1)
      }
    })

  await program.parseAsync()
}

export const run = () => {
  main().catch(console.error)
}
