## ADDED Requirements

### Requirement: Direct per-cell editing from the preview
The web app SHALL let a user edit an individual cell of the currently displayed mark by
interacting with the preview: selecting one cell and setting its primitive type, its rotation
(0°, 90°, 180°, 270°), and its invert flag. On any such edit the app SHALL re-encode the
shape ID, update the live preview, the shape-ID field, the URL, and the primitive-usage
breakdown, without a page reload. Grid dimensions are not changed by this editor.

#### Scenario: Selecting a cell exposes its current contents
- **WHEN** a user selects a cell in the preview
- **THEN** the app SHALL present controls showing that cell's current primitive type,
  rotation, and invert state, with a picker offering every registered primitive

#### Scenario: Changing a cell's primitive re-encodes the shape
- **WHEN** a user selects a cell and picks a different primitive type for it
- **THEN** the app SHALL produce a shape ID that decodes to the same grid size with only that
  one cell's type changed, and SHALL update the preview, shape-ID field, URL, and
  primitive-usage breakdown to match

#### Scenario: Changing a cell's rotation or invert re-encodes the shape
- **WHEN** a user changes the selected cell's rotation or toggles its invert flag
- **THEN** the app SHALL produce a shape ID whose corresponding cell has the new rotation or
  invert value and whose other cells are unchanged

#### Scenario: Editing a cell preserves an active ramp
- **WHEN** the current mark has a ramp modifier and the user edits a cell
- **THEN** the resulting shape ID SHALL still carry that ramp, the Morph panel SHALL still
  show it, and the preview SHALL show the edited grid with the ramp applied

#### Scenario: Cell editing does not affect export or grid size
- **WHEN** a user edits cells and then exports SVG or PNG
- **THEN** the export SHALL reflect the edited mark, and the grid's column and row counts
  SHALL be unchanged by the editing interaction

#### Scenario: An invalid shape ID disables cell editing gracefully
- **WHEN** the displayed shape ID cannot be decoded
- **THEN** the cell-editing overlay SHALL present no editable cells and SHALL not raise an
  error
