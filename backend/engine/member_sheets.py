"""
"By member" breakdown: each structural member worked out the way the
engineer writes a manual estimate (his handwritten sheets, 2026-10-09):
Given, then Concrete (cement, sand, gravel), Rebar and Formworks, with his
notation (VT = total volume, WT = weight, LV / LH = vertical / horizontal
length). Uses the same numbers as formulas.py, but raw: no cement, steel or
roofing factor and no wastage, each result rounded up per member like on
paper. The Total view keeps the factors, so it is a little higher.
"""
import math

SHEET_M2 = 1.22 * 2.44  # one plywood sheet, 2.9768 m2
BAR_M = 6.0


def n(value, decimals=2):
    return f"{value:,.{decimals}f}"


def up(value):
    return math.ceil(round(value, 6))


def pcs(value):
    """'45.72 pcs ≈ 46 pcs', or just '46 pcs' when it is already whole."""
    whole = up(value)
    return f"{n(value)} pcs ≈ {whole:,} pcs" if abs(value - round(value)) > 1e-6 else f"{whole:,} pcs"


def mix_lines(vt):
    cement = vt * 9
    return [
        f"Cement = VT x 9 bags/cu.m = {n(vt, 3)} x 9 = {n(cement)} bags ≈ {up(cement):,} bags",
        f"Sand = VT x 0.5 = {n(vt, 3)} x 0.5 = {n(vt * 0.5, 3)} cu.m",
        f"Gravel = VT x 1.0 = {n(vt, 3)} x 1.0 = {n(vt, 3)} cu.m",
    ]


def mix_results(vt):
    return [
        {"material": "Cement", "quantity": up(vt * 9), "unit": "bags"},
        {"material": "Sand", "quantity": round(vt * 0.5, 3), "unit": "cu.m"},
        {"material": "Gravel", "quantity": round(vt, 3), "unit": "cu.m"},
    ]


def split_rebar_lines(weight_kg, main_mm, main_uw, second_mm, second_uw, second_name):
    """Half main bars, half ties or stirrups, as on his column and beam sheets."""
    main_m = weight_kg * 0.5 / main_uw
    second_m = weight_kg * 0.5 / second_uw
    lines = [
        f"For main bars: use {main_mm}mm ø, unit WT = {n(main_uw, 3)} kg/m",
        f"L = Rebar WT x 50% / unit WT = {n(weight_kg)} x 50% / {n(main_uw, 3)} = {n(main_m)} m",
        f"Qty = L / 6 m = {n(main_m)} / 6 = {pcs(main_m / BAR_M)} ({main_mm}mm ø x 6 m)",
        f"For {second_name}: use {second_mm}mm ø, unit WT = {n(second_uw, 3)} kg/m",
        f"L = Rebar WT x 50% / unit WT = {n(weight_kg)} x 50% / {n(second_uw, 3)} = {n(second_m)} m",
        f"Qty = L / 6 m = {n(second_m)} / 6 = {pcs(second_m / BAR_M)} ({second_mm}mm ø x 6 m)",
    ]
    results = [
        {"material": f"Rebar {main_mm}mm", "quantity": up(main_m / BAR_M), "unit": "pcs"},
        {"material": f"Rebar {second_mm}mm", "quantity": up(second_m / BAR_M), "unit": "pcs"},
    ]
    return lines, results


def plywood_lines(area_total, frame_bdft_per_sheet=None, frame_sheet_m2=2.88):
    lines = [f"Qty = AT / (1.22 x 2.44) = {n(area_total)} / {n(SHEET_M2, 4)} = {pcs(area_total / SHEET_M2)} (1/2\" plywood)"]
    results = [{"material": "Plywood", "quantity": up(area_total / SHEET_M2), "unit": "pcs"}]
    if frame_bdft_per_sheet:
        bdft = area_total / frame_sheet_m2 * frame_bdft_per_sheet
        lines.append(f"Lumber (2\" x 2\" frames) = AT / {frame_sheet_m2} sq.m x {frame_bdft_per_sheet} bd.ft = {n(bdft)} bd.ft ≈ {up(bdft):,} bd.ft")
        results.append({"material": "Lumber", "quantity": up(bdft), "unit": "bd.ft"})
    return lines, results


def build_member_sheets(d):
    """d holds the values formulas.compute_materials worked out (see there)."""
    members = []
    uw = d["unit_weight"]

    # ---------------- Footing ----------------
    f = d["footing"]
    v1 = f["w"] * f["l"] * f["t"]
    vt = v1 * f["count"]
    rebar_kg = vt * f["rate"]
    rebar_m = rebar_kg / uw(16)
    a1 = (f["w"] + f["l"]) * 2 * f["t"]
    at = a1 * f["count"]
    form_lines, form_results = plywood_lines(at, d["column_form_bdft"], d["form_sheet_m2"])
    members.append({
        "key": "footing", "title": "Footing",
        "given": [f"Concrete rebar ratio = {n(f['rate'], 0)} kg/cu.m",
                  f"W = Width = {n(f['w'])} m", f"L = Length = {n(f['l'])} m", f"T = Thickness = {n(f['t'])} m",
                  f"No. of footings = {f['count']}"],
        "sections": [
            {"title": "Concrete", "lines": [f"V = W x L x T = {n(f['w'])} x {n(f['l'])} x {n(f['t'])} = {n(v1, 3)} cu.m",
                                            f"VT = {n(v1, 3)} x {f['count']} = {n(vt, 3)} cu.m"] + mix_lines(vt)},
            {"title": "Rebar", "lines": [f"Use 16mm ø = {n(uw(16), 3)} kg/m",
                                         f"Total WT = VT x {n(f['rate'], 0)} kg/cu.m = {n(vt, 3)} x {n(f['rate'], 0)} = {n(rebar_kg)} kg",
                                         f"Total length = {n(rebar_kg)} kg / {n(uw(16), 3)} kg/m = {n(rebar_m)} m",
                                         f"Qty = {n(rebar_m)} m / 6 m per pc = {pcs(rebar_m / BAR_M)} (16mm ø x 6 m)"]},
            {"title": "Formworks", "lines": [f"A = (W + L) x 2 x T = ({n(f['w'])} + {n(f['l'])}) x 2 x {n(f['t'])} = {n(a1)} sq.m",
                                             f"AT = {n(a1)} x {f['count']} = {n(at)} sq.m"] + form_lines},
        ],
        "results": mix_results(vt) + [{"material": "Rebar 16mm", "quantity": up(rebar_m / BAR_M), "unit": "pcs"}] + form_results,
    })

    # ---------------- Column ----------------
    c = d["column"]
    segs = c["segments"]  # [(abbr, label, w, l, h, count, h_note)]
    given = [f"Concrete rebar ratio = {n(c['rate'], 0)} kg/cu.m",
             f"Main bar = {c['main_mm']}mm ø, Lateral ties = {c['tie_mm']}mm ø"]
    concrete, forms, volumes, areas = [], [], [], []
    for abbr, label, w, l, h, count, h_note in segs:
        given.append(f"{label} ({abbr}): W = {n(w)} m, L = {n(l)} m, H = {h_note or n(h) + ' m'}, Count = {count}")
        v = w * l * h * count
        a = (w + l) * 2 * h * count
        volumes.append((abbr, v))
        areas.append((abbr, a))
        concrete.append(f"V{abbr} = W x L x H x Count = {n(w)} x {n(l)} x {n(h)} x {count} = {n(v, 4)} cu.m")
        forms.append(f"A{abbr} = (W + L) x 2 x H x Count = ({n(w)} + {n(l)}) x 2 x {n(h)} x {count} = {n(a)} sq.m")
    vt = sum(v for _, v in volumes)
    at = sum(a for _, a in areas)
    if len(volumes) > 1:
        concrete.append(f"VT = {' + '.join('V' + x for x, _ in volumes)} = {' + '.join(n(v, 4) for _, v in volumes)} = {n(vt, 3)} cu.m")
        forms.append(f"AT = {' + '.join('A' + x for x, _ in areas)} = {' + '.join(n(a) for _, a in areas)} = {n(at)} sq.m")
    else:
        concrete.append(f"VT = {n(vt, 3)} cu.m")
        forms.append(f"AT = {n(at)} sq.m")
    rebar_kg = vt * c["rate"]
    rebar_lines, rebar_results = split_rebar_lines(rebar_kg, c["main_mm"], uw(c["main_mm"]), c["tie_mm"], uw(c["tie_mm"]), "lateral ties")
    form_lines, form_results = plywood_lines(at, d["column_form_bdft"], d["form_sheet_m2"])
    members.append({
        "key": "column", "title": "Column", "given": given,
        "sections": [
            {"title": "Concrete", "lines": concrete + mix_lines(vt)},
            {"title": "Rebar", "lines": [f"Total WT of rebar = VT x Concrete rebar ratio = {n(vt, 3)} x {n(c['rate'], 0)} = {n(rebar_kg)} kg"] + rebar_lines},
            {"title": "Formworks", "lines": forms + form_lines},
        ],
        "results": mix_results(vt) + rebar_results + form_results,
    })

    # ---------------- Beam ----------------
    b = d["beam"]
    levels = b["levels"]  # [(abbr, label, length)]
    given = [f"Concrete rebar ratio = {n(b['rate'], 0)} kg/cu.m", f"W = Width = {n(b['w'])} m, D = Depth = {n(b['d'])} m"]
    given += [f"{label} ({abbr}): L = {n(length)} m" for abbr, label, length in levels]
    concrete, forms = [], []
    vt = at = 0.0
    for abbr, label, length in levels:
        v = b["w"] * b["d"] * length
        a = (b["w"] + 2 * b["d"]) * length
        vt += v
        at += a
        concrete.append(f"V{abbr} = W x D x L = {n(b['w'])} x {n(b['d'])} x {n(length)} = {n(v, 3)} cu.m")
        forms.append(f"A{abbr} = [W + (2 x D)] x L = [{n(b['w'])} + (2 x {n(b['d'])})] x {n(length)} = {n(a)} sq.m")
    abbrs = [x for x, _, _ in levels]
    concrete.append(f"VT = {' + '.join('V' + x for x in abbrs)} = {n(vt, 3)} cu.m" if len(levels) > 1 else f"VT = {n(vt, 3)} cu.m")
    forms.append(f"AT = {' + '.join('A' + x for x in abbrs)} = {n(at)} sq.m" if len(levels) > 1 else f"AT = {n(at)} sq.m")
    rebar_kg = vt * b["rate"]
    rebar_lines, rebar_results = split_rebar_lines(rebar_kg, b["main_mm"], uw(b["main_mm"]), b["stirrup_mm"], uw(b["stirrup_mm"]), "stirrups")
    form_lines, form_results = plywood_lines(at, d["beam_form_bdft"], d["form_sheet_m2"])
    members.append({
        "key": "beam", "title": "Beam", "given": given,
        "sections": [
            {"title": "Concrete", "lines": concrete + mix_lines(vt)},
            {"title": "Rebar", "lines": [f"Total WT of rebar = VT x Concrete rebar ratio = {n(vt, 3)} x {n(b['rate'], 0)} = {n(rebar_kg)} kg"] + rebar_lines},
            {"title": "Formworks", "lines": forms + form_lines},
        ],
        "results": mix_results(vt) + rebar_results + form_results,
    })

    # ---------------- Slabs ----------------
    s = d["slabs"]  # list of {label, area, t, bars: (mm, spacing, a, wid, b, len, length_m) or None}
    given, concrete, rebar, results = [], [], [], []
    vt = 0.0
    bar_totals = {}
    for slab in s["items"]:
        v = slab["area"] * slab["t"]
        vt += v
        given.append(f"{slab['label']}: A = {n(slab['area'])} sq.m, T = {n(slab['t'], 3)} m")
        concrete.append(f"V ({slab['label']}) = A x T = {n(slab['area'])} x {n(slab['t'], 3)} = {n(v, 3)} cu.m")
        if slab["bars"]:
            mm, spacing, ca, wid, cb, ln, length_m = slab["bars"]
            rebar.append(f"{slab['label']}, {mm}mm ø @ {n(spacing)} m both ways: L = {ca} bars x {n(wid)} m + {cb} bars x {n(ln)} m = {n(length_m)} m")
            rebar.append(f"WT = {n(length_m)} m x {n(uw(mm), 3)} kg/m = {n(length_m * uw(mm))} kg, Qty = {n(length_m)} / 6 = {pcs(length_m / BAR_M)}")
            bar_totals[mm] = bar_totals.get(mm, 0.0) + length_m
    concrete.append(f"VT = {n(vt, 3)} cu.m")
    results = mix_results(vt) + [{"material": f"Rebar {mm}mm", "quantity": up(m / BAR_M), "unit": "pcs"} for mm, m in sorted(bar_totals.items())]
    form_lines, form_results = plywood_lines(s["form_area"])
    members.append({
        "key": "slab", "title": "Slabs", "given": given,
        "sections": [
            {"title": "Concrete", "lines": concrete + mix_lines(vt)},
            {"title": "Rebar", "lines": rebar or ["No floor outline read, so no slab bars"]},
            {"title": "Formworks", "lines": [f"AT = slab area of all floors = {n(s['form_area'])} sq.m"] + form_lines
                                            + [f"Steel props = slab area / 1.0 sq.m per prop = {n(s['form_area'])} / 1.0 = {pcs(s['form_area'])}",
                                               "No lumber frames for slab forms: the steel props carry them"]},
        ],
        "results": results + form_results + [{"material": "Steel Props", "quantity": up(s["form_area"]), "unit": "pcs"}],
    })

    # ---------------- Stairs ----------------
    st = d.get("stairs")
    if st:
        slab_v = st["slant"] * st["width"] * st["waist"]
        step_v = 0.5 * st["riser"] * st["tread"] * st["width"] * st["risers"]
        vt = slab_v + step_v
        members.append({
            "key": "stairs", "title": "Stairs",
            "given": [f"Riser = {n(st['riser'])} m, Tread = {n(st['tread'])} m, Width = {n(st['width'])} m, Waist = {n(st['waist'])} m",
                      f"Risers = floor height / riser = {n(st['floor_h'])} / {n(st['riser'])} ≈ {st['risers']}",
                      f"Slant length = √(height² + run²) = {n(st['slant'])} m"],
            "sections": [
                {"title": "Concrete", "lines": [
                    f"V (waist slab) = slant x width x waist = {n(st['slant'])} x {n(st['width'])} x {n(st['waist'])} = {n(slab_v, 3)} cu.m",
                    f"V (steps) = {st['risers']} x 1/2 x {n(st['riser'])} x {n(st['tread'])} x {n(st['width'])} = {n(step_v, 3)} cu.m",
                    f"VT = {n(slab_v, 3)} + {n(step_v, 3)} = {n(vt, 3)} cu.m"] + mix_lines(vt)},
                {"title": "Rebar", "lines": [
                    f"10mm ø @ {n(st['spacing'])} m: L = {st['across']} bars x {n(st['width'])} m + {st['along']} bars x {n(st['slant'])} m = {n(st['length_m'])} m",
                    f"WT = {n(st['length_m'])} m x {n(uw(10), 3)} kg/m = {n(st['length_m'] * uw(10))} kg, Qty = {n(st['length_m'])} / 6 = {pcs(st['length_m'] / BAR_M)}"]},
            ],
            "results": mix_results(vt) + [{"material": "Rebar 10mm", "quantity": up(st["length_m"] / BAR_M), "unit": "pcs"}],
        })

    # ---------------- CHB walls ----------------
    lines_by_floor, blocks, cement, sand, bar_len = [], 0.0, 0.0, 0.0, {}
    given = []
    for wall in d["walls"]:
        a = wall["area"]
        blocks += a * 12.5
        given.append(f"{wall['label']}: wall length {n(wall['length'])} m x height {n(wall['height'])} m")
        floor_lines = [
            f"A = L x H - doors - windows = {n(wall['length'])} x {n(wall['height'])} - {n(wall['doors'])} - {n(wall['windows'])} = {n(a)} sq.m",
            f"Qty = A x 12.5 = {n(a)} x 12.5 = {pcs(a * 12.5)}",
        ]
        for size, area, bags, sand_rate in wall["mortar"]:
            cement += area * bags
            sand += area * sand_rate
            floor_lines.append(f"Cement mortar, Class B, {size} CHB ({n(area)} sq.m): Cement = A x {bags} = {n(area * bags)} bags, Sand = A x {sand_rate} = {n(area * sand_rate, 3)} cu.m")
        lv, lh = a * 2.13, a * 2.15
        mm = wall["bar_mm"]
        bar_len[mm] = bar_len.get(mm, 0.0) + lv + lh
        floor_lines += [
            f"Rebar, use {mm}mm ø ({n(uw(mm), 3)} kg/m), 60 cm vertical, every 3 layers horizontal:",
            f"LV = A x 2.13 = {n(a)} x 2.13 = {n(lv)} m",
            f"LH = A x 2.15 = {n(a)} x 2.15 = {n(lh)} m",
            f"L = LV + LH = {n(lv)} + {n(lh)} = {n(lv + lh)} m, Qty = L / 6 = {pcs((lv + lh) / BAR_M)}",
            f"Total WT = L x {n(uw(mm), 3)} = {n((lv + lh) * uw(mm))} kg",
        ]
        lines_by_floor.append({"title": wall["label"], "lines": floor_lines})
    if d["walls"]:
        members.append({
            "key": "chb", "title": "Concrete Hollow Blocks (CHB)", "given": given + ["CHB 10 x 20 x 40 cm, 12.5 pcs per sq.m"],
            "sections": lines_by_floor,
            "results": [{"material": "CHB", "quantity": up(blocks), "unit": "pcs"},
                        {"material": "Cement", "quantity": up(cement), "unit": "bags"},
                        {"material": "Sand", "quantity": round(sand, 3), "unit": "cu.m"}]
                       + [{"material": f"Rebar {mm}mm", "quantity": up(m / BAR_M), "unit": "pcs"} for mm, m in sorted(bar_len.items())],
            "note": "The Total view adds a 5% CHB allowance.",
        })

    # ---------------- Roof ----------------
    r = d.get("roof")
    if r:
        area = r["area"]
        weight = area * r["framing_kg_per_m2"]
        angle_m = weight / r["angle_kg_per_m"]
        sheets = area / r["sheet_cover"]
        members.append({
            "key": "roofFraming", "title": "Roof Steel Framing (for trusses)",
            "given": [f"Area weight ratio = {n(r['framing_kg_per_m2'], 1)} kg/sq.m",
                      f"A = top floor {n(r['floor_area'])} sq.m x {n(r['pitch'], 3)} (1:3 pitch) = {n(area)} sq.m"],
            "sections": [{"title": "Angle bar", "lines": [
                f"Total WT = A x Area weight ratio = {n(area)} x {n(r['framing_kg_per_m2'], 1)} = {n(weight)} kg",
                f"Use 38 x 38 x 6 mm angle bar = {n(r['angle_kg_per_m'], 1)} kg/m (unit WT)",
                f"L = Total WT / Unit WT = {n(weight)} / {n(r['angle_kg_per_m'], 1)} = {n(angle_m)} m",
                f"Qty = L / 6 m = {n(angle_m)} / 6 = {pcs(angle_m / BAR_M)} (38 x 38 x 6 mm x 6 m angle bar)"]}],
            "results": [{"material": "Angle Bar", "quantity": up(angle_m / BAR_M), "unit": "pcs"}],
        })
        members.append({
            "key": "roofing", "title": "Roofing",
            "given": [f"A = {n(area)} sq.m (sloped)", f"Roof perimeter = {n(r['perimeter'])} m, ridge = {n(r['ridge'])} m"],
            "sections": [{"title": "Roof covering", "lines": [
                f"8 ft G.I. sheet covers {n(r['sheet_cover'], 3)} sq.m (0.70 m effective width x (2.44 - 0.30 end lap) m)",
                f"Sheets = A / {n(r['sheet_cover'], 3)} = {n(area)} / {n(r['sheet_cover'], 3)} = {pcs(sheets)}",
                f"Purlins = (perimeter / 2) / 0.70 m spacing + 1 = {r['purlins']} rows",
                f"Ridge roll = ridge / 2.20 m = {n(r['ridge'])} / 2.20 ≈ {r['ridge_pcs']} pcs",
                f"Flashing = perimeter / 2.30 m = {n(r['perimeter'])} / 2.30 ≈ {r['flashing']} pcs",
                f"Gutter = perimeter / 2.35 m = {n(r['perimeter'])} / 2.35 ≈ {r['gutter']} pcs"]}],
            "results": [{"material": "Roofing sheets", "quantity": up(sheets), "unit": "sheets"},
                        {"material": "Purlins", "quantity": r["purlins"], "unit": "lengths"},
                        {"material": "Ridge", "quantity": r["ridge_pcs"], "unit": "pcs"},
                        {"material": "Flashing", "quantity": r["flashing"], "unit": "pcs"},
                        {"material": "Gutter", "quantity": r["gutter"], "unit": "pcs"}],
        })

    # ---------------- Scaffolding ----------------
    sc = d["scaffolding"]
    members.append({
        "key": "scaffolding", "title": "Scaffolding",
        "given": [f"1 set = {sc['parts']}, covers {n(sc['w'])} x {n(sc['h'])} m"],
        "sections": [{"title": "Sets", "lines": [sc["text"]]}],
        "results": [{"material": "Scaffolding", "quantity": up(sc["sets"]), "unit": "sets"}],
    })
    return members
