import re
import sys


def parse_path(d):
    """Return list of subpaths; each a list of (x, y) from M/C/L/Z (curve endpoints kept,
    control points sampled coarsely so curvature is not lost entirely)."""
    toks = re.findall(r'[MCLZmclz]|-?\d*\.?\d+(?:e-?\d+)?', d)
    subs, cur, i, cmd = [], [], 0, None
    x = y = 0.0
    while i < len(toks):
        t = toks[i]
        if t in 'MCLZmclz':
            cmd = t
            i += 1
            if cmd in 'Zz':
                if cur:
                    subs.append(cur)
                cur = []
            continue
        if cmd in 'Mm':
            x, y = float(toks[i]), float(toks[i + 1]); i += 2
            if cur:
                subs.append(cur)
            cur = [(x, y)]
            cmd = 'L'
        elif cmd in 'Ll':
            x, y = float(toks[i]), float(toks[i + 1]); i += 2
            cur.append((x, y))
        elif cmd in 'Cc':
            c1 = (float(toks[i]), float(toks[i + 1]))
            c2 = (float(toks[i + 2]), float(toks[i + 3]))
            p = (float(toks[i + 4]), float(toks[i + 5]))
            i += 6
            p0 = cur[-1] if cur else (x, y)
            for s in (0.25, 0.5, 0.75):
                u = 1 - s
                bx = u**3 * p0[0] + 3 * u * u * s * c1[0] + 3 * u * s * s * c2[0] + s**3 * p[0]
                by = u**3 * p0[1] + 3 * u * u * s * c1[1] + 3 * u * s * s * c2[1] + s**3 * p[1]
                cur.append((bx, by))
            cur.append(p)
            x, y = p
        else:
            i += 1
    if cur:
        subs.append(cur)
    return subs


def dp_loop(points, eps):
    """Simplify a closed loop: split at the point farthest from the start, then DP each half."""
    if len(points) < 4:
        return points
    x0, y0 = points[0]
    far, fi = -1.0, 0
    for k in range(1, len(points)):
        d = (points[k][0] - x0) ** 2 + (points[k][1] - y0) ** 2
        if d > far:
            far, fi = d, k
    a = dp(points[:fi + 1], eps)
    b = dp(points[fi:] + [points[0]], eps)
    return a[:-1] + b[:-1]


def dp(points, eps):
    if len(points) < 3:
        return points
    (x1, y1), (x2, y2) = points[0], points[-1]
    dx, dy = x2 - x1, y2 - y1
    norm = (dx * dx + dy * dy) ** 0.5 or 1e-9
    best, idx = -1.0, 0
    for k in range(1, len(points) - 1):
        px, py = points[k]
        d = abs(dy * px - dx * py + x2 * y1 - y2 * x1) / norm
        if d > best:
            best, idx = d, k
    if best > eps:
        left = dp(points[:idx + 1], eps)
        right = dp(points[idx:], eps)
        return left[:-1] + right
    return [points[0], points[-1]]


def area(poly):
    a = 0.0
    for k in range(len(poly)):
        x1, y1 = poly[k]
        x2, y2 = poly[(k + 1) % len(poly)]
        a += x1 * y2 - x2 * y1
    return abs(a) / 2


def to_d(poly):
    pts = [(round(x), round(y)) for x, y in poly]
    # drop consecutive duplicates after rounding
    clean = [pts[0]]
    for p in pts[1:]:
        if p != clean[-1]:
            clean.append(p)
    if len(clean) > 1 and clean[-1] == clean[0]:
        clean.pop()
    if len(clean) < 3:
        return ''
    out = ['M%d %d' % clean[0]]
    px, py = clean[0]
    for x, y in clean[1:]:
        out.append('l%d %d' % (x - px, y - py))
        px, py = x, y
    out.append('z')
    return ''.join(out)


def simplify(path_in, path_out, tol=1.2, min_area=6.0):
    s = open(path_in).read()
    head = re.search(r'<svg[^>]*>', s).group(0)
    w = re.search(r'width="(\d+)"', head).group(1)
    h = re.search(r'height="(\d+)"', head).group(1)
    body = []
    kept = 0
    for tag in re.findall(r'<path ([^>]*)/>', s):
        attrs = dict(re.findall(r'(\w[\w-]*)="([^"]*)"', tag))
        d = attrs.get('d', '')
        fill = attrs.get('fill', '#000000')
        tm = re.search(r'translate\(([-\d.]+),([-\d.]+)\)', attrs.get('transform', ''))
        tx, ty = (float(tm.group(1)), float(tm.group(2))) if tm else (0.0, 0.0)
        ds = []
        for sub in parse_path(d):
            if len(sub) < 3:
                continue
            sub = [(x + tx, y + ty) for x, y in sub]
            simp = dp_loop(sub, tol)
            if len(simp) < 3 or area(simp) < min_area:
                continue
            seg = to_d(simp)
            if seg:
                ds.append(seg)
        if ds:
            body.append('<path d="%s" fill="%s"/>' % (''.join(ds), fill.lower()))
            kept += 1
    svg = ('<svg xmlns="http://www.w3.org/2000/svg" width="%s" height="%s" viewBox="0 0 %s %s">%s</svg>'
           % (w, h, w, h, ''.join(body)))
    open(path_out, 'w').write(svg)
    return len(svg.encode('utf-8')), kept


if __name__ == '__main__':
    tol = float(sys.argv[3]) if len(sys.argv) > 3 else 1.2
    min_area = float(sys.argv[4]) if len(sys.argv) > 4 else 6.0
    size, kept = simplify(sys.argv[1], sys.argv[2], tol, min_area)
    print('bytes', size, 'paths kept', kept)
