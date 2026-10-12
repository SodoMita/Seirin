import sys, re, os
import numpy as np
from PIL import Image
import vtracer

SRC = 'characters/hana/_wip/42_light_flat_try1.png'


def kmeans(pts, k, iters=12, seed=3):
    rng = np.random.default_rng(seed)
    cent = pts[rng.choice(len(pts), k, replace=False)].astype(np.float64)
    for _ in range(iters):
        d = ((pts[:, None, :] - cent[None]) ** 2).sum(axis=2)
        lab = d.argmin(axis=1)
        for j in range(k):
            m = lab == j
            if m.any():
                cent[j] = pts[m].mean(axis=0)
    return cent.round().astype(np.uint8)


def prep(scale, k, bg_thresh):
    im = Image.open(SRC).convert('RGB')
    if scale != 1.0:
        im = im.resize((int(im.width * scale), int(im.height * scale)), Image.LANCZOS)
    a = np.asarray(im).astype(np.int32)
    figure = a.min(axis=2) < bg_thresh
    pts = a[figure].astype(np.float64)
    cent = kmeans(pts, k)
    out = np.zeros_like(a, dtype=np.uint8)  # background = black
    if figure.any():
        d = ((a[figure][:, None, :] - cent[None].astype(np.int32)) ** 2).sum(axis=2)
        out[figure] = cent[d.argmin(axis=1)]
    return Image.fromarray(out), cent


def trace(img, path_out, speckle, corner, length, prec):
    tmp = '/home/user/Seirin/characters/hana/_wip/_trace_in.png'
    img.save(tmp)
    vtracer.convert_image_to_svg_py(
        tmp, path_out,
        colormode='color', hierarchical='stacked', mode='spline',
        filter_speckle=speckle, color_precision=6, layer_difference=24,
        corner_threshold=corner, length_threshold=length,
        max_iterations=10, splice_threshold=45, path_precision=prec)
    # drop the black background layer: the figure is what remains
    s = open(path_out).read()
    s2 = re.sub(r'<path[^>]*fill="#000000"[^>]*/>\s*', '', s)
    open(path_out, 'w').write(s2)
    return os.path.getsize(path_out)


if __name__ == '__main__':
    scale = float(sys.argv[1]); k = int(sys.argv[2]); thresh = int(sys.argv[3])
    speckle = int(sys.argv[4]); corner = int(sys.argv[5]); length = float(sys.argv[6]); prec = int(sys.argv[7])
    out = sys.argv[8]
    img, cent = prep(scale, k, thresh)
    size = trace(img, out, speckle, corner, length, prec)
    print('bytes', size, 'size', img.size, 'palette', [('#%02X%02X%02X' % tuple(c)) for c in cent])
