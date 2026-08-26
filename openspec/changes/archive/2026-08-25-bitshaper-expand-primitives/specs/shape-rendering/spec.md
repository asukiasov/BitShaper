## MODIFIED Requirements

### Requirement: Starter primitive set
The registry SHALL include, at minimum, ten primitives: `empty` (renders no path segments),
`fill` (a solid unit square), `fillet` (a concave quarter-circle corner cut), `bulge` (a convex
quarter-circle corner), `circle` (a filled circle centered in the cell, tangent to all four
sides), `wedge` (a straight diagonal cut from one corner to the opposite corner), `cap` (a
single semicircular arc spanning one full cell edge), `pinwheel-arc` (a concave arc anchored
near a corner with radius smaller than the cell size, leaving straight stub edges before the
arc), `step` (a corner-to-corner cut whose connecting edge is a diagonal-jog-diagonal polyline
instead of a single straight line), and `ogee` (a horizontal S-curve band, tangent to the left
and right cell edges at their vertical midpoint).

#### Scenario: Each starter primitive renders valid path data
- **WHEN** a single-cell shape is rendered using each of `empty`, `fill`, `fillet`, `bulge`,
  `circle`, `wedge`, `cap`, `pinwheel-arc`, `step`, and `ogee`
- **THEN** each SHALL produce syntactically valid SVG path-segment commands (or, for `empty`, no
  segments) consistent with that primitive's described geometry

#### Scenario: `circle` is centered and tangent to all four sides
- **WHEN** a single-cell shape is rendered using `circle` at any rotation or invert value
- **THEN** the emitted path SHALL describe a circle of diameter equal to the cell size, centered
  on the cell, unchanged by rotation or invert

#### Scenario: `wedge` cuts a straight diagonal
- **WHEN** a single-cell shape is rendered using `wedge`
- **THEN** the emitted path SHALL describe a right-triangle half of the cell bounded by a single
  straight edge running corner-to-corner, with no arc segments

#### Scenario: `cap` rounds one full edge with a single arc
- **WHEN** a single-cell shape is rendered using `cap`
- **THEN** the emitted path SHALL describe a single semicircular arc spanning one full cell
  edge, with radius equal to half that edge's length, rounding both of that edge's corners

#### Scenario: `pinwheel-arc` leaves straight stub edges before its arc
- **WHEN** a single-cell shape is rendered using `pinwheel-arc`
- **THEN** the emitted path SHALL describe a concave arc whose radius is smaller than the cell
  size, connected to the cell's corner by a straight stub segment along each of the two edges
  adjacent to that corner

#### Scenario: `step` cuts a jogged diagonal instead of a straight one
- **WHEN** a single-cell shape is rendered using `step`
- **THEN** the emitted path's corner-to-corner boundary SHALL be a 3-segment polyline (diagonal,
  then a short run parallel to a cell edge, then diagonal) rather than the single straight
  segment `wedge` produces for the same corners

#### Scenario: `ogee` forms a tangent S-curve
- **WHEN** a single-cell shape is rendered using `ogee`
- **THEN** the emitted path SHALL describe two arc segments of equal radius and opposite sweep
  direction, together forming a band whose boundary is tangent to the cell's left and right
  edges at their vertical midpoint
