"""
AquaLoop | New Product Development Studio — main build script.

What it does
  1. Finds and loads the two Excel workbooks (./input/ or repository root).
  2. Inspects worksheet / column names, cleans blanks and validates numeric fields.
  3. Analyses the survey (practice and, separately, any genuine responses) and the public discussions.
  4. Runs the NPD calculations: QFD priorities, concept scoring, pricing, unit economics,
     break-even, scenarios / NPV, market sizing, water recovery, FMEA risk scores.
  5. Writes public/data/analysis.json (anonymised aggregates only — no row-level survey data)
     and public/data/research.json, then regenerates the 2D illustrations and prototype board.

Usage
  python build_project.py                 # analysis + 2D visuals
  python build_project.py --with-cad      # also rebuild CAD (STEP/STL/GLB) and 3D renders (needs requirements-cad.txt + npm install)
  python build_project.py --primary practice|actual|auto
"""
from __future__ import annotations

import argparse
import json
import math
import subprocess
import sys
from datetime import date
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "public" / "data"
OUT.mkdir(parents=True, exist_ok=True)
sys.path.insert(0, str(ROOT / "engineering"))
import npd_content as C  # noqa: E402  (qualitative framework content)

SURVEY_FILE = "AquaLoop_survey_practice_and_collection.xlsx"
DISCUSSION_FILE = "AquaLoop_public_discussions.xlsx"
MIN_ACTUAL_FOR_PRIMARY = 10   # genuine responses needed before they drive the analysis

LIKERT = ["problem_severity_1_to_5", "space_constraint_1_to_5", "overflow_importance_1_to_5",
          "detachable_container_importance_1_to_5", "easy_cleaning_importance_1_to_5", "retrofit_importance_1_to_5",
          "modular_capacity_importance_1_to_5", "concept_usefulness_1_to_5", "purchase_intent_1_to_5",
          "appliance_integration_importance_1_to_5", "water_quality_safeguard_importance_1_to_5"]
FEATURES = {
    "Overflow protection": "overflow_importance_1_to_5",
    "Detachable container": "detachable_container_importance_1_to_5",
    "Easy cleaning": "easy_cleaning_importance_1_to_5",
    "Retrofit compatibility": "retrofit_importance_1_to_5",
    "Modular capacity": "modular_capacity_importance_1_to_5",
    "Appliance integration": "appliance_integration_importance_1_to_5",
    "Water-quality safeguard": "water_quality_safeguard_importance_1_to_5",
}
REJECT_BANDS = {"Under 5": 3.0, "5–10": 7.5, "11–20": 15.5, "21–30": 25.5, "Over 30": 35.0}  # midpoints; 'Over 30' assumed 35
BAND_ORDER = ["Under 5", "5–10", "11–20", "21–30", "Over 30", "Unknown"]


# ============================================================================ helpers
def find_file(name: str) -> Path:
    for d in (ROOT / "input", ROOT, ROOT / "data"):
        p = d / name
        if p.exists():
            return p
    raise FileNotFoundError(f"{name} not found in ./input, repository root or ./data")


def jsonable(o):
    if isinstance(o, dict):
        return {str(k): jsonable(v) for k, v in o.items()}
    if isinstance(o, (list, tuple)):
        return [jsonable(v) for v in o]
    if isinstance(o, (np.integer,)):
        return int(o)
    if isinstance(o, (np.floating, float)):
        return None if (o is None or math.isnan(float(o))) else round(float(o), 4)
    if isinstance(o, (np.bool_,)):
        return bool(o)
    return o


def counts(s: pd.Series, order=None):
    s = s.dropna().astype(str).str.strip()
    s = s[s != ""]
    n = int(len(s))
    vc = s.value_counts()
    keys = [k for k in (order or []) if k in vc.index] + [k for k in vc.index if k not in (order or [])]
    if order is None:
        keys = list(vc.index)
    return {"n_valid": n, "items": [{"label": k, "count": int(vc[k]), "pct": round(100 * vc[k] / n, 1) if n else 0}
                                    for k in keys]}


def likert_stats(s: pd.Series):
    s = pd.to_numeric(s, errors="coerce")
    s = s[(s >= 1) & (s <= 5)]
    n = int(s.notna().sum())
    if n == 0:
        return {"n_valid": 0}
    dist = {str(i): int((s == i).sum()) for i in range(1, 6)}
    return {"n_valid": n, "mean": round(s.mean(), 2), "median": float(s.median()),
            "top2_pct": round(100 * (s >= 4).mean(), 1), "bottom2_pct": round(100 * (s <= 2).mean(), 1),
            "dist": dist}


# ============================================================================ loading & cleaning
def inspect_workbook(path: Path):
    xl = pd.ExcelFile(path)
    return {sh: list(pd.read_excel(path, sheet_name=sh, nrows=0).columns) for sh in xl.sheet_names}


def pick_sheet(sheets: dict, include: tuple, required_col: str):
    for name, cols in sheets.items():
        if any(k in name.lower() for k in include) and required_col in cols:
            return name
    return None


def clean_survey(df: pd.DataFrame) -> tuple[pd.DataFrame, dict]:
    log = {"rows_read": int(len(df))}
    content_cols = [c for c in df.columns if c != "respondent_number"]
    df = df.dropna(subset=content_cols, how="all").copy()
    log["blank_rows_removed"] = log["rows_read"] - int(len(df))
    for c in df.select_dtypes(include=["object", "string"]).columns:
        df[c] = df[c].astype(str).str.strip().replace({"nan": np.nan, "None": np.nan, "": np.nan})
    invalid = {}
    for c in LIKERT:
        if c in df:
            v = pd.to_numeric(df[c], errors="coerce")
            bad = v.notna() & ((v < 1) | (v > 5))
            invalid[c] = int(bad.sum() + (df[c].notna() & v.isna()).sum())
            df[c] = v.where((v >= 1) & (v <= 5))
    for c in ("max_willingness_to_pay_inr", "extra_willingness_to_pay_inr", "household_size"):
        if c in df:
            v = pd.to_numeric(df[c], errors="coerce")
            bad = v < 0
            invalid[c] = int(bad.sum() + (df[c].notna() & v.isna()).sum())
            df[c] = v.where(v >= 0)
    if "household_ro_user" in df:   # analyse RO users only (screening question)
        before = len(df)
        df = df[df["household_ro_user"].fillna("Yes").astype(str).str.lower().str.startswith("y")]
        log["non_ro_users_excluded"] = int(before - len(df))
    log["invalid_values_set_to_missing"] = {k: v for k, v in invalid.items() if v}
    log["respondents_analysed"] = int(len(df))
    return df, log


# ============================================================================ survey analysis
def wtp_block(s: pd.Series, prices):
    s = pd.to_numeric(s, errors="coerce").dropna()
    n = int(len(s))
    if n == 0:
        return {"n_valid": 0}
    acc = [{"price": int(p), "accept_pct": round(100 * (s >= p).mean(), 1), "accept_n": int((s >= p).sum())} for p in prices]
    vc = s.value_counts().sort_index()
    return {"n_valid": n, "mean": round(s.mean()), "median": float(s.median()), "p25": float(s.quantile(.25)),
            "p75": float(s.quantile(.75)), "min": float(s.min()), "max": float(s.max()),
            "dist": [{"label": f"₹{int(k):,}", "value": int(k), "count": int(v)} for k, v in vc.items()],
            "acceptance": acc}


def analyse_survey(df: pd.DataFrame, label: str) -> dict:
    n = int(len(df))
    if n == 0:
        return {"label": label, "n": 0}
    out = {"label": label, "n": n}
    out["profile"] = {
        "housing_type": counts(df["housing_type"]),
        "household_size": counts(df["household_size"].dropna().astype(int).astype(str), order=[str(i) for i in range(1, 15)]),
        "purifier_brand": counts(df["purifier_brand"]),
        "dishwasher_ownership": counts(df["dishwasher_ownership"]),
        "household_size_mean": round(pd.to_numeric(df["household_size"], errors="coerce").mean(), 2),
    }
    rej = df["reject_water_litres_daily_estimate"].astype(str).replace({"nan": np.nan})
    mids = rej.map(REJECT_BANDS).dropna()
    med_band = None
    if len(mids):
        ordered = sorted(mids)
        med_mid = ordered[(len(ordered) - 1) // 2]
        med_band = [k for k, v in REJECT_BANDS.items() if v == med_mid][0]
    out["behaviour"] = {
        "reject_band": counts(rej, order=BAND_ORDER),
        "reject_known_n": int(len(mids)),
        "reject_unknown_pct": round(100 * (rej == "Unknown").sum() / rej.notna().sum(), 1) if rej.notna().sum() else None,
        "reject_median_band": med_band,
        "reject_median_midpoint_l": float(REJECT_BANDS[med_band]) if med_band else None,
        "reject_mean_midpoint_l": round(mids.mean(), 1) if len(mids) else None,
        "collection_method": counts(df["current_collection_method"]),
        "reuse_frequency": counts(df["reuse_frequency"], order=["Daily", "Often", "Sometimes", "Never"]),
    }
    rf = df["reuse_frequency"].dropna()
    out["behaviour"]["reuse_any_pct"] = round(100 * (rf != "Never").mean(), 1) if len(rf) else None
    out["behaviour"]["reuse_regular_pct"] = round(100 * rf.isin(["Daily", "Often"]).mean(), 1) if len(rf) else None
    out["pain"] = {
        "main_pain_point": counts(df["main_pain_point"]),
        "severity": likert_stats(df["problem_severity_1_to_5"]),
        "space": likert_stats(df["space_constraint_1_to_5"]),
        "purchase_concern": counts(df["main_purchase_concern"]),
    }
    feats = []
    for name, col in FEATURES.items():
        st = likert_stats(df[col]); st["feature"] = name; feats.append(st)
    feats.sort(key=lambda x: (x.get("mean") or 0), reverse=True)
    for i, f in enumerate(feats, 1):
        f["rank"] = i
    out["features"] = feats
    cap = df["preferred_capacity_litres"].astype(str).replace({"nan": np.nan}).str.replace(".0", "", regex=False)
    cap = cap.map(lambda x: x if pd.isna(x) or not x.replace(".", "").isdigit() else f"{x} L")
    out["preferences"] = {
        "capacity": counts(cap, order=["5 L", "10 L", "15 L", "Unsure"]),
        "installation": counts(df["preferred_installation"]),
        "reuse_connection": counts(df["preferred_reuse_connection"]),
        "channel": counts(df["preferred_purchase_channel"]),
    }
    out["concept_test"] = {
        "usefulness": likert_stats(df["concept_usefulness_1_to_5"]),
        "intent": likert_stats(df["purchase_intent_1_to_5"]),
        "wtp": wtp_block(df["max_willingness_to_pay_inr"], range(0, 3001, 100)),
        "extra_wtp": wtp_block(df["extra_willingness_to_pay_inr"], range(0, 1001, 50)),
        "appliance_importance": likert_stats(df["appliance_integration_importance_1_to_5"]),
        "calibrated_intent_pct": round(0.8 * likert_stats(df["purchase_intent_1_to_5"])["dist"]["5"] / max(1, likert_stats(df["purchase_intent_1_to_5"])["n_valid"]) * 100
                                       + 0.3 * likert_stats(df["purchase_intent_1_to_5"])["dist"]["4"] / max(1, likert_stats(df["purchase_intent_1_to_5"])["n_valid"]) * 100, 1),
        "open_feedback_n": int(df["open_feedback"].notna().sum()) if "open_feedback" in df else 0,
    }
    # simple cross-tabs (segment view)
    seg = []
    for h, g in df.groupby("housing_type"):
        seg.append({"segment": h, "n": int(len(g)),
                    "intent_top2_pct": likert_stats(g["purchase_intent_1_to_5"]).get("top2_pct"),
                    "usefulness_mean": likert_stats(g["concept_usefulness_1_to_5"]).get("mean"),
                    "space_mean": likert_stats(g["space_constraint_1_to_5"]).get("mean"),
                    "wtp_median": float(pd.to_numeric(g["max_willingness_to_pay_inr"], errors="coerce").median()),
                    "dishwasher_pct": round(100 * (g["dishwasher_ownership"] == "Yes").mean(), 1)})
    out["segments"] = seg
    return out


def analyse_by_segment(df: pd.DataFrame, label: str) -> dict:
    res = {"All respondents": analyse_survey(df, label)}
    for h, g in df.groupby("housing_type"):
        res[h] = analyse_survey(g, label)
    return res


# ============================================================================ public discussions
THEMES = {
    "Existing tanks / competing products": ["tank", "commercial", "competition", "benchmark"],
    "Buckets & manual collection": ["bucket", "jar", "container", "collection"],
    "Overflow & spillage": ["overflow", "spill"],
    "Space constraints": ["space", "compact"],
    "Heavy containers / carrying": ["heavy", "20 l", "carry"],
    "Dispensing & convenience": ["tap", "dispens", "convenien", "pipe routing"],
    "Reuse applications": ["mopping", "plants", "floor", "reuse", "repurpose", "saved"],
    "Appliance reuse": ["washing machine", "appliance"],
    "Water quality / TDS": ["dissolved", "quality", "tds", "safety"],
    "Price & affordability": ["₹", "price", "cost", "affordab"],
    "Drainage": ["drain"],
}


def analyse_discussions(path: Path) -> dict:
    sheets = inspect_workbook(path)
    sheet = pick_sheet(sheets, ("discussion", "public"), "url") or list(sheets)[0]
    df = pd.read_excel(path, sheet_name=sheet).dropna(how="all")
    text_cols = [c for c in ("paraphrased_observation", "design_implication", "platform") if c in df]
    rows, theme_hits = [], {t: [] for t in THEMES}
    for _, r in df.iterrows():
        txt = " ".join(str(r[c]) for c in text_cols).lower()
        tags = [t for t, kws in THEMES.items() if any(k in txt for k in kws)]
        for t in tags:
            theme_hits[t].append(r["source_id"])
        rows.append({"id": r.get("source_id"), "platform": r.get("platform"), "url": r.get("url"),
                     "observation": r.get("paraphrased_observation"), "implication": r.get("design_implication"),
                     "evidence_type": r.get("evidence_type"), "engagement": r.get("engagement_metrics"),
                     "verification": r.get("verification"), "themes": tags})
    n = len(rows)
    themes = sorted([{"theme": t, "sources": ids, "count": len(ids), "pct": round(100 * len(ids) / n, 1) if n else 0}
                     for t, ids in theme_hits.items() if ids], key=lambda x: -x["count"])
    platforms = counts(df["platform"].str.split(" ").str[0]) if "platform" in df else {}
    return {"sheet": sheet, "columns": sheets[sheet], "n": n, "rows": rows, "themes": themes, "platforms": platforms,
            "codebook": THEMES,
            "caveat": "Existing public discussions validate the underlying problem only; they are not reactions to AquaLoop. "
                      "Engagement metrics are not reported because none were verified."}


# ============================================================================ NPD calculations
def qfd(primary: dict) -> dict:
    f = {x["feature"]: x.get("mean") for x in primary["features"]}
    wtp = primary["concept_test"]["wtp"]
    under_1500 = next((100 - a["accept_pct"] for a in wtp["acceptance"] if a["price"] == 1500), None)
    needs = [
        ("Prevents overflow and spillage", f["Overflow protection"], "survey"),
        ("Easy to empty and carry", f["Detachable container"], "survey"),
        ("Easy to clean", f["Easy cleaning"], "survey"),
        ("Fits my existing RO purifier", f["Retrofit compatibility"], "survey"),
        ("Right / expandable capacity", f["Modular capacity"], "survey"),
        ("Compact for a small kitchen", primary["pain"]["space"]["mean"], "survey proxy: space-constraint rating"),
        ("Clearly safe, non-potable water", f["Water-quality safeguard"], "survey"),
        ("Option to feed an appliance", f["Appliance integration"], "survey"),
        ("Affordable", round(1 + 4 * (under_1500 or 0) / 100, 2), "derived: 1 + 4 × share with max WTP < ₹1,500"),
    ]
    ecs = ["Float-operated overflow bypass", "Lift-out tank with handle", "Wide-mouth lid, radiused interior",
           "Universal 1/4\" push-fit retrofit kit", "Snap-in 5 / 10 L tank modules", "≤140 mm wall-mount depth",
           "Level window + non-potable labelling", "Distribution port with backflow + safeguard", "BOM cost ≤ ₹600"]
    R = [  # needs x ECs  (9 strong, 3 moderate, 1 weak, 0 none)
        [9, 1, 0, 3, 0, 0, 3, 1, 0],
        [0, 9, 3, 0, 3, 1, 1, 0, 0],
        [0, 9, 9, 0, 3, 0, 0, 0, 0],
        [3, 0, 0, 9, 0, 3, 0, 1, 0],
        [1, 3, 0, 0, 9, 3, 1, 0, 1],
        [0, 1, 0, 1, 3, 9, 0, 1, 1],
        [3, 0, 3, 0, 0, 0, 9, 9, 0],
        [0, 0, 0, 3, 1, 0, 3, 9, 0],
        [1, 1, 1, 3, 3, 1, 0, 1, 9],
    ]
    imp = np.array([n[1] for n in needs], dtype=float)
    M = np.array(R, dtype=float)
    raw = imp @ M
    rel = 100 * raw / raw.sum()
    pri = sorted([{"ec": e, "raw": round(r, 1), "pct": round(p, 1)} for e, r, p in zip(ecs, raw, rel)], key=lambda x: -x["raw"])
    for i, p in enumerate(pri, 1):
        p["rank"] = i
    return {"needs": [{"need": n, "importance": round(i, 2), "basis": b} for n, i, b in needs], "ecs": ecs,
            "matrix": R, "priorities": pri, "scale": "9 = strong, 3 = moderate, 1 = weak"}


CRITERIA = [("Customer usefulness", 25), ("Affordability", 20), ("Manufacturing simplicity", 15), ("Differentiation", 15),
            ("Installation convenience", 10), ("Sustainability", 10), ("Maintenance", 5)]


def concept_scoring() -> dict:
    concepts = C.CONCEPTS
    total_w = sum(w for _, w in CRITERIA)
    for c in concepts:
        c["weighted"] = round(sum(c["scores"][i] * w for i, (_, w) in enumerate(CRITERIA)) / total_w, 2)
    ranked = sorted(concepts, key=lambda c: -c["weighted"])
    for i, c in enumerate(ranked, 1):
        c["rank"] = i
    pugh = C.PUGH
    for col in pugh["concepts"]:
        vals = [row["ratings"][col] for row in pugh["rows"]]
        pugh.setdefault("totals", {})[col] = {"plus": vals.count(1), "same": vals.count(0), "minus": vals.count(-1),
                                              "net": sum(vals)}
    winner = ranked[0]
    gated = [c for c in ranked if c["safety_gate"].startswith("Pass")]
    return {"criteria": [{"name": n, "weight": w} for n, w in CRITERIA], "concepts": concepts, "pugh": pugh,
            "selected": gated[0]["id"], "top_scorer": winner["id"]}


def economics(primary: dict) -> dict:
    a = dict(C.FIN_ASSUMPTIONS)
    bom = C.BOM_BASE
    base_parts = sum(i["cost"] for i in bom)
    base_cost = round(base_parts * (1 + a["inbound_scrap_pct"] / 100))
    mod_cost = round(sum(i["cost"] for i in C.BOM_MODULE) * (1 + a["inbound_scrap_pct"] / 100))

    def unit(price, cost):
        ex = price / (1 + a["gst_pct"] / 100)
        channel = ex * a["channel_margin_pct"] / 100
        net = ex - channel
        other = net * a["other_variable_pct"] / 100
        contrib = net - cost - other
        return {"price_incl_gst": price, "gst": round(price - ex), "price_ex_gst": round(ex), "channel_cost": round(channel),
                "net_realisation": round(net), "manufacturing_cost": cost, "other_variable": round(other),
                "contribution": round(contrib), "contribution_margin_pct": round(100 * contrib / net, 1) if net else None}

    wtp = primary["concept_test"]["wtp"]

    def accept_at(price):   # exact share of valid respondents whose stated max WTP >= price
        n = sum(d["count"] for d in wtp["dist"])
        return round(100 * sum(d["count"] for d in wtp["dist"] if d["value"] >= price) / n, 1) if n else 0.0

    price_grid = []
    for p in a["price_points"]:
        u = unit(p, base_cost)
        accept = accept_at(p)
        price_grid.append({"price": p, "accept_pct": accept, "contribution": u["contribution"],
                           "contribution_index": round(accept / 100 * u["contribution"], 1)})
    best = max(price_grid, key=lambda x: x["contribution_index"])
    rec = a["recommended_price"]
    ue = unit(rec, base_cost)
    ue_mod = unit(a["module_price"], mod_cost)
    fixed_y1 = a["one_time_investment"] + a["annual_fixed_opex"]
    be_units = math.ceil(fixed_y1 / ue["contribution"]) if ue["contribution"] > 0 else None

    scen = {}
    for name, units in a["scenarios"].items():
        cfs = [-a["one_time_investment"]]
        rows = []
        for y, u in enumerate(units, 1):
            rev = u * ue["net_realisation"]
            contrib = u * ue["contribution"]
            cf = contrib - a["annual_fixed_opex"]
            cfs.append(cf)
            rows.append({"year": y, "units": u, "net_revenue": round(rev), "mrp_value": round(u * rec),
                         "contribution": round(contrib), "fixed_opex": a["annual_fixed_opex"], "cash_flow": round(cf)})
        r = a["discount_rate_pct"] / 100
        npv = sum(cf / (1 + r) ** t for t, cf in enumerate(cfs))
        cum, payback = cfs[0], None
        for t, cf in enumerate(cfs[1:], 1):
            if payback is None and cum + cf >= 0:
                payback = round(t - 1 + (-cum) / cf, 2) if cf > 0 else None
            cum += cf
        scen[name] = {"years": rows, "npv": round(npv), "payback_years": payback, "cash_flows": [round(c) for c in cfs]}
    return {"assumptions": a, "bom_base": bom, "bom_module": C.BOM_MODULE, "base_parts_total": base_parts,
            "base_unit_cost": base_cost, "module_unit_cost": mod_cost, "price_grid": price_grid,
            "contribution_index_max_price": best["price"], "recommended_price": rec, "unit_economics": ue,
            "module_unit_economics": ue_mod, "break_even_units_year1": be_units, "first_year_fixed": fixed_y1,
            "scenarios": scen,
            "wtp_reference": {"median": wtp.get("median"), "accept_at_recommended": accept_at(rec), "accept_at_bundle": accept_at(a["bundle_price"]),
                              "extra_wtp_median": primary["concept_test"]["extra_wtp"].get("median"),
                              "extra_wtp_max": primary["concept_test"]["extra_wtp"].get("max")}}


def market_sizing(primary: dict, price: int) -> dict:
    m = dict(C.MARKET_ASSUMPTIONS)
    base_2025 = m["installed_base_2020_mn"] * (1 + m["installed_base_growth_pct"] / 100) ** (2025 - 2020)
    tam = base_2025 * m["ro_share_pct"] / 100
    sam = tam * m["serviceable_share_pct"] / 100
    som = sam * m["obtainable_share_3yr_pct"] / 100
    m.update({"installed_base_2025_mn": round(base_2025, 2), "tam_households_mn": round(tam, 2),
              "sam_households_mn": round(sam, 2), "som_units_3yr_mn": round(som, 3),
              "tam_value_cr": round(tam * 1e6 * price / 1e7), "sam_value_cr": round(sam * 1e6 * price / 1e7),
              "som_value_cr": round(som * 1e6 * price / 1e7),
              "survey_intent_top2_pct": primary["concept_test"]["intent"].get("top2_pct")})
    return m


def water_recovery(daily_reject, recoverable_pct, storage_l, reuse_demand_l, days):
    captured = min(daily_reject * recoverable_pct / 100, storage_l)
    used = min(captured, reuse_demand_l)
    return {"daily_l": round(used, 2), "monthly_l": round(used * days / 12, 1), "annual_l": round(used * days, 1),
            "binding_constraint": min([("reject supply", daily_reject * recoverable_pct / 100), ("storage", storage_l),
                                       ("reuse demand", reuse_demand_l)], key=lambda x: x[1])[0]}


def fmea():
    rows = []
    for r in C.FMEA:
        r = dict(r); r["rpn"] = r["S"] * r["O"] * r["D"]; rows.append(r)
    return sorted(rows, key=lambda x: -x["rpn"])


# ============================================================================ main
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--primary", choices=["auto", "practice", "actual"], default="auto")
    ap.add_argument("--with-cad", action="store_true")
    ap.add_argument("--skip-visuals", action="store_true")
    args = ap.parse_args()

    s_path, d_path = find_file(SURVEY_FILE), find_file(DISCUSSION_FILE)
    s_sheets = inspect_workbook(s_path)
    practice_sheet = pick_sheet(s_sheets, ("practice", "simulated"), "purchase_intent_1_to_5")
    actual_sheet = pick_sheet(s_sheets, ("actual", "collection", "genuine"), "purchase_intent_1_to_5")
    readme_sheet = next((s for s in s_sheets if "read" in s.lower()), None)
    print(f"Survey workbook: {s_path.name} | sheets: {list(s_sheets)}")

    datasets, logs = {}, {}
    for key, sheet, label in (("practice", practice_sheet, "Practice (simulated) responses — illustrative only"),
                              ("actual", actual_sheet, "Genuine survey responses")):
        if sheet:
            df, log = clean_survey(pd.read_excel(s_path, sheet_name=sheet))
            log["sheet"] = sheet
            logs[key] = log
            datasets[key] = analyse_by_segment(df, label) if len(df) else None
            print(f"  {key}: sheet '{sheet}' → {log['respondents_analysed']} valid respondents")
    n_actual = logs.get("actual", {}).get("respondents_analysed", 0)
    primary_key = args.primary if args.primary != "auto" else ("actual" if n_actual >= MIN_ACTUAL_FOR_PRIMARY else "practice")
    if datasets.get(primary_key) is None:
        primary_key = "practice"
    primary = datasets[primary_key]["All respondents"]
    readme = pd.read_excel(s_path, sheet_name=readme_sheet).dropna(how="all").to_dict("records") if readme_sheet else []

    disc = analyse_discussions(d_path)
    print(f"Discussion workbook: {d_path.name} → {disc['n']} sources, {len(disc['themes'])} themes")

    q = qfd(primary)
    cs = concept_scoring()
    econ = economics(primary)
    mkt = market_sizing(primary, econ["recommended_price"])
    wr_in = dict(C.WATER_DEFAULTS)
    wr_in["daily_reject_l"] = primary["behaviour"]["reject_median_midpoint_l"] or wr_in["daily_reject_l"]
    wr = water_recovery(wr_in["daily_reject_l"], wr_in["recoverable_pct"], wr_in["storage_l"], wr_in["reuse_demand_l"], wr_in["days"])
    top_pain = next((x for x in primary["pain"]["main_pain_point"]["items"] if x["label"] != "No major problem"), None)

    kpis = {
        "survey_n": primary["n"], "survey_source": primary_key, "actual_n": n_actual, "discussions_n": disc["n"],
        "median_reject_band": primary["behaviour"]["reject_median_band"],
        "median_reject_l": primary["behaviour"]["reject_median_midpoint_l"],
        "top_pain": top_pain["label"] if top_pain else None, "top_pain_pct": top_pain["pct"] if top_pain else None,
        "intent_top2_pct": primary["concept_test"]["intent"]["top2_pct"],
        "usefulness_top2_pct": primary["concept_test"]["usefulness"]["top2_pct"],
        "wtp_median": primary["concept_test"]["wtp"]["median"],
        "recommended_price": econ["recommended_price"], "price_range": C.FIN_ASSUMPTIONS["price_range"],
        "annual_recovery_l": wr["annual_l"], "stage": "Conceptual design → validation (practice data; genuine survey pending)",
    }
    analysis = {
        "meta": {"title": "AquaLoop | Product Innovation & Development Studio",
                 "subtitle": "A Proposed Aquaguard Innovation for Sustainable Household Water Reuse",
                 "generated": date.today().isoformat(), "primary_dataset": primary_key,
                 "primary_label": primary["label"], "inputs": {"survey": s_path.name, "discussions": d_path.name},
                 "survey_sheets": s_sheets, "readme": readme, "cleaning_log": logs,
                 "min_actual_for_primary": MIN_ACTUAL_FOR_PRIMARY},
        "kpis": kpis,
        "survey": datasets,
        "discussions": disc,
        "qfd": q, "concepts": cs, "economics": econ, "market": mkt,
        "water": {"defaults": wr_in, "result": wr, "reject_bands": REJECT_BANDS},
        "fmea": fmea(),
        "board": {"annual_kl": f"{wr['annual_l'] / 1000:.1f}", "price": f"₹{econ['recommended_price']:,}", "modules": "8"},
        "content": C.content(primary, econ, kpis),
    }
    (OUT / "analysis.json").write_text(json.dumps(jsonable(analysis), ensure_ascii=False, indent=1))
    research = json.loads((ROOT / "research" / "research_findings.json").read_text())
    (OUT / "research.json").write_text(json.dumps(research, ensure_ascii=False, indent=1))
    print(f"Wrote {OUT / 'analysis.json'} (primary dataset: {primary_key})")

    # ---- basic checks on important calculations
    w = sum(c["weight"] for c in cs["criteria"]); assert w == 100, "concept weights must sum to 100"
    ue = econ["unit_economics"]
    assert abs(ue["price_ex_gst"] - ue["channel_cost"] - ue["net_realisation"]) <= 1
    assert abs(ue["net_realisation"] - ue["manufacturing_cost"] - ue["other_variable"] - ue["contribution"]) <= 1
    acc = primary["concept_test"]["wtp"]["acceptance"]; assert all(acc[i]["accept_pct"] >= acc[i + 1]["accept_pct"] for i in range(len(acc) - 1))
    print("Basic calculation checks passed.")

    # publish the CAD generation source next to the models for download
    import shutil
    shutil.copy(ROOT / "engineering" / "generate_cad.py", ROOT / "public" / "models" / "generate_cad.py")

    if args.with_cad:
        subprocess.run([sys.executable, str(ROOT / "engineering" / "generate_cad.py")], check=True)
        subprocess.run([sys.executable, str(ROOT / "engineering" / "render_views.py")], check=True)
    if not args.skip_visuals:
        import visuals
        print("2D visuals:", visuals.generate_all(analysis))


if __name__ == "__main__":
    main()
