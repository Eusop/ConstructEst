# Sample DXF files

Test files for the DXF engine. All coordinates are in millimeters. Engine results below are for the current local code (2026-09-28); some rely on features not yet deployed (marked).

## Which file to use

| Goal | Upload |
|---|---|
| **Accuracy test with the civil engineer** | `File_3A_..._FIXED_MLINE_WALLS.dxf` + `File_3B_..._FIXED_MLINE_WALLS.dxf` (2 storeys), once MLINE support is deployed |
| Normal 2-storey run (what live uses today) | `File_3A_..._FIXED.dxf` + `File_3B_..._FIXED.dxf` |
| 1-storey run | `File_3A_..._FIXED.dxf` alone |
| The merged File 2, split into one file per floor | `File_2_Ground_Floor_SPLIT.dxf` + `File_2_Second_Floor_With_Roof_SPLIT.dxf` |
| Demo the BEAM / TRUSS layers | `File_3A_..._FIXED_WITH_BEAMS.dxf` + `File_3B_..._FIXED_WITH_BEAMS_TRUSSES.dxf` |
| Error handling | `File_Empty.dxf`, the raw `File 3A ...` files, or the same file in both slots |

## The two-storey house (3A ground floor, 3B second floor)

| File | What it is |
|---|---|
| `File 3A - Two Storey House Ground Floor (2).dxf`, `FILE 3A -Two-Storey House Ground Floor - REV 1.dxf` | Raw originals. They **fail** with "No floor boundary found": they have no FLOOR outline. |
| `File_3A_..._FIXED.dxf`, `File_3B_..._FIXED.dxf` | Originals made readable by the team: layers renamed to the standard names (e.g. `WALL-150` to `WALL`), a closed FLOOR outline added, and in 3B a ROOF outline (with eaves) and two ridge lines added (shown in magenta). Door leaves were redrawn as closed rectangles so the door width reads 1.0 m. Walls are drawn as **two lines**, so the engine counts them **twice** (70.15 m and 77.16 m; `docs/paper-limitations.md` entry 6). |
| `File_3A_..._FIXED_MLINE_WALLS.dxf`, `File_3B_..._FIXED_MLINE_WALLS.dxf` | Same as FIXED, but each double-line wall is converted to one **MLINE** at its real thickness (100/150 mm), so walls are read once: **34.20 m** and **37.00 m**. Short wall-end lines are on a display-only `JAMB` layer. The added FLOOR/ROOF helpers are hidden and all lines are black, so the drawing looks like the original (same 70.15 m / 77.16 m of drawn wall lines). The converted MLINEs stop about half a wall thickness short at corners, so the wall run is slightly under the true centerline. **Needs the MLINE support that isn't deployed yet**; on the current live site these files read zero walls. |
| `File_3A_..._FIXED_WITH_BEAMS.dxf`, `File_3B_..._FIXED_WITH_BEAMS_TRUSSES.dxf` | Demo files for the optional layers from the engineer's notation (Reply 4). BEAM: 18 lines per floor between neighboring columns. TRUSS (3B only): 12 trusses inside the L-shaped roof (9 across the main wing, 3 across the right wing), about 800 mm apart (team assumption). All added layers are hidden and lines are black, so they look like the original. These are **not** real structural drawings; the original has no beams or trusses. Not deployed yet. |

**Expected results, 2 storeys, roofing on:**

| | FIXED (double lines) | MLINE_WALLS | WITH_BEAMS / TRUSSES |
|---|---|---|---|
| CHB | 5,205 | 2,209 | 5,205 |
| Cement (bags) | 621 | 439 | 596 |
| Rebar (t) | 2.59 | 2.05 | 2.59 |
| Plywood | 115 | 88 | 101 |
| Lumber (bd.ft.) | 1,023 | 784 | 895 |
| Scaffolding (sets) | 105 | 105 | 255 |

Plywood uses 2.98 m² per sheet (Reply 10), which isn't deployed yet; live still shows 280 for FIXED.

1-storey FIXED 3A: CHB 2,474, cement 319, rebar 0.904 t, plywood 54, scaffolding 62 (44 with roofing off).

## Other files

| File | What it is |
|---|---|
| `File_2_Both_Floors_FIXED.dxf`, `File_2_Both_Floors_NO_ROOF_FIXED.dxf` | Both floors drawn in one file on the same layers. Kept to show the **known limitation**: a merged file overstates columns and roofing (`docs/paper-limitations.md` entry 1). Don't use for accuracy tests. |
| `File_2_Ground_Floor_SPLIT.dxf`, `File_2_Second_Floor_With_Roof_SPLIT.dxf` | `File_2_Both_Floors_FIXED.dxf` split into one file per floor, cut along the empty gaps between its three sheets (no entity crossed a gap). The ground file holds the ground floor sheet. The second floor file holds the second floor sheet **and** the roof plan sheet, left beside it in its original position (not moved over the floor). In the roof plan, only the outer eave outline and the two short ridge lines stay on `ROOF`; the wall outline under the roof, the inner fascia outline and the hip lines moved to a `ROOFPLAN-DETAIL` layer with the same color, so they still show but aren't read as roof (otherwise the three outlines add up to an 83.2 m roof perimeter). 2 storeys, roofing on: CHB 5,357, cement 627, plywood 115, lumber 1,023, scaffolding 105, roof perimeter 32.4 m. Same floors and walls as 3A/3B FIXED; CHB is higher because File 2's door leaves were never redrawn as closed rectangles, so door area reads about half. Ridge reads 2.0 m because this is a hip roof and the engine doesn't count hip lines. Walls are double lines (counted twice). |
| `File_2_Ground_Floor_SPLIT_MLINE_WALLS.dxf`, `File_2_Second_Floor_With_Roof_SPLIT_MLINE_WALLS.dxf` | The two SPLIT files with double-line walls converted to MLINE, done the same way as the 3A/3B MLINE files (short end lines on `JAMB`, FLOOR outline hidden). ROOF stays visible here because its lines are part of the original roof plan. Walls read **34.20 m** and **37.01 m**. 2 storeys, roofing on: CHB 2,360, cement 446, plywood 88, lumber 784, scaffolding 105. **Needs the MLINE support that isn't deployed yet.** |
| `File_Empty.dxf` | Valid DXF with nothing drawn; should fail cleanly with "No floor boundary found". |
| `duplex_ground_floor.dxf`, `duplex_second_floor.dxf` | Synthetic duplex: rectangles plus one door line on WALL/DOOR/FLOOR, sized to a real duplex's floor areas (37.96 m², 60.44 m²) and wall perimeters (25.04 m, 33.77 m). Walls are **single lines**, so they're read correctly. No ROOF layer: untick "Include roofing". Two files give 98.4 m² floor area; the ground floor alone as 2 storeys gives 75.92 m². |

## Notes

- **Hidden layers** in the MLINE and WITH_BEAMS files are still read by the engine; only the drawing and the upload preview hide them.
