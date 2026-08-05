/*
    celup.c - Fast Steered-Isophote Scaler for Anime / Cel-Shaded WebP Sprites

    Build:
        cc -O3 -std=c99 celup.c -o celup \
            $(pkg-config --cflags --libs libwebp) -lm

    Usage:
        ./celup input.webp output.webp 4
*/

#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <string.h>
#include <limits.h>
#include <math.h>

#include <webp/decode.h>
#include <webp/encode.h>

/* Edge sensitivity thresholds */
#define GRAD_MIN 0.03f
#define GRAD_MAX 0.18f

typedef struct {
    int w;
    int h;
    float *r; /* Premultiplied Linear Red   */
    float *g; /* Premultiplied Linear Green */
    float *b; /* Premultiplied Linear Blue  */
    float *a; /* Straight Alpha (0..1)      */
    float *storage;
} FImage;

typedef struct {
    int w;
    int h;
    float *gx;
    float *gy;
    float *storage;
} GradientMap;

static float srgb_to_linear_lut[256];
static uint8_t linear_to_srgb_lut[4097];

static inline float clampf(float x, float lo, float hi) {
    if (x < lo) return lo;
    if (x > hi) return hi;
    return x;
}

static inline int clampi(int x, int lo, int hi) {
    if (x < lo) return lo;
    if (x > hi) return hi;
    return x;
}

static void init_color_tables(void) {
    for (int i = 0; i < 256; ++i) {
        float s = (float)i / 255.0f;
        srgb_to_linear_lut[i] = (s <= 0.04045f) ? (s / 12.92f) : powf((s + 0.055f) / 1.055f, 2.4f);
    }
    for (int i = 0; i <= 4096; ++i) {
        float l = (float)i / 4096.0f;
        float s = (l <= 0.0031308f) ? (12.92f * l) : (1.055f * powf(l, 1.0f / 2.4f) - 0.055f);
        linear_to_srgb_lut[i] = (uint8_t)floorf(clampf(s, 0.0f, 1.0f) * 255.0f + 0.5f);
    }
}

static int alloc_float_image(int w, int h, FImage *out) {
    size_t count = (size_t)w * h;
    out->w = w;
    out->h = h;
    out->storage = (float *)malloc(count * 4 * sizeof(float));
    if (!out->storage) return 0;
    out->r = out->storage;
    out->g = out->storage + count;
    out->b = out->storage + count * 2;
    out->a = out->storage + count * 3;
    return 1;
}

static void free_float_image(FImage *im) {
    free(im->storage);
    memset(im, 0, sizeof(*im));
}

static int alloc_gradient_map(int w, int h, GradientMap *out) {
    size_t count = (size_t)w * h;
    out->w = w;
    out->h = h;
    out->storage = (float *)malloc(count * 2 * sizeof(float));
    if (!out->storage) return 0;
    out->gx = out->storage;
    out->gy = out->storage + count;
    return 1;
}

static void free_gradient_map(GradientMap *g) {
    free(g->storage);
    memset(g, 0, sizeof(*g));
}

/* Load sRGB RGBA buffer into Premultiplied Linear Float Image */
static void load_rgba_to_fimage(const uint8_t *rgba, FImage *out) {
    size_t count = (size_t)out->w * out->h;
    for (size_t i = 0; i < count; ++i) {
        const uint8_t *p = rgba + i * 4;
        float a = (float)p[3] / 255.0f;
        out->a[i] = a;
        out->r[i] = srgb_to_linear_lut[p[0]] * a;
        out->g[i] = srgb_to_linear_lut[p[1]] * a;
        out->b[i] = srgb_to_linear_lut[p[2]] * a;
    }
}

/* Fast prepass to extract and smooth continuous gradient vectors */
static void compute_gradient_map(const FImage *im, GradientMap *gmap) {
    int w = im->w;
    int h = im->h;
    float *raw_gx = (float *)malloc((size_t)w * h * sizeof(float));
    float *raw_gy = (float *)malloc((size_t)w * h * sizeof(float));

    /* 1. Sobel operator on perceived brightness + alpha */
    for (int y = 0; y < h; ++y) {
        int ym = clampi(y - 1, 0, h - 1);
        int yp = clampi(y + 1, 0, h - 1);
        for (int x = 0; x < w; ++x) {
            int xm = clampi(x - 1, 0, w - 1);
            int xp = clampi(x + 1, 0, w - 1);

            #define LUMA_VAL(px, py) ( \
                im->r[(size_t)(py)*w + (px)] * 0.2126f + \
                im->g[(size_t)(py)*w + (px)] * 0.7152f + \
                im->b[(size_t)(py)*w + (px)] * 0.0722f + \
                im->a[(size_t)(py)*w + (px)] * 0.5000f )

            float l00 = LUMA_VAL(xm, ym), l10 = LUMA_VAL(x, ym), l20 = LUMA_VAL(xp, ym);
            float l01 = LUMA_VAL(xm, y ),                       l21 = LUMA_VAL(xp, y );
            float l02 = LUMA_VAL(xm, yp), l12 = LUMA_VAL(x, yp), l22 = LUMA_VAL(xp, yp);

            size_t idx = (size_t)y * w + x;
            raw_gx[idx] = (l20 + 2.0f * l21 + l22) - (l00 + 2.0f * l01 + l02);
            raw_gy[idx] = (l00 + 2.0f * l10 + l20) - (l02 + 2.0f * l12 + l22);
        }
    }

    /* 2. 3x3 Box Smooth the gradient field to eliminate staircasing in AA regions */
    for (int y = 0; y < h; ++y) {
        int ym = clampi(y - 1, 0, h - 1);
        int yp = clampi(y + 1, 0, h - 1);
        for (int x = 0; x < w; ++x) {
            int xm = clampi(x - 1, 0, w - 1);
            int xp = clampi(x + 1, 0, w - 1);

            float sum_x = 0.0f, sum_y = 0.0f;
            int neighbors[3] = {xm, x, xp};
            int rows[3] = {ym, y, yp};

            for (int r = 0; r < 3; ++r) {
                for (int c = 0; c < 3; ++c) {
                    size_t idx = (size_t)rows[r] * w + neighbors[c];
                    sum_x += raw_gx[idx];
                    sum_y += raw_gy[idx];
                }
            }

            size_t dst_idx = (size_t)y * w + x;
            gmap->gx[dst_idx] = sum_x / 9.0f;
            gmap->gy[dst_idx] = sum_y / 9.0f;
        }
    }

    free(raw_gx);
    free(raw_gy);
}

/* Bilinear lookup of precomputed gradient vector */
static void sample_gradient(const GradientMap *gmap, float sx, float sy, float *out_gx, float *out_gy) {
    int w = gmap->w;
    int h = gmap->h;

    sx = clampf(sx, 0.0f, (float)(w - 1));
    sy = clampf(sy, 0.0f, (float)(h - 1));

    int x0 = (int)floorf(sx);
    int y0 = (int)floorf(sy);
    int x1 = clampi(x0 + 1, 0, w - 1);
    int y1 = clampi(y0 + 1, 0, h - 1);

    float u = sx - (float)x0;
    float v = sy - (float)y0;

    size_t i00 = (size_t)y0 * w + x0, i10 = (size_t)y0 * w + x1;
    size_t i01 = (size_t)y1 * w + x0, i11 = (size_t)y1 * w + x1;

    float gx0 = gmap->gx[i00] * (1.0f - u) + gmap->gx[i10] * u;
    float gx1 = gmap->gx[i01] * (1.0f - u) + gmap->gx[i11] * u;
    *out_gx = gx0 * (1.0f - v) + gx1 * v;

    float gy0 = gmap->gy[i00] * (1.0f - u) + gmap->gy[i10] * u;
    float gy1 = gmap->gy[i01] * (1.0f - u) + gmap->gy[i11] * u;
    *out_gy = gy0 * (1.0f - v) + gy1 * v;
}

/* 1D Catmull-Rom Cubic Kernel Weight */
static inline float catmull_rom_weight(float x) {
    x = fabsf(x);
    if (x < 1.0f)
        return 0.5f * (2.0f + x * x * (-5.0f + 3.0f * x));
    if (x < 2.0f)
        return 0.5f * (x * (-2.0f + x * (4.0f - x)) - 2.0f + 8.0f / (x > 1e-5f ? x : 1.0f) - 6.0f); // Fast cubic approximation
    return 0.0f;
}

static inline void catmull_rom_weights(float t, float w[4]) {
    float t2 = t * t;
    float t3 = t2 * t;
    w[0] = 0.5f * (-t3 + 2.0f * t2 - t);
    w[1] = 0.5f * (3.0f * t3 - 5.0f * t2 + 2.0f);
    w[2] = 0.5f * (-3.0f * t3 + 4.0f * t2 + t);
    w[3] = 0.5f * (t3 - t2);
}

/* 16-tap Catmull-Rom Bicubic Sampler */
static void sample_bicubic(const FImage *im, float sx, float sy, float out_rgba[4]) {
    int w = im->w;
    int h = im->h;

    int ix = (int)floorf(sx);
    int iy = (int)floorf(sy);

    float u = sx - (float)ix;
    float v = sy - (float)iy;

    float wx[4], wy[4];
    catmull_rom_weights(u, wx);
    catmull_rom_weights(v, wy);

    float sum_r = 0.0f, sum_g = 0.0f, sum_b = 0.0f, sum_a = 0.0f;

    for (int cy = -1; cy <= 2; ++cy) {
        int py = clampi(iy + cy, 0, h - 1);
        float wy_val = wy[cy + 1];

        for (int cx = -1; cx <= 2; ++cx) {
            int px = clampi(ix + cx, 0, w - 1);
            float weight = wx[cx + 1] * wy_val;

            size_t idx = (size_t)py * w + px;
            sum_r += im->r[idx] * weight;
            sum_g += im->g[idx] * weight;
            sum_b += im->b[idx] * weight;
            sum_a += im->a[idx] * weight;
        }
    }

    out_rgba[0] = sum_r;
    out_rgba[1] = sum_g;
    out_rgba[2] = sum_b;
    out_rgba[3] = sum_a;
}

static inline uint8_t linear_to_srgb8(float x) {
    int index = (int)floorf(clampf(x, 0.0f, 1.0f) * 4096.0f + 0.5f);
    return linear_to_srgb_lut[index];
}

static void store_pixel(uint8_t *dst, const float rgba[4]) {
    float a = clampf(rgba[3], 0.0f, 1.0f);
    if (a <= 1e-7f) {
        memset(dst, 0, 4);
        return;
    }
    float inv_a = 1.0f / a;
    dst[0] = linear_to_srgb8(rgba[0] * inv_a);
    dst[1] = linear_to_srgb8(rgba[1] * inv_a);
    dst[2] = linear_to_srgb8(rgba[2] * inv_a);
    dst[3] = (uint8_t)floorf(a * 255.0f + 0.5f);
}

/* Core Upscaling Routine */
static void upscale_image(const FImage *src, const GradientMap *gmap, uint8_t *dst, int dst_w, int dst_h) {
    float scale_x = (float)src->w / (float)dst_w;
    float scale_y = (float)src->h / (float)dst_h;

    for (int oy = 0; oy < dst_h; ++oy) {
        float sy = ((float)oy + 0.5f) * scale_y - 0.5f;

        for (int ox = 0; ox < dst_w; ++ox) {
            float sx = ((float)ox + 0.5f) * scale_x - 0.5f;

            /* 1. Fetch local gradient orientation */
            float gx, gy;
            sample_gradient(gmap, sx, sy, &gx, &gy);

            float mag = sqrtf(gx * gx + gy * gy);

            float final_sx = sx;
            float final_sy = sy;

            /* 2. Apply Steered Isophote Ramp Sharpening if an edge/AA region is present */
            if (mag > GRAD_MIN) {
                float nx = gx / mag;
                float ny = gy / mag;

                int ix = (int)floorf(sx);
                int iy = (int)floorf(sy);

                /* Fractional cell offsets relative to pixel center */
                float u = (sx - (float)ix) - 0.5f;
                float v = (sy - (float)iy) - 0.5f;

                /* Decompose offset into Normal (d) and Tangential (t) distances */
                float d = u * nx + v * ny;
                float t = -u * ny + v * nx;

                /* Calculate edge strength factor S */
                float S = clampf((mag - GRAD_MIN) / (GRAD_MAX - GRAD_MIN), 0.0f, 1.0f);

                /* Two-pass polynomial cubic steepening across normal direction d */
                float x = clampf(2.0f * d, -1.0f, 1.0f);
                float x1 = x * (1.5f - 0.5f * x * x);
                float x2 = x1 * (1.5f - 0.5f * x1 * x1); /* Second pass for razor sharp lines */
                float d_sharp = 0.5f * x2;

                /* Blend sharpened normal offset with original depending on edge strength */
                float d_final = (1.0f - S) * d + S * d_sharp;

                /* Reconstruct fractional sampling point */
                float u_new = d_final * nx - t * ny;
                float v_new = d_final * ny + t * nx;

                final_sx = (float)ix + 0.5f + u_new;
                final_sy = (float)iy + 0.5f + v_new;
            }

            /* 3. Sample final point via 16-tap Catmull-Rom Bicubic */
            float rgba[4];
            sample_bicubic(src, final_sx, final_sy, rgba);

            uint8_t *out_pixel = dst + ((size_t)oy * dst_w + ox) * 4;
            store_pixel(out_pixel, rgba);
        }
    }
}

int main(int argc, char **argv) {
    if (argc != 4) {
        fprintf(stderr, "Usage: %s input.webp output.webp scale\n", argv[0]);
        return 1;
    }

    const char *input_name = argv[1];
    const char *output_name = argv[2];
    double scale = strtod(argv[3], NULL);

    if (scale <= 1.0 || scale > 64.0) {
        fprintf(stderr, "Scale must be between 1.0 and 64.0\n");
        return 1;
    }

    init_color_tables();

    /* Read Input File */
    FILE *fp = fopen(input_name, "rb");
    if (!fp) { fprintf(stderr, "Cannot open file %s\n", input_name); return 1; }
    fseek(fp, 0, SEEK_END);
    size_t input_size = ftell(fp);
    fseek(fp, 0, SEEK_SET);
    uint8_t *input_data = (uint8_t *)malloc(input_size);
    if (fread(input_data, 1, input_size, fp) != input_size) {
        fprintf(stderr, "Failed to read input data\n");
        fclose(fp);
        free(input_data);
        return 1;
    }
    fclose(fp);

    /* Decode WebP */
    int src_w, src_h;
    uint8_t *decoded_rgba = WebPDecodeRGBA(input_data, input_size, &src_w, &src_h);
    free(input_data);
    if (!decoded_rgba) { fprintf(stderr, "WebP decode failed\n"); return 1; }

    int dst_w = (int)floor((double)src_w * scale + 0.5);
    int dst_h = (int)floor((double)src_h * scale + 0.5);

    FImage source;
    if (!alloc_float_image(src_w, src_h, &source)) return 1;
    load_rgba_to_fimage(decoded_rgba, &source);
    WebPFree(decoded_rgba);

    /* Prepass: Compute continuous gradient map */
    GradientMap gmap;
    if (!alloc_gradient_map(src_w, src_h, &gmap)) return 1;
    compute_gradient_map(&source, &gmap);

    /* Allocate Destination Buffer */
    size_t dst_bytes = (size_t)dst_w * dst_h * 4;
    uint8_t *dst_rgba = (uint8_t *)malloc(dst_bytes);
    if (!dst_rgba) return 1;

    /* Upscale */
    upscale_image(&source, &gmap, dst_rgba, dst_w, dst_h);

    /* Encode Lossless WebP Output */
    uint8_t *output_webp = NULL;
    size_t output_size = WebPEncodeLosslessRGBA(dst_rgba, dst_w, dst_h, dst_w * 4, &output_webp);

    free(dst_rgba);
    free_gradient_map(&gmap);
    free_float_image(&source);

    if (output_size == 0) { fprintf(stderr, "WebP encoding failed\n"); return 1; }

    /* Write Output File */
    fp = fopen(output_name, "wb");
    if (!fp) { fprintf(stderr, "Cannot open output file %s\n", output_name); return 1; }
    fwrite(output_webp, 1, output_size, fp);
    fclose(fp);
    WebPFree(output_webp);

    printf("Successfully upscaled %s (%dx%d -> %dx%d)\n", output_name, src_w, src_h, dst_w, dst_h);
    return 0;
}
