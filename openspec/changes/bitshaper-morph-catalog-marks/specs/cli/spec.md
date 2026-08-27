## MODIFIED Requirements

### Requirement: List command and curated catalog
The CLI SHALL provide `bitshaper list`, which prints every entry in the curated catalog (each with at least its shape ID, name, and tags) to standard output. Every catalog entry's shape ID SHALL be a valid, canonical ID that decodes and renders without error against the current primitive set — including IDs that carry a `~` ramp-modifier block.

#### Scenario: Catalog entries printed
- **WHEN** `bitshaper list` is run against a non-empty catalog
- **THEN** the command SHALL print, for every catalog entry, at least its shape ID and name

#### Scenario: Empty catalog handled gracefully
- **WHEN** `bitshaper list` is run against an empty catalog
- **THEN** the command SHALL exit successfully and indicate that the catalog is empty, rather than erroring

#### Scenario: Every catalog entry is a renderable shape ID
- **WHEN** each curated catalog entry's shape ID is decoded and rendered
- **THEN** decoding and rendering SHALL succeed for every entry, and re-encoding the decoded shape SHALL reproduce the entry's ID exactly (canonical form), whether or not the ID carries a `~` ramp block
