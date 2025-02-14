# Schema Generator

This tool generates Borsh schema files for testing the zorsh-schema-gen package.

## Usage

Generate schema file:

```bash
# Generate in default location (../../test/fixtures/complex_schema.bin)
cargo run

# Generate in custom location
cargo run -- path/to/output.bin
```

Run tests (also generates schema):

```bash
cargo test
```

## Development

To add new types to the schema:

1. Add your type definitions to `src/lib.rs`
2. Make sure they derive `BorshSchema`
3. Run tests to generate updated schema
4. Commit both the code and generated schema file
