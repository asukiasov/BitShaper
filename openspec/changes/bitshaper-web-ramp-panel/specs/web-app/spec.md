## ADDED Requirements

### Requirement: Ramp modifier editing
The web app SHALL let a user add, edit, and remove a shape's ramp modifier from the preview
view, keeping the displayed shape ID, live preview, and export outputs in sync with the current
ramp.

#### Scenario: Adding a ramp track updates the shape ID and preview
- **WHEN** a user opens the Morph panel, chooses a direction and curve, and adds a parameter
  track with a start and end value
- **THEN** the app SHALL append a `~` ramp block to the current shape ID, update the live
  preview to show the per-cell transform, and reflect the new ID in the shape-ID field and
  subsequent exports — without a page reload

#### Scenario: Removing all ramp tracks drops the ramp block
- **WHEN** a user removes every parameter track (or uses a "remove morph" control)
- **THEN** the current shape ID SHALL no longer contain a `~` block and the preview SHALL show
  the shape with no per-cell transform

#### Scenario: Loading a ramped shape ID populates the panel
- **WHEN** a shape ID that carries a `~` ramp block is loaded (from the catalog, a pasted ID,
  or a shared URL)
- **THEN** the Morph panel SHALL show that ramp's direction, curve, and tracks, so the user can
  edit it further

#### Scenario: Ramp survives regeneration
- **WHEN** a user has an active ramp in the Morph panel and then generates or randomizes a new
  mark
- **THEN** the newly generated mark SHALL keep the same ramp applied

#### Scenario: Ramp editing values match what is encoded
- **WHEN** a user sets a track's start or end value with the panel's controls
- **THEN** the value shown in the panel SHALL equal the value that the shape ID actually
  encodes (the controls operate on the ID format's quantization grid, so there is no drift
  between the displayed and encoded value)
