#!/usr/bin/env python3
"""Fail an episode whose world uses primitive props (user 2026-11-24: everything except the characters is a realistic model).

Usage: python scripts/real_props.py <slug>

Scans src/videos/<slug>/ for primitive geometry (three.js Box/Cylinder/Sphere/... geometries, kit box()/cyl() helpers).
Floors, walls, ceilings, terrain and roads may be primitives with a photo material: mark that line `// surface`.
Effects (bubbles, glows, smoke, speed lines) are not props: mark them `// effect`.
A story prop no CC0 library has (a bus, a phone), built from realistic parts with photo materials: `// modelled`.
"""
import os, re, sys

PRIM = re.compile(r"new (Box|Cylinder|Sphere|Cone|Torus|Capsule|Lathe|Extrude|Dodecahedron|Icosahedron)Geometry|\b(box|cyl|sphere|cone)\(")
OK = re.compile(r"//.*\b(surface|effect|modelled)\b")


def scan(root):
    bad = []
    for dp, _, fs in os.walk(root):
        for f in fs:
            if f.endswith((".ts", ".tsx")):
                p = os.path.join(dp, f)
                for n, line in enumerate(open(p, encoding="utf-8"), 1):
                    code = line.split("//")[0]
                    if PRIM.search(code) and not OK.search(line) and not re.match(r"\s*(import|export (const|function) (box|cyl|sphere|cone)\b)", code):
                        bad.append(f"{p}:{n}: {line.strip()[:110]}")
    return bad


if __name__ == "__main__":
    if "--selftest" in sys.argv:
        import tempfile
        d = tempfile.mkdtemp()
        open(os.path.join(d, "b.ts"), "w").write("a = box(1,2,3);\nb = box(9,0.1,9); // surface: floor\nc = new SphereGeometry(1); // effect: bubble\nimport { box } from 'x';\n")
        r = scan(d)
        assert len(r) == 1 and "a = box" in r[0], r
        print("real_props selftest ok")
        sys.exit(0)
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    bad = scan(f"src/videos/{sys.argv[1]}")
    for b in bad:
        print("PRIMITIVE PROP", b)
    print(f"real_props: {len(bad)} primitive prop line(s)" + (" (mark floors/walls // surface, effects // effect, replace the rest with realistic models)" if bad else ", all props are models"))
    sys.exit(1 if bad else 0)
