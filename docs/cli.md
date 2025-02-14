# CLI Reference

## Commands

### generate

Generate Zorsh schemas from a Borsh schema file.

```bash
@zorsh/schema-gen generate <input> [options]
```

Arguments:

- `input`: Path to .bin file containing Borsh schema

Options:

- `-o, --output <file>`: Output file (defaults to stdout)
- `-w, --watch`: Watch input file for changes
- `--prettier`: Run prettier on output
- `--no-exports`: Don't export generated types

Examples:

```bash
# Basic usage
@zorsh/schema-gen generate schema.bin > schema.ts

# Watch mode with prettier
@zorsh/schema-gen generate schema.bin -w --prettier -o schema.ts
```

## Environment Variables

- `ZORSH_PRETTIER_CONFIG`: Path to prettier config file
