import { readFileSync, watch, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { dirname } from "node:path"
import { fileURLToPath } from "node:url"
// cli/index.ts
import { Command } from "commander"

import chalk from "chalk"
import ora from "ora"
import * as prettier from "prettier"
import { BorshSchemaContainerSchema, ZorshGenerator } from "../lib/index.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Read package.json
const packageJson = JSON.parse(readFileSync(resolve(__dirname, "../../package.json"), "utf-8"))

const program = new Command()

program
  .name(packageJson.name.split("/")[1]) // Remove the @zorsh/ prefix
  .description(packageJson.description)
  .version(packageJson.version)

program
  .command("generate")
  .description("Generate Zorsh schema from a Borsh schema file")
  .argument("<input>", "Input .bin file containing Borsh schema")
  .option("-o, --output <file>", "Output file (defaults to stdout)")
  .option("-w, --watch", "Watch input file for changes")
  .option("--prettier", "Run prettier on output")
  .option("--no-exports", "Don't export generated types")
  .action(async (input, options) => {
    const inputPath = resolve(input)
    const generator = new ZorshGenerator()

    const generateSchema = async () => {
      const spinner = ora("Generating schema").start()
      try {
        // Read and parse schema
        const data = readFileSync(inputPath)
        const container = BorshSchemaContainerSchema.deserialize(data)

        // Generate code
        let code = generator.generate(container)

        // Format with prettier if requested
        if (options.prettier) {
          const prettierConfig = process.env.ZORSH_PRETTIER_CONFIG
            ? JSON.parse(readFileSync(process.env.ZORSH_PRETTIER_CONFIG, "utf-8"))
            : await prettier.resolveConfig(process.cwd())

          code = await prettier.format(code, {
            ...prettierConfig,
            parser: "typescript",
          })
        }

        // Output
        if (options.output) {
          writeFileSync(options.output, code)
          spinner.succeed(chalk.green(`Schema written to ${options.output}`))
        } else {
          spinner.stop()
          console.log(code)
        }
      } catch (error) {
        spinner.fail(chalk.red("Error generating schema"))
        if (error instanceof Error) {
          console.error(chalk.red(error.message))
          if (process.env.DEBUG) {
            console.error(error.stack)
          }
        }
        if (!options.watch) {
          process.exit(1)
        }
      }
    }

    // Initial generation
    await generateSchema()

    // Watch mode
    if (options.watch) {
      console.log(chalk.blue("\nWatching for changes..."))
      watch(inputPath, { persistent: true }, async (eventType) => {
        if (eventType === "change") {
          console.log(chalk.blue("\nFile changed, regenerating..."))
          await generateSchema()
        }
      })
    }
  })

// Add error handling for unknown commands
program.on("command:*", () => {
  console.error(chalk.red("Invalid command: %s\n"), program.args.join(" "))
  program.help()
  process.exit(1)
})

export const run = () => {
  program.parse()
}
