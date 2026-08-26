## Purpose

Gives non-developers a hosted web UI to browse the curated shape catalog, generate and customize marks, and export or share them, without installing anything.

## ADDED Requirements

### Requirement: Catalog browsing
The web app SHALL display every entry from the `bitshaper` library's curated catalog, showing at least each entry's rendered mark, name, and tags.

#### Scenario: Catalog renders on load
- **WHEN** a user opens the web app
- **THEN** the app SHALL render a visible preview for every catalog entry without requiring further user action

#### Scenario: Selecting a catalog entry loads it into the generator
- **WHEN** a user selects a catalog entry from the browse view
- **THEN** the app SHALL load that entry's shape ID into the preview/export view described below

### Requirement: Seed-based generation with grid and primitive controls
The web app SHALL let a user generate a new mark by providing a seed value, and adjust its grid size (columns × rows) and which primitive types are eligible, producing a new preview without a page reload.

#### Scenario: Generating from a seed produces a preview
- **WHEN** a user enters a seed value and triggers generation
- **THEN** the app SHALL display the rendered mark for the shape deterministically generated from that seed and the current grid/primitive settings

#### Scenario: Same seed and settings reproduce the same mark
- **WHEN** a user generates with the same seed, grid size, and primitive settings on two separate occasions
- **THEN** the app SHALL display the identical mark both times

#### Scenario: Changing grid size updates the preview
- **WHEN** a user changes the grid size control after generating a mark
- **THEN** the app SHALL regenerate and display a mark matching the new grid dimensions

#### Scenario: Randomizing generates a mark without a manually typed seed
- **WHEN** a user triggers randomization instead of typing a seed
- **THEN** the app SHALL fill in a randomly generated seed value and display the resulting mark, using the current grid and primitive settings

### Requirement: Live preview
The web app SHALL render the currently selected or generated shape ID as a visible mark that updates immediately whenever the underlying shape ID changes, without a page reload.

#### Scenario: Preview updates on generation
- **WHEN** a new mark is generated or a catalog entry is selected
- **THEN** the visible preview SHALL update to show that mark within the same page view

### Requirement: SVG and PNG export
The web app SHALL let a user download the currently previewed mark as an SVG file or as a PNG file.

#### Scenario: SVG export downloads the exact rendered markup
- **WHEN** a user chooses SVG export for the current mark
- **THEN** the app SHALL provide a downloadable `.svg` file whose content is the same SVG markup shown in the preview

#### Scenario: PNG export downloads a rasterized image
- **WHEN** a user chooses PNG export for the current mark
- **THEN** the app SHALL provide a downloadable `.png` file that is a rasterized rendering of the previewed mark

### Requirement: Shape-ID-based permalink sharing
The web app SHALL encode the currently previewed shape ID into the page URL, such that loading that URL directly (in the same browser or a different one) reproduces the identical mark without contacting any backend or database.

#### Scenario: URL reflects the current mark
- **WHEN** a user generates a mark or selects a catalog entry
- **THEN** the page URL SHALL update to include that mark's shape ID

#### Scenario: Loading a shared URL reproduces the mark
- **WHEN** a URL containing a valid shape ID is opened
- **THEN** the app SHALL load and preview that exact mark on page load, without any additional user action

#### Scenario: Invalid shape ID in URL handled gracefully
- **WHEN** a URL contains a shape ID that fails to decode
- **THEN** the app SHALL show a clear error state instead of a blank page or an unhandled crash

### Requirement: Static-first, no required backend
The web app SHALL function fully as a static site: every requirement above (catalog browsing, generation, preview, export, and permalink sharing) SHALL work using only files served statically, with no server-side computation or database required to reproduce a shared mark.

#### Scenario: App works from a static file server
- **WHEN** the built app is served from a plain static file host (no server-side code execution)
- **THEN** every requirement above SHALL continue to function
