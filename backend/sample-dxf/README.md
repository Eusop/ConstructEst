# Sample DXFs — duplex test pair

Synthetic DXFs sized to match the real duplex floor plans used to quantify the
single-file-vs-two-file accuracy gap this session (see `backend/README.md`'s
Known Limitations). They're rectangles + one door line on the standard
`WALL`/`DOOR`/`FLOOR` layers — not a room-by-room trace of the real plans —
each sized so its floor area and wall perimeter exactly match the real
building's stated figures:

| File | Represents | Floor area | Wall perimeter |
|---|---|---|---|
| `duplex_ground_floor.dxf` | Ground floor | 37.96 m² | 25.04 m |
| `duplex_second_floor.dxf` | Second floor | 60.44 m² | 33.77 m |

## How to use them

- **Test the new two-file mode**: New Project → Storeys → **2 storeys** →
  upload `duplex_ground_floor.dxf` as the primary floor plan, then
  `duplex_second_floor.dxf` in the new optional "Second floor plan" dropzone.
  Expect the resulting floor area to read **98.4 m²** (37.96 + 60.44) — not
  75.92 (37.96 × 2), which is what you'd get uploading the ground floor alone.
- **Test the single-file fallback (unchanged behavior)**: same flow, but
  leave the second dropzone empty — expect 75.92 m², matching today's
  existing (documented) approximation.
- **Test 1-storey**: Storeys → **1 storey** — only the primary dropzone
  should be visible at all.

Uncheck "Include roofing" for either — neither file has a ROOF layer.
