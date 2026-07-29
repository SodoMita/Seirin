/*
 * upscale_filter.c — plain-C bicubic upscale + light sharpen/saturation
 * pass for VN sprites. No GPU, no GLSL, no browser: this replaces both the
 * earlier ImageMagick bash pipeline (tools/flatcel_finish.sh's old body)
 * AND an abandoned GLSL/EGL/SwiftShader attempt — that attempt hit ANGLE's
 * Vulkan backend needing VK_EXT_headless_surface, which this sandbox's
 * software Vulkan ICD does not provide, and debugging a whole Vulkan/ANGLE
 * stack just to run one fragment shader was not worth it next to a ~150
 * line C loop that does the exact same math directly on pixels.
 *
 * Order of operations (per this project's own spec, see
 * ai_agent_docs/skills/seirin-character-art/references/sprite-spec.md and
 * the regression recorded in tools/_gl_upscale_retired_notes.md): run this
 * on the still-OPAQUE source image first. Alpha/background removal is a
 * separate later step (matte_floodfill.c) run on this program's output, at
 * final resolution — never the other way around, or the resize filter
 * blends transparent pixels' arbitrary RGB into opaque edges (fringing).
 *
 * Algorithm, per output pixel:
 *   1. Catmull-Rom bicubic resample (4x4 tap kernel, separable weights) —
 *      sharper than bilinear, closer to Lanczos than a naive box filter,
 *      cheap enough for a plain scalar C loop at these resolutions.
 *   2. Unsharp mask: subtract a 3x3 box blur of the *upscaled* image from
 *      itself and add the difference back, scaled by --sharpen.
 *   3. Saturation lift: luma-preserving mix toward the original color by
 *      --saturation (1.0 = no change).
 *
 * Usage:
 *   upscale_filter <in.png> <out.png> <target_height> [sharpen=0.6] [saturation=1.06]
 *
 * Build: gcc -O2 -o upscale_filter upscale_filter.c -lm
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>

#define STB_IMAGE_IMPLEMENTATION
#include "stb_image.h"
#define STB_IMAGE_WRITE_IMPLEMENTATION
#include "stb_image_write.h"

typedef struct { float r, g, b, a; } Pixel;

static inline float clampf(float v, float lo, float hi) {
    return v < lo ? lo : (v > hi ? hi : v);
}

/* Catmull-Rom 1D cubic weights for fractional offset t in [0,1). */
static void cubic_weights(float t, float w[4]) {
    float t2 = t * t, t3 = t2 * t;
    w[0] = -0.5f * t3 + 1.0f * t2 - 0.5f * t;
    w[1] =  1.5f * t3 - 2.5f * t2 + 1.0f;
    w[2] = -1.5f * t3 + 2.0f * t2 + 0.5f * t;
    w[3] =  0.5f * t3 - 0.5f * t2;
}

static inline Pixel fetch(const unsigned char *src, int w, int h, int x, int y) {
    if (x < 0) x = 0; if (x >= w) x = w - 1;
    if (y < 0) y = 0; if (y >= h) y = h - 1;
    const unsigned char *p = src + ((size_t)y * w + x) * 4;
    Pixel px = { p[0] / 255.0f, p[1] / 255.0f, p[2] / 255.0f, p[3] / 255.0f };
    return px;
}

static Pixel sample_bicubic(const unsigned char *src, int sw, int sh, float u, float v) {
    float fx = u * sw - 0.5f;
    float fy = v * sh - 0.5f;
    int ix = (int)floorf(fx);
    int iy = (int)floorf(fy);
    float tx = fx - ix;
    float ty = fy - iy;
    float wx[4], wy[4];
    cubic_weights(tx, wx);
    cubic_weights(ty, wy);

    Pixel result = {0, 0, 0, 0};
    for (int j = -1; j <= 2; j++) {
        Pixel row = {0, 0, 0, 0};
        for (int i = -1; i <= 2; i++) {
            Pixel s = fetch(src, sw, sh, ix + i, iy + j);
            float wxi = wx[i + 1];
            row.r += s.r * wxi; row.g += s.g * wxi;
            row.b += s.b * wxi; row.a += s.a * wxi;
        }
        float wyj = wy[j + 1];
        result.r += row.r * wyj; result.g += row.g * wyj;
        result.b += row.b * wyj; result.a += row.a * wyj;
    }
    result.r = clampf(result.r, 0.0f, 1.0f);
    result.g = clampf(result.g, 0.0f, 1.0f);
    result.b = clampf(result.b, 0.0f, 1.0f);
    result.a = clampf(result.a, 0.0f, 1.0f);
    return result;
}

int main(int argc, char **argv) {
    if (argc < 4) {
        fprintf(stderr, "usage: %s <in.png> <out.png> <target_height> [sharpen=0.6] [saturation=1.06]\n", argv[0]);
        return 1;
    }
    const char *in_path = argv[1];
    const char *out_path = argv[2];
    int target_h = atoi(argv[3]);
    float sharpen = argc > 4 ? (float)atof(argv[4]) : 0.6f;
    float saturation = argc > 5 ? (float)atof(argv[5]) : 1.06f;

    int sw, sh, channels;
    unsigned char *src = stbi_load(in_path, &sw, &sh, &channels, 4);
    if (!src) {
        fprintf(stderr, "failed to load %s\n", in_path);
        return 1;
    }

    int dw = (int)((double)sw * target_h / sh + 0.5);
    int dh = target_h;

    unsigned char *dst = malloc((size_t)dw * dh * 4);
    if (!dst) { fprintf(stderr, "out of memory\n"); return 1; }

    /* Pass 1: bicubic resample into dst. */
    for (int y = 0; y < dh; y++) {
        float v = (y + 0.5f) / dh;
        for (int x = 0; x < dw; x++) {
            float u = (x + 0.5f) / dw;
            Pixel p = sample_bicubic(src, sw, sh, u, v);
            unsigned char *o = dst + ((size_t)y * dw + x) * 4;
            o[0] = (unsigned char)(p.r * 255.0f + 0.5f);
            o[1] = (unsigned char)(p.g * 255.0f + 0.5f);
            o[2] = (unsigned char)(p.b * 255.0f + 0.5f);
            o[3] = (unsigned char)(p.a * 255.0f + 0.5f);
        }
    }
    stbi_image_free(src);

    /* Pass 2: unsharp mask (3x3 box blur of dst, subtract, scale, add back).
     * RGB only — alpha is left as the plain resample result; sharpening
     * alpha would fatten/erode the silhouette, not sharpen it. */
    unsigned char *sharpened = malloc((size_t)dw * dh * 4);
    memcpy(sharpened, dst, (size_t)dw * dh * 4);
    if (sharpen > 0.0001f) {
        for (int y = 0; y < dh; y++) {
            for (int x = 0; x < dw; x++) {
                float sum[3] = {0, 0, 0};
                int n = 0;
                for (int dy = -1; dy <= 1; dy++) {
                    int yy = y + dy; if (yy < 0) yy = 0; if (yy >= dh) yy = dh - 1;
                    for (int dx = -1; dx <= 1; dx++) {
                        int xx = x + dx; if (xx < 0) xx = 0; if (xx >= dw) xx = dw - 1;
                        unsigned char *p = dst + ((size_t)yy * dw + xx) * 4;
                        sum[0] += p[0]; sum[1] += p[1]; sum[2] += p[2];
                        n++;
                    }
                }
                unsigned char *center = dst + ((size_t)y * dw + x) * 4;
                unsigned char *out = sharpened + ((size_t)y * dw + x) * 4;
                for (int c = 0; c < 3; c++) {
                    float blur = sum[c] / n;
                    float centerVal = center[c];
                    float v = centerVal + (centerVal - blur) * sharpen;
                    out[c] = (unsigned char)clampf(v, 0.0f, 255.0f);
                }
            }
        }
    }

    /* Pass 3: luma-preserving saturation lift. */
    if (fabsf(saturation - 1.0f) > 0.0001f) {
        for (size_t i = 0; i < (size_t)dw * dh; i++) {
            unsigned char *p = sharpened + i * 4;
            float r = p[0], g = p[1], b = p[2];
            float luma = 0.299f * r + 0.587f * g + 0.114f * b;
            float nr = luma + (r - luma) * saturation;
            float ng = luma + (g - luma) * saturation;
            float nb = luma + (b - luma) * saturation;
            p[0] = (unsigned char)clampf(nr, 0.0f, 255.0f);
            p[1] = (unsigned char)clampf(ng, 0.0f, 255.0f);
            p[2] = (unsigned char)clampf(nb, 0.0f, 255.0f);
        }
    }

    stbi_write_png(out_path, dw, dh, 4, sharpened, dw * 4);
    fprintf(stderr, "upscale_filter: %dx%d -> %dx%d (sharpen=%.2f saturation=%.2f) -> %s\n",
            sw, sh, dw, dh, sharpen, saturation, out_path);

    free(dst);
    free(sharpened);
    return 0;
}
