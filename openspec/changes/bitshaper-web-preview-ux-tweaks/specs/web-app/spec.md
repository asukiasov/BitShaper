## ADDED Requirements

### Requirement: Cell-edit controls do not obscure the cell being edited
When a user selects a cell for editing, the app SHALL present the editing controls positioned
so they do not cover the selected cell, and SHALL keep the selected cell visually
distinguished while the controls are open.

#### Scenario: The popover opens beside the selected cell
- **WHEN** a user clicks a cell in the preview to edit it
- **THEN** the editing popover SHALL appear adjacent to that cell, wholly outside the cell's
  own area, and wholly within the preview area

#### Scenario: A cell near the edge flips the popover to a side that fits
- **WHEN** the selected cell is close enough to a preview edge that the popover would not fit
  on the near side
- **THEN** the app SHALL place the popover on another side where it fits, still without
  covering the selected cell

#### Scenario: The selected cell stays marked while editing
- **WHEN** the editing popover is open for a cell
- **THEN** that cell SHALL remain visually highlighted so the user can see which cell the
  controls affect

### Requirement: Reusing a mark's primitives does not scroll the page
The primitive-reuse control on the preview view SHALL configure the generator form without
moving the user's scroll position.

#### Scenario: Activating the control leaves the viewport where it was
- **WHEN** a user activates the "use these primitives" control
- **THEN** the generator form's primitive selection, grid size, and seed field SHALL be
  updated as before, and the page SHALL NOT scroll

### Requirement: Users can find how to revisit previous generated marks
The preview view SHALL surface guidance that previously generated or randomized marks can be
revisited using the browser's history navigation.

#### Scenario: A hint is shown near the shape ID
- **WHEN** a user views the preview section
- **THEN** the app SHALL display a hint indicating that the browser Back button steps through
  previously shown marks
