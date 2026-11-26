# AquaLoop | New Product Development Studio

*A proposed Aquaguard innovation for sustainable household water reuse.*
This is an MBA assignment for New Product Development & Design at IIM Ranchi (Term V, Prof. Shilpi Saxena, Working with AI).

AquaLoop is a modular accessory that fits onto the reject-water line of an existing RO purifier. It collects the reject water in a detachable 5 / 10 L tank, sends any overflow to the drain automatically, and has a tap for non-potable chores. An optional add-on module could later supply verified water to compatible appliances.
AquaLoop is an academic concept. It is **not** an existing or announced Eureka Forbes product.

The app is a static site. Python produces all the analysis and assets **before** deployment, so Netlify only runs `npm run build` and serves the `dist/` folder. It needs no Python server or backend.

---

## 1. Deploy to Netlify (no local setup needed)

The repository already contains the generated data (`public/data/*.json`), drawings, renders and 3D models, so the first deployment works straight away.

1. Create a new GitHub repository and upload **the contents** of this folder (not the ZIP itself). `node_modules/` and `dist/` are not needed.
2. In Netlify: **Add new site → Import an existing project → GitHub**, then pick the repository.
3. Netlify reads `netlify.toml`:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Node 20
4. Click **Deploy**. Every later push to GitHub redeploys the site automatically.

## 2. Run locally (optional)

```bash
npm install
npm run dev            # http://localhost:5173
npm run build && npm run preview
```

## 3. Re-run the Python analysis

```bash
pip install -r requirements.txt
python build_project.py                 # analysis JSON + 2D drawings + prototype board
python build_project.py --primary actual   # force genuine data (once collected)
```

`build_project.py`:
- finds the two workbooks in `./input/` (or the repository root);
- inspects the worksheet and column names, removes blank rows and sets out-of-range ratings or WTP values to missing;
- analyses the **practice** sheet and the **actual** sheet *separately* and never merges them. Genuine data become the primary dataset automatically once there are at least 10 valid responses;
- calculates customer insights (with valid-response denominators), thematic coding of the public discussions, QFD priorities, Pugh and weighted concept scores, pricing, unit economics, break-even, scenarios/NPV, TAM/SAM/SOM, water recovery and FMEA RPNs;
- writes `public/data/analysis.json` (aggregated and anonymised; no row-level survey data) and `public/data/research.json`;
- regenerates the 2D illustrations and the one-page prototype board.

To add genuine survey responses: fill in the **"Actual survey collection"** sheet, re-run `python build_project.py`, commit, and push.

## 4. Rebuild the 3D CAD model (optional, heavier)

```bash
pip install -r requirements-cad.txt
npm install                      # model-viewer is used for headless renders
python -m playwright install chromium   # if no Chrome is installed
python build_project.py --with-cad
```

`engineering/generate_cad.py` uses CadQuery to build 8 simple parametric modules and exports:
- `aqualoop_assembly.step` (coloured CAD assembly)
- `.stl`
- `aqualoop.glb` / `aqualoop_exploded.glb` (web)

`engineering/render_views.py` produces the studio renders.
Netlify never runs these scripts.

## 5. Repository structure

```
build_project.py          main Python script (analysis + visuals)
requirements.txt          analysis dependencies
requirements-cad.txt      optional CAD/render dependencies
package.json, vite.config.js, netlify.toml, index.html
src/                      main.js (12 tabs + references), style.css
public/data/              analysis.json, research.json, cad_modules.json
public/images/            renders, prototype board
public/models/            STEP, STL, GLB, CAD source copy
public/drawings/          SVG/PNG sketches, exploded view, cutaway, flow, board PDF
engineering/              generate_cad.py, render_views.py, visuals.py, npd_content.py
research/                 research_findings.json (sources with links)
input/                    the two Excel workbooks
```

## 6. Data and limitations

- **Practice survey data (42 rows) are simulated** and labelled as such everywhere. Genuine responses: 0 so far.
- The 7 public discussions confirm the underlying problem. They are **not** reactions to AquaLoop, and their engagement figures were not verified, so the app does not show them.
- Market sizes, BOM costs, margins, fixed costs and volumes are **transparent assumptions**, and the app lets you adjust most of them.
- Appliance integration is **conditional**: it needs water testing, treatment and manufacturer approval. AquaLoop is never connected to drinking-water plumbing, and untreated reject water is never supplied to a dishwasher.
- The CAD is conceptual: no tolerances, wall thicknesses or fittings.

## 7. Basic checks performed

- Both workbooks load.
- Concept weights sum to 100%.
- The unit-economics waterfall reconciles.
- Price acceptance is monotonic.
- `npm run build` succeeds.
- All 13 sections render in headless Chrome with no console errors, and the 3D model loads.
