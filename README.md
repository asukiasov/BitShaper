# BitShaper

A compact, self-describing ID scheme for procedurally composed grid
shapes (geometric marks/logo icons) — plus a library and CLI to generate
and render them from that ID, no lookup table required.

A shape ID decodes offline: `BS-{cols}X{rows}-{payload}{checksum}`, one
base62 character per grid cell (row-major), each character encoding that
cell's primitive type, rotation, and inversion. Most shapes fit this
one-character-per-cell form; when a cell's encoded value needs more room,
`encodeShapeId` automatically switches to the wider
`BS2-{cols}X{rows}-{payload}{checksum}` form (2 characters per cell) —
you'll see both prefixes in the gallery below. See
[`openspec/roadmap.md`](openspec/roadmap.md) for the full format rationale.

## Install

```bash
npm install bitshaper
```

## Examples

Every mark below is rendered straight from its shape ID — no assets,
just the ID string.

| | | |
|---|---|---|
| ![Diamond](https://raw.githubusercontent.com/asukiasov/BitShaper/main/docs/examples/diamond.svg)<br>Diamond — `BS-2X2-GIMKE` | ![Corner Notch](https://raw.githubusercontent.com/asukiasov/BitShaper/main/docs/examples/corner-notch.svg)<br>Corner Notch — `BS-2X2-888Ge` | ![Bulge Cross](https://raw.githubusercontent.com/asukiasov/BitShaper/main/docs/examples/bulge-cross.svg)<br>Bulge Cross — `BS-3X3-0S0Q8U0O0s` |
| ![Filled Square](https://raw.githubusercontent.com/asukiasov/BitShaper/main/docs/examples/filled-square.svg)<br>Filled Square — `BS-2X2-8888W` | ![Pinwheel](https://raw.githubusercontent.com/asukiasov/BitShaper/main/docs/examples/pinwheel.svg)<br>Pinwheel — `BS-2X2-HJNLI` | ![Checker Bulge](https://raw.githubusercontent.com/asukiasov/BitShaper/main/docs/examples/checker-bulge.svg)<br>Checker Bulge — `BS-3X2-O0O0S0E` |
| ![Circle Duo](https://raw.githubusercontent.com/asukiasov/BitShaper/main/docs/examples/circle-duo.svg)<br>Circle Duo — `BS-2X2-WYbdI` | ![Wedge Fan](https://raw.githubusercontent.com/asukiasov/BitShaper/main/docs/examples/wedge-fan.svg)<br>Wedge Fan — `BS-2X2-egjlo` | ![Cap Row](https://raw.githubusercontent.com/asukiasov/BitShaper/main/docs/examples/cap-row.svg)<br>Cap Row — `BS-2X2-mortK` |
| ![Pinwheel Arc Spin](https://raw.githubusercontent.com/asukiasov/BitShaper/main/docs/examples/pinwheel-arc-spin.svg)<br>Pinwheel Arc Spin — `BS2-2X2-0u0w0z113q` | ![Step Stack](https://raw.githubusercontent.com/asukiasov/BitShaper/main/docs/examples/step-stack.svg)<br>Step Stack — `BS2-2X2-121417194M` | ![Ogee Wave](https://raw.githubusercontent.com/asukiasov/BitShaper/main/docs/examples/ogee-wave.svg)<br>Ogee Wave — `BS2-2X2-1A1C1F1H4s` |
| ![Scatter Nine](https://raw.githubusercontent.com/asukiasov/BitShaper/main/docs/examples/scatter-nine.svg)<br>Scatter Nine — `BS-3X3-M9ADK8HVBH` | ![Scatter Sixteen](https://raw.githubusercontent.com/asukiasov/BitShaper/main/docs/examples/scatter-sixteen.svg)<br>Scatter Sixteen — `BS-4X4-ETAOVIDJ6POVDHAIs` | |

Together these cover all 10 primitives currently in the registry:
`empty`, `fill`, `fillet`, `bulge`, `circle`, `wedge`, `cap`,
`pinwheel-arc`, `step`, `ogee`.

## Library usage

```ts
import {
  decodeShapeId,
  encodeShapeId,
  renderShape,
  generateShapeId,
} from "bitshaper";

// Decode a shape ID into its grid definition
const shapeDef = decodeShapeId("BS-2X2-GIMKE");
// { cols: 2, rows: 2, cells: [...] }

// Render a shape ID straight to an SVG string
const svg = renderShape("BS-2X2-GIMKE");

// Encode a grid definition back into its canonical ID
const id = encodeShapeId(shapeDef); // "BS-2X2-GIMKE"

// Deterministically generate a new shape ID from a seed
const generatedId = generateShapeId("my-seed", { cols: 3, rows: 3 });
```

## CLI usage

```bash
# Decode and render a shape ID to an SVG file
bitshaper render "BS-2X2-GIMKE" -o diamond.svg
bitshaper render "BS-2X2-GIMKE" -o diamond.svg --fill "#1d4ed8"

# Deterministically generate and render a shape from a seed
bitshaper generate --seed my-seed --grid 3x3 -o generated.svg

# List every curated catalog entry
bitshaper list
```

## Contributing

See [`docs/architecture.md`](docs/architecture.md) for where code lives
and [`docs/code-standards.md`](docs/code-standards.md) for how it's
written. This project uses spec-driven development via
[OpenSpec](openspec/) for changes under `src/`.

## License

[MIT](LICENSE)
