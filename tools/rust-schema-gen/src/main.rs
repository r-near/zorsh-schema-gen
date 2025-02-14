use std::env;
use std::fs;
use std::path::PathBuf;

fn main() -> std::io::Result<()> {
    // Get output path from args or use default
    let out_path = env::args()
        .nth(1)
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("../../test/fixtures/complex_schema.bin"));

    // Generate and write schema
    let data = schema_gen::generate_schema();
    fs::write(&out_path, data)?;

    println!("Schema written to: {}", out_path.display());
    Ok(())
}
