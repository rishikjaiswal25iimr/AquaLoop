"""
AquaLoop conceptual illustrations (matplotlib only — lightweight, no CAD dependency).

Produces into public/drawings/ (SVG + PNG):
  product_sketch      – front, side and isometric views with labels and indicative dimensions
  exploded_view       – labelled isometric exploded view of the 8 major modules
  internal_working    – cutaway / transparent working illustration
  water_flow          – water flow and conditional appliance-integration diagram
and public/images/prototype_board.png + public/drawings/prototype_board.pdf (one-page board).

Geometry mirrors engineering/generate_cad.py (viewer's left = side module).
Conceptual visuals only: no tolerances, hidden lines or fittings.
"""
from pathlib import Path
import math

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, Rectangle, Polygon, Circle, FancyArrowPatch
import matplotlib.image as mpimg

ROOT = Path(__file__).resolve().parents[1]
DRAW = ROOT / "public" / "drawings"
IMG = ROOT / "public" / "images"
DRAW.mkdir(parents=True, exist_ok=True)
IMG.mkdir(parents=True, exist_ok=True)

NAVY, TEAL, AQUA, WHITE = "#0f294d", "#0d9e9e", "#5bc8eb", "#f6f8fa"
LINE, INK, MUTED, WATER, AMBER, RED = "#33475b", "#0f294d", "#5b6b7c", "#8fd3f0", "#e8a33d", "#c2453d"
plt.rcParams.update({"font.family": "DejaVu Sans", "font.size": 10, "svg.fonttype": "none"})

# Dimensions (mm) — same as CAD
W, D, BASE_H, TANK_H, CAP_H = 300, 140, 50, 310, 60
H = BASE_H + TANK_H + CAP_H


def save(fig, name, png_dpi=200):
    fig.savefig(DRAW / f"{name}.svg", bbox_inches="tight", facecolor=fig.get_facecolor())
    fig.savefig(DRAW / f"{name}.png", dpi=png_dpi, bbox_inches="tight", facecolor=fig.get_facecolor())
    plt.close(fig)


def label(ax, xy, text_xy, text, num=None, fs=8.5, color=INK):
    ax.annotate(text, xy=xy, xytext=text_xy, fontsize=fs, color=color, va="center",
                arrowprops=dict(arrowstyle="-", color=MUTED, lw=0.8, shrinkA=0, shrinkB=2),
                bbox=dict(boxstyle="round,pad=0.25", fc="white", ec="#c9d6e2", lw=0.6))


def rrect(ax, x, y, w, h, fc, ec=LINE, lw=1.2, r=6, alpha=1, z=1):
    p = FancyBboxPatch((x + r, y + r), max(w - 2 * r, 0.1), max(h - 2 * r, 0.1),
                       boxstyle=f"round,pad={r}", fc=fc, ec=ec, lw=lw, alpha=alpha, zorder=z)
    ax.add_patch(p)
    return p


def dim(ax, p1, p2, text, off=(0, 0), vertical=False):
    ax.annotate("", xy=p1, xytext=p2, arrowprops=dict(arrowstyle="<->", color=MUTED, lw=0.8))
    mx, my = (p1[0] + p2[0]) / 2 + off[0], (p1[1] + p2[1]) / 2 + off[1]
    ax.text(mx, my, text, fontsize=8, color=MUTED, ha="center", va="center",
            rotation=90 if vertical else 0, bbox=dict(fc="white", ec="none", pad=1))


# --------------------------------------------------------------------------- front / side primitives
def draw_front(ax, water_frac=0.62, show_labels=True):
    # side module (viewer's left)
    rrect(ax, -310, 50, 90, 200, WHITE, r=8)
    ax.add_patch(Rectangle((-287, 170), 44, 120, fc=AQUA, ec=LINE, lw=1, zorder=2))
    ax.add_patch(Rectangle((-288.5, 260), 47, 14, fc="#3aa6d6", ec=LINE, lw=1, zorder=3))
    ax.add_patch(Circle((-265, 75), 8, fc=NAVY, ec=LINE, zorder=3))
    # overflow drop pipe
    ax.add_patch(Rectangle((-207, 10), 14, 340, fc=NAVY, ec=LINE, lw=0.8, zorder=1))
    ax.add_patch(Rectangle((-207, 383), 70, 14, fc=NAVY, ec=LINE, lw=0.8, zorder=1))
    ax.add_patch(Rectangle((-207, 350), 14, 47, fc=NAVY, ec=LINE, lw=0.8, zorder=1))
    # main housing
    rrect(ax, -150, 0, 300, BASE_H, WHITE, r=8, z=2)
    rrect(ax, -150, BASE_H + TANK_H, 300, CAP_H, WHITE, r=8, z=2)
    ax.add_patch(Rectangle((-150, BASE_H), 300, TANK_H, fc="#eef2f5", ec=LINE, lw=1.2, zorder=1))
    # tank + water
    rrect(ax, -135, BASE_H, 270, TANK_H, "#d8f1fa", r=10, z=3, alpha=0.95)
    rrect(ax, -127, BASE_H + 8, 254, TANK_H * water_frac, WATER, ec="none", r=8, z=3, alpha=0.9)
    ax.add_patch(Rectangle((-60, BASE_H + TANK_H - 22), 120, 12, fc="#c3e7f4", ec=LINE, lw=0.6, zorder=4))
    # level indicator
    ax.add_patch(Rectangle((-114, 75), 18, 260, fc=TEAL, ec=LINE, lw=0.8, zorder=4))
    for i, t in enumerate(["L", "", "½", "", "F"]):
        y = 100 + i * 52
        ax.plot([-96, -84], [y, y], color=NAVY, lw=1.2, zorder=4)
        if t:
            ax.text(-80, y, t, fontsize=7, color=NAVY, va="center", zorder=4)
    # trims, badge
    ax.add_patch(Rectangle((-135, BASE_H + TANK_H + 25), 270, 8, fc=TEAL, ec="none", zorder=4))
    ax.add_patch(Rectangle((-135, BASE_H - 12), 270, 5, fc=TEAL, ec="none", zorder=4))
    ax.add_patch(Rectangle((55, BASE_H + TANK_H + 37), 70, 16, fc=NAVY, ec="none", zorder=4))
    ax.text(90, BASE_H + TANK_H + 45, "AquaLoop", color="white", fontsize=6, ha="center", va="center", zorder=5)
    # overflow body + inlet
    ax.add_patch(Rectangle((-119, 367), 28, 46, fc=NAVY, ec=LINE, lw=0.8, zorder=4))
    ax.add_patch(Rectangle((96, 420), 18, 40, fc=NAVY, ec=LINE, lw=0.8, zorder=4))
    ax.add_patch(Rectangle((96, 444), 95, 12, fc=NAVY, ec=LINE, lw=0.8, zorder=4))
    # tap
    ax.add_patch(Rectangle((38, 18), 24, 24, fc=TEAL, ec=LINE, lw=0.8, zorder=5))
    ax.add_patch(Rectangle((44, -8), 12, 26, fc=TEAL, ec=LINE, lw=0.8, zorder=5))
    ax.add_patch(Rectangle((30, 40), 40, 7, fc=TEAL, ec=LINE, lw=0.8, zorder=5))


def draw_side(ax, x0=0):
    # viewed from viewer's right: wall on the left (y=-70), front on the right (y=+70)
    ax.add_patch(Rectangle((x0 - 70, 0), 10, H, fc="#dfe6ec", ec=LINE, lw=1.0))
    rrect(ax, x0 - 70, 0, 140, BASE_H, WHITE, r=8, z=2)
    rrect(ax, x0 - 70, BASE_H + TANK_H, 140, CAP_H, WHITE, r=8, z=2)
    rrect(ax, x0 - 56, BASE_H, 120, TANK_H, "#d8f1fa", r=10, z=1)
    rrect(ax, x0 - 50, BASE_H + 8, 108, TANK_H * 0.62, WATER, ec="none", r=8, z=1)
    ax.add_patch(Rectangle((x0 + 64, 75), 6, 260, fc=TEAL, ec=LINE, lw=0.8, zorder=3))
    ax.add_patch(Rectangle((x0 + 70, 18), 30, 24, fc=TEAL, ec=LINE, lw=0.8, zorder=3))
    ax.add_patch(Rectangle((x0 + 88, -8), 12, 26, fc=TEAL, ec=LINE, lw=0.8, zorder=3))
    ax.add_patch(Rectangle((x0 - 9, 420), 18, 40, fc=NAVY, ec=LINE, lw=0.8, zorder=3))
    ax.add_patch(Rectangle((x0 - 70, BASE_H + TANK_H + 25), 140, 8, fc=TEAL, ec="none", zorder=3))


# --------------------------------------------------------------------------- isometric helpers
C30, S30 = math.cos(math.radians(30)), math.sin(math.radians(30))


def iso(x, y, z):
    return (C30 * (x - y), z - S30 * (x + y))


def iso_box(ax, x, y, z, w, d, h, fc, ec=LINE, alpha=1.0, lw=0.9, zo=1, shade=True):
    """Axis-aligned box: x right, y toward viewer, z up. Draw top, front(+y) and right(+x) faces."""
    P = lambda a, b, c: iso(x + a, y + b, z + c)
    top = [P(0, 0, h), P(w, 0, h), P(w, d, h), P(0, d, h)]
    front = [P(0, d, 0), P(w, d, 0), P(w, d, h), P(0, d, h)]
    right = [P(w, 0, 0), P(w, d, 0), P(w, d, h), P(w, 0, h)]
    import matplotlib.colors as mc
    base = mc.to_rgb(fc)
    dark = lambda f: tuple(max(0, c * f) for c in base)
    for poly, f in ((right, 0.82 if shade else 1), (front, 0.93 if shade else 1), (top, 1.0)):
        ax.add_patch(Polygon(poly, closed=True, fc=dark(f), ec=ec, lw=lw, alpha=alpha, zorder=zo))
    return P(w / 2, d, h / 2)


def iso_cyl(ax, x, y, z, r, h, fc, zo=1, n=28):
    import matplotlib.colors as mc
    pts_b = [iso(x + r * math.cos(t), y + r * math.sin(t), z) for t in [2 * math.pi * i / n for i in range(n)]]
    pts_t = [iso(x + r * math.cos(t), y + r * math.sin(t), z + h) for t in [2 * math.pi * i / n for i in range(n)]]
    lx = min(p[0] for p in pts_b); rx = max(p[0] for p in pts_b)
    cb, ct = iso(x, y, z), iso(x, y, z + h)
    side = [(lx, cb[1] + (pts_b[0][1] - cb[1]) * 0), (lx, ct[1]), (rx, ct[1]), (rx, cb[1])]
    ax.add_patch(Polygon([(lx, cb[1]), (lx, ct[1]), (rx, ct[1]), (rx, cb[1])], fc=tuple(c * 0.88 for c in mc.to_rgb(fc)),
                         ec=LINE, lw=0.8, zorder=zo))
    ax.add_patch(Polygon(pts_b, fc=tuple(c * 0.88 for c in mc.to_rgb(fc)), ec=LINE, lw=0.8, zorder=zo))
    ax.add_patch(Polygon(pts_t, fc=fc, ec=LINE, lw=0.8, zorder=zo + 0.1))
    return iso(x, y, z + h / 2)


def draw_iso_assembly(ax, ex=None):
    """Isometric assembly. ex: dict of module -> (dx, dy, dz) explode offsets (viewer coords)."""
    ex = ex or {}
    o = lambda k: ex.get(k, (0, 0, 0))
    anchors = {}
    # side module (left, behind front plane)
    dx, dy, dz = o("distribution")
    anchors["distribution"] = iso_box(ax, -310 + dx, -60 + dy, 50 + dz, 90, 120, 200, "#ffffff", zo=2)
    dx, dy, dz = o("safeguard")
    anchors["safeguard"] = iso_cyl(ax, -265 + dx, 10 + dy, 170 + dz, 22, 120, AQUA, zo=3)
    # overflow drop pipe + top body
    dx, dy, dz = o("overflow")
    iso_box(ax, -207 + dx, -7 + dy, 10 + dz, 14, 14, 340, NAVY, zo=2.5)
    iso_box(ax, -207 + dx, -7 + dy, 383 + dz, 80, 14, 14, NAVY, zo=2.6)
    anchors["overflow"] = iso_cyl(ax, -105 + dx, 0 + dy, 367 + dz, 14, 46, NAVY, zo=9)
    # housing
    dx, dy, dz = o("housing")
    iso_box(ax, -150 + dx, -70 + dy, 0 + dz, 300, 10, H, "#e9eef2", zo=4)
    anchors["housing"] = iso_box(ax, -150 + dx, -70 + dy, 0 + dz, 300, 140, BASE_H, WHITE, zo=5)
    iso_box(ax, -150 + dx, -70 + dy, BASE_H + TANK_H + dz, 300, 140, CAP_H, WHITE, zo=8 if not ex else 5.5)
    p1, p2 = iso(-135 + dx, 70 + dy, BASE_H + TANK_H + 25 + dz), iso(135 + dx, 70 + dy, BASE_H + TANK_H + 25 + dz)
    ax.plot([p1[0], p2[0]], [p1[1], p2[1]], color=TEAL, lw=3, zorder=8.5 if not ex else 5.6, solid_capstyle="butt")
    # tank (translucent) + water
    dx, dy, dz = o("tank")
    iso_box(ax, -135 + dx, -56 + dy, BASE_H + 8 + dz, 270, 108, TANK_H * 0.6, WATER, alpha=0.85, zo=6, ec="none")
    anchors["tank"] = iso_box(ax, -135 + dx, -56 + dy, BASE_H + dz, 270, 120, TANK_H, "#cfeef9", alpha=0.45, zo=7)
    # level indicator
    dx, dy, dz = o("level")
    anchors["level"] = iso_box(ax, -114 + dx, 64 + dy, 75 + dz, 18, 6, 260, TEAL, zo=10)
    # inlet
    dx, dy, dz = o("inlet")
    anchors["inlet"] = iso_cyl(ax, 105 + dx, 0 + dy, 420 + dz, 9, 40, NAVY, zo=11)
    iso_box(ax, 105 + dx, -6 + dy, 444 + dz, 90, 12, 12, NAVY, zo=11)
    # tap
    dx, dy, dz = o("tap")
    anchors["tap"] = iso_box(ax, 38 + dx, 70 + dy, 18 + dz, 24, 34, 24, TEAL, zo=12)
    iso_box(ax, 44 + dx, 92 + dy, -8 + dz, 12, 12, 26, TEAL, zo=12)
    return anchors


def finish(ax, pad=40):
    ax.set_aspect("equal")
    ax.autoscale_view()
    x0, x1 = ax.get_xlim(); y0, y1 = ax.get_ylim()
    ax.set_xlim(x0 - pad, x1 + pad); ax.set_ylim(y0 - pad, y1 + pad)
    ax.axis("off")


MODULE_LABELS = {
    "housing": "1  Main housing (wall-mount frame, base tray, top header)",
    "tank": "2  Detachable translucent storage tank (5 / 10 L)",
    "inlet": "3  Inlet & universal retrofit connector",
    "level": "4  Water-level indicator",
    "overflow": "5  Automatic overflow bypass to drain",
    "tap": "6  Controlled dispensing tap",
    "distribution": "7  Optional distribution module (valve, backflow, pump if needed)",
    "safeguard": "8  Appliance safeguard cartridge — conditional",
}


# --------------------------------------------------------------------------- 1. 2D product sketch
def product_sketch():
    fig = plt.figure(figsize=(16, 7.2), facecolor="white")
    fig.suptitle("AquaLoop — basic 2D product sketch (conceptual, indicative dimensions in mm)",
                 x=0.02, ha="left", fontsize=14, color=NAVY, fontweight="bold")
    axf = fig.add_axes([0.0, 0.03, 0.40, 0.86]); axs = fig.add_axes([0.42, 0.03, 0.17, 0.86])
    axi = fig.add_axes([0.58, 0.03, 0.42, 0.86])
    draw_front(axf)
    label(axf, (-265, 230), (-470, 330), "Optional distribution\nmodule + safeguard")
    label(axf, (-200, 150), (-470, 150), "Overflow bypass\nto drain")
    label(axf, (-105, 200), (-470, 30), "Water-level\nindicator")
    label(axf, (0, 180), (172, 190), "Detachable\ntranslucent tank")
    label(axf, (150, 395), (172, 330), "Top header:\ninlet + overflow")
    label(axf, (150, 450), (205, 480), "Inlet from RO\nreject line")
    label(axf, (60, 30), (172, 70), "Dispensing\ntap")
    dim(axf, (-150, -35), (150, -35), "300")
    dim(axf, (-310, -70), (150, -70), "≈ 460 with module")
    axf.text(-150, 505, "FRONT VIEW", fontsize=10, color=TEAL, fontweight="bold")
    finish(axf, 30)
    draw_side(axs)
    dim(axs, (-70, -35), (70, -35), "140")
    axs.text(-75, 505, "SIDE VIEW", fontsize=10, color=TEAL, fontweight="bold")
    axs.text(-82, 470, "WALL", color=MUTED, fontsize=8)
    dim(axs, (-100, 0), (-100, 420), "420", vertical=True, off=(-14, 0))
    finish(axs, 30)
    a = draw_iso_assembly(axi)
    axi.text(-420, 560, "ISOMETRIC VIEW", fontsize=10, color=TEAL, fontweight="bold")
    label(axi, a["tank"], (260, 430), "Lift-out tank\nwith handle")
    label(axi, a["tap"], (200, -150), "Front tap at\nbucket height")
    label(axi, a["safeguard"], (-470, 470), "Quality safeguard\n(conditional)")
    finish(axi, 30)
    fig.text(0.02, 0.0, "Concept visual for an MBA NPD assignment — not a manufacturing drawing. "
             "No hidden lines, tolerances or fittings shown.", fontsize=8, color=MUTED)
    save(fig, "product_sketch")


# --------------------------------------------------------------------------- 2. exploded view
EXPLODE = {"housing": (0, -120, 0), "tank": (0, 260, 0), "level": (0, 430, 30), "tap": (60, 330, -140),
           "inlet": (80, 0, 160), "overflow": (-40, 0, 170), "distribution": (-190, 0, 0), "safeguard": (-200, 0, 230)}


def exploded_view():
    fig = plt.figure(figsize=(14, 9), facecolor="white")
    ax = fig.add_axes([0.0, 0.0, 0.66, 0.92])
    a = draw_iso_assembly(ax, EXPLODE)
    for i, k in enumerate(MODULE_LABELS, 1):
        x, y = a[k]
        ax.add_patch(Circle((x, y), 15, fc=NAVY, ec="white", lw=1.5, zorder=20))
        ax.text(x, y, str(i), color="white", ha="center", va="center", fontsize=9, fontweight="bold", zorder=21)
    finish(ax, 30)
    fig.suptitle("AquaLoop — simplified exploded view: 8 major modules", x=0.02, ha="left",
                 fontsize=15, color=NAVY, fontweight="bold")
    axl = fig.add_axes([0.66, 0.08, 0.33, 0.8]); axl.axis("off")
    groups = [("Passive core (launch product)", ["housing", "tank", "inlet", "level", "overflow", "tap"], TEAL),
              ("Optional add-on (future / conditional)", ["distribution", "safeguard"], AMBER)]
    y = 0.98
    for title, keys, col in groups:
        axl.text(0, y, title, fontsize=11.5, color=col, fontweight="bold", transform=axl.transAxes, va="top"); y -= 0.06
        for k in keys:
            axl.text(0.0, y, MODULE_LABELS[k], fontsize=9.6, color=INK, transform=axl.transAxes, va="top", wrap=True)
            y -= 0.075
        y -= 0.03
    axl.text(0, y - 0.02, "Snap-fit / push-fit interfaces between modules support\nrepair, capacity upgrades (5 → 10 L) and later\n"
             "add-on of the distribution module without tools.\nScrews, gaskets and fittings intentionally not modelled.",
             fontsize=8.8, color=MUTED, transform=axl.transAxes, va="top")
    save(fig, "exploded_view")


# --------------------------------------------------------------------------- 3. internal working
def arrow(ax, p1, p2, color=TEAL, lw=2.2, style="-|>", ls="-", z=10, rad=0.0):
    ax.add_patch(FancyArrowPatch(p1, p2, arrowstyle=style, mutation_scale=14, color=color, lw=lw,
                                 linestyle=ls, zorder=z, connectionstyle=f"arc3,rad={rad}"))


def internal_working():
    fig, ax = plt.subplots(figsize=(13, 8.5), facecolor="white")
    # housing outline (ghosted)
    rrect(ax, -150, 0, 300, BASE_H, "#f2f5f8", r=8, z=1)
    rrect(ax, -150, BASE_H + TANK_H, 300, CAP_H, "#f2f5f8", r=8, z=1)
    ax.add_patch(Rectangle((-150, BASE_H), 300, TANK_H, fc="none", ec="#9fb0c0", lw=1, ls="--", zorder=1))
    # tank and water
    rrect(ax, -135, BASE_H, 270, TANK_H, "#e3f5fb", r=10, z=2)
    rrect(ax, -127, BASE_H + 8, 254, TANK_H * 0.7, WATER, ec="none", r=8, z=3)
    for xx in range(-110, 120, 40):
        ax.plot([xx, xx + 18], [BASE_H + 8 + TANK_H * 0.7 - 3] * 2, color="white", lw=1.2, zorder=4)
    ax.text(0, 150, "STORAGE CHAMBER\n(non-potable reject water)", ha="center", color=NAVY, fontsize=11, fontweight="bold", zorder=5)
    # inlet path
    ax.add_patch(Rectangle((96, 400), 18, 60, fc=NAVY, zorder=5))
    ax.add_patch(Rectangle((96, 446), 150, 12, fc=NAVY, zorder=5))
    arrow(ax, (330, 452), (250, 452)); arrow(ax, (105, 395), (105, 300))
    ax.text(340, 452, "① RO reject water in\n(retrofit tee on drain line)", va="center", fontsize=9.5, color=INK)
    # overflow chamber with float
    ax.add_patch(Rectangle((-125, 330), 50, 80, fc="#d6e2ec", ec=LINE, lw=1, zorder=5))
    ax.add_patch(Circle((-100, 352), 13, fc=AMBER, ec=LINE, zorder=6))
    ax.plot([-100, -100], [365, 400], color=LINE, lw=1.5, zorder=6)
    ax.add_patch(Rectangle((-207, 383), 85, 14, fc=NAVY, zorder=5))
    ax.add_patch(Rectangle((-207, -40), 14, 437, fc=NAVY, zorder=5))
    arrow(ax, (-125, 390), (-200, 390), color=AMBER); arrow(ax, (-200, 300), (-200, -30), color=AMBER, ls="--")
    ax.text(-215, -60, "② Overflow bypass → drain\n(float lifts when full; no spill)", ha="right", fontsize=9.5, color=INK)
    # level indicator
    ax.add_patch(Rectangle((115, 75), 14, 260, fc=TEAL, ec=LINE, lw=0.8, zorder=6))
    ax.add_patch(Rectangle((112, 75 + 260 * 0.66), 20, 10, fc=AMBER, ec=LINE, zorder=7))
    ax.text(140, 250, "③ Level\nindicator", fontsize=9.5, color=INK)
    # tap
    ax.add_patch(Rectangle((38, 18), 24, 24, fc=TEAL, ec=LINE, zorder=6))
    ax.add_patch(Rectangle((44, -10), 12, 28, fc=TEAL, ec=LINE, zorder=6))
    arrow(ax, (50, 60), (50, 15)); arrow(ax, (50, -12), (50, -70))
    ax.text(70, -60, "④ Manual dispensing → mopping, cleaning,\n    plants (after TDS check)", fontsize=9.5, color=INK)
    # optional module
    rrect(ax, -420, 40, 150, 230, "#fff8ec", ec=AMBER, r=10, z=2)
    ax.text(-345, 250, "OPTIONAL MODULE", ha="center", fontsize=9, color=AMBER, fontweight="bold")
    ax.add_patch(Rectangle((-395, 120), 40, 100, fc=AQUA, ec=LINE, zorder=4)); ax.text(-375, 225, "Safeguard", ha="center", fontsize=8)
    ax.add_patch(Circle((-315, 150), 14, fc="white", ec=LINE, zorder=4)); ax.text(-315, 150, "P", ha="center", va="center", fontsize=8); ax.text(-315, 120, "Pump\n(if needed)", ha="center", fontsize=7.5)
    ax.add_patch(Polygon([(-330, 80), (-300, 95), (-300, 65)], fc=NAVY, zorder=4)); ax.text(-315, 50, "Backflow\n+ isolation", ha="center", fontsize=7.5)
    arrow(ax, (-130, 70), (-270, 100), color=AMBER, rad=0.15)
    arrow(ax, (-420, 100), (-520, 100), color=AMBER, ls="--")
    ax.text(-530, 135, "⑤ Controlled outlet to a\ncompatible appliance —\nONLY after water testing,\ntreatment & OEM approval", ha="right",
            fontsize=9.2, color=RED)
    ax.set_title("AquaLoop — internal working (transparent conceptual view)", loc="left", fontsize=14, color=NAVY, fontweight="bold")
    ax.text(-560, -120, "Not connected to drinking-water plumbing. Untreated reject water is never supplied to a dishwasher.",
            fontsize=9, color=MUTED)
    finish(ax, 20)
    save(fig, "internal_working")


# --------------------------------------------------------------------------- 4. water flow diagram
def box(ax, x, y, w, h, text, fc, ec=None, tc="white", fs=10, bold=True):
    ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.02,rounding_size=0.12", fc=fc, ec=ec or fc, lw=1.5))
    ax.text(x + w / 2, y + h / 2, text, ha="center", va="center", color=tc, fontsize=fs, fontweight="bold" if bold else "normal")


def water_flow():
    fig, ax = plt.subplots(figsize=(15, 7.5), facecolor="white")
    ax.set_xlim(0, 15); ax.set_ylim(0, 7.5); ax.axis("off")
    ax.text(0.2, 7.15, "AquaLoop — water flow and conditional appliance integration", fontsize=15, color=NAVY, fontweight="bold")
    box(ax, 0.3, 3.6, 2.0, 1.1, "RO purifier\n(existing)", NAVY)
    box(ax, 3.0, 3.6, 2.2, 1.1, "Reject-water\nretrofit connector", "#1d5b8f")
    box(ax, 5.9, 3.35, 2.4, 1.6, "AquaLoop\nstorage tank\n5 / 10 L", TEAL, fs=11)
    box(ax, 9.2, 5.5, 2.4, 1.0, "Overflow bypass\n→ household drain", "#6b7c8f")
    box(ax, 9.2, 3.65, 2.4, 1.0, "Manual dispensing\ntap", TEAL)
    box(ax, 12.2, 3.65, 2.6, 1.0, "Utility reuse: mopping,\ncleaning, plants*", "#e6f6f6", ec=TEAL, tc=NAVY, fs=9.5)
    box(ax, 9.2, 1.75, 2.4, 1.0, "Optional distribution\nmodule", AMBER)
    box(ax, 12.2, 1.75, 2.6, 1.0, "Water-quality safeguard\n(test / treat)", "#fff3df", ec=AMBER, tc=NAVY, fs=9.5)
    # decision diamond
    cx, cy = 13.5, 0.62
    ax.add_patch(Polygon([(cx - 1.3, cy), (cx, cy + 0.5), (cx + 1.3, cy), (cx, cy - 0.5)], fc="white", ec=RED, lw=1.5))
    ax.text(cx, cy, "Quality verified +\nOEM approved?", ha="center", va="center", fontsize=8.5, color=RED, fontweight="bold")
    box(ax, 9.0, 0.2, 2.8, 0.85, "YES → compatible washing\nmachine / utility outlet", "#e9f7ef", ec="#2e8b57", tc="#1f5e3c", fs=8.8)
    ax.text(cx + 1.4, cy - 0.05, "NO → manual\nuse or drain", fontsize=8.5, color=RED, va="center")
    A = lambda p, q, c=TEAL, ls="-", rad=0: ax.add_patch(FancyArrowPatch(p, q, arrowstyle="-|>", mutation_scale=18, color=c, lw=2.2, linestyle=ls, connectionstyle=f"arc3,rad={rad}"))
    A((2.3, 4.15), (3.0, 4.15)); A((5.2, 4.15), (5.9, 4.15))
    A((8.3, 4.6), (9.2, 6.0), "#6b7c8f", rad=-0.2); A((8.3, 4.15), (9.2, 4.15)); A((11.6, 4.15), (12.2, 4.15))
    A((8.3, 3.7), (9.2, 2.25), AMBER, rad=0.2); A((11.6, 2.25), (12.2, 2.25), AMBER); A((13.5, 1.75), (13.5, 1.12), AMBER)
    A((12.2, 0.62), (11.8, 0.62), "#2e8b57")
    ax.text(2.4, 4.4, "reject line", fontsize=8, color=MUTED)
    ax.text(8.45, 5.3, "when full", fontsize=8, color=MUTED, rotation=38)
    ax.text(8.4, 2.6, "conditional", fontsize=8, color=AMBER, rotation=-40)
    # forbidden
    ax.add_patch(FancyBboxPatch((0.3, 1.1), 7.6, 1.6, boxstyle="round,pad=0.02,rounding_size=0.1", fc="#fdecea", ec=RED, lw=1.2))
    ax.text(0.5, 2.45, "✕  Never connected", fontsize=10, color=RED, fontweight="bold", va="top")
    ax.text(0.5, 2.05, "• to drinking-water or cooking-water plumbing\n• as untreated supply to a dishwasher\n"
            "• to any appliance without testing, treatment and manufacturer approval", fontsize=9, color=INK, va="top")
    ax.text(0.3, 0.75, "* TDS alone does not establish suitability; reject-water quality varies with\n"
            "  source water. Labelled non-potable throughout.", fontsize=8.5, color=MUTED, va="top")
    save(fig, "water_flow")


# --------------------------------------------------------------------------- 5. prototype board
def prototype_board(analysis=None):
    a = analysis or {}
    k = a.get("board", {})
    fig = plt.figure(figsize=(8.27, 11.69), facecolor="white")  # A4 portrait
    fig.add_axes([0, 0.915, 1, 0.085]).axis("off")
    hdr = fig.axes[-1]; hdr.add_patch(Rectangle((0, 0), 1, 1, fc=NAVY, transform=hdr.transAxes))
    hdr.text(0.04, 0.62, "AQUAGUARD  AquaLoop", color="white", fontsize=22, fontweight="bold", transform=hdr.transAxes, va="center")
    hdr.text(0.04, 0.25, "Modular RO Reject-Water Recovery & Redistribution System — concept prototype",
             color="#bfe9ef", fontsize=10.5, transform=hdr.transAxes, va="center")
    hdr.text(0.96, 0.62, "Proposed line extension\nfor Eureka Forbes (academic concept)", color="#bfe9ef", fontsize=7.5,
             ha="right", transform=hdr.transAxes, va="center")

    def put(path, rect, title=None):
        ax = fig.add_axes(rect); ax.axis("off")
        if Path(path).exists():
            ax.imshow(mpimg.imread(path))
        if title:
            ax.set_title(title, fontsize=9, color=TEAL, fontweight="bold", loc="left")
        return ax

    put(IMG / "render_hero.png", [0.0, 0.565, 0.60, 0.345])
    # feature panel
    fp = fig.add_axes([0.60, 0.58, 0.38, 0.32]); fp.axis("off")
    fp.text(0, 1.0, "KEY FEATURES", fontsize=11, color=NAVY, fontweight="bold", va="top")
    feats = ["Universal retrofit — keeps the existing RO", "Automatic overflow bypass to drain",
             "Detachable translucent 5 / 10 L tank", "Level indicator: Low / Half / Full",
             "Front tap at bucket height — no lifting", "Wide-mouth lid for easy cleaning",
             "Modular: add capacity or redistribution later", "Optional appliance module — conditional on\nwater testing & OEM approval"]
    y = 0.88
    for f in feats:
        fp.add_patch(Circle((0.02, y - 0.015), 0.012, fc=TEAL, transform=fp.transAxes))
        fp.text(0.06, y, f, fontsize=8.6, color=INK, va="top", transform=fp.transAxes)
        y -= 0.1 if "\n" not in f else 0.14
    T = dict(fontsize=9.5, color=TEAL, fontweight="bold")
    fig.text(0.03, 0.552, "2D SKETCH — front · side · isometric", **T)
    put(DRAW / "product_sketch.png", [0.02, 0.36, 0.96, 0.185])
    fig.text(0.03, 0.345, "EXPLODED VIEW — 8 modules", **T)
    fig.text(0.52, 0.345, "WATER FLOW — conditional appliance path", **T)
    put(DRAW / "exploded_view.png", [0.02, 0.15, 0.48, 0.19])
    put(DRAW / "water_flow.png", [0.51, 0.15, 0.47, 0.19])
    # sustainability strip
    sb = fig.add_axes([0.03, 0.022, 0.94, 0.115]); sb.axis("off")
    sb.add_patch(FancyBboxPatch((0, 0), 1, 1, boxstyle="round,pad=0,rounding_size=0.04", fc="#e8f7f7", ec=TEAL, transform=sb.transAxes))
    sb.text(0.02, 0.84, "SUSTAINABILITY EDGE", fontsize=10, color=TEAL, fontweight="bold", transform=sb.transAxes, va="center")
    kpis = [(k.get("annual_kl", "—") + " kL", "reusable per household\nper year (estimate)"),
            (k.get("price", "—"), "proposed launch price\n(10 L core)"),
            (k.get("modules", "8"), "replaceable modules —\nrepair, not replace"),
            ("0", "changes to the existing\nRO purifier")]
    for i, (v, t) in enumerate(kpis):
        x = 0.03 + i * 0.245
        sb.text(x, 0.52, str(v), fontsize=17, color=NAVY, fontweight="bold", transform=sb.transAxes, va="center")
        sb.text(x, 0.17, t, fontsize=7.5, color=MUTED, transform=sb.transAxes, va="center")
    fig.text(0.5, 0.006, "Conceptual MBA prototype (IIM Ranchi, NPDD). Not an existing or announced Eureka Forbes product. "
             "Estimates are assumption-based.", ha="center", fontsize=6.5, color=MUTED)
    fig.savefig(IMG / "prototype_board.png", dpi=220, facecolor="white")
    fig.savefig(DRAW / "prototype_board.pdf", facecolor="white")
    plt.close(fig)


def generate_all(analysis=None):
    product_sketch(); exploded_view(); internal_working(); water_flow(); prototype_board(analysis)
    return sorted(p.name for p in DRAW.iterdir())


if __name__ == "__main__":
    print(generate_all())
