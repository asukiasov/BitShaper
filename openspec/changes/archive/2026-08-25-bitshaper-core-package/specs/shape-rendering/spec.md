## Purpose

Turns a decoded shape definition into visible SVG output, and provides seeded, reproducible random shape generation, via an append-only registry of geometric primitives.

## ADDED Requirements

### Requirement: Render shape ID to SVG
Given a valid shape ID, the system SHALL produce a single, well-formed SVG document string containing one `<svg>` element sized to a configurable dimension (default 256×256) and one `<path>` element whose `d` attribute is the concatenation of every cell's path-segment commands, positioned at that cell's grid offset.

#### Scenario: Renders a full grid
- **WHEN** `renderShape` is called with a valid shape ID for an N×M grid
- **THEN** the returned SVG string SHALL contain path data contributed by all N×M cells, each positioned at its correct row/column offset within the SVG viewport

#### Scenario: Custom size and fill honored
- **WHEN** `renderShape` is called with `opts.size` and/or `opts.fill`
- **THEN** the returned SVG's root element SHALL use the given size for its width/height (or viewBox), and the path SHALL use the given fill color

#### Scenario: Invalid shape ID surfaces decode error
- **WHEN** `renderShape` is called with a shape ID that fails decoding (bad format, cell-count mismatch, or checksum failure)
- **THEN** rendering SHALL fail with the underlying decode error rather than emitting a partial or empty SVG

### Requirement: Primitive registry
The system SHALL maintain a registry mapping primitive type names to stable numeric indices and to an SVG path-builder function for that primitive. The numeric index assigned to a primitive SHALL never change or be reused once assigned, so that existing shape IDs continue to decode to the same primitive after new primitives are added.

#### Scenario: New primitive appended without breaking old IDs
- **WHEN** a new primitive type is added to the registry after shape IDs referencing existing primitive indices have already been issued
- **THEN** decoding and rendering those existing IDs SHALL continue to resolve to the same primitives as before the addition

#### Scenario: Unknown primitive index rejected
- **WHEN** a shape ID decodes to a cell whose type index has no corresponding entry in the registry
- **THEN** rendering SHALL fail with an error identifying the unknown primitive, rather than skipping the cell silently

### Requirement: Starter primitive set
The registry SHALL include, at minimum, four starter primitives: `empty` (renders no path segments), `fill` (a solid unit square), `fillet` (a concave quarter-circle corner cut), and `bulge` (a convex quarter-circle corner).

#### Scenario: Each starter primitive renders valid path data
- **WHEN** a single-cell shape is rendered using each of `empty`, `fill`, `fillet`, and `bulge`
- **THEN** each SHALL produce syntactically valid SVG path-segment commands (or, for `empty`, no segments) consistent with that primitive's described geometry

### Requirement: Rotation and inversion applied to path geometry
A cell's `rotation` (0/90/180/270°) and `invert` (horizontal mirror) SHALL be applied by transforming the primitive's corner/geometry reference before emitting path commands, not by wrapping output in an SVG `transform=` attribute.

#### Scenario: Rotated cell changes path coordinates, not a transform attribute
- **WHEN** a cell with `rotation: 90` is rendered
- **THEN** the emitted path-segment commands for that cell SHALL reflect the rotated geometry directly in their coordinates, and the output SHALL NOT contain a `transform` attribute for that cell

#### Scenario: Inversion applied before rotation
- **WHEN** a cell has both `invert: true` and a non-zero `rotation`
- **THEN** the emitted path geometry SHALL reflect the mirror applied before the rotation, consistently and reproducibly for the same inputs

### Requirement: Seeded shape generation
Given a seed (string or number) and an optional grid size, the system SHALL deterministically generate a `ShapeDef` using a mulberry32 pseudo-random number generator, such that the same seed and grid size always produce the same `ShapeDef`.

#### Scenario: Same seed produces identical shape
- **WHEN** `generateShapeDef` (or `generateShapeId`) is called twice with the same seed and same grid size
- **THEN** both calls SHALL return an equal `ShapeDef` (or identical shape ID)

#### Scenario: Different seeds produce different shapes (in general)
- **WHEN** `generateShapeDef` is called with two different seeds and the same grid size
- **THEN** the resulting `ShapeDef` values SHALL, in the general case, differ in at least one cell's type, rotation, or invert value

#### Scenario: Default grid used when omitted
- **WHEN** `generateShapeDef` or `generateShapeId` is called without a `grid` argument
- **THEN** the system SHALL apply a documented default grid size and produce a valid `ShapeDef`/shape ID for that size
