## ADDED Requirements

### Requirement: Reusing a mark's primitives configures the generator without regenerating
The web app SHALL provide a control on the preview view that loads the current mark's
distinct primitive types and grid size into the generator form, without generating a new
mark or altering the current preview, shape ID, URL, or ramp.

#### Scenario: Using a mark's primitives fills the generator but keeps the preview
- **WHEN** a user views a mark and activates the "use these primitives" control
- **THEN** the generator form's eligible-primitive selection SHALL be set to exactly that
  mark's distinct primitive types, the generator's grid size SHALL be set to that mark's
  grid, the seed field SHALL be cleared, and the generator form SHALL be scrolled into view

#### Scenario: The control does not change what is previewed
- **WHEN** a user activates the "use these primitives" control
- **THEN** the previewed mark, the displayed shape ID, the URL, and any active ramp SHALL be
  unchanged — no new mark is generated until the user triggers generation or randomization

#### Scenario: The control's label does not promise a new mark
- **WHEN** a user reads the control
- **THEN** its label and description SHALL describe loading the mark's primitives and grid
  into the generator, not generating a new mark
