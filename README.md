# @zorsh/schema-gen

Generate Zorsh schemas from Borsh schema definitions.

## Quick Start

```bash
# Install globally
npm install -g @zorsh/schema-gen

# Generate schema from a Borsh schema file
@zorsh/schema-gen generate schema.bin > schema.ts

# Or use npx
npx @zorsh/schema-gen generate schema.bin > schema.ts
```

## Usage

### CLI

The CLI tool accepts a Borsh schema file (usually with .bin extension) and generates TypeScript code with Zorsh schema definitions:

```bash
# Basic usage
@zorsh/schema-gen generate input.bin > output.ts

# Specify output file
@zorsh/schema-gen generate input.bin -o output.ts

# Watch mode
@zorsh/schema-gen generate input.bin -w
```

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
