import sys
import os
from PIL import Image

def align_and_triangulate(white_path, black_path, out_matted, alpha_out=None):
    w_img = Image.open(white_path)
    b_img = Image.open(black_path)
    
    if w_img.size != b_img.size:
        print(f"Resizing white {w_img.size} to match black {b_img.size}...")
        w_img = w_img.resize(b_img.size, Image.Resampling.LANCZOS)
        w_img.save(white_path)
        
    cmd = f"/home/user/Seirin/.venv_art/bin/python3 tools/triangulate_matte.py {white_path} {black_path} {out_matted}"
    if alpha_out:
        cmd += f" --alpha-out {alpha_out}"
        
    os.system(cmd)
    os.system(f"/home/user/Seirin/.venv_art/bin/python3 tools/check_matte.py {out_matted} --checks --report")

if __name__ == "__main__":
    if len(sys.argv) >= 4:
        align_and_triangulate(sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4] if len(sys.argv) > 4 else None)
