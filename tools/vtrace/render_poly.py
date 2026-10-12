import re
import sys
from PIL import Image, ImageDraw


def render(svg_path, out_path, scale=1.0):
    s = open(svg_path).read()
    w = int(re.search(r'width="(\d+)"', s).group(1))
    h = int(re.search(r'height="(\d+)"', s).group(1))
    im = Image.new('RGB', (int(w * scale), int(h * scale)), (255, 255, 255))
    dr = ImageDraw.Draw(im)
    for tag in re.findall(r'<path d="([^"]*)" fill="([^"]*)"/>', s):
        d, fill = tag
        for sub in re.findall(r'M[^M]*', d):
            nums = re.findall(r'[Mlz]|-?\d+', sub)
            pts, x, y, i = [], 0, 0, 0
            while i < len(nums):
                t = nums[i]
                if t == 'M':
                    x, y = int(nums[i + 1]), int(nums[i + 2]); i += 3
                elif t == 'l':
                    x += int(nums[i + 1]); y += int(nums[i + 2]); i += 3
                else:
                    i += 1
                    continue
                pts.append((x * scale, y * scale))
            if len(pts) >= 3:
                dr.polygon(pts, fill=fill)
    im.save(out_path)


if __name__ == '__main__':
    render(sys.argv[1], sys.argv[2], float(sys.argv[3]) if len(sys.argv) > 3 else 1.0)
