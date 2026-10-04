"""Hand-drawn (2D vector) anime character art for Ranger's Apprentice.

Everything is drawn with hand-placed Bezier curves: anime line art, flat colour and hard
cel shadows, the way a TV-anime character sheet is coloured.
    python3 art/draw.py [name]     -> art/<name>.svg   (default: cast)
"""
import math, os, sys

HERE = os.path.dirname(__file__)
LINE = "#2b1a12"


def shade(hex_, k):
    h = hex_.lstrip("#")
    r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
    f = (lambda v: v * (1 + k)) if k < 0 else (lambda v: v + (255 - v) * k)
    return "#%02x%02x%02x" % tuple(max(0, min(255, round(f(v)))) for v in (r, g, b))


def P(d, fill="none", stroke=LINE, sw=2.2, op=None):
    o = f' opacity="{op}"' if op is not None else ""
    return f'<path d="{d}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" stroke-linejoin="round" stroke-linecap="round"{o}/>'


def spiky(tips, pull=0.35, center=(0, 0), close=True):
    """Anime hair outline: sharp tips joined by concave curves bowed toward `center`."""
    cx, cy = center
    d = f"M {tips[0][0]:.1f},{tips[0][1]:.1f} "
    n = len(tips) if close else len(tips) - 1
    for i in range(n):
        a, b = tips[i], tips[(i + 1) % len(tips)]
        mx, my = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
        p = pull if len(a) < 3 else a[2]
        qx, qy = mx + (cx - mx) * p, my + (cy - my) * p
        d += f"Q {qx:.1f},{qy:.1f} {b[0]:.1f},{b[1]:.1f} "
    return d + ("Z" if close else "")


def bangs(top_y, left, right, tips, pull=0.45):
    """A fringe: flat top hidden under the hair mass, bottom edge of pointed tips (left→right)."""
    d = f"M {left[0]},{left[1]} L {left[0]},{top_y} L {right[0]},{top_y} L {right[0]},{right[1]} "
    pts = [right] + list(reversed(tips)) + [left]
    for a, b in zip(pts, pts[1:]):
        mx, my = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
        d += f"Q {mx:.1f},{my - (abs(b[0] - a[0]) * pull):.1f} {b[0]:.1f},{b[1]:.1f} "
    return d + "Z"


def lock(x, y, ang, length, width, curl=0.15):
    """a tapered, curved lock from (x,y) pointing at ang degrees (90 = straight down)"""
    a = math.radians(ang); dx, dy = math.cos(a), math.sin(a); nx, ny = -dy, dx
    tx, ty = x + dx * length + nx * length * curl, y + dy * length + ny * length * curl
    c1 = (x + nx * width * 1.1 + dx * length * 0.55 + nx * length * curl * 0.5, y + ny * width * 1.1 + dy * length * 0.55 + ny * length * curl * 0.5)
    c2 = (x - nx * width * 0.9 + dx * length * 0.6 + nx * length * curl * 0.75, y - ny * width * 0.9 + dy * length * 0.6 + ny * length * curl * 0.75)
    return (f"M {x + nx*width:.1f},{y + ny*width:.1f} Q {c1[0]:.1f},{c1[1]:.1f} {tx:.1f},{ty:.1f} Q {c2[0]:.1f},{c2[1]:.1f} {x - nx*width:.1f},{y - ny*width:.1f} "
            f"Q {x - dx*width:.1f},{y - dy*width:.1f} {x + nx*width:.1f},{y + ny*width:.1f} Z")


def hair_mass(locks, blobs, color, shadow_x=18, strands=(), shine=None, sw=2.6):
    """Overlapping locks + base blobs drawn twice: inked, then flat on top, so only the silhouette keeps its line."""
    shapes = [lock(*l) for l in locks] + blobs
    o = [P(d, color, LINE, sw * 2) for d in shapes]
    o += [P(d, color, "none") for d in shapes]
    sh = shade(color, -0.3)
    cid = uid("hc")
    o.append(f'<clipPath id="{cid}">' + "".join(f'<path d="{d}"/>' for d in shapes) + "</clipPath>")
    o.append(f'<g clip-path="url(#{cid})"><path d="M {shadow_x + 30},-200 Q {shadow_x - 10},-60 {shadow_x + 14},-20 Q {shadow_x - 6},30 {shadow_x + 10},140 L 300,140 L 300,-200 Z" fill="{sh}"/>')
    if shine:
        o.append(P(shine, shade(color, 0.42), "none", op=0.85))
    for d in strands:
        o.append(P(d, stroke=sh, sw=1.6))
    o.append("</g>")
    return "".join(o)


_uid = [0]
def uid(p):
    _uid[0] += 1
    return f"{p}{_uid[0]}"


def eye(cx, cy, side, iris, w=30, h=34, lid=0.0, lash=1.0, sharp=0.0, look=(0, 0), lower_lid=0.0):
    """Anime eye. lid lowers the upper lid (0..1); sharp tilts the outer corner up (cool/stern look)."""
    o = []
    top, bot = cy - h / 2, cy + h / 2
    tilt = sharp * h * 0.25
    ox, ix = cx + side * w / 2, cx - side * w / 2
    # eye white: rounded top, flatter bottom, outer corner lifted by `sharp`
    white = (f"M {ix},{cy + h*0.08} C {ix},{top - h*0.05} {ox},{top - h*0.05 - tilt} {ox},{cy - tilt*0.6} "
             f"C {cx + side*w*0.42},{bot - lower_lid*h*0.3} {cx - side*w*0.4},{bot} {ix},{cy + h*0.08} Z")
    cid = uid("ec")
    o.append(f'<clipPath id="{cid}"><path d="{white}"/></clipPath>')
    o.append(P(white, "#fffdf7", "none"))
    ix_, iy_ = cx + look[0] * w * 0.14, cy + h * 0.1 + look[1] * h * 0.1
    iw, ih = w * 0.36, h * 0.46
    gid = uid("ig")
    o.append(f'<defs><linearGradient id="{gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{shade(iris, -0.65)}"/>'
             f'<stop offset="0.45" stop-color="{shade(iris, -0.1)}"/><stop offset="1" stop-color="{shade(iris, 0.55)}"/></linearGradient></defs>')
    o.append(f'<g clip-path="url(#{cid})">')
    o.append(f'<ellipse cx="{ix_}" cy="{iy_}" rx="{iw}" ry="{ih}" fill="url(#{gid})" stroke="{shade(iris, -0.75)}" stroke-width="1.5"/>')
    o.append(f'<ellipse cx="{ix_}" cy="{iy_ + ih*0.06}" rx="{iw*0.42}" ry="{ih*0.48}" fill="{shade(iris, -0.85)}"/>')
    o.append(f'<path d="M {ix_ - iw*0.75},{iy_ + ih*0.35} Q {ix_},{iy_ + ih*0.95} {ix_ + iw*0.75},{iy_ + ih*0.35}" fill="none" stroke="{shade(iris, 0.7)}" stroke-width="2" opacity="0.7"/>')
    o.append(f'<ellipse cx="{ix_ - side*iw*0.3}" cy="{iy_ - ih*0.4}" rx="{iw*0.32}" ry="{ih*0.22}" fill="#fff" transform="rotate({-side*25} {ix_ - side*iw*0.3} {iy_ - ih*0.4})"/>')
    o.append(f'<circle cx="{ix_ + side*iw*0.38}" cy="{iy_ + ih*0.4}" r="{iw*0.13}" fill="#fff"/>')
    # shadow of the upper lid across the white
    o.append(f'<path d="M {cx - w},{top - h} L {cx + w},{top - h} L {cx + w},{top + h*(0.2 + lid*0.75)} Q {cx},{top + h*(0.08 + lid*0.75)} {cx - w},{top + h*(0.2 + lid*0.75)} Z" fill="rgba(95,55,80,0.25)"/>')
    if lid > 0:
        o.append(f'<path d="M {cx - w},{top - h} L {cx + w},{top - h} L {cx + w},{top + h*lid*0.75 - (tilt if side > 0 else 0)} '
                 f'L {cx - w},{top + h*lid*0.75 - (tilt if side < 0 else 0)} Z" fill="var(--skin)"/>')
    o.append('</g>')
    # heavy upper lash line, flicked wing at the outer corner, thin lower lash
    ly = top + h * lid * 0.75
    if lid > 0:
        o.append(P(f"M {ix - side*2},{ly + h*0.06 + (tilt*0.5 if side < 0 else 0)} Q {cx},{ly - h*0.04} {ox + side*2},{ly - tilt*0.6}", sw=4.2 * lash))
    else:
        o.append(P(f"M {ix - side*1.5},{cy + h*0.06} C {ix},{top - h*0.12} {ox},{top - h*0.12 - tilt} {ox + side*1.5},{cy - tilt*0.6}", sw=4.2 * lash))
    o.append(P(f"M {ox},{cy - tilt*0.6 - 1} L {ox + side*w*0.2},{cy - h*0.14 - tilt}", sw=3.0 * lash))
    o.append(P(f"M {cx + side*w*0.02},{bot + 1.5} Q {cx + side*w*0.3},{bot + 1} {cx + side*w*0.45},{cy + h*0.2 - tilt*0.4}", sw=1.5))
    # lid crease
    o.append(P(f"M {cx - w*0.36},{top - 6} Q {cx},{top - 11} {cx + w*0.38},{top - 6 - (tilt if side > 0 else 0)}", stroke="rgba(90,50,40,0.5)", sw=1.3))
    return "".join(o)


def brow(cx, cy, side, color, ang=0, w=26, t=3.4):
    """ang > 0 lifts the inner end (worried); < 0 pulls it down (stern)"""
    xi, xo = cx - side * w * 0.45, cx + side * w * 0.6
    yi, yo = cy - ang * 7, cy + ang * 3 + 2
    return P(f"M {xi},{yi} Q {(xi + xo)/2},{min(yi, yo) - 5} {xo},{yo}", "none", color, t)


class Figure:
    """Waist-up anime figure. The head is ~100 units wide around (0,0); the frame bottom is y=270."""

    def __init__(self, **k):
        self.k = k

    def svg(self, x, y, s, flip=False):
        k = self.k
        skin = k["skin"]; skinS = shade(skin, -0.2)
        hair = k["hair"]; hairS = shade(hair, -0.32); hairH = shade(hair, 0.42)
        o = [f'<g transform="translate({x},{y}) scale({-s if flip else s},{s})" style="--skin:{skin}">']
        if k.get("back_hair"): o.append(k["back_hair"](hair, hairS, hairH))
        o.append(k["body"]())
        # neck + cel shadow under the jaw
        o.append(P("M -12,44 L -14,88 Q 0,96 14,88 L 12,44 Z", skin, sw=2.2))
        o.append(P("M -12,48 L -12,70 Q 0,80 12,70 L 12,48 Z", skinS, "none"))
        if k.get("collar"): o.append(k["collar"]())
        for sx in (-1, 1):
            o.append(P(f"M {sx*43},2 C {sx*55},-4 {sx*57},24 {sx*40},28", skin, sw=2.2))
            o.append(P(f"M {sx*45},8 Q {sx*50},12 {sx*45},20", "none", shade(skin, -0.35), 1.3))
        jaw = k.get("jaw", 1.0); chin = k.get("chin", 60)
        face = (f"M -46,-8 C -46,16 {-40*jaw},34 {-24*jaw},{chin-12} Q -8,{chin} 0,{chin+1} Q 8,{chin} {24*jaw},{chin-12} "
                f"C {40*jaw},34 46,16 46,-8 C 46,-60 -46,-60 -46,-8 Z")
        o.append(P(face, skin, sw=2.5))
        # hard cel shadow down the shadow side of the face and under the fringe
        o.append(P(f"M 46,-8 C 46,16 {40*jaw},34 {24*jaw},{chin-12} Q 14,{chin-3} 8,{chin} Q 28,34 33,10 Q 35,-4 46,-8 Z", skinS, "none"))
        if k.get("fringe_shadow"): o.append(P(k["fringe_shadow"], skinS, "none"))
        if k.get("blush"):
            for sx in (-1, 1):
                o.append(f'<ellipse cx="{sx*26}" cy="34" rx="11" ry="5.5" fill="rgba(255,105,105,{0.38*k["blush"]})"/>')
                for i in (-1, 0, 1):
                    o.append(P(f"M {sx*26 + i*5 - 2},37 L {sx*26 + i*5 + 2},31", stroke=f"rgba(215,70,70,{0.6*k['blush']})", sw=1.2))
        if k.get("freckles"):
            for sx in (-1, 1):
                for fx, fy in [(15, 30), (20, 33), (25, 30), (19, 27), (27, 34)]:
                    o.append(f'<circle cx="{sx*fx}" cy="{fy}" r="1.25" fill="#a6603a" opacity="0.75"/>')
        if k.get("scar"): o.append(P("M 26,-14 L 31,24", stroke="#9a4a3a", sw=2.2))
        ey = k.get("eye_y", 14)
        for sx in (-1, 1):
            o.append(eye(sx * 20, ey, sx, k["iris"], w=k.get("eye_w", 30), h=k.get("eye_h", 34), lid=k.get("lid", 0), lash=k.get("lash", 1),
                         sharp=k.get("sharp", 0), look=k.get("look", (0, 0)), lower_lid=k.get("lower_lid", 0)))
            o.append(brow(sx * 20, k.get("brow_y", -8), sx, k.get("brow_col", shade(hair, -0.4)), k.get("brow_ang", 0), t=k.get("brow_t", 3.4)))
        o.append(P("M 3,30 L 5,37 L 0,38", stroke=shade(skin, -0.42), sw=1.7))
        o.append(k.get("mouth", P("M -6,48 Q 0,50 6,48", sw=2)))
        if k.get("beard"): o.append(k["beard"]())
        o.append(k["front_hair"](hair, hairS, hairH))
        if k.get("extra"): o.append(k["extra"]())
        o.append("</g>")
        return "".join(o)


def torso(cloth, width=1.0, slope=1.0, sw=2.5, arms=True):
    """Shoulders, chest and arms down to the frame bottom, with a cel shadow on one side."""
    w = 78 * width
    sh = 96 + 6 * slope
    d = (f"M -14,82 C {-w*0.5},86 {-w*0.85},{sh-6} {-w*0.98},{sh+14} C {-w*1.08},{sh+50} {-w*1.06},200 {-w*1.08},272 "
         f"L {w*1.08},272 C {w*1.06},200 {w*1.08},{sh+50} {w*0.98},{sh+14} C {w*0.85},{sh-6} {w*0.5},86 14,82 Q 0,90 -14,82 Z")
    o = [P(d, cloth, sw=sw)]
    o.append(P(f"M {w*0.25},88 C {w*0.6},90 {w*0.9},{sh} {w*0.98},{sh+14} C {w*1.08},{sh+50} {w*1.06},200 {w*1.08},272 L {w*0.5},272 "
               f"C {w*0.55},200 {w*0.5},140 {w*0.25},88 Z", shade(cloth, -0.2), "none"))
    if arms:
        for sx in (-1, 1):
            o.append(P(f"M {sx*w*0.72},{sh+30} C {sx*w*0.7},180 {sx*w*0.72},230 {sx*w*0.74},272", stroke=shade(cloth, -0.5), sw=2))
    return "".join(o)


# ------------------------------------------------------------------ the cast

def will():
    hair = "#7b4a29"
    LOCKS = [  # (x, y, angle, length, width, curl)
        (-30, -60, 232, 24, 15, 0.1), (-6, -72, 262, 22, 14, 0.08), (20, -68, 292, 24, 14, -0.05), (42, -50, 322, 22, 13, -0.1),
        (-50, -36, 200, 22, 12, 0.15), (56, -20, 348, 18, 11, -0.1), (8, -76, 282, 18, 7, 0.45),
        (-49, -16, 104, 42, 12, 0.12), (51, -14, 76, 40, 12, -0.12), (-47, 2, 98, 30, 9, 0.1), (49, 4, 82, 28, 9, -0.1),
        (-34, -36, 104, 34, 12, 0.12), (-18, -42, 95, 40, 12, 0.08), (0, -44, 87, 42, 12, 0.02), (17, -42, 80, 38, 12, -0.06),
        (33, -38, 72, 32, 11, -0.1), (45, -30, 64, 26, 9, -0.12)]
    def back(h, hs, hh):
        return hair_mass([(-44, -10, 112, 52, 15, 0.1), (46, -8, 68, 50, 15, -0.1), (-30, -20, 125, 44, 15, 0.1), (32, -20, 55, 44, 15, -0.1)], [], hs)
    def front(h, hs, hh):
        return hair_mass(LOCKS, ["M -54,-30 C -54,-82 54,-82 54,-30 C 54,-6 -54,-6 -54,-30 Z"], h, shadow_x=22,
                         strands=["M -22,-66 Q -16,-36 -16,-4", "M 4,-76 Q 2,-40 0,6", "M 24,-66 Q 22,-36 18,2", "M -40,-44 Q -36,-20 -32,0"],
                         shine="M -40,-52 Q -20,-64 -4,-58 L 4,-66 Q 14,-62 28,-62 L 40,-52 Q 24,-56 12,-54 L 4,-60 Q -6,-52 -20,-56 Z")
    def body():
        o = [torso("#5e9a4c", 0.92, 1.0)]
        o.append(P("M -16,84 L 0,112 L 16,84", "#4f8a3e", sw=2.2))                                    # V-neck
        o.append(P("M -15,86 Q -40,94 -50,104", stroke="#3f6e30", sw=1.6)); o.append(P("M 15,86 Q 40,94 50,104", stroke="#3f6e30", sw=1.6))
        o.append(P("M -82,222 Q 0,232 82,222 L 84,240 Q 0,250 -84,240 Z", "#6a4628", sw=2.2))           # belt
        o.append(P("M -10,226 L 10,226 L 10,244 L -10,244 Z", "#d4ad52", sw=1.8))
        return "".join(o)
    return Figure(skin="#f7d6b4", hair=hair, iris="#4f9a3a", freckles=True, eye_w=31, eye_h=36, brow_ang=0.2, look=(0.3, 0),
                  mouth=P("M -9,46 Q 0,54 10,45", sw=2.3) + P("M 8,47 L 11,44", sw=1.6),
                  fringe_shadow="M -46,6 Q -40,12 -36,10 Q -30,4 -24,14 Q -18,6 -12,16 Q -4,8 2,14 Q 10,6 16,12 Q 24,6 30,10 Q 38,4 46,8 L 46,-10 L -46,-10 Z",
                  back_hair=back, front_hair=front, body=body)


def halt():
    hair = "#8e887c"
    cloak = "#5d6a48"
    LOCKS = [
        (-34, -58, 225, 22, 16, 0.12), (-8, -70, 255, 20, 15, 0.1), (20, -68, 290, 22, 15, -0.05), (44, -52, 320, 20, 14, -0.12),
        (-52, -34, 200, 18, 12, 0.2), (58, -22, 345, 16, 11, -0.15),
        (-51, -14, 102, 46, 14, 0.18), (53, -12, 78, 44, 14, -0.18), (-49, 8, 96, 32, 11, 0.15), (51, 10, 86, 30, 11, -0.15),
        (-36, -34, 108, 32, 12, 0.2), (-20, -40, 98, 36, 12, 0.14), (-2, -42, 90, 34, 12, 0.05), (16, -40, 82, 34, 12, -0.08),
        (32, -36, 74, 30, 11, -0.16), (46, -28, 66, 26, 9, -0.2)]
    def back(h, hs, hh):
        return hair_mass([(-46, -8, 110, 58, 17, 0.12), (48, -6, 70, 56, 17, -0.12), (-30, -18, 122, 48, 17, 0.1), (34, -18, 58, 48, 17, -0.1)], [], hs)
    def front(h, hs, hh):
        return hair_mass(LOCKS, ["M -56,-28 C -56,-84 56,-84 56,-28 C 56,-4 -56,-4 -56,-28 Z"], h, shadow_x=22,
                         strands=["M -26,-66 Q -20,-36 -18,-4", "M 2,-76 Q 0,-44 -2,2", "M 26,-64 Q 22,-36 20,0", "M -44,-40 Q -40,-18 -36,4"],
                         shine="M -42,-50 Q -22,-62 -6,-56 L 2,-64 Q 12,-60 26,-60 L 38,-50 Q 22,-54 10,-52 L 2,-58 Q -8,-50 -22,-54 Z")
    def beard():
        b = "#827c70"; bs = shade(b, -0.28)
        o = [P(spiky([(-46, 2), (-44, 30), (-36, 52), (-22, 70), (-8, 82), (6, 84), (20, 72), (34, 56), (44, 32), (46, 2), (34, 30), (20, 44), (0, 46), (-20, 44), (-34, 30)],
                     0.18, (0, 40)), b, sw=2.4)]
        o.append(P(spiky([(46, 2), (44, 32), (34, 56), (20, 72), (6, 84), (16, 58), (30, 36)], 0.15, (30, 40)), bs, "none"))
        for d in ["M -24,52 Q -18,64 -14,76", "M 0,52 Q 0,66 -2,80", "M 22,52 Q 18,64 14,74"]:
            o.append(P(d, stroke=bs, sw=1.5))
        # moustache over a grim mouth
        o.append(P("M -1,40 C -8,37 -18,40 -21,54 C -16,48 -9,45 -1,45 Z", b, sw=2))
        o.append(P("M 1,40 C 8,37 18,40 21,54 C 16,48 9,45 1,45 Z", b, sw=2))
        return "".join(o)
    def body():
        o = [torso("#55543e", 1.05, 1.0, arms=False)]
        o.append(P("M -104,272 C -108,180 -100,118 -68,96 Q -36,84 -16,84 L -22,128 Q -42,190 -40,272 Z", cloak, sw=2.5))
        o.append(P("M 104,272 C 108,180 100,118 68,96 Q 36,84 16,84 L 22,128 Q 42,190 40,272 Z", shade(cloak, -0.18), sw=2.5))
        for mx, my, rx, ry, col in [(-72, 150, 15, 9, "#7d8466"), (-62, 214, 13, 8, "#45503a"), (-86, 122, 9, 6, "#45503a"), (74, 162, 14, 9, "#3b4632"),
                                    (64, 226, 11, 7, "#6a7556"), (88, 128, 8, 6, "#6a7556"), (-52, 248, 10, 6, "#7d8466"), (-82, 186, 10, 7, "#6a7556")]:
            o.append(f'<ellipse cx="{mx}" cy="{my}" rx="{rx}" ry="{ry}" fill="{col}" opacity="0.8"/>')
        # the cowl lying back on his shoulders
        o.append(P("M -62,96 C -66,60 66,60 62,96 Q 32,80 0,88 Q -32,80 -62,96 Z", shade(cloak, -0.05), sw=2.5))
        o.append(P("M -40,84 Q 0,70 40,84", stroke=shade(cloak, -0.35), sw=1.6))
        # longbow behind, quiver strap across the chest, fletching at the shoulder
        o.append(P("M 112,-170 Q 168,60 110,290", stroke="#5a3a22", sw=7))
        o.append(P("M 112,-170 L 110,290", stroke="#d8d0c0", sw=1.2))
        o.append(P("M 56,98 L -44,262", stroke="#4a3020", sw=9))
        o.append(P("M 56,98 L -44,262", stroke="#6a4630", sw=5))
        for i, col in enumerate(["#e0d8c8", "#8a5a3a", "#e0d8c8"]):
            o.append(P(f"M {64 + i*8},92 L {58 + i*12},62 L {70 + i*10},66 Z", col, sw=1.8))
        return "".join(o)
    return Figure(skin="#e2b48e", hair=hair, iris="#6a5a3c", eye_w=29, eye_h=26, lid=0.3, sharp=0.55, lash=1.15, lower_lid=0.4,
                  brow_ang=-0.6, brow_t=5, brow_y=-4, brow_col="#5e594f", jaw=1.08, chin=62,
                  mouth=P("M -7,49 Q 0,47 7,49", sw=2.3),
                  fringe_shadow="M -48,4 Q -42,8 -38,4 Q -30,-2 -24,6 Q -16,0 -10,6 Q -2,0 4,4 Q 12,-2 18,4 Q 26,-2 32,4 Q 40,0 48,4 L 48,-10 L -48,-10 Z",
                  back_hair=back, front_hair=front, body=body, beard=beard)


# ---- mouths ----
def m_smile(w=8): return P(f"M -{w},46 Q 0,{52} {w},46", sw=2.2)
def m_smirk(): return P("M -7,48 Q 2,49 9,44", sw=2.2) + P("M 8,46 L 11,43", sw=1.5)
def m_grin(): return P("M -14,44 Q 0,46 14,44 Q 10,58 0,59 Q -10,58 -14,44 Z", "#8a2a2a", sw=2.2) + P("M -12,45 L 12,45 L 10,49 L -10,49 Z", "#fff", "none") + P("M -6,56 Q 0,52 6,56 Q 0,59 -6,56 Z", "#e07070", "none")
def m_o(): return P("M -4,47 Q 0,42 4,47 Q 0,53 -4,47 Z", "#8a2a2a", sw=1.8)
def m_flat(): return P("M -7,49 Q 0,48 7,49", sw=2.2)


def simple_body(cloth, width=1.0, collar=None, trim=None, belt=None, apron=None, robe=False):
    def body():
        o = [torso(cloth, width)]
        if collar: o.append(P("M -26,84 Q 0,104 26,84 Q 30,92 0,112 Q -30,92 -26,84 Z", collar, sw=2.2))
        if trim:
            o.append(P(f"M -14,84 L -10,272", stroke=trim, sw=7)); o.append(P(f"M 14,84 L 10,272", stroke=trim, sw=7))
        if apron: o.append(P("M -50,150 Q 0,140 50,150 L 56,272 L -56,272 Z", apron, sw=2.2))
        if belt: o.append(P("M -84,224 Q 0,234 84,224 L 86,242 Q 0,252 -86,242 Z", belt, sw=2.2))
        return "".join(o)
    return body


def short_hair(top_spikes, fringe, side=(36, 9), base_top=-80, up=False):
    """locks for short hair: crown spikes, a fringe row and two short side locks"""
    L = []
    for i, (x, ang, ln) in enumerate(top_spikes): L.append((x, -62 + abs(x) * 0.25, ang, ln, 14, 0.08 if x < 0 else -0.08))
    for x, ang, ln in fringe: L.append((x, -42 + abs(x) * 0.15, ang, ln, 11, 0.1 if x < 0 else -0.1))
    L += [(-49, -16, 104, side[0], side[1], 0.12), (51, -14, 76, side[0], side[1], -0.12)]
    blob = f"M -54,-28 C -54,{base_top} 54,{base_top} 54,-28 C 54,-6 -54,-6 -54,-28 Z"
    return L, blob


def horace():
    hair = "#e6bd5c"
    L, blob = short_hair([(-34, 222, 22), (-12, 248, 26), (10, 272, 28), (30, 300, 24), (46, 325, 18), (-48, 200, 16)],
                         [(-30, 112, 20), (-14, 100, 22), (2, 92, 20), (18, 82, 22), (34, 72, 18)], (30, 9), -78)
    return Figure(skin="#f4cfa6", hair=hair, iris="#3a6ab0", eye_w=29, eye_h=31, sharp=0.3, brow_ang=-0.15, brow_t=4.2, jaw=1.1, chin=62,
                  mouth=m_smirk(), back_hair=None,
                  front_hair=lambda h, hs, hh: hair_mass(L, [blob], h, 24, ["M -16,-66 Q -14,-46 -10,-30", "M 10,-70 Q 8,-48 6,-30"],
                                                         "M -38,-50 Q -18,-62 0,-58 L 8,-64 Q 20,-60 32,-58 L 40,-50 Q 22,-54 8,-52 L 0,-56 Q -16,-50 -30,-50 Z"),
                  fringe_shadow="M -46,-6 Q -36,0 -30,-2 Q -22,-8 -14,0 Q -6,-6 2,-2 Q 10,-8 18,0 Q 26,-6 34,-2 Q 40,-6 46,-4 L 46,-14 L -46,-14 Z",
                  body=simple_body("#b33a30", 1.22, belt="#4a3020"))


def alyss():
    hair = "#f3e0a8"
    LOCKS = [(-30, -60, 232, 16, 15, 0.1), (0, -70, 270, 12, 14, 0), (30, -60, 308, 16, 15, -0.1),
             (-48, -20, 98, 120, 14, 0.04), (50, -18, 82, 118, 14, -0.04), (-38, -36, 112, 46, 11, 0.12), (-22, -42, 100, 40, 11, 0.08),
             (22, -42, 80, 40, 11, -0.08), (38, -36, 68, 46, 11, -0.12), (-6, -44, 96, 34, 9, 0.05), (8, -44, 84, 32, 9, -0.05)]
    def back(h, hs, hh):
        return hair_mass([(-56, -20, 96, 230, 22, 0.02), (58, -18, 84, 228, 22, -0.02), (-40, -10, 100, 220, 22, 0.02), (40, -10, 80, 220, 22, -0.02),
                          (0, -20, 90, 210, 30, 0)], [], hs)
    return Figure(skin="#f8dcc4", hair=hair, iris="#4a86c8", eye_w=30, eye_h=33, lash=1.35, lid=0.12, brow_ang=0.05, brow_col="#b8955a", chin=60,
                  mouth=m_smile(6), back_hair=back,
                  front_hair=lambda h, hs, hh: hair_mass(LOCKS, ["M -54,-30 C -54,-80 54,-80 54,-30 C 54,-6 -54,-6 -54,-30 Z"], h, 26,
                                                         ["M -14,-66 Q -16,-40 -20,-4", "M 14,-66 Q 16,-40 20,-4", "M -46,0 Q -48,60 -46,110", "M 48,0 Q 50,60 48,110"],
                                                         "M -40,-52 Q -20,-64 -2,-60 L 0,-66 Q 12,-60 30,-60 L 42,-52 Q 22,-56 6,-54 L 0,-58 Q -16,-52 -30,-52 Z"),
                  fringe_shadow="M -44,2 Q -36,8 -30,4 Q -24,-2 -18,2 L -6,-12 L 6,-12 Q 18,2 24,-2 Q 32,8 44,2 L 44,-14 L -44,-14 Z",
                  body=simple_body("#6fa2d6", 0.86, collar="#f4f0e4", belt="#f0e8d0"))


def jenny():
    hair = "#b8582e"
    LOCKS = [(-40, -40, 150, 22, 13, 0.5), (-50, -16, 120, 26, 12, 0.6), (52, -16, 60, 26, 12, -0.6), (42, -40, 30, 22, 13, -0.5),
             (-30, -40, 105, 26, 11, 0.45), (-14, -44, 96, 26, 11, 0.45), (2, -46, 88, 24, 11, 0.45), (18, -44, 80, 26, 11, -0.45), (34, -40, 70, 24, 10, -0.45),
             (-48, 4, 100, 24, 10, 0.6), (50, 6, 80, 24, 10, -0.6)]
    def extra():
        return ""
    def front(h, hs, hh):
        bun = "M -24,-88 C -26,-122 26,-122 24,-88 C 22,-74 -22,-74 -24,-88 Z"
        return hair_mass(LOCKS, ["M -54,-28 C -54,-80 54,-80 54,-28 C 54,-6 -54,-6 -54,-28 Z", bun], h, 22,
                         ["M -20,-64 Q -16,-46 -12,-30", "M 8,-70 Q 6,-50 4,-32", "M -10,-106 Q 0,-96 10,-106"],
                         "M -38,-52 Q -18,-64 0,-58 L 8,-64 Q 20,-60 32,-58 L 40,-50 Q 22,-54 8,-52 L 0,-56 Q -16,-50 -30,-50 Z")
    return Figure(skin="#f8d4ae", hair=hair, iris="#7a4a28", eye_w=30, eye_h=33, blush=1.0, brow_ang=0.15, chin=58, jaw=1.06,
                  mouth=m_grin(), front_hair=front,
                  fringe_shadow="M -46,-2 Q -38,6 -30,0 Q -22,-6 -14,2 Q -6,-4 2,0 Q 10,-6 18,0 Q 26,-6 34,0 Q 40,-4 46,-2 L 46,-14 L -46,-14 Z",
                  body=simple_body("#e8b440", 1.0, apron="#fbf6ea", collar="#fbf6ea"))


def george():
    hair = "#2f2722"
    L, blob = short_hair([(-30, 230, 14), (-6, 258, 12), (18, 290, 14), (40, 320, 12)],
                         [(-34, 72, 34), (-18, 64, 36), (-2, 58, 34), (14, 52, 30), (30, 46, 24)], (34, 9), -76)
    return Figure(skin="#ecc8a4", hair=hair, iris="#5a4632", eye_w=30, eye_h=34, brow_ang=0.6, look=(-0.3, 0.1), chin=63, jaw=0.94,
                  mouth=m_o(),
                  front_hair=lambda h, hs, hh: hair_mass(L, [blob], h, 24, ["M -20,-66 Q -10,-50 0,-36", "M 4,-70 Q 14,-52 22,-36"],
                                                         "M -38,-50 Q -18,-62 0,-58 L 8,-64 Q 20,-60 32,-58 L 40,-50 Q 22,-54 8,-52 L 0,-56 Q -16,-50 -30,-50 Z"),
                  fringe_shadow="M -46,-10 Q -30,-2 -14,4 Q 4,8 20,2 Q 34,-2 46,-8 L 46,-16 L -46,-16 Z",
                  body=simple_body("#6c707a", 0.82, collar="#5a5e68", belt="#2a2420"))


def baron():
    hair = "#5e3c24"
    L, blob = short_hair([(-30, 230, 14), (-6, 262, 12), (18, 292, 14), (40, 322, 12)], [(-28, 104, 16), (-10, 94, 18), (8, 86, 18), (26, 76, 16)], (26, 10), -74)
    def beard():
        b = hair; bs = shade(b, -0.3)
        o = [P(spiky([(-50, -2), (-52, 34), (-44, 66), (-28, 94), (-8, 108), (10, 108), (30, 94), (46, 66), (52, 34), (50, -2), (36, 30), (20, 44), (0, 46), (-20, 44), (-36, 30)],
                     0.12, (0, 50)), b, sw=2.4)]
        o.append(P(spiky([(50, -2), (52, 34), (46, 66), (30, 94), (10, 108), (24, 70), (36, 36)], 0.12, (34, 50)), bs, "none"))
        for d in ["M -26,60 Q -20,78 -16,96", "M 0,56 Q 0,80 -2,104", "M 24,60 Q 20,78 16,94"]: o.append(P(d, stroke=bs, sw=1.6))
        o.append(P("M -1,38 C -10,34 -28,38 -32,48 C -24,44 -12,44 -1,44 Z", b, sw=2)); o.append(P("M 1,38 C 10,34 28,38 32,48 C 24,44 12,44 1,44 Z", b, sw=2))
        return "".join(o)
    return Figure(skin="#efb88f", hair=hair, iris="#5a3a20", eye_w=27, eye_h=26, lid=0.15, blush=0.6, brow_ang=0.25, brow_t=5, jaw=1.15, chin=64,
                  mouth=m_smile(9), beard=beard,
                  front_hair=lambda h, hs, hh: hair_mass(L, [blob], h, 24, ["M -16,-64 Q -12,-46 -10,-30"]),
                  fringe_shadow="M -46,-8 Q -30,0 -14,-4 Q 4,2 20,-2 Q 34,2 46,-6 L 46,-16 L -46,-16 Z",
                  body=simple_body("#8a1e22", 1.4, trim="#d8b048", collar="#d8b048"))


def rodney():
    hair = "#2b221c"
    L, blob = short_hair([(-30, 232, 12), (-6, 262, 10), (18, 292, 12), (40, 322, 10)], [(-26, 100, 14), (-8, 92, 16), (10, 84, 16), (28, 74, 14)], (24, 9), -72)
    def beard():
        b = hair
        return (P("M -44,6 C -44,32 -32,54 -16,62 Q 0,68 16,62 C 32,54 44,32 44,6 C 40,26 30,40 18,46 Q 0,42 -18,46 C -30,40 -40,26 -44,6 Z", b, sw=2.2)
                + P("M -1,40 C -8,38 -18,40 -20,46 C -14,44 -8,44 -1,44 Z", b, sw=1.8) + P("M 1,40 C 8,38 18,40 20,46 C 14,44 8,44 1,44 Z", b, sw=1.8))
    def body():
        o = [torso("#9aa2ac", 1.28)]
        for y in range(110, 272, 12):
            o.append(P(f"M -100,{y} Q 0,{y + 8} 100,{y}", stroke="#7a828c", sw=1.2))
        o.append(P("M -50,96 Q 0,110 50,96 L 54,272 L -54,272 Z", "#3a4a72", sw=2.4))
        o.append(P("M -16,140 L 16,140 L 0,180 Z", "#d8b048", sw=1.8))
        return "".join(o)
    return Figure(skin="#d9a47a", hair=hair, iris="#3a3a3a", eye_w=28, eye_h=25, lid=0.25, sharp=0.35, scar=True, brow_ang=-0.45, brow_t=5.2, jaw=1.14, chin=62,
                  mouth=m_flat(), beard=beard,
                  front_hair=lambda h, hs, hh: hair_mass(L, [blob], h, 24, []),
                  fringe_shadow="M -46,-10 Q -30,-2 -14,-6 Q 4,0 20,-4 Q 34,0 46,-8 L 46,-16 L -46,-16 Z", body=body)


def pauline():
    hair = "#aeb2c4"
    LOCKS = [(-40, -36, 115, 28, 12, 0.2), (-20, -44, 60, 34, 11, -0.4), (6, -46, 40, 34, 11, -0.5), (30, -42, 30, 26, 11, -0.4),
             (-50, -12, 100, 46, 7, 0.2), (52, -10, 80, 46, 7, -0.2)]
    def front(h, hs, hh):
        bun = "M -30,-70 C -40,-104 20,-110 30,-84 C 34,-70 -20,-60 -30,-70 Z"
        return hair_mass(LOCKS, ["M -54,-28 C -54,-80 54,-80 54,-28 C 54,-8 -54,-8 -54,-28 Z", bun], h, 22, ["M -30,-60 Q 0,-70 30,-56", "M -20,-90 Q 0,-96 20,-84"],
                         "M -38,-52 Q -18,-64 0,-58 L 8,-64 Q 20,-60 32,-58 L 40,-50 Q 22,-54 8,-52 L 0,-56 Q -16,-50 -30,-50 Z")
    return Figure(skin="#f4e0cc", hair=hair, iris="#5a7088", eye_w=28, eye_h=28, lid=0.3, lash=1.4, brow_col="#8a8ea0", chin=60, jaw=0.96,
                  mouth=m_smile(5), front_hair=front,
                  fringe_shadow="M -46,-12 Q -30,-4 -14,-10 Q 4,-14 20,-8 Q 34,-4 46,-10 L 46,-16 L -46,-16 Z",
                  body=simple_body("#8f97a6", 0.86, collar="#eceef4"))


def chubb():
    hair = "#4a3a2a"
    def front(h, hs, hh):
        o = [hair_mass([(-40, -30, 110, 20, 12, 0.1), (-20, -34, 98, 20, 11, 0.1), (0, -36, 90, 20, 11, 0), (20, -34, 82, 20, 11, -0.1), (40, -30, 70, 20, 12, -0.1)],
                       ["M -52,-26 C -52,-56 52,-56 52,-26 C 52,-10 -52,-10 -52,-26 Z"], h, 24)]
        o.append(P("M -50,-40 L -48,-62 L 48,-62 L 50,-40 Q 0,-34 -50,-40 Z", "#f6f2ea", sw=2.4))   # hat band
        o.append(P("M -56,-60 C -80,-110 -30,-150 0,-128 C 30,-150 80,-110 56,-60 Z", "#ffffff", sw=2.4))  # puffy top
        o.append(P("M 20,-120 C 44,-124 66,-100 56,-62 L 30,-62 Z", "#e6e2da", "none"))
        return "".join(o)
    def extra():  # ladle raised over his shoulder
        return P("M 84,150 L 120,-40", stroke="#8a6040", sw=7) + P("M 104,-56 C 104,-84 140,-84 140,-56 C 140,-36 104,-36 104,-56 Z", "#a07850", sw=2.4)
    return Figure(skin="#f2b48e", hair=hair, iris="#4a3020", eye_w=26, eye_h=24, sharp=0.2, blush=1.0, brow_ang=-0.7, brow_t=5.4, jaw=1.2, chin=60,
                  mouth=P("M -10,48 Q 0,42 10,48", sw=2.4), front_hair=front, extra=extra,
                  fringe_shadow="M -46,-6 Q -30,2 -14,-2 Q 4,4 20,-2 Q 34,2 46,-4 L 46,-14 L -46,-14 Z",
                  body=simple_body("#f6f2ea", 1.3, apron="#ffffff"))


def nigel():
    hair = "#8e8680"
    def front(h, hs, hh):
        o = [hair_mass([(-50, -16, 120, 24, 11, 0.3), (-52, 0, 110, 22, 10, 0.3), (52, -14, 60, 24, 11, -0.3), (54, 2, 70, 22, 10, -0.3)], [], h, 40)]
        for sx in (-1, 1):  # spectacles
            o.append(f'<circle cx="{sx*20}" cy="14" r="17" fill="rgba(220,235,255,0.18)" stroke="#3a3024" stroke-width="2.4"/>')
        o.append(P("M -3,12 Q 0,9 3,12", stroke="#3a3024", sw=2.4))
        o.append(P("M -24,-40 Q 0,-48 24,-40", stroke=shade("#ecd0b4", -0.25), sw=1.6))  # shine on the bald crown
        return "".join(o)
    return Figure(skin="#ecd0b4", hair=hair, iris="#4a4a4a", eye_w=24, eye_h=22, lid=0.35, brow_ang=0.1, brow_col="#6a6460", chin=66, jaw=0.9,
                  mouth=m_smirk(), front_hair=front, body=simple_body("#26242e", 0.84, collar="#e6e2d4"))


def morgarath():
    hair = "#f2f0ea"
    LOCKS = [(-48, -20, 98, 150, 13, 0.03), (50, -18, 82, 148, 13, -0.03), (-34, -38, 100, 54, 11, 0.06), (-16, -44, 94, 50, 11, 0.03),
             (4, -46, 88, 46, 11, 0), (22, -42, 82, 50, 11, -0.04), (38, -36, 76, 56, 11, -0.06), (-30, -60, 232, 12, 14, 0.1), (28, -60, 308, 12, 14, -0.1)]
    def back(h, hs, hh):
        return hair_mass([(-56, -10, 95, 250, 24, 0.0), (58, -10, 85, 250, 24, 0.0), (0, -20, 90, 240, 34, 0)], [], hs)
    return Figure(skin="#ece6e0", hair=hair, iris="#8ab8e8", eye_w=28, eye_h=22, lid=0.35, sharp=0.75, lash=1.3, brow_ang=-0.55, brow_col="#c8c4bc", chin=66, jaw=0.92,
                  mouth=P("M -8,48 Q 2,50 10,44", sw=2.2), back_hair=back,
                  front_hair=lambda h, hs, hh: hair_mass(LOCKS, ["M -54,-30 C -54,-80 54,-80 54,-30 C 54,-6 -54,-6 -54,-30 Z"], h, 26,
                                                         ["M -10,-66 Q -12,-30 -14,10", "M 16,-66 Q 18,-30 20,10"]),
                  fringe_shadow="M -44,8 Q -34,14 -28,6 Q -20,14 -12,6 Q -4,14 4,4 Q 12,14 20,6 Q 28,14 36,6 Q 40,10 44,8 L 44,-14 L -44,-14 Z",
                  body=simple_body("#18151e", 1.0, collar="#3a2a4a"))


CAST = {"will": will, "halt": halt, "horace": horace, "alyss": alyss, "jenny": jenny, "george": george,
        "baron": baron, "rodney": rodney, "pauline": pauline, "chubb": chubb, "nigel": nigel, "morgarath": morgarath}


def label(x, y, name, sub):
    return (f'<text x="{x}" y="{y}" text-anchor="middle" font-family="Georgia, serif" font-size="30" font-weight="700" fill="#fff8e8" '
            f'stroke="#2b1a12" stroke-width="5" paint-order="stroke">{name}</text>'
            f'<text x="{x}" y="{y + 26}" text-anchor="middle" font-family="Georgia, serif" font-size="17" font-style="italic" fill="#fff4dc" '
            f'stroke="#2b1a12" stroke-width="4" paint-order="stroke">{sub}</text>')


def poster():
    o = []
    # background: sunset sky, Castle Redmont on its hill, the forest
    o.append('<path d="M 0,700 Q 480,600 960,640 T 1920,620 L 1920,1080 L 0,1080 Z" fill="#6a8a4a"/>')
    o.append('<path d="M 700,640 L 700,520 L 740,520 L 740,500 L 760,500 L 760,520 L 820,520 L 820,430 L 830,400 L 840,430 L 840,520 L 900,520 L 900,470 L 960,470 L 960,380 L 975,340 L 990,380 L 990,470 L 1060,470 L 1060,520 L 1120,520 L 1120,500 L 1140,500 L 1140,520 L 1180,520 L 1180,640 Z" fill="#7a5a6a" opacity="0.55"/>')
    for i in range(40):
        x = i * 50 - 10; h = 60 + (i * 37 % 40)
        o.append(f'<path d="M {x},{700 - h * 0.2} L {x + 25},{700 - h} L {x + 50},{700 - h * 0.2} Z" fill="#3e5a3a" opacity="0.8"/>')
    back = [("baron", 260, 330, 1.25, "BARON ARALD", "Lord of Redmont"), ("pauline", 540, 350, 1.15, "LADY PAULINE", "Diplomatic Service"),
            ("chubb", 800, 360, 1.2, "MASTER CHUBB", "Head Cook"), ("rodney", 1100, 330, 1.25, "SIR RODNEY", "Battlemaster"),
            ("nigel", 1380, 340, 1.15, "MASTER NIGEL", "Chief Scribe"), ("morgarath", 1690, 320, 1.25, "MORGARATH", "Lord of the Mountains")]
    front = [("jenny", 230, 680, 1.45, "JENNY", "Kitchens"), ("horace", 500, 670, 1.5, "HORACE", "Battleschool"),
             ("will", 790, 690, 1.55, "WILL", "the apprentice"), ("halt", 1110, 660, 1.6, "HALT", "Ranger of Redmont"),
             ("alyss", 1420, 680, 1.45, "ALYSS", "Diplomatic Service"), ("george", 1690, 690, 1.45, "GEORGE", "Scribeschool")]
    for k, x, y, sc, n, sub in back:
        if k == "morgarath":
            o.append(f'<ellipse cx="{x}" cy="{y + 120}" rx="200" ry="300" fill="#2a1a3a" opacity="0.45"/>')
        o.append(CAST[k]().svg(x, y, sc))
    o.append('<rect x="0" y="560" width="1920" height="520" fill="url(#fog)"/>')
    for k, x, y, sc, n, sub in front:
        o.append(CAST[k]().svg(x, y, sc))
    for k, x, y, sc, n, sub in back: o.append(label(x, y - 118 * sc - (55 if k == "chubb" else 0), n, sub))
    for k, x, y, sc, n, sub in front: o.append(label(x, 1050, n, sub))
    o.append('<text x="960" y="90" text-anchor="middle" font-family="Georgia, serif" font-size="78" font-weight="700" letter-spacing="10" fill="#fff4d6" '
             'stroke="#2b1a12" stroke-width="8" paint-order="stroke">RANGER\'S APPRENTICE</text>')
    return "".join(o)


def doc(body, w=1920, h=1080):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">'
            '<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#36478a"/>'
            '<stop offset="0.55" stop-color="#e8907a"/><stop offset="1" stop-color="#ffd59a"/></linearGradient></defs>'
            f'<rect width="{w}" height="{h}" fill="url(#sky)"/>{body}</svg>')


if __name__ == "__main__":
    name = sys.argv[1] if len(sys.argv) > 1 else "cast"
    if name == "cast":
        body = poster()
    else:
        body = CAST[name]().svg(960, 400, 3.0)
    out = os.path.join(HERE, f"{name}.svg")
    open(out, "w").write(doc(body))
    print("wrote", out)
