# cli Specification

## Purpose

Gives users a command-line entry point (`bitshaper`) to render, generate, and browse BitShaper shapes without writing code, and defines the curated shape catalog the `list` command reads from.

## Requirements

### Requirement: Render command
The CLI SHALL provide `bitshaper render <shapeId> -o <outputFile> [--fill <color>]` which decodes and renders the given shape ID and writes the resulting SVG to the given output file path.

#### Scenario: Successful render writes SVG file
- **WHEN** `bitshaper render <validShapeId> -o out.svg` is run
- **THEN** the command SHALL exit successfully and `out.svg` SHALL contain the SVG produced by rendering that shape ID

#### Scenario: Fill option passed through
- **WHEN** `bitshaper render <validShapeId> -o out.svg --fill "#333"` is run
- **THEN** the written SVG's path SHALL use `#333` as its fill color

#### Scenario: Invalid shape ID reported to the user
- **WHEN** `bitshaper render <invalidShapeId> -o out.svg` is run
- **THEN** the command SHALL exit with a non-zero status and print an error describing why the shape ID is invalid, and SHALL NOT write `out.svg`

### Requirement: Generate command
The CLI SHALL provide `bitshaper generate --seed <seed> [--grid <colsxrows>] -o <outputFile>` which deterministically generates a shape from the given seed (and optional grid size) and writes its rendered SVG to the given output file path.

#### Scenario: Successful generate writes SVG file
- **WHEN** `bitshaper generate --seed foo --grid 4x4 -o out.svg` is run
- **THEN** the command SHALL exit successfully and `out.svg` SHALL contain the SVG rendering of the shape deterministically generated from seed `foo` on a 4×4 grid

#### Scenario: Same seed and grid reproduce the same output across runs
- **WHEN** `bitshaper generate --seed foo --grid 4x4 -o a.svg` and `bitshaper generate --seed foo --grid 4x4 -o b.svg` are each run
- **THEN** the contents of `a.svg` and `b.svg` SHALL be identical

#### Scenario: Grid size omitted uses default
- **WHEN** `bitshaper generate --seed foo -o out.svg` is run without `--grid`
- **THEN** the command SHALL exit successfully, applying the documented default grid size

### Requirement: List command and curated catalog
The CLI SHALL provide `bitshaper list`, which prints every entry in the curated catalog (each with at least its shape ID, name, and tags) to standard output.

#### Scenario: Catalog entries printed
- **WHEN** `bitshaper list` is run against a non-empty catalog
- **THEN** the command SHALL print, for every catalog entry, at least its shape ID and name

#### Scenario: Empty catalog handled gracefully
- **WHEN** `bitshaper list` is run against an empty catalog
- **THEN** the command SHALL exit successfully and indicate that the catalog is empty, rather than erroring
