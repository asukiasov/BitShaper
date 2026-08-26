---
name: primitives-analyzer
description: Use when given a set of sample images (SVG, PNG, or JPG) of target final shapes/patterns and asked to extract reusable grid-cell primitives that could compose them, or to determine which primitives tile well next to each other.
---

# Primitives Analyzer

## Overview

Given N target images, reverse-engineer the small set of reusable single-cell
building blocks ("primitives") that, tiled on a grid with rotation/mirroring,
could reproduce them — plus which primitive/rotation/invert combinations are
good neighbors when placed edge-to-edge. Output is a survey document, not
code: this feeds a later implementation step (e.g. an OpenSpec change), it
doesn't write to `src/`.

**Core principle:** infer a per-image grid resolution first, describe every
image in terms of *existing* primitives before proposing new ones, and
determine adjacency by matching each primitive's **edge signature** — not by
eyeballing "these look nice together."

## When to Use

- User provides sample images and asks what primitives would reproduce them
- User asks which shapes/primitives "neighbor well" or "tile well" together
- Growing a primitive registry from reference material (logos, icon sets,
  pattern tiles, seamless textures)

Not for: rendering final compositions (that's implementation, after this
skill's output is reviewed) or analyzing a single one-off image in isolation
with no reuse goal.

## Inputs

Accepts a mix of formats in one pass:
- **SVG** — read the raw path data directly; reason about coordinates,
  don't render to raster first.
- **PNG/JPG** — use the Read tool's image support to actually view them;
  there's no path data, so grid/motif inference is visual.

## Process

### 1. Per-image: infer the grid

Before naming any primitive, work out what grid resolution the image implies.
Look for repeated coordinate spacing (SVG: recurring values like 128, 64, 32
in path data — the largest common divisor of repeated offsets is usually the
cell size) or repeated visual motifs at regular spacing (raster: count
repeat units by eye). State the inferred grid (e.g. "3 columns × 4 rows,
~64px cells") explicitly per image before describing its cells — don't skip
straight to "this looks like diagonal stripes."

### 2. Describe every image in terms of what already exists

Read the primitives already in the registry (if analyzing for a project that
has one, e.g. `src/core/primitives/` in bitshaper) or already proposed in a
prior survey (e.g. `docs/primitives/`, `docs/primitive-survey.md`). For each
image, try to explain its geometry using ONLY existing/already-proposed
primitives (at various rotations/inverts) first. Only introduce a new
primitive candidate when a region of the image genuinely doesn't reduce to
any existing one. This avoids the failure mode of inventing five near-duplicate
primitives that are actually the same primitive at different rotations.

### 3. Name and rank new candidates

For each genuinely new motif: a short kebab-case name, a one-sentence
geometric description (anchor, radius/curve type, symmetry), and which
sample files exhibit it. Rank by how many independent samples use it — a
primitive that recurs across many unrelated samples is a stronger candidate
than one seen once. Do not artificially cap the count to a "nice round
number" — report every distinct motif found, then let ranking do the
prioritization.

If the target registry has a hard ceiling on primitive count (e.g.
bitshaper's 8-type ID-format ceiling), state explicitly which ranked
candidates fit the remaining slots and which would need to wait for a format
revision — don't silently drop the excess.

### 4. Adjacency: build edge signatures, don't eyeball it

This is the part that must be an algorithm, not an impression.

For every candidate primitive (existing + new), at every rotation (0/90/180/270°)
and invert state that's actually used in the samples, derive its **edge
signature**: a description of what the shape looks like at each of its 4
cell boundaries (top/right/bottom/left), specifically:
- **Boundary type** at that edge: straight-through (the cell boundary is a
  plain unmodified edge), cut-corner (the fill stops short of one or both
  corners on this edge), curve-tangent (an arc meets this edge, note the
  tangent direction), or point (a vertex touches this edge at a specific
  fractional position, e.g. "midpoint").
- **Fill side**: which side of the boundary (inside/outside the cell) is
  filled at that edge, at each end of the edge.

Two primitives (each a specific type+rotation+invert) are a **good neighbor
pair** across a shared edge when their edge signatures on that shared
boundary satisfy one of:
- **Continuous match**: same boundary type, same fill side, same
  endpoint/tangent — the outline crosses the cell boundary with no visible
  seam (e.g. two `fillet` cells at rotations that make their arcs meet
  tangentially).
- **Regular alternation**: the mismatch itself is the intended rhythm —
  e.g. invert flips every row, producing an interlocking woven look — and it
  repeats on every cell of that boundary, not just once.

Flag anything else (a mismatch that occurs only once or irregularly) as a
**bad neighbor** — it reads as a broken tile, not a motif, even if a human
glancing at the source image might not immediately say why.

Output the adjacency findings as an explicit table per direction (e.g. "cell
A's right edge vs cell B's left edge"), not as narrative prose — the table is
what makes this reusable input for a later "auto-tile compatible neighbors"
feature, prose isn't.

| Primitive A (rot/invert) | Shared edge | Primitive B (rot/invert) | Verdict | Why |
|---|---|---|---|---|
| `fillet` 0° | right↔left | `fillet` 180° | good — continuous | arcs meet tangentially, same fill side |
| `bulge` 0° | bottom↔top | `bulge` 0° | bad | tip meets tip, visible flat seam |
| `bulge` 0° | bottom↔top | `bulge` invert | good — alternation | point nests into curve, repeats every row |

### 5. Write the survey doc

Structure (see `docs/primitive-survey.md` in bitshaper for a worked example
from SVG samples):
- One-paragraph summary: images surveyed, distinct new motifs found, any
  images left unexplained.
- Ranked candidate table (name, description, sample count, representative
  files).
- Ceiling section, if the target registry has one.
- Adjacency section: the edge-signature tables from step 4.
- "Samples not yet explained" — bespoke one-offs that don't decompose into
  any repeating motif. Never silently drop these.

Do not write implementation code or open a spec/change as part of this
skill — the survey is a decision document for a human to review before any
code gets written.

## Quick Reference

| Step | Output |
|---|---|
| 1. Infer grid | Stated resolution per image |
| 2. Explain with existing primitives first | Coverage notes per image |
| 3. Name/rank new candidates | Ranked table, ceiling-aware |
| 4. Edge-signature adjacency | Per-direction compatibility table |
| 5. Write survey doc | Markdown, no code |

## Common Mistakes

- **Skipping grid inference** and jumping to "primitive candidates" — leads
  to motifs that are actually the same primitive misidentified as different
  ones because they were compared at the wrong scale.
- **Proposing a new primitive that's actually an existing one at a different
  rotation** — always check reuse before naming something new.
- **Adjacency as prose** ("these look nice together") instead of the edge-
  signature table — prose doesn't generalize to primitives not yet
  eyeballed together, and can't be checked mechanically later.
- **Capping candidate count to look tidy** — report everything found, let
  the ranking (and any registry ceiling) do the prioritization.
- **Dropping unexplained samples silently** — always list bespoke one-offs
  separately instead of omitting them.
