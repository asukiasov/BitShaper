## ADDED Requirements

### Requirement: Trace an uploaded image to a mark
The web app SHALL let a user upload a raster or vector image (PNG, JPEG, or SVG) and receive
the closest mark expressible as a BitShaper shape ID, entirely client-side with no network
request. SVG input SHALL be rasterized, not path-parsed, so all three formats behave
identically. The app SHALL rasterize the image, reduce it to a two-class (foreground/
background) mask, match each cell of a user-chosen square grid to the best-fitting registered
primitive candidate (over all rotations and the invert flag) by intersection-over-union of
filled area, and encode the row-major result as a valid `BS` or `BS2` shape ID. Colour is
discarded; the output is monochrome. The app SHALL NOT attempt to reproduce the image
faithfully and SHALL NOT auto-detect the grid resolution.

#### Scenario: Uploading an image produces a reconstruction
- **WHEN** a user drops or selects a PNG, JPEG, or SVG image into the trace section
- **THEN** the app SHALL show the normalized source mask beside a live preview of the
  reconstructed mark, and SHALL make a valid shape ID available for that reconstruction

#### Scenario: Adjusting the grid size re-matches live
- **WHEN** a user changes the grid-size slider
- **THEN** the app SHALL re-match every cell at the new N×N resolution and update the
  reconstruction preview, without a page reload and without a network request

#### Scenario: Threshold and foreground/background are adjustable
- **WHEN** a user changes the binarization threshold or toggles the swap-foreground/
  background control
- **THEN** the app SHALL recompute the source mask and the reconstruction from the new
  settings, and the threshold control SHALL start seeded from an automatically computed value
  and the swap control from an automatic foreground/background guess

#### Scenario: Accepting the reconstruction loads it for editing
- **WHEN** a user chooses to use the reconstructed mark
- **THEN** the app SHALL load that shape ID into the main preview, shape-ID field, URL
  (as a new history entry), primitive-usage breakdown, and per-cell editor — the same state
  as selecting a catalog mark — while any active ramp is preserved

#### Scenario: Grid-size exploration does not touch history
- **WHEN** a user adjusts the trace controls without accepting the result
- **THEN** the app SHALL NOT change the page URL or browser history

#### Scenario: An image with no detectable shape is handled gracefully
- **WHEN** the normalized mask contains no foreground content
- **THEN** the app SHALL show a message inviting the user to adjust the threshold or swap
  foreground/background, and SHALL NOT offer an empty mark for editing or raise an error

#### Scenario: Tracing does not require or change the core package
- **WHEN** the trace feature encodes a reconstruction
- **THEN** it SHALL use only the published `bitshaper` API and SHALL produce IDs that decode
  with the same grid size and cell count as the grid the user selected
