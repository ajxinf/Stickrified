#!/usr/bin/env python3
"""Fetch CC0 assets from Poly Haven (R26 asset library). Nothing is downloaded twice.

Usage:
  python scripts/polyhaven.py tex <id> [<id> ...] [--res 2k]   PBR texture: diffuse + normal (GL) at --res (default 1k;
                                                               2k for the 2K master, R26) + 1K ARM (AO/rough/metal)
  python scripts/polyhaven.py model <id> [<id> ...]   1K glTF model with its textures
  python scripts/polyhaven.py --selftest

Textures: diffuse -> assets/tex/<id>.jpg (raw; run scripts/tex_level.py to level it into public/tex/), normal and ARM ->
assets/tex/maps/<id>_nor.jpg / _arm.jpg, copied unchanged to public/tex/ (linear data: never levelled). public/tex/maps.json
lists which maps exist; kit build/photo.ts loads them next to the diffuse, so every photo() material gets relief and
roughness without a code change.
Models: assets/models/<id>/ (original download) -> public/models/<id>/ (served). public/models/index.json records each
model's bounding box (from the glTF accessors) so kit build/models.ts can place a collider before the file has loaded.
Every asset is CC0 (polyhaven.com/license); add the ids to assets/CREDITS.md (the script prints the line).
"""
import json
import os
import shutil
import sys
import urllib.request

import numpy as np

API = "https://api.polyhaven.com"
UA = {"User-Agent": "stickrified-asset-fetch"}


def get(url, dst=None, force=False):
    if dst and os.path.exists(dst) and not force:
        return dst
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120) as r:
        data = r.read()
    if dst is None:
        return json.loads(data)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    with open(dst, "wb") as f:
        f.write(data)
    return dst


def copy(src, dst):
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    if not os.path.exists(dst) or os.path.getmtime(dst) < os.path.getmtime(src):
        shutil.copy2(src, dst)


def tex(i, res="1k"):
    files = get(f"{API}/files/{i}")
    manifest = "public/tex/maps.json"
    m = json.load(open(manifest)) if os.path.exists(manifest) else {}
    redo = m.get(i, {}).get("res", "1k") != res  # a new resolution replaces the old files; same resolution never re-downloads
    get(files["Diffuse"][res]["jpg"]["url"], f"assets/tex/{i}.jpg", redo)
    have = {"res": res}
    for key, suffix, r in (("nor_gl", "nor", res), ("arm", "arm", "1k")):  # AO/roughness are low-frequency: 1K is enough
        if key in files:
            src = get(files[key][r]["jpg"]["url"], f"assets/tex/maps/{i}_{suffix}.jpg", redo and r == res)
            copy(src, f"public/tex/{i}_{suffix}.jpg")
            have[suffix] = True
    m[i] = have
    json.dump(m, open(manifest, "w"), indent=1, sort_keys=True)
    print(f"tex {i} ({res}): diffuse + {', '.join(k for k in have if k != 'res') or 'no maps'}")


def trs(node):
    """4x4 matrix of a glTF node (matrix, or translation * rotation(quaternion xyzw) * scale)."""
    if "matrix" in node:
        return np.array(node["matrix"], float).reshape(4, 4).T  # glTF stores column-major
    x, y, z, w = node.get("rotation", [0, 0, 0, 1])
    r = np.array([[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
                  [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
                  [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]])
    m = np.eye(4)
    m[:3, :3] = r * np.array(node.get("scale", [1, 1, 1]))
    m[:3, 3] = node.get("translation", [0, 0, 0])
    return m


def bbox(gltf):
    """Axis-aligned bounds of every mesh's POSITION accessor box (8 corners) through the full node hierarchy."""
    nodes = gltf.get("nodes", [])
    roots = gltf["scenes"][gltf.get("scene", 0)]["nodes"] if gltf.get("scenes") else range(len(nodes))
    pts = []

    def walk(i, parent):
        m = parent @ trs(nodes[i])
        if "mesh" in nodes[i]:
            for prim in gltf["meshes"][nodes[i]["mesh"]]["primitives"]:
                a = gltf["accessors"][prim["attributes"]["POSITION"]]
                for c in np.array(np.meshgrid(*zip(a["min"], a["max"]))).T.reshape(-1, 3):
                    pts.append((m @ np.append(c, 1))[:3])
        for ch in nodes[i].get("children", []):
            walk(ch, m)

    for r in roots:
        walk(r, np.eye(4))
    p = np.array(pts)
    return p.min(0).tolist(), p.max(0).tolist()


def node_boxes(gltf):
    """{root node name: [min, max]} for each scene root with geometry: kit models.ts unions the boxes of the part it keeps."""
    out = {}
    for r in gltf["scenes"][gltf.get("scene", 0)]["nodes"]:
        sub = dict(gltf, scenes=[{"nodes": [r]}], scene=0)
        try:
            lo, hi = bbox(sub)
        except ValueError:  # no mesh under this root (curves, empties)
            continue
        out[gltf["nodes"][r].get("name", str(r))] = [[round(v, 4) for v in lo], [round(v, 4) for v in hi]]
    return out


def model(i):
    g = get(f"{API}/files/{i}")["gltf"]["1k"]["gltf"]
    root = f"assets/models/{i}"
    main = get(g["url"], f"{root}/{i}.gltf")
    for rel, f in g["include"].items():
        get(f["url"], f"{root}/{rel}")
    for dirpath, _, names in os.walk(root):
        for n in names:
            src = os.path.join(dirpath, n)
            copy(src, os.path.join("public/models", i, os.path.relpath(src, root)))
    g = json.load(open(main))
    lo, hi = bbox(g)
    index = "public/models/index.json"
    m = json.load(open(index)) if os.path.exists(index) else {}
    m[i] = {"min": [round(v, 4) for v in lo], "max": [round(v, 4) for v in hi], "nodes": node_boxes(g)}
    json.dump(m, open(index, "w"), indent=1, sort_keys=True)
    print(f"model {i}: size {[round(h - l, 3) for l, h in zip(lo, hi)]} m")


if __name__ == "__main__":
    if "--selftest" in sys.argv:
        # a child rotated 90 deg about y under a parent moved +1 x and scaled 2: x/z swap, then scale and move
        q = 2 ** -0.5
        g = {"scenes": [{"nodes": [1]}], "nodes": [{"mesh": 0, "rotation": [0, q, 0, q]}, {"children": [0], "translation": [1, 0, 0], "scale": [2, 2, 2]}],
             "meshes": [{"primitives": [{"attributes": {"POSITION": 0}}]}],
             "accessors": [{"min": [-0.5, 0, -0.5], "max": [0.5, 1, 0.5]}]}
        g["accessors"][0] = {"min": [-0.5, 0, -0.25], "max": [0.5, 1, 0.25]}
        lo, hi = bbox(g)
        assert np.allclose(lo, [0.5, 0, -1]) and np.allclose(hi, [1.5, 2, 1]), (lo, hi)
        print("selftest ok")
        sys.exit()
    if len(sys.argv) < 3 or sys.argv[1] not in ("tex", "model"):
        print(__doc__)
        sys.exit(2)
    res = sys.argv[sys.argv.index("--res") + 1] if "--res" in sys.argv else "1k"
    kind, ids = sys.argv[1], [a for a in sys.argv[2:] if a not in ("--res", res)]
    for i in ids:
        tex(i, res) if kind == "tex" else model(i)
    print(f"CREDITS: Poly Haven {kind}s {', '.join(ids)} | https://polyhaven.com/a/<id> | CC0 1.0")
