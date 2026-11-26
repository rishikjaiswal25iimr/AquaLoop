"""
AquaLoop — qualitative NPD framework content and transparent assumptions.
Imported by build_project.py. Anything numeric that comes from the survey is injected via content(primary, econ, kpis)
so the narrative updates automatically when genuine survey data replaces the practice data.
Source ids (R1…R18, C1–C2) refer to research/research_findings.json.
"""

# ----------------------------------------------------------------------------- concepts (scores 1–5)
# criteria order: usefulness, affordability, mfg simplicity, differentiation, installation, sustainability, maintenance
CONCEPTS = [
    {"id": "A", "name": "Basic gravity collection tank",
     "summary": "Single wall-hung tank with tap fed by the reject line — close to today's market products (incl. Aquaguard's own basic tank).",
     "scores": [2, 5, 5, 1, 4, 3, 3],
     "why": ["Solves storage only; overflow and cleaning pains remain", "Cheapest; simple blow-moulded part", "Little differentiation vs existing tanks"],
     "safety_gate": "Pass — manual non-potable use only"},
    {"id": "B", "name": "Compact modular collection + manual dispensing",
     "summary": "Slim housing, detachable tank, float overflow bypass, level window and front tap; 5 / 10 L modules.",
     "scores": [4, 4, 4, 3, 4, 4, 4],
     "why": ["Addresses overflow, space and cleaning pains", "Few extra parts vs A", "Differentiated but easy to copy"],
     "safety_gate": "Pass — manual non-potable use only"},
    {"id": "C", "name": "Automated water redistribution system",
     "summary": "Pumped, sensor-controlled system that routes reject water to appliances and outlets automatically.",
     "scores": [4, 1, 1, 5, 2, 4, 2],
     "why": ["Highest novelty, but expensive and complex", "Needs electrics, plumbing and installation", "Default appliance supply conflicts with water-quality constraint"],
     "safety_gate": "Fail as specified — unrestricted appliance supply is not acceptable"},
    {"id": "D", "name": "Modular hybrid: passive core + optional appliance module",
     "summary": "Concept B as the launch core, plus a snap-on distribution module with backflow protection and a quality safeguard, enabled only after testing and OEM approval.",
     "scores": [5, 4, 3, 5, 4, 5, 4],
     "why": ["Core solves today's pains at B's cost", "Module creates a platform and upgrade path", "Safety gate built into the architecture"],
     "safety_gate": "Pass — appliance path conditional on testing, treatment and OEM approval"},
]

PUGH = {
    "baseline": "A", "baseline_name": "Concept A (basic gravity tank ≈ current market reference)",
    "concepts": ["B", "C", "D"],
    "rows": [
        {"criterion": "Overflow protection", "ratings": {"B": 1, "C": 1, "D": 1}},
        {"criterion": "Space efficiency", "ratings": {"B": 1, "C": -1, "D": 1}},
        {"criterion": "Ease of dispensing", "ratings": {"B": 1, "C": 1, "D": 1}},
        {"criterion": "Ease of cleaning", "ratings": {"B": 1, "C": -1, "D": 1}},
        {"criterion": "Retrofit / installation ease", "ratings": {"B": 0, "C": -1, "D": 0}},
        {"criterion": "Unit cost", "ratings": {"B": -1, "C": -1, "D": -1}},
        {"criterion": "Manufacturing complexity", "ratings": {"B": 0, "C": -1, "D": -1}},
        {"criterion": "Upgradeability / platform", "ratings": {"B": 1, "C": 0, "D": 1}},
        {"criterion": "Water-safety risk", "ratings": {"B": 0, "C": -1, "D": 0}},
        {"criterion": "Reuse beyond manual chores", "ratings": {"B": 0, "C": 1, "D": 1}},
    ],
    "decision": {"B": "Continue (merge into D)", "C": "Reject as launch concept; keep ideas for module", "D": "Continue — develop"},
}

# ----------------------------------------------------------------------------- economics assumptions (₹)
FIN_ASSUMPTIONS = {
    "gst_pct": 18, "channel_margin_pct": 25, "other_variable_pct": 5, "inbound_scrap_pct": 5,
    "recommended_price": 1499, "bundle_price": 1299, "price_range": "₹1,299–₹1,999", "module_price": 2499, "installation_fee": 199,
    "price_points": [799, 999, 1199, 1299, 1499, 1699, 1999, 2499, 2999],
    "one_time_investment": 5_000_000,   # tooling ₹30 L + design/prototypes/testing ₹12 L + pilot & technician training ₹8 L
    "annual_fixed_opex": 3_000_000,     # launch marketing, product management, certification upkeep
    "discount_rate_pct": 12,
    "scenarios": {"Conservative": [15000, 25000, 35000], "Base": [30000, 50000, 70000], "Optimistic": [50000, 90000, 130000]},
    "notes": ["Prices are consumer prices incl. 18% GST; GST is removed before any margin is computed (consistent treatment).",
              "Channel margin 25% of ex-GST price (blend of brand site, retail and technician channels) — assumption.",
              "Other variable allowance 5% of net realisation: warranty reserve 2% + outbound freight 3% — assumption.",
              "Installation (₹199) is a pass-through service fee to the technician network and excluded from product contribution.",
              "Fixed costs: one-time ₹50 L at t0; ₹30 L/yr fixed opex. Break-even is on first-year fixed costs (₹80 L).",
              "Scenario volumes are assumptions; base year-1 volume ≈ 2% of Eureka Forbes' 1.6 mn app-installed base (R19)."],
}

BOM_BASE = [
    {"item": "Storage tank 10 L (translucent)", "material": "Food-grade PP / HDPE", "process": "Blow moulding", "make_buy": "Buy (contract moulder, EF-owned mould)", "cost": 120, "basis": "Assumption; benchmark vs ₹1,249 basic tank street price (R9)"},
    {"item": "Main housing: frame, base tray, top header", "material": "ABS / PP, white", "process": "Injection moulding", "make_buy": "Buy (contract moulder, EF-owned tools)", "cost": 150, "basis": "Assumption"},
    {"item": "Retrofit connection kit (tee, 1.5 m tube, clamps)", "material": "PE / PP", "process": "Purchased standard RO fittings", "make_buy": "Buy", "cost": 45, "basis": "RO fittings are low-cost commodity parts (R16)"},
    {"item": "Dispensing tap (lever)", "material": "PP", "process": "Purchased", "make_buy": "Buy", "cost": 35, "basis": "RO taps ₹5.5–90 on IndiaMART (R16)"},
    {"item": "Level indicator (window + float)", "material": "PC window, PP float", "process": "Purchased / moulded", "make_buy": "Buy", "cost": 30, "basis": "Assumption"},
    {"item": "Overflow bypass (float valve, spout, drain hose)", "material": "PP / PVC", "process": "Purchased + moulded spout", "make_buy": "Buy", "cost": 60, "basis": "Float valves ₹45 (R16); switch ₹125–250 (R17) not needed — mechanical design"},
    {"item": "Wall bracket & fasteners", "material": "ABS / zinc-plated steel", "process": "Purchased", "make_buy": "Buy", "cost": 25, "basis": "Assumption"},
    {"item": "Labels (non-potable), manual, QR", "material": "Paper / vinyl", "process": "Printed", "make_buy": "Buy", "cost": 10, "basis": "Assumption"},
    {"item": "Assembly & quality check", "material": "—", "process": "Manual assembly + leak test", "make_buy": "Make (contract assembler)", "cost": 40, "basis": "Assumption"},
    {"item": "Packaging", "material": "Corrugated box, pulp inserts", "process": "Purchased", "make_buy": "Buy", "cost": 45, "basis": "Assumption"},
]
BOM_MODULE = [
    {"item": "Module pod housing", "material": "ABS / PP", "process": "Injection moulding", "make_buy": "Buy", "cost": 120, "basis": "Assumption"},
    {"item": "Isolation valve + controlled outlet", "material": "PP / brass", "process": "Purchased", "make_buy": "Buy", "cost": 60, "basis": "Assumption"},
    {"item": "Backflow preventer (non-return valve)", "material": "PP / brass", "process": "Purchased", "make_buy": "Buy", "cost": 70, "basis": "Assumption"},
    {"item": "Small 24 V diaphragm pump + adapter (if needed)", "material": "—", "process": "Purchased", "make_buy": "Buy", "cost": 450, "basis": "Assumption"},
    {"item": "Water-quality safeguard cartridge (softening / filtration)", "material": "Resin / media", "process": "Purchased", "make_buy": "Buy", "cost": 250, "basis": "Assumption"},
    {"item": "Fittings, assembly & packaging", "material": "—", "process": "Assembly", "make_buy": "Make", "cost": 120, "basis": "Assumption"},
]

MARKET_ASSUMPTIONS = {
    "installed_base_2020_mn": 19.5, "installed_base_growth_pct": 10.0, "ro_share_pct": 60,
    "serviceable_share_pct": 40, "obtainable_share_3yr_pct": 2.0,
    "notes": ["Installed purifier base 19.5 mn in 2020 (Ken Research, R5) grown at ~10% p.a. (≈ market CAGR, R2) — assumption.",
              "RO share of installed base 60% — assumption (RO is the largest segment, R3/R4; ~40% by value).",
              "Serviceable: urban/semi-urban RO homes reachable via Eureka Forbes channels with wall space — 40% assumption.",
              "Obtainable: 2% of SAM over three years — assumption, cross-checked against the Base volume scenario."],
}

WATER_DEFAULTS = {"daily_reject_l": 15.5, "recoverable_pct": 80, "storage_l": 10, "reuse_demand_l": 12, "days": 365,
                  "notes": ["Daily reject defaults to the survey median band midpoint.",
                            "Recoverable % reflects losses (tap left open, cleaning flush, unsuitable days).",
                            "Model: used/day = min(reject × recoverable %, storage, reuse demand). Storage cap assumes the tank is emptied daily."]}

FMEA = [
    {"failure": "Overflow / spill when tank is full", "effect": "Wet floor, damage, distrust", "S": 8, "O": 4, "D": 3,
     "mitigation": "Float-operated bypass routes excess to drain; full mark on level window", "validation": "Bench fill test at max RO reject flow; 1,000-cycle float test"},
    {"failure": "Leak at tank / tap joint", "effect": "Water loss, cabinet damage", "S": 7, "O": 4, "D": 4,
     "mitigation": "Moulded tap boss, gasket seat, factory leak test", "validation": "100% leak check; 6-month household pilot"},
    {"failure": "Hose disconnection at retrofit tee", "effect": "Reject water on floor", "S": 7, "O": 3, "D": 5,
     "mitigation": "Push-fit lock clips; technician-installed kit", "validation": "Pull-out test; installer checklist"},
    {"failure": "Incorrect installation (wrong line, kinked hose)", "effect": "RO back-pressure or no collection", "S": 6, "O": 4, "D": 4,
     "mitigation": "Colour-coded fittings; QR video; Eureka Forbes technician install", "validation": "Pilot installs across 5+ purifier brands"},
    {"failure": "Unsuitable water fed to an appliance", "effect": "Scaling, appliance damage, warranty void, health risk", "S": 9, "O": 3, "D": 6,
     "mitigation": "Module disabled by default; safeguard cartridge; enable only after test + OEM approval", "validation": "Lab tests (hardness, TDS, microbes); OEM compatibility trials"},
    {"failure": "Backflow into purifier / supply", "effect": "Contamination risk", "S": 9, "O": 2, "D": 5,
     "mitigation": "Air gap at inlet + non-return valve; no link to potable plumbing", "validation": "Back-pressure test"},
    {"failure": "Biofilm / odour from infrequent cleaning", "effect": "Smell, slime, low reuse", "S": 5, "O": 6, "D": 3,
     "mitigation": "Wide-mouth lid, radiused corners, opaque-tint option, cleaning reminder card", "validation": "30-day stagnant-water trial"},
    {"failure": "Salt / scale deposits at tap and floor", "effect": "Stains, clogged tap", "S": 4, "O": 5, "D": 3,
     "mitigation": "Usage guidance (dilute for mopping), replaceable tap", "validation": "High-TDS (1,500 mg/L) soak test"},
]


def pct_of(items, label):
    return next((x["pct"] for x in items if x["label"] == label), 0)


# ----------------------------------------------------------------------------- narrative content (data-aware)
def content(p, econ, k):
    f = {x["feature"]: x for x in p["features"]}
    top_feat = p["features"][0]["feature"]
    coll = p["behaviour"]["collection_method"]["items"]
    diy_like = sum(x["pct"] for x in coll if x["label"] in ("Bucket", "DIY pipe to container"))
    drain_pct = pct_of(coll, "Direct drain")
    tank_pct = pct_of(coll, "Storage tank")
    space_top2 = p["pain"]["space"]["top2_pct"]
    sev_top2 = p["pain"]["severity"]["top2_pct"]
    cap = p["preferences"]["capacity"]["items"]
    dish_yes = pct_of(p["profile"]["dishwasher_ownership"]["items"], "Yes")
    wtp = p["concept_test"]["wtp"]
    ue = econ["unit_economics"]
    concerns = p["pain"]["purchase_concern"]["items"]
    cc = {x["label"]: x for x in concerns}

    insights = [
        {"title": "Collection already happens — badly",
         "evidence": f"{diy_like:.0f}% use buckets or DIY pipe-to-container set-ups; only {tank_pct:.0f}% own a storage tank and {drain_pct:.0f}% drain everything.",
         "decision": "Position AquaLoop as an upgrade from improvised collection, not as a new behaviour."},
        {"title": "Safety and hygiene lead the feature ranking",
         "evidence": f"{top_feat} ranks #1 (mean {p['features'][0]['mean']}); easy cleaning mean {f['Easy cleaning']['mean']}.",
         "decision": "Make non-potable labelling, a quality safeguard path and a wide-mouth, radiused tank core features."},
        {"title": "Space is a real constraint",
         "evidence": f"{space_top2}% rate space constraint 4–5; 'Limited space' is the most cited pain point.",
         "decision": "Slim wall-mount form (≤140 mm depth) and 5 L / 10 L variants rather than a large floor tank."},
        {"title": "Overflow and retrofit are hygiene factors",
         "evidence": f"Retrofit mean {f['Retrofit compatibility']['mean']}, overflow mean {f['Overflow protection']['mean']}; overflow/spillage is a top-3 pain.",
         "decision": "Passive float bypass + universal push-fit kit installed by the existing technician network."},
        {"title": "Appliance integration is interesting, not yet monetisable",
         "evidence": f"Appliance-integration mean {f['Appliance integration']['mean']}; only {dish_yes:.0f}% own a dishwasher; median extra WTP ₹{p['concept_test']['extra_wtp'].get('median', 0):,.0f}.",
         "decision": "Keep the appliance module as an optional, conditional platform add-on for later pilots — not the launch product."},
        {"title": "Price expectations sit below the ₹1,499–2,999 hypothesis",
         "evidence": f"Median stated max WTP ₹{wtp['median']:,.0f}; {econ['wtp_reference']['accept_at_recommended']}% accept ₹{econ['recommended_price']:,}.",
         "decision": f"Launch the 10 L core at ₹{econ['recommended_price']:,} (range {FIN_ASSUMPTIONS['price_range']}), with a lower-priced 5 L variant; validate with genuine data."},
    ]

    feedback_to_design = [
        {"concern": "Installation", "n": cc.get("Installation", {}).get("count", 0), "improvement": "Universal push-fit retrofit kit; technician install bundled at purchase", "benefit": "No plumbing or drilling anxiety; no change to RO"},
        {"concern": "Water quality", "n": cc.get("Water quality", {}).get("count", 0), "improvement": "Non-potable labelling, reuse guide card, TDS strip, safeguard cartridge in module", "benefit": "Clear, safe use cases; trust"},
        {"concern": "Warranty", "n": cc.get("Warranty", {}).get("count", 0), "improvement": "1-year warranty; spare tap/float via Aquaguard service", "benefit": "Brand-backed reassurance"},
        {"concern": "Space", "n": cc.get("Space", {}).get("count", 0), "improvement": "140 mm slim wall-mount; 5 L variant", "benefit": "Fits beside/under purifier"},
        {"concern": "Leaks", "n": cc.get("Leaks", {}).get("count", 0), "improvement": "100% factory leak test; locking clips; overflow bypass", "benefit": "Dry floor, fewer complaints"},
        {"concern": "Cleaning", "n": cc.get("Cleaning", {}).get("count", 0), "improvement": "Lift-out tank, wide-mouth lid, radiused corners", "benefit": "Cleaning in < 5 minutes (target)"},
        {"concern": "Price", "n": cc.get("Price", {}).get("count", 0), "improvement": "5 L entry variant; exchange / purifier-bundle offers", "benefit": "Lower entry barrier"},
    ]

    return {
        "overview": {
            "description": "AquaLoop is a modular, wall-mounted accessory that connects to the reject-water outlet of an existing RO purifier, "
                           "stores reject water in a detachable translucent tank, prevents overflow automatically and dispenses it through a front tap "
                           "for suitable non-potable chores. An optional add-on module can later route treated, verified water to compatible appliances.",
            "problem": "RO purifiers discard reject water continuously; households that want to reuse it rely on buckets, jars and DIY pipes that overflow, "
                       "take space, are heavy to carry and hard to clean — so most of the water still goes down the drain.",
            "value_proposition": "Save the water your RO throws away — without buckets, spills or replacing your purifier.",
            "targets": ["Urban RO-purifier households (apartments and independent houses)", "Existing Aquaguard customers (service and AMC base)",
                        "Water-conscious households in water-stressed cities"],
            "innovation": "Architectural innovation: a passive, modular collection core (overflow bypass + detachable tank + tap) designed as a platform "
                          "for an optional, safety-gated redistribution module — a retrofit line extension rather than a new purifier.",
            "portfolio_role": "Accessory line extension that strengthens the water-purifier franchise (42.8% of FY26 revenue, R7) and the service business "
                              "(31.4%, R7): it raises attachment and technician-visit revenue, reinforces the 'Aquasaver' water-saving positioning (R8), "
                              "and upgrades Eureka Forbes' existing basic RO Reject Water Tank (R9).",
            "phases": [
                {"phase": "0. Planning", "activities": "Opportunity identification, market & competitor scan, mission statement", "aqualoop": "Problem validated via R1 + public discussions; strategic fit with Eureka Forbes", "status": "Done (secondary research)"},
                {"phase": "1. Concept development", "activities": "Customer needs, specifications, concept generation/selection/testing", "aqualoop": "Survey analysis, QFD, 4 concepts, Pugh + weighted scoring → Concept D", "status": "Done on practice data; genuine data pending"},
                {"phase": "2. System-level design", "activities": "Architecture, modules, interfaces, make/buy", "aqualoop": "8-module architecture, passive core + optional module", "status": "Conceptual"},
                {"phase": "3. Detail design", "activities": "Geometry, materials, BOM, DfM/DfE", "aqualoop": "Conceptual CAD, indicative BOM and materials", "status": "Conceptual only"},
                {"phase": "4. Testing & refinement", "activities": "Prototypes, reliability, user testing", "aqualoop": "FMEA-driven test plan, household pilot", "status": "Future"},
                {"phase": "5. Production ramp-up", "activities": "Tooling, supplier ramp, launch", "aqualoop": "Contract moulding, regional launch", "status": "Future"},
                {"phase": "+ Commercialization", "activities": "STP, 4Ps, launch roadmap", "aqualoop": "Aquaguard channels + technician attach", "status": "Planned"},
            ],
            "course_map": [
                {"session": "1–2", "topic": "Product development process & organisation", "tab": "Overview", "application": "Six-phase process mapped to AquaLoop"},
                {"session": "3", "topic": "Opportunity identification", "tab": "Opportunity", "application": "Gap analysis, JTBD, PESTLE"},
                {"session": "4", "topic": "Product planning", "tab": "Opportunity", "application": "Mission statement, portfolio fit"},
                {"session": "5", "topic": "Identifying customer needs", "tab": "Customer insights", "application": "Survey + thematic coding, needs hierarchy, VoC"},
                {"session": "6", "topic": "Product specifications", "tab": "Specs & QFD", "application": "Target specs, House of Quality"},
                {"session": "7–8", "topic": "Concept generation & selection", "tab": "Concepts", "application": "Morphological chart, SCAMPER, Pugh, weighted scoring"},
                {"session": "9", "topic": "Concept testing", "tab": "Concept testing", "application": "Intent, WTP, price acceptance, feedback→design"},
                {"session": "10–11", "topic": "Product architecture & industrial design", "tab": "Architecture", "application": "Modular architecture, ID principles"},
                {"session": "12–13", "topic": "Design for environment / manufacturing", "tab": "Sustainability & DfM", "application": "Impact matrix, make/buy, supply chain"},
                {"session": "14", "topic": "Prototyping", "tab": "Prototype", "application": "2D sketch, CAD, exploded view, renders"},
                {"session": "15–17", "topic": "Robust design, patents, service design", "tab": "Robust / IP / Service", "application": "Noise factors, FMEA, IP, customer journey"},
                {"session": "18", "topic": "Product development economics", "tab": "Economics", "application": "BOM, unit economics, break-even, NPV"},
                {"session": "19–20", "topic": "Project management & commercialization", "tab": "Commercialization", "application": "Gantt, STP, 4Ps, roadmap"},
            ],
        },
        "opportunity": {
            "significance": [
                {"text": "Conventional household RO discards ~3–4 L per litre purified (cited in R1); BIS now requires ≥40% recovery (R11), so reject volumes remain material.", "src": "R1, R11"},
                {"text": "In a 143-household Gurugram study, 39.8% of RO users reused reject water and 35% said an additional storage tank could be installed (R1).", "src": "R1"},
                {"text": "Only 45% knew about reuse practices, and authors call for easier-to-use reuse technology (R1).", "src": "R1"},
                {"text": "RO is the largest purifier segment (~40% of value, R3); the overall market is ~USD 1.24 bn growing ~10% p.a. (R2).", "src": "R2, R3"},
            ],
            "alternatives": [
                {"alt": "Buckets / jars", "problem": "Overflow, spillage, heavy lifting, floor space"},
                {"alt": "DIY pipe to container", "problem": "Untidy, leaks, no overflow control, hard to clean"},
                {"alt": "Basic reject tanks (e.g. Aquaguard RO Reject Water Tank, AquaSave)", "problem": "Storage + tap only; overflow control absent or needs electrical wiring into the purifier (R9, R10)"},
                {"alt": "Water-saving RO (Aquasaver, up to 60% saving)", "problem": "Requires buying a new purifier; still produces reject water (R8)"},
            ],
            "trends": ["Regulatory pressure on RO wastage (NGT ≥60% recovery direction, R12; BIS 40%, R11)", "Brands marketing water saving as a feature (Aquasaver, R8)",
                       "Apartment living → space-constrained kitchens", "Service-led revenue growth at Eureka Forbes (R7)", "Rising water-stress awareness in metros"],
            "sustainability": "Reject water reused for chores replaces fresh municipal/borewell water litre for litre; a durable, repairable accessory extends the purifier's sustainability story without new purifier purchases.",
            "strategic_fit": [
                {"asset": "Aquaguard brand", "fit": "Trusted water brand; natural extension of the purifier"},
                {"asset": "Installed customer base", "fit": "1.6 mn app-installed users in FY25 (R19) for targeted attach offers"},
                {"asset": "Service network", "fit": "17,000+ pin codes (R8) — technician installs the retrofit kit"},
                {"asset": "Multi-channel distribution", "fit": "Direct, retail, e-commerce, institutional (R6)"},
                {"asset": "Existing accessory", "fit": "Basic RO Reject Water Tank already listed (R9) — AquaLoop is its next-generation upgrade"},
                {"asset": "Water-saving positioning", "fit": "Complements Aquasaver purifiers for the installed base of older ROs"},
            ],
            "markets": {"primary": "Existing urban RO-purifier households (Aquaguard and other brands) in apartments and independent houses, metro + tier-1",
                        "secondary": "New purifier buyers (bundle), water-stressed tier-2 cities, small offices / clinics with POU RO"},
            "jtbd": {
                "statement": "When my RO purifier is running, I want to capture its reject water and use it for chores without mess or effort, so I can stop wasting water and feel responsible.",
                "functional": ["Collect reject water automatically", "Avoid overflow and spills", "Dispense easily into a mop bucket", "Clean the container quickly"],
                "emotional": ["Stop feeling guilty about wasted water", "Confidence the water is used safely"],
                "social": ["Be seen as a water-responsible household", "Neat kitchen — no buckets on the floor"],
            },
            "pestle": [
                {"factor": "Political", "point": "NGT/MoEF direction on RO wastage keeps the issue on the policy agenda (R12)", "impact": "+"},
                {"factor": "Economic", "point": "Price-sensitive accessory buyers; low-cost DIY alternatives", "impact": "−"},
                {"factor": "Social", "point": "Growing water-stress awareness; reuse awareness still low (45%, R1)", "impact": "+/−"},
                {"factor": "Technological", "point": "Higher-recovery ROs reduce reject volume per litre (R8, R11)", "impact": "−"},
                {"factor": "Legal", "point": "Non-potable labelling; appliance warranties restrict input water", "impact": "Constraint"},
                {"factor": "Environmental", "point": "Groundwater depletion and TDS rise increase RO use and reject volumes", "impact": "+"},
            ],
            "mission": {
                "description": "Modular retrofit accessory that collects, stores and dispenses RO reject water for safe non-potable reuse, with an optional redistribution module.",
                "objectives": ["Launch within ~18 months of approval", f"Break even within year 1–2 on ~{econ['break_even_units_year1']:,} units", "Contribution margin ≥ 30% of net realisation", "Increase service-visit attach revenue"],
                "target_market": "Primary: urban RO households incl. existing Aquaguard customers. Secondary: new purifier buyers, small offices.",
                "assumptions": ["Households will adopt a neat, safe alternative to buckets", "Technicians can install in < 20 min", "Genuine survey confirms practice-data patterns"],
                "constraints": ["No connection to potable plumbing", "No change to the existing RO", "Appliance supply only after testing & OEM approval", "Retail price within stated WTP band"],
                "stakeholders": ["Households", "Eureka Forbes product, service and sales teams", "Contract moulders & fitting suppliers", "Channel partners", "Appliance OEMs (for module)", "Regulators / BIS"],
            },
            "competitors": {
                "dims": ["Convenience", "Affordability", "Overflow protection", "Modularity", "Maintenance", "Retrofit capability", "Water redistribution"],
                "rows": [
                    {"name": "Buckets & DIY", "scores": [1, 5, 1, 1, 2, 4, 1], "price": "₹0–300 (tap ~₹50, P05)"},
                    {"name": "Basic RO waste tanks", "scores": [3, 4, 2, 1, 3, 4, 1], "price": "₹1,249–1,410 street (R9, R10)"},
                    {"name": "Water-saving RO purifier", "scores": [4, 1, 3, 1, 3, 1, 1], "price": "₹9,499+ (new purifier, R8)"},
                    {"name": "AquaLoop (Concept D)", "scores": [5, 3, 5, 5, 4, 5, 3], "price": f"₹{econ['recommended_price']:,} core; module later"},
                ],
                "note": "Scores 1–5 are the author's comparative judgements based on listed features and public discussions; not measured data.",
            },
            "planning_decision": "Pursue as a near-term line-extension project in the accessories portfolio (low capital, leverages existing channels), "
                                 "with the appliance module as a later, higher-risk platform bet.",
        },
        "needs": {
            "hierarchy": [
                {"level": "Primary", "need": "Collects reject water without overflow or spills", "type": "Explicit"},
                {"level": "Primary", "need": "Fits a small kitchen and my existing RO", "type": "Explicit"},
                {"level": "Primary", "need": "Water is easy to take out for chores", "type": "Explicit"},
                {"level": "Primary", "need": "Water use is clearly safe (non-potable, suitable uses)", "type": "Explicit"},
                {"level": "Secondary", "need": "Easy to clean, no odour", "type": "Explicit"},
                {"level": "Secondary", "need": "Shows how full it is", "type": "Explicit"},
                {"level": "Secondary", "need": "Capacity matches my reject volume", "type": "Explicit"},
                {"level": "Secondary", "need": "Brand warranty and service", "type": "Explicit"},
                {"level": "Latent", "need": "Know how much water I am saving (feedback loop)", "type": "Latent"},
                {"level": "Latent", "need": "Kitchen looks neat — no visible buckets", "type": "Latent"},
                {"level": "Latent", "need": "Use stored water beyond mopping (appliances) without risk", "type": "Latent"},
            ],
            "voc": [
                {"observation": "Bucket under the sink overflows if I forget it (P03, survey)", "need": "Collect without overflow", "feature": "Float-operated bypass to drain"},
                {"observation": "20 L jars are heavy to carry to the balcony (P04)", "need": "Easy to move/dispense", "feature": "Front tap at bucket height; 5/10 L lift-out tank"},
                {"observation": "Jar with a ₹50 tap looks untidy (P05)", "need": "Neat appearance", "feature": "Slim white housing with teal trim"},
                {"observation": "Can't route pipes in a small kitchen (P03)", "need": "Fits existing set-up", "feature": "Universal push-fit retrofit kit, wall-mount"},
                {"observation": "Unsure whether water is OK for plants or clothes (P01, P07)", "need": "Confidence about safe use", "feature": "Non-potable labels, reuse guide, TDS strip"},
                {"observation": "Someone uses reject water in a washing machine (P06)", "need": "Appliance reuse (latent)", "feature": "Optional module — gated by testing & OEM approval"},
                {"observation": "Cleaning containers is a chore (survey pain)", "need": "Easy cleaning", "feature": "Wide-mouth lid, radiused interior"},
            ],
            "insights": insights,
        },
        "specs": {
            "rows": [
                {"req": "Prevents overflow", "feature": "Float-operated bypass to drain", "target": "0 spills at max reject flow (~1 L/min) over 1,000 cycles", "imp": f["Overflow protection"]["mean"], "why": "Top-3 pain; passive = no wiring"},
                {"req": "Right capacity", "feature": "Modular tank", "target": "5 L and 10 L variants", "imp": f["Modular capacity"]["mean"], "why": f"Survey: {pct_of(cap, '5 L'):.0f}% prefer 5 L, {pct_of(cap, '10 L'):.0f}% 10 L, {pct_of(cap, '15 L'):.0f}% 15 L"},
                {"req": "Compact", "feature": "Slim wall-mount", "target": "≤ 300 W × 140 D × 420 H mm (10 L)", "imp": p["pain"]["space"]["mean"], "why": "Space is the most cited pain"},
                {"req": "Easy to empty/carry", "feature": "Detachable tank with handle", "target": "Remove in < 30 s; ≤ 11 kg full", "imp": f["Detachable container"]["mean"], "why": "Also enables cleaning"},
                {"req": "Simple installation", "feature": "Universal retrofit kit", "target": "Fits 1/4\" reject lines; install < 20 min", "imp": f["Retrofit compatibility"]["mean"], "why": "Installation is a top purchase concern"},
                {"req": "Easy dispensing", "feature": "Front lever tap", "target": "≥ 2 L/min at half level; 150 mm bucket clearance", "imp": None, "why": "Replaces lifting/tilting"},
                {"req": "Easy cleaning", "feature": "Wide-mouth lid", "target": "Hand-sized opening ≥ 100 mm; clean < 5 min", "imp": f["Easy cleaning"]["mean"], "why": "#2 feature by mean rating"},
                {"req": "Safe use", "feature": "Labelling + safeguard path", "target": "Permanent 'Non-potable' marking; no potable connection", "imp": f["Water-quality safeguard"]["mean"], "why": "#1 feature by mean rating"},
                {"req": "Appliance option", "feature": "Optional module", "target": "Disabled by default; enabled after test + OEM approval", "imp": f["Appliance integration"]["mean"], "why": "Latent need; conditional"},
                {"req": "Affordable", "feature": "Lean BOM", "target": f"Core unit cost ≤ ₹600; MRP ₹{econ['recommended_price']:,}", "imp": None, "why": f"Median stated WTP ₹{wtp['median']:,.0f}"},
            ],
            "dimensions": "Indicative 10 L core: 300 W × 140 D × 420 H mm; with optional module ≈ 460 mm wide.",
            "tradeoffs": [
                "Capacity vs footprint: 10 L fits a 140 mm depth; 15 L would need ~190 mm — offered later as an add-on module rather than a bigger core.",
                "Automation vs cost: a mechanical float bypass costs a fraction of an electronic auto-cut (R17) and avoids wiring into the purifier (R10 reviews).",
                "Translucency vs algae: a translucent window aids level visibility; a lightly tinted tank limits light-driven growth.",
                "Appliance reuse vs safety: value for some users, but hardness/TDS (279–1,616 mg/L, R13) can exceed appliance limits (R15) → gated module.",
            ],
            "conjoint_note": "The course covers conjoint analysis for finalising specifications. The available survey asks for independent importance ratings and a single stated WTP — "
                             "it has no trade-off choice tasks, so formal conjoint part-worths cannot be estimated. This app uses feature-preference analysis instead; "
                             "a choice-based conjoint (e.g. capacity × overflow type × price) is recommended for the genuine survey round.",
        },
        "concepts": {
            "morph": [
                {"function": "Collection", "options": ["Open bucket", "Push-fit tee on reject line", "Auto-diverter valve"], "chosen": 1},
                {"function": "Storage", "options": ["Fixed tank", "Detachable 5/10 L tank", "Under-sink bladder"], "chosen": 1},
                {"function": "Overflow", "options": ["None (manual watch)", "Float bypass to drain", "Electronic auto-cut of RO"], "chosen": 1},
                {"function": "Dispensing", "options": ["Lift & pour", "Front lever tap", "Pump to hose"], "chosen": 1},
                {"function": "Distribution", "options": ["Manual only", "Optional snap-on module", "Always-on pumped network"], "chosen": 1},
                {"function": "Maintenance", "options": ["Rinse in place", "Lift-out + wide mouth", "Self-cleaning UV"], "chosen": 1},
            ],
            "scamper": [
                {"lens": "Substitute", "idea": "Replace electronic auto-cut with a passive float bypass (no wiring into the RO)"},
                {"lens": "Combine", "idea": "Combine tank, level window and tap into one lift-out module"},
                {"lens": "Adapt", "idea": "Adapt water-dispenser float valves and RO push-fit fittings"},
                {"lens": "Modify", "idea": "Slim the form to 140 mm depth; 5 / 10 L variants"},
                {"lens": "Put to other use", "idea": "Distribution module for compatible appliances (conditional)"},
                {"lens": "Eliminate", "idea": "Eliminate buckets, manual monitoring and purifier replacement"},
                {"lens": "Reverse", "idea": "Excess flows back to the drain automatically instead of the user watching the level"},
            ],
            "rationale": "Concept D scores highest on the weighted matrix and passes the water-safety gate: it launches with B's simple, affordable passive core "
                         "while creating a platform for a conditional appliance module. Concept C is rejected as a launch concept because default "
                         "appliance supply fails the mandatory water-safety constraint regardless of its score.",
        },
        "testing": {
            "feedback_to_design": feedback_to_design,
            "template_fields": ["Platform", "Post URL", "Date posted", "Likes", "Comments", "Shares", "Representative reaction (paraphrased)", "Sentiment (+/0/−)", "Design implication"],
            "plan": ["Post the concept render + 3-line description on LinkedIn, r/india / r/Frugal_Ind and a housing-society WhatsApp group",
                     "Collect genuine survey responses in the 'Actual survey collection' sheet (target n ≥ 60, informed consent)",
                     "Re-run build_project.py — the app switches to genuine data automatically once ≥ 10 valid responses exist",
                     "Compare genuine vs practice patterns before finalising price and capacity"],
            "stated_vs_actual": "Stated purchase intent overstates real demand. A common heuristic weights 'definitely' (5) responses at ~0.8 and 'probably' (4) at ~0.3; "
                                "the app shows this as an illustrative calibrated estimate, not a forecast.",
        },
        "architecture": {
            "type": "Modular (slot/bus hybrid): the housing is the bus; tank, tap, level, overflow and inlet are slot modules; the distribution pod attaches by a bus-type side interface.",
            "modular_vs_integral": [
                {"aspect": "Repair", "modular": "Replace tap, float or tank individually", "integral": "Replace whole unit"},
                {"aspect": "Variety", "modular": "5 / 10 L, colour, module add-on from shared housing", "integral": "New tooling per variant"},
                {"aspect": "Cost at launch", "modular": "Slightly higher interface cost", "integral": "Lowest single-part cost"},
                {"aspect": "Upgrade path", "modular": "Distribution module added later", "integral": "None"},
                {"aspect": "Development", "modular": "Modules developed in parallel; suppliers own commodity parts", "integral": "Tightly coupled"},
            ],
            "advantages": ["Repairability and lower lifetime cost", "Product variety from one housing tool", "Platform for the appliance module", "Spare-parts revenue via service network", "Parallel sourcing of commodity modules"],
            "variants": ["AquaLoop 5 (compact)", "AquaLoop 10 (core)", "AquaLoop+ (with distribution module, pilot)", "Bundle SKU with new Aquaguard purifiers", "Society / office 20 L version"],
            "id": [
                {"principle": "Appearance", "application": "White body, teal trim, navy badge — matches Aquaguard purifiers"},
                {"principle": "Compactness", "application": "140 mm depth, wall-mount beside or below the purifier"},
                {"principle": "Ease of use", "application": "One-hand lever tap at bucket height; lift-out handle"},
                {"principle": "Ergonomics", "application": "Tank ≤ 11 kg full; tap height suits a mop bucket"},
                {"principle": "Cleaning", "application": "Wide-mouth lid, radiused corners, dishwasher-free hand wash"},
                {"principle": "Accessibility", "application": "Large L / ½ / F marks; colour + text labels"},
                {"principle": "Water-level visibility", "application": "Translucent window with floating indicator"},
                {"principle": "Kitchen suitability", "application": "Splash-safe, no electrics in core, non-potable icon"},
            ],
        },
        "feasibility": {
            "verdict": "Manual non-potable reuse (mopping, cleaning, some gardening) is feasible with guidance. Direct appliance supply is NOT assumed safe: "
                       "reject-water TDS of 279–1,616 mg/L (R13) can exceed the ~800 ppm hardness limit cited for dishwashers (R15), and appliance warranties "
                       "depend on input water. Appliance integration is therefore a conditional module requiring water testing, treatment and manufacturer approval.",
            "points": [
                {"use": "Floor mopping / outdoor cleaning", "status": "Suitable with dilution if high TDS", "src": "R14"},
                {"use": "Gardening", "status": "Conditional — test plants; avoid high-sodium water", "src": "R13"},
                {"use": "Toilet flushing", "status": "Suitable (manual fill)", "src": "R13"},
                {"use": "Utensil washing", "status": "Pre-soak only; final wash with fresh water", "src": "R14"},
                {"use": "Washing machine", "status": "Conditional — testing + softening + OEM approval", "src": "R15"},
                {"use": "Dishwasher", "status": "Not with untreated reject water", "src": "R15, R18"},
                {"use": "Drinking / cooking", "status": "Never", "src": "—"},
            ],
            "tds_note": "TDS alone does not establish safety: hardness, sodium, microbial growth during storage and source contaminants also matter.",
        },
        "sustainability": {
            "matrix": [
                {"dimension": "Water", "impact": "High +", "lever": "Reuses reject water for chores, replacing fresh water"},
                {"dimension": "Materials", "impact": "Medium", "lever": "Single-polymer PP/HDPE parts, recyclable; ~1 kg plastic per unit"},
                {"dimension": "Durability", "impact": "Medium +", "lever": "No electronics in core; replaceable tap/float"},
                {"dimension": "Repairability", "impact": "High +", "lever": "Modular, snap-fit; spares via service network"},
                {"dimension": "Energy", "impact": "Neutral", "lever": "Passive core uses no power; module pump only if needed"},
                {"dimension": "End of life", "impact": "Medium", "lever": "Material marking, take-back at service visit"},
                {"dimension": "Avoided purchases", "impact": "Medium +", "lever": "Retrofit avoids premature purifier replacement for water saving"},
            ],
            "dfe": ["Design for disassembly (snap-fits, no adhesives)", "Mono-material where possible; resin ID codes", "Minimal, recyclable packaging",
                    "Replaceable wear parts (tap, float, seals)", "No LCA performed — qualitative assessment only"],
            "supply_chain": [
                {"stage": "Component sourcing", "plan": "Tank & housing from contract moulders on EF-owned tools; fittings, taps, float valves from RO-component suppliers (Gujarat, NCR clusters)"},
                {"stage": "Supplier categories", "plan": "Plastic moulders · RO fittings/valves · printing & packaging · (module) pumps & cartridges"},
                {"stage": "Assembly", "plan": "Contract assembler near moulder; simple manual assembly"},
                {"stage": "Quality checks", "plan": "Incoming inspection, 100% leak test, float function check, label check"},
                {"stage": "Packaging", "plan": "Flat-pack corrugated box; tank nested in housing"},
                {"stage": "Distribution", "plan": "Existing Eureka Forbes warehouses → brand site, e-commerce, dealers, technician van stock"},
                {"stage": "Installation", "plan": "Technician installs at purchase or during next service/AMC visit"},
                {"stage": "Spare parts", "plan": "Tap, float, hose and seal kits via service network"},
                {"stage": "After-sales", "plan": "App-based service booking, 1-year warranty, cleaning reminders"},
            ],
        },
        "robust": {
            "variations": [
                {"noise": "Household water usage", "range": "Low to high chore demand", "response": "5 / 10 L modules; tap and overflow cope with any draw-down"},
                {"noise": "RO configuration", "range": "Brand, tubing size, reject flow", "response": "Universal push-fit kit with adapters"},
                {"noise": "Reject-water quantity", "range": "Under 5 to over 30 L/day (survey)", "response": "Overflow bypass handles surplus; capacity add-on"},
                {"noise": "Water quality", "range": "TDS 279–1,616 mg/L (R13)", "response": "Use guidance, TDS strip, safeguard cartridge for module"},
                {"noise": "Installation conditions", "range": "Wall type, space, drain position", "response": "Wall bracket or countertop stand; flexible drain hose"},
                {"noise": "Cleaning frequency", "range": "Weekly to rarely", "response": "Radiused interior, tinted tank, reminder card"},
            ],
            "ip": [
                {"topic": "Existing similar products", "point": "Reject-water tanks with taps and float auto-cut already exist (R9, R10) — the basic idea is not novel."},
                {"topic": "Possible differentiation", "point": "Passive overflow bypass integrated in a slim modular housing, plus a safety-gated distribution module interface."},
                {"topic": "Industrial design protection", "point": "Register the housing/trim design under the Designs Act, 2000 (appearance), subject to novelty search."},
                {"topic": "Patents", "point": "Any functional novelty would need a professional prior-art search; no claim of patentability is made."},
                {"topic": "Brand", "point": "Use the Aquaguard master brand; check 'AquaLoop' trademark availability (similar names such as AquaSave exist)."},
            ],
            "journey": [
                {"stage": "Discovery", "touchpoint": "Technician visit, app nudge, e-commerce search, purifier bundle", "ef_support": "Targeted offers to installed base"},
                {"stage": "Purchase", "touchpoint": "Brand site, dealer, technician, marketplace", "ef_support": "Bundle pricing, EMI-free, exchange of old tank"},
                {"stage": "Installation", "touchpoint": "Technician fits retrofit kit (< 20 min)", "ef_support": "Trained network, install checklist"},
                {"stage": "Usage", "touchpoint": "Level window, tap, reuse guide card / QR video", "ef_support": "Water-saved tips in app"},
                {"stage": "Maintenance", "touchpoint": "Cleaning reminders, spare tap/float", "ef_support": "Add to AMC visit"},
                {"stage": "After-sales", "touchpoint": "Warranty claims, upgrade to module", "ef_support": "Service app, feedback loop to product team"},
            ],
        },
        "economics_notes": {
            "pricing": f"The contribution-index (acceptance × unit contribution) peaks at ₹{econ['contribution_index_max_price']:,} on practice data, but at that price only a "
                       f"small minority accept. ₹{econ['recommended_price']:,} is recommended as a balance: it covers cost with ~{ue['contribution_margin_pct']}% contribution margin, "
                       f"sits modestly above Eureka Forbes' own basic tank street price (₹1,249, R9) and AquaSave (₹1,410, R10) to reflect overflow control and modularity, "
                       f"and is the lower edge of the original ₹1,499–₹2,999 hypothesis — the upper part of that hypothesis is not supported by the practice data. "
                       f"A ₹{FIN_ASSUMPTIONS['bundle_price']:,} attach price (with a new purifier or AMC) widens reach to {econ['wtp_reference']['accept_at_bundle']}% of respondents.",
            "module": f"The appliance module's indicative cost (₹{econ['module_unit_cost']:,}) far exceeds stated extra WTP (median ₹{p['concept_test']['extra_wtp'].get('median', 0):,.0f}). "
                      "It is not commercially viable as a launch product and is kept as a pilot/platform option.",
            "recommendation": "Commercially feasible as a low-capital line extension if genuine demand confirms the practice-data pattern; the main risks are price acceptance and attach rates, not cost.",
        },
        "commercialization": {
            "stp": {
                "segmentation": ["Housing type (apartment / independent / rented)", "RO ownership & brand", "Current reuse behaviour", "Water-stress of city", "Space available"],
                "primary": "Urban RO households already reusing reject water with buckets/DIY — especially existing Aquaguard customers",
                "secondary": "New purifier buyers (bundle), water-stressed tier-2 cities, small offices/clinics",
                "persona": {"name": "Priya, 34, Bengaluru apartment", "context": "Aquaguard RO, 4-member family, collects reject water in two buckets under the sink",
                            "pains": "Buckets overflow when she forgets; carrying to the balcony; cramped kitchen", "gains": "Neat set-up, no spills, knows she saves water", "channel": "Aquaguard technician during AMC visit, brand app"},
                "positioning": "For water-conscious RO households who already try to reuse reject water, Aquaguard AquaLoop is the modular retrofit accessory that captures it neatly and never overflows — "
                               "unlike buckets or basic tanks, it fits your existing purifier, cleans in minutes and can grow into a safe redistribution system.",
                "usp": "No spills, no buckets, no new purifier.",
            },
            "differentiation": [
                {"vs": "Buckets", "why": "Automatic overflow bypass, no lifting, tidy"},
                {"vs": "DIY arrangements", "why": "Brand-installed, leak-tested, easy to clean"},
                {"vs": "Basic wastewater tanks", "why": "Passive overflow (no wiring), slim modular design, detachable tank, upgrade module"},
                {"vs": "Replacing the RO", "why": "~1/6 of the cost of a water-saving purifier; reuses remaining reject water too"},
            ],
            "perceptual": [
                {"name": "Buckets / DIY", "x": 1.0, "y": 4.7}, {"name": "Basic tanks", "x": 2.5, "y": 3.9},
                {"name": "Water-saving RO", "x": 3.6, "y": 1.2}, {"name": "AquaLoop", "x": 4.6, "y": 3.3},
                {"name": "Automated system (C)", "x": 4.8, "y": 1.0},
            ],
            "perceptual_axes": {"x": "Convenience & safety (1–5)", "y": "Affordability (1–5)"},
            "four_p": {
                "Product": ["Core: AquaLoop 10 L (and 5 L) passive collection unit", "Optional: distribution module (pilot, conditional)", "Future: 20 L society/office version, purifier bundle SKU"],
                "Price": [f"Core 10 L: ₹{econ['recommended_price']:,} (range {FIN_ASSUMPTIONS['price_range']})", "5 L: ~₹1,199", f"Module: indicative ₹{FIN_ASSUMPTIONS['module_price']:,} (pilot only)", f"Installation: ₹{FIN_ASSUMPTIONS['installation_fee']} or free with purifier/AMC"],
                "Place": ["Eureka Forbes direct + technician network (attach at install/AMC)", "Brand website and e-commerce marketplaces", "Dealer and modern retail"],
                "Promotion": ["'Litres saved' demos at service visits", "Digital: water-saving calculator, reels", "Outreach to existing Aquaguard customers via app/SMS", "Housing-society activations in water-stressed cities"],
            },
            "roadmap": [
                {"stage": "1. Customer concept validation", "timing": "Months 0–2", "gate": "Genuine survey n ≥ 60; top-2 intent ≥ 40%"},
                {"stage": "2. Product concept refinement", "timing": "Months 2–4", "gate": "Specs frozen; target cost ≤ ₹600"},
                {"stage": "3. Functional prototype testing", "timing": "Months 4–8", "gate": "FMEA high-RPN items closed"},
                {"stage": "4. Limited household pilot", "timing": "Months 8–11", "gate": "≥ 100 homes; < 3% leak complaints"},
                {"stage": "5. Regional launch", "timing": "Months 12–15", "gate": "Attach rate & NPS targets"},
                {"stage": "6. Wider commercialization", "timing": "Month 16+", "gate": "National roll-out; module pilot decision"},
            ],
            "gantt": [
                {"task": "Opportunity identification", "start": 0, "dur": 1, "status": "Done"},
                {"task": "Customer research", "start": 0.5, "dur": 2, "status": "In progress"},
                {"task": "Concept development", "start": 1, "dur": 1.5, "status": "Done (practice data)"},
                {"task": "Concept selection", "start": 2, "dur": 0.5, "status": "Done (provisional)"},
                {"task": "Concept testing", "start": 2.5, "dur": 1.5, "status": "Pending"},
                {"task": "Prototype development", "start": 4, "dur": 4, "status": "Planned"},
                {"task": "Feasibility analysis", "start": 3, "dur": 3, "status": "Planned"},
                {"task": "Pilot launch", "start": 8, "dur": 3, "status": "Planned"},
                {"task": "Commercialization", "start": 12, "dur": 6, "status": "Planned"},
            ],
            "final": [
                {"k": "Market opportunity", "v": "Millions of RO homes discard reject water; reuse intent exists but tools are crude (R1, survey)"},
                {"k": "Selected concept", "v": "D — modular hybrid: passive core now, conditional appliance module later"},
                {"k": "Needs addressed", "v": "Overflow, space, carrying, cleaning, safe use, retrofit"},
                {"k": "Differentiation", "v": "Passive overflow + slim modular design + brand install & service"},
                {"k": "Proposed price", "v": f"₹{econ['recommended_price']:,} (10 L core), range {FIN_ASSUMPTIONS['price_range']}"},
                {"k": "Sustainability edge", "v": "Reuses reject water; repairable, mono-material, no electronics in core"},
                {"k": "Commercial feasibility", "v": f"Unit contribution ≈ ₹{ue['contribution']:,}; year-1 break-even ≈ {econ['break_even_units_year1']:,} units"},
                {"k": "Remaining validation", "v": "Genuine survey & concept test, price test, prototype leak/overflow tests, appliance OEM trials"},
            ],
        },
        "ai_log": [
            {"stage": "Idea generation", "tool": "ChatGPT", "task": "Brainstorm household sustainability product ideas", "rec": "RO reject-water reuse accessory for an established purifier brand", "status": "Accepted", "why": "Clear, under-served everyday problem with strategic fit", "review": "Student to confirm choice rationale"},
            {"stage": "Project planning", "tool": "ChatGPT", "task": "Structure the project around the six-phase NPD process", "rec": "12-section plan from planning to commercialization", "status": "Accepted", "why": "Mirrors course outline", "review": "Check against session plan"},
            {"stage": "Survey design", "tool": "ChatGPT", "task": "Draft survey and practice dataset", "rec": "29-question survey; 42 simulated rows", "status": "Modified", "why": "Practice rows kept only for illustration; genuine collection sheet added", "review": "Collect real responses with consent"},
            {"stage": "Secondary research", "tool": "Claude", "task": "Verify R1 figures; find market, company, competitor and water-quality sources", "rec": "39.8% and 35% verified; found existing Aquaguard RO Reject Water Tank", "status": "Accepted", "why": "Changes positioning to a next-generation line extension", "review": "Student to re-check links before submission"},
            {"stage": "Customer analysis", "tool": "Claude", "task": "Python analysis of survey + thematic coding", "rec": "Safety & cleaning lead; detachable/modular rated lower; WTP median below hypothesis", "status": "Accepted", "why": "Data-driven; denominators shown", "review": "Re-run on genuine data"},
            {"stage": "Concept selection", "tool": "Claude", "task": "Score concepts A–D", "rec": "Concept D with safety gate", "status": "Accepted", "why": "Highest weighted score and passes mandatory gate", "review": "Scores are judgements — student to challenge"},
            {"stage": "Product scope", "tool": "Claude", "task": "Choose architecture complexity", "rec": "Modular passive core instead of a fully automated system", "status": "Accepted", "why": "Cost, safety and MBA scope", "review": "—"},
            {"stage": "Appliance integration", "tool": "Claude", "task": "Feasibility of feeding dishwashers / washing machines", "rec": "Conditional module only; never untreated to dishwasher", "status": "Accepted", "why": "TDS/hardness evidence (R13, R15)", "review": "Seek expert/OEM view"},
            {"stage": "Engineering depth", "tool": "Claude", "task": "Level of CAD detail", "rec": "Simple conceptual CAD; no tolerances or fittings", "status": "Accepted", "why": "Assignment is MBA, not engineering", "review": "—"},
            {"stage": "Market sizing", "tool": "Claude", "task": "TAM/SAM/SOM", "rec": "Assumption-based, interactive, sources for anchors", "status": "Modified", "why": "Market reports disagree widely; avoided unsupported claims", "review": "Student to validate assumptions"},
            {"stage": "Pricing", "tool": "Claude", "task": "Test ₹1,499–2,999 hypothesis", "rec": "₹1,499 launch; upper range not supported", "status": "Pending review", "why": "Practice data only", "review": "Price test with genuine respondents"},
            {"stage": "Visualisation & app", "tool": "Claude", "task": "CAD, renders, diagrams and the web app", "rec": "CadQuery model, model-viewer, Chart.js, Vite", "status": "Accepted", "why": "Static, Netlify-friendly", "review": "Student to review visuals for the report"},
        ],
        "assumptions": [
            {"type": "Genuine customer evidence", "status": "Pending", "detail": "No genuine survey responses yet (collection sheet blank)."},
            {"type": "Practice survey data", "status": "Illustrative", "detail": "42 AI-generated rows; used to build and demonstrate the analysis only."},
            {"type": "Public secondary discussions", "status": "Qualitative", "detail": "7 public posts; anecdotal; validate the problem, not AquaLoop."},
            {"type": "Verified research", "status": "Sourced", "detail": "R1–R18 with links; R1 figures verified against the paper."},
            {"type": "Product concept assumptions", "status": "Assumption", "detail": "Dimensions, materials, modules and specs are conceptual targets."},
            {"type": "Financial estimates", "status": "Assumption", "detail": "BOM, margins, fixed costs, volumes and market shares are transparent assumptions."},
            {"type": "Future validation", "status": "Required", "detail": "Genuine survey, concept test posts, price test, prototype tests, OEM trials."},
        ],
    }
