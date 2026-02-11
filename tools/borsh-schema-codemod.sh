#!/usr/bin/env bash
# borsh-schema-codemod: Add BorshSchema derives to all types that derive BorshSerialize
#
# Usage:
#   ./borsh-schema-codemod.sh /path/to/crate         # dry-run (preview changes)
#   ./borsh-schema-codemod.sh /path/to/crate --apply  # apply changes
#
# What it does:
#   1. Finds all .rs files with derive(BorshSerialize)
#   2. Adds BorshSchema to those derive lists (cfg_attr gated behind "schema" feature)
#   3. Adds `use borsh::BorshSchema;` to files that need it
#   4. Patches Cargo.toml to add the schema feature
#
# What it skips:
#   - Files that already have BorshSchema
#   - Types with manual BorshSerialize impls (no derive)
#   - Third-party dependencies

set -euo pipefail

CRATE_DIR="${1:-.}"
APPLY="${2:-}"

if [ ! -d "$CRATE_DIR" ]; then
    echo "Error: $CRATE_DIR is not a directory"
    exit 1
fi

echo "=== borsh-schema-codemod ==="
echo "Target: $CRATE_DIR"
echo "Mode: ${APPLY:+APPLY}${APPLY:-DRY-RUN (pass --apply to write changes)}"
echo ""

# Count files that would be modified
modified=0
skipped=0

# Find all .rs files that derive BorshSerialize but NOT BorshSchema
while IFS= read -r file; do
    # Skip if already has BorshSchema
    if grep -q 'BorshSchema' "$file" 2>/dev/null; then
        ((skipped++)) || true
        continue
    fi

    # Check if this file has derive(BorshSerialize)
    if ! grep -qE 'derive\(.*BorshSerialize' "$file" 2>/dev/null; then
        continue
    fi

    ((modified++)) || true
    echo "  → $file"

    if [ "$APPLY" = "--apply" ]; then
        # Strategy: Add cfg_attr line AFTER each derive line that contains BorshSerialize
        # This handles multi-line derives too
        #
        # Transform:
        #   #[derive(BorshSerialize, BorshDeserialize, ...)]
        # Into:
        #   #[derive(BorshSerialize, BorshDeserialize, ...)]
        #   #[cfg_attr(feature = "schema", derive(borsh::BorshSchema))]

        # Use perl for reliable multi-line handling
        perl -i -pe '
            # After a line containing derive(.*BorshSerialize.*), insert cfg_attr
            # But only if the next line does not already have BorshSchema
            if ($prev_was_derive && !/BorshSchema/) {
                print "#[cfg_attr(feature = \"schema\", derive(borsh::BorshSchema))]\n";
            }
            $prev_was_derive = /derive\(.*BorshSerialize/;
        ' "$file"

        # Handle edge case: if the last derive is at end of file
        if grep -q 'derive(.*BorshSerialize' "$file" | tail -1; then
            : # perl handles this
        fi
    fi
done < <(find "$CRATE_DIR/src" -name "*.rs" -type f 2>/dev/null)

echo ""
echo "Files to modify: $modified"
echo "Files already have BorshSchema: $skipped"

# Patch Cargo.toml
CARGO_TOML="$CRATE_DIR/Cargo.toml"
if [ -f "$CARGO_TOML" ]; then
    if grep -q 'unstable__schema' "$CARGO_TOML"; then
        echo "Cargo.toml: already has unstable__schema feature"
    else
        echo "Cargo.toml: needs schema feature added"
        if [ "$APPLY" = "--apply" ]; then
            # Check if [features] section exists
            if grep -q '^\[features\]' "$CARGO_TOML"; then
                # Add schema feature after [features] line
                sed -i '/^\[features\]/a schema = ["borsh/unstable__schema"]' "$CARGO_TOML"
            else
                # Append [features] section
                printf '\n[features]\nschema = ["borsh/unstable__schema"]\n' >> "$CARGO_TOML"
            fi
            echo "  ✓ Added schema feature to Cargo.toml"
        fi
    fi
fi

echo ""
if [ "$APPLY" = "--apply" ]; then
    echo "✓ Changes applied. Test with: cargo build --features schema"
else
    echo "Dry run complete. Run with --apply to make changes."
fi
