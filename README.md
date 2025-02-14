# @zorsh/schema-gen

Generate Zorsh schemas from Borsh schema definitions.

## Quick Start

You can run zorsh-schema-gen using various package managers:

```bash
# NPM
npm install -g @zorsh/schema-gen
zorsh-schema-gen generate

# Or use npx without installing
npx @zorsh/schema-gen generate

# Using pnpm
pnpm add -g @zorsh/schema-gen
zorsh-schema-gen generate

# Or use pnpm dlx without installing
pnpm dlx @zorsh/schema-gen generate

# Using yarn
yarn global add @zorsh/schema-gen
zorsh-schema-gen generate

# Or use yarn dlx without installing
yarn dlx @zorsh/schema-gen generate
```

## Usage

### CLI

The CLI tool provides an interactive interface to generate TypeScript code with Zorsh schema definitions from Borsh schema files:

```bash
# Interactive mode (will prompt for all options)
zorsh-schema-gen generate

# Specify input and output
zorsh-schema-gen generate input.bin -o output.ts

# Format with prettier
zorsh-schema-gen generate input.bin -o output.ts --prettier
```

### Options

- `input` - Path to input .bin file containing Borsh schema
- `-o, --output <file>` - Output file path
- `--prettier` - Format output with prettier
- `--no-exports` - Don't export generated types

If options are not provided, the CLI will prompt for them interactively.

### Programmatic Usage

You can also use the library programmatically:

```typescript
import { readFileSync } from "node:fs";
import { BorshSchemaContainerSchema, ZorshGenerator } from "@zorsh/schema-gen";

// Read and parse schema file
const data = readFileSync("schema.bin");
const container = BorshSchemaContainerSchema.deserialize(data);

// Generate Zorsh schemas
const generator = new ZorshGenerator();
const code = generator.generate(container);
```

## Documentation

- [CLI Reference](docs/cli.md) - Detailed CLI usage and options
- [Technical Documentation](docs/technical.md) - Deep dive into how it works
