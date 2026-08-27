## ADDED Requirements

### Requirement: Ramp transform applied per cell
When a decoded shape carries a `ramp`, `renderShape` SHALL apply an additional per-cell
transform — a non-uniform scale `(scaleX, scaleY)` and a rotation by `angleDeg` — computed from
the ramp and the cell's grid position, applied about the cell's center, **after** the cell's
discrete `rotation`/`invert` geometry transform and **before** the cell's grid offset. A shape
with no `ramp` SHALL render byte-identically to how it renders without this capability.

The per-cell transform is derived by: mapping the cell's position to a scalar `t ∈ [0, 1]`
along the ramp's `axis` (`column`, `row`, `diagonal`, or `radial` distance from the grid
center), reshaping `t` by the ramp's `curve`, then linearly interpolating each track's `param`
between its `from` and `to` at that `t`. An axis whose denominator would be zero (e.g. a
`column` ramp on a single-column grid) yields `t = 0` for every cell.

#### Scenario: Scale track shrinks a cell toward its center
- **WHEN** a shape with a `scale` (or `scaleX`+`scaleY`) track ramping from a value below 1 is
  rendered, for a cell whose resolved scale is below 1
- **THEN** that cell's emitted geometry SHALL be smaller than the un-ramped primitive and
  SHALL remain centered on the cell's center point (not shifted toward a corner)

#### Scenario: Angle track rotates a cell by a non-multiple of 90°
- **WHEN** a shape with an `angle` track resolving to a non-zero, non-90°-multiple angle for a
  cell is rendered
- **THEN** that cell's emitted path geometry SHALL reflect the extra rotation directly in its
  coordinates, with no SVG `transform` attribute

#### Scenario: Arc segments are flattened in ramped cells
- **WHEN** a cell whose primitive emits arc (`A`) segments is rendered under a ramp
- **THEN** that cell's path fragment SHALL contain no `A` command — each arc is sampled into a
  polyline and its points transformed — while the same primitive rendered without a ramp SHALL
  still emit `A` commands

#### Scenario: Empty cells stay empty under a ramp
- **WHEN** a shape containing `empty` cells is rendered with a ramp
- **THEN** the `empty` cells SHALL contribute no path data, exactly as without a ramp

#### Scenario: Invalid ramp block surfaces the decode error
- **WHEN** `renderShape` is called with an ID whose `~` ramp block fails to decode
- **THEN** rendering SHALL fail with the underlying `bad-ramp-block` decode error rather than
  emitting a partial SVG
