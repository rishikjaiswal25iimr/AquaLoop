"""
AquaLoop — simplified conceptual CAD model (MBA concept level, NOT manufacturing CAD).

Builds 8 major functional modules from simple parametric solids with CadQuery and exports:
  public/models/aqualoop_assembly.step   (reusable CAD assembly, coloured)
  public/models/aqualoop.glb             (INTERNAL web-viewer asset, assembled — not a CAD deliverable)
  public/models/aqualoop_exploded.glb    (INTERNAL web-viewer asset, exploded — not a CAD deliverable)
The STEP file contains genuine B-rep CAD geometry exported by OpenCascade (via CadQuery).
DWG is not exported: no reliable open-source 3D DWG writer is available.
  public/data/cad_modules.json           (module list, dimensions, colours)

Run from the repository root:   python engineering/generate_cad.py
Requires: cadquery, trimesh (see requirements-cad.txt). Netlify never runs this script.
"""
from pathlib import Path
import json
import tempfile

import cadquery as cq
import numpy as np
import trimesh

ROOT = Path(__file__).resolve().parents[1]
MODELS = ROOT / "public" / "models"
DATA = ROOT / "public" / "data"
MODELS.mkdir(parents=True, exist_ok=True)
DATA.mkdir(parents=True, exist_ok=True)

# ---- Key parametric dimensions (mm). Indicative only. ------------------------
W = 300        # overall width of main body (without side module)
D = 140        # depth (wall to front)
TANK_W, TANK_D, TANK_H = 270, 120, 310   # ~10 L gross internal envelope
BASE_H = 50    # base tray (houses dispensing outlet)
CAP_H = 60     # top header (inlet + overflow module)
H = BASE_H + TANK_H + CAP_H   # 420 mm overall height

# ---- V2 product colour scheme (kept identical in engineering/visuals.py) ----
NAVY = (0.075, 0.165, 0.310, 1.0)        # main housing           #132a4f
MOUNT_GREY = (0.55, 0.58, 0.62, 1.0)     # mounting / back plate  #8c949e
TANK = (0.55, 0.85, 0.93, 0.42)          # translucent aqua tank  #8cd9ed
WATER = (0.12, 0.47, 0.82, 0.88)         # stored water           #1e78d1
LIGHT_TEAL = (0.52, 0.86, 0.80, 1.0)     # detachable lid/handle  #85dbcc
TAP_GREY = (0.70, 0.72, 0.75, 1.0)       # metallic tap           #b3b8bf
INLET_GREEN = (0.20, 0.66, 0.33, 1.0)    # water inlet            #33a854
OVERFLOW_ORANGE = (0.95, 0.53, 0.13, 1.0)  # overflow outlet      #f28721
LEVEL_CYAN = (0.00, 0.83, 0.95, 1.0)     # level indicator        #00d4f2
CHARCOAL = (0.17, 0.19, 0.22, 1.0)       # optional module body   #2b3038
TEAL = (0.05, 0.62, 0.62, 1.0)           # accents                #0d9e9e
WHITE = (0.97, 0.98, 0.99, 1.0)          # badge
METALLIC = {TAP_GREY}


def rbox(w, d, h, r=8):
    s = cq.Workplane("XY").box(w, d, h)
    try:
        s = s.edges("|Z").fillet(r)
    except Exception:
        pass
    return s


def build_modules():
    """Return list of (key, label, solid, colour, explode_offset_xyz, function)."""
    mods = []

    # 1. Main housing: back plate + base tray + top header shell (white)
    back = rbox(W, 10, H, 6).translate((0, -D / 2 + 5, H / 2))
    base = rbox(W, D, BASE_H, 10).translate((0, 0, BASE_H / 2))
    cap = rbox(W, D, CAP_H, 10).translate((0, 0, BASE_H + TANK_H + CAP_H / 2))
    try:
        cap = cap.faces(">Z").edges().fillet(6)
        base = base.faces("<Z").edges().fillet(4)
    except Exception:
        pass
    housing = base.union(cap)
    trim = (cq.Workplane("XY").box(W - 30, 3, 10).translate((0, D / 2 + 1, BASE_H + TANK_H + CAP_H / 2))
            .union(cq.Workplane("XY").box(W - 30, 3, 6).translate((0, D / 2 + 1, BASE_H - 8))))
    badge = cq.Workplane("XY").box(70, 3, 18).translate((-W / 2 + 60, D / 2 + 2, BASE_H + TANK_H + CAP_H / 2 + 14))
    mods.append(("housing", "Main housing", housing, NAVY, (0, -90, 0),
                 "Wall-mount frame, base tray and top header; carries all modules",
                 [(back, MOUNT_GREY), (trim, TEAL), (badge, WHITE)]))

    # 2. Storage tank (translucent, detachable)
    tank = rbox(TANK_W, TANK_D, TANK_H, 14).translate((0, 4, BASE_H + TANK_H / 2))
    # handle recess on top front
    handle = cq.Workplane("XY").box(120, 18, 14).translate((0, TANK_D / 2 - 6, BASE_H + TANK_H - 10))
    tank = tank.cut(handle)
    water = rbox(TANK_W - 16, TANK_D - 16, TANK_H * 0.62, 10).translate((0, 4, BASE_H + 8 + TANK_H * 0.31))
    lid = rbox(TANK_W - 6, TANK_D - 6, 8, 12).translate((0, 4, BASE_H + TANK_H - 4))
    grip = cq.Workplane("XY").box(110, 10, 12).translate((0, TANK_D / 2 + 6, BASE_H + TANK_H - 14))
    mods.append(("tank", "Detachable storage tank (5 / 10 L)", tank, TANK, (0, 180, 0),
                 "Translucent, food-grade PP/HDPE tank; lifts out by handle for emptying and cleaning",
                 [(water, WATER), (lid.union(grip), LIGHT_TEAL)]))

    # 3. Inlet & retrofit connection (top-left)
    inlet = (cq.Workplane("XY").circle(9).extrude(40).translate((-W / 2 + 45, 0, H))
             .union(cq.Workplane("YZ").circle(6).extrude(70).translate((-W / 2 - 25, 0, H + 30))))
    mods.append(("inlet", "Inlet & universal retrofit connector", inlet, INLET_GREEN, (-60, 0, 120),
                 "Push-fit 1/4-inch reject-line tee and diverter; no change to the purifier"))

    # 4. Level indicator (front vertical strip)
    level = rbox(18, 6, TANK_H - 60, 3).translate((TANK_W / 2 - 30, TANK_D / 2 + 7, BASE_H + TANK_H / 2))
    for i in range(5):
        tick = cq.Workplane("XY").box(10, 4, 3).translate(
            (TANK_W / 2 - 46, TANK_D / 2 + 7, BASE_H + 50 + i * (TANK_H - 100) / 4))
        level = level.union(tick)
    mods.append(("level", "Water-level indicator", level, LEVEL_CYAN, (0, 300, 20),
                 "Floating indicator in a clear window with Low / Half / Full marks"))

    # 5. Overflow & drainage module (top-right, down the side)
    ov_body = cq.Workplane("XY").circle(14).extrude(46).translate((W / 2 - 45, 0, BASE_H + TANK_H + 7))
    ov_pipe = cq.Workplane("YZ").circle(7).extrude(60).translate((W / 2 - 10, 0, BASE_H + TANK_H + 30))
    ov_drop = cq.Workplane("XY").circle(7).extrude(BASE_H + TANK_H - 20).translate((W / 2 + 50, 0, 10))
    overflow = ov_body.union(ov_pipe).union(ov_drop)
    mods.append(("overflow", "Automatic overflow bypass to drain", overflow, OVERFLOW_ORANGE, (90, 0, 110),
                 "Float-operated bypass: when the tank is full, reject water is routed to the drain"))

    # 6. Dispensing mechanism (front of base tray)
    tap_body = cq.Workplane("XZ").circle(12).extrude(-40).translate((-50, D / 2, BASE_H / 2 + 5))
    tap_spout = cq.Workplane("XY").circle(7).extrude(-26).translate((-50, D / 2 + 32, BASE_H / 2 + 5))
    tap_lever = cq.Workplane("XY").box(10, 40, 8).translate((-50, D / 2 + 28, BASE_H / 2 + 22))
    tap = tap_body.union(tap_spout).union(tap_lever)
    mods.append(("tap", "Controlled dispensing tap", tap, TAP_GREY, (0, 170, -80),
                 "Front lever tap at bucket / mop-bucket height; no lifting or tilting"))

    # 7. Water distribution module (side pod, optional)
    pod = rbox(90, 120, 200, 12).translate((W / 2 + 115, 0, BASE_H + 100))
    port = cq.Workplane("XZ").circle(9).extrude(-25).translate((W / 2 + 115, 60, BASE_H + 40))
    distribution = pod.union(port)
    accent = cq.Workplane("XY").box(92, 3, 10).translate((W / 2 + 115, 61, BASE_H + 160))
    mods.append(("distribution", "Optional distribution module", distribution, CHARCOAL, (190, 0, 0),
                 "Snap-on pod with outlet, isolation valve, backflow preventer and (if needed) small pump",
                 [(accent, TEAL)]))

    # 8. Appliance integration safeguard (cartridge on pod)
    cart = cq.Workplane("XY").circle(22).extrude(120).translate((W / 2 + 115, 10, BASE_H + 120))
    band = cq.Workplane("XY").circle(23.5).extrude(14).translate((W / 2 + 115, 10, BASE_H + 210))
    safeguard = cart.union(band)
    mods.append(("safeguard", "Appliance integration safeguard (conditional)", safeguard, TEAL,
                 (250, 40, 130),
                 "Treatment / quality-check cartridge; appliance outlet enabled only after testing and OEM approval"))
    return [m if len(m) == 7 else m + ([],) for m in mods]


def solid_to_trimesh(solid, tol=0.4):
    with tempfile.NamedTemporaryFile(suffix=".stl", delete=False) as f:
        cq.exporters.export(solid, f.name, tolerance=tol, angularTolerance=0.2)
        m = trimesh.load(f.name)
    return m


def srgb_to_linear(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def material(rgba):
    alpha = rgba[3]
    lin = [srgb_to_linear(c) for c in rgba[:3]] + [alpha]   # glTF base colours are linear
    return trimesh.visual.material.PBRMaterial(
        baseColorFactor=[int(round(c * 255)) for c in lin],
        metallicFactor=0.85 if tuple(rgba) in METALLIC else 0.0,
        roughnessFactor=0.28 if tuple(rgba) in METALLIC else (0.2 if alpha < 1 else 0.45),
        alphaMode="BLEND" if alpha < 1 else "OPAQUE",
        doubleSided=alpha < 1,
    )


def main():
    mods = build_modules()

    # STEP assembly (coloured)
    asm = cq.Assembly(name="AquaLoop")
    for key, label, solid, rgba, _, _, extras in mods:
        asm.add(solid, name=key, color=cq.Color(*rgba))
        for i, (es, ec) in enumerate(extras):
            asm.add(es, name=f"{key}_detail{i+1}", color=cq.Color(*ec))
    asm.save(str(MODELS / "aqualoop_assembly.step"))

    # Meshes
    # CAD Z-up, front=+Y  ->  glTF Y-up, front=+Z
    to_y_up = trimesh.transformations.rotation_matrix(np.pi / 2, [0, 1, 0]) @ \
        trimesh.transformations.rotation_matrix(np.pi / 2, [0, 1, 0]) @ \
        trimesh.transformations.rotation_matrix(-np.pi / 2, [1, 0, 0])
    scale = trimesh.transformations.scale_matrix(0.001)                        # mm -> m
    scene_a, scene_e, combined = trimesh.Scene(), trimesh.Scene(), []
    meta = []
    for key, label, solid, rgba, off, func, extras in mods:
        parts = [(solid, rgba, key)] + [(es, ec, f"{key}_detail{i+1}") for i, (es, ec) in enumerate(extras)]
        for psolid, prgba, pname in parts:
            pm = solid_to_trimesh(psolid)
            combined.append(pm.copy())
            for scene, offset in ((scene_a, (0, 0, 0)), (scene_e, off)):
                mm = pm.copy()
                mm.apply_translation(offset)
                mm.apply_transform(scale)
                mm.apply_transform(to_y_up)
                mm.visual = trimesh.visual.TextureVisuals(material=material(prgba))
                scene.add_geometry(mm, node_name=pname, geom_name=pname)
        bb = solid.val().BoundingBox()
        hs = {}
        for name, offset in (("assembled", (0, 0, 0)), ("exploded", off)):
            c = np.array([bb.center.x + offset[0], bb.center.y + offset[1], bb.zmax + offset[2] - 10, 1000.0]) / 1000.0
            v = (to_y_up @ c)[:3]
            hs[name] = f"{v[0]:.4f}m {v[1]:.4f}m {v[2]:.4f}m"
        meta.append({"key": key, "label": label, "function": func,
                     "color": "#%02x%02x%02x" % tuple(int(c * 255) for c in rgba[:3]),
                     "bbox_mm": [round(bb.xlen), round(bb.ylen), round(bb.zlen)], "hotspot": hs})

    scene_a.export(MODELS / "aqualoop.glb")
    scene_e.export(MODELS / "aqualoop_exploded.glb")
    (MODELS / "aqualoop_assembly.stl").unlink(missing_ok=True)   # mesh formats are not CAD deliverables

    info = {
        "units": "mm",
        "overall_mm": {"width_core": W, "width_with_module": W + 160 + 45, "depth": D, "height": H},
        "tank_envelope_mm": [TANK_W, TANK_D, TANK_H],
        "tank_gross_litres": round(TANK_W * TANK_D * TANK_H / 1e6, 1),
        "modules": meta,
        "note": "Conceptual geometry for visualisation only; no tolerances, wall thicknesses or fittings modelled.",
    }
    (DATA / "cad_modules.json").write_text(json.dumps(info, indent=2))
    print("CAD exported:", [p.name for p in MODELS.iterdir()])


if __name__ == "__main__":
    main()
