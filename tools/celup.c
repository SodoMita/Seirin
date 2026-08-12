/*
    celup.c - edge-aware scaler for anime/cel-shaded WebP sprites

    Build:
        cc -O3 -std=c99 celup.c -o celup \
            $(pkg-config --cflags --libs libwebp) -lm

    Usage:
        ./celup input.webp output.webp 4

    The output is lossless WebP.
*/

#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <string.h>
#include <limits.h>
#include <math.h>

#include <webp/decode.h>
#include <webp/encode.h>

#define FILTER_RADIUS       2

/*
    Lower this for sharper output.
    Raise it if low-contrast regions look too blocky.
*/
#define FLAT_GRADIENT       0.018f

/*
    Gradient magnitude at which directional filtering becomes strong.
*/
#define EDGE_GRADIENT       0.24f

#define BASE_SIGMA          0.70f

typedef struct {
    int w;
    int h;

    /*
        These are premultiplied linear-light RGB values.
        Alpha is in the range 0..1.
    */
    float *r;
    float *g;
    float *b;
    float *a;

    float *storage;
} FImage;

typedef struct {
    float nx;
    float ny;
    float strength;
    float coherence;
} EdgeInfo;

static float srgb_to_linear_lut[256];
static uint8_t linear_to_srgb_lut[4097];

static float clampf_local(float x, float lo, float hi)
{
    if (x < lo) return lo;
    if (x > hi) return hi;
    return x;
}

static int clampi_local(int x, int lo, int hi)
{
    if (x < lo) return lo;
    if (x > hi) return hi;
    return x;
}

static int image_pixel_count(int w, int h, size_t *result)
{
    if (w <= 0 || h <= 0)
        return 0;

    if ((size_t)w > SIZE_MAX / (size_t)h)
        return 0;

    *result = (size_t)w * (size_t)h;
    return 1;
}

static void init_color_tables(void)
{
    int i;

    for (i = 0; i < 256; ++i) {
        float s = (float)i / 255.0f;

        if (s <= 0.04045f)
            srgb_to_linear_lut[i] = s / 12.92f;
        else
            srgb_to_linear_lut[i] =
                powf((s + 0.055f) / 1.055f, 2.4f);
    }

    for (i = 0; i <= 4096; ++i) {
        float l = (float)i / 4096.0f;
        float s;

        if (l <= 0.0031308f)
            s = 12.92f * l;
        else
            s = 1.055f * powf(l, 1.0f / 2.4f) - 0.055f;

        s = clampf_local(s, 0.0f, 1.0f);
        linear_to_srgb_lut[i] =
            (uint8_t)floorf(s * 255.0f + 0.5f);
    }
}

static int make_float_image(
    const uint8_t *rgba,
    int w,
    int h,
    FImage *out)
{
    size_t count;
    size_t bytes;
    size_t i;

    memset(out, 0, sizeof(*out));

    if (!image_pixel_count(w, h, &count))
        return 0;

    if (count > SIZE_MAX / (4 * sizeof(float)))
        return 0;

    bytes = count * 4 * sizeof(float);

    out->storage = (float *)malloc(bytes);
    if (!out->storage)
        return 0;

    out->w = w;
    out->h = h;

    out->r = out->storage;
    out->g = out->storage + count;
    out->b = out->storage + count * 2;
    out->a = out->storage + count * 3;

    for (i = 0; i < count; ++i) {
        const uint8_t *p = rgba + i * 4;
        float a = (float)p[3] / 255.0f;

        /*
            Premultiply in linear light. This prevents dark fringes
            around transparent sprite edges.
        */
        out->a[i] = a;
        out->r[i] = srgb_to_linear_lut[p[0]] * a;
        out->g[i] = srgb_to_linear_lut[p[1]] * a;
        out->b[i] = srgb_to_linear_lut[p[2]] * a;
    }

    return 1;
}

static void free_float_image(FImage *im)
{
    free(im->storage);
    memset(im, 0, sizeof(*im));
}

/*
    Estimate the dominant edge normal around one source pixel.

    A structure tensor is used instead of only luminance. This detects
    edges such as red-to-green boundaries that have little luminance
    contrast. Alpha is also included, which is important for sprites.
*/
static EdgeInfo get_edge_info(const FImage *im, int x, int y)
{
    EdgeInfo result;
    int xm, xp, ym, yp;
    size_t c, lx, rx, ty, by;

    float drx, dgx, dbx, dax;
    float dry, dgy, dby, day;

    float jxx, jyy, jxy;
    float trace, discriminant;
    float lambda1, lambda2;
    float theta;

    result.nx = 0.0f;
    result.ny = 0.0f;
    result.strength = 0.0f;
    result.coherence = 0.0f;

    x = clampi_local(x, 0, im->w - 1);
    y = clampi_local(y, 0, im->h - 1);

    xm = x > 0 ? x - 1 : x;
    xp = x + 1 < im->w ? x + 1 : x;
    ym = y > 0 ? y - 1 : y;
    yp = y + 1 < im->h ? y + 1 : y;

    c  = (size_t)y  * im->w + x;
    lx = (size_t)y  * im->w + xm;
    rx = (size_t)y  * im->w + xp;
    ty = (size_t)ym * im->w + x;
    by = (size_t)yp * im->w + x;

    (void)c;

    drx = (im->r[rx] - im->r[lx]) * 0.5f;
    dgx = (im->g[rx] - im->g[lx]) * 0.5f;
    dbx = (im->b[rx] - im->b[lx]) * 0.5f;
    dax = (im->a[rx] - im->a[lx]) * 0.5f;

    dry = (im->r[by] - im->r[ty]) * 0.5f;
    dgy = (im->g[by] - im->g[ty]) * 0.5f;
    dby = (im->b[by] - im->b[ty]) * 0.5f;
    day = (im->a[by] - im->a[ty]) * 0.5f;

    /*
        Structure tensor.

        Alpha gets extra weight so transparent sprite outlines are
        treated as real edges.
    */
    jxx =
        drx * drx +
        dgx * dgx +
        dbx * dbx +
        2.0f * dax * dax;

    jyy =
        dry * dry +
        dgy * dgy +
        dby * dby +
        2.0f * day * day;

    jxy =
        drx * dry +
        dgx * dgy +
        dbx * dby +
        2.0f * dax * day;

    trace = 0.5f * (jxx + jyy);

    discriminant = sqrtf(
        fmaxf(
            0.0f,
            0.25f * (jxx - jyy) * (jxx - jyy) +
            jxy * jxy
        )
    );

    lambda1 = trace + discriminant;
    lambda2 = trace - discriminant;

    if (lambda1 < 0.0f)
        lambda1 = 0.0f;

    if (lambda2 < 0.0f)
        lambda2 = 0.0f;

    result.strength = sqrtf(lambda1);

    /*
        Coherence is high for a line-like edge and low at corners,
        junctions, or noisy texture. Directional filtering is only
        used when the direction is reliable.
    */
    result.coherence =
        (lambda1 - lambda2) /
        (lambda1 + lambda2 + 1.0e-12f);

    result.coherence =
        clampf_local(result.coherence, 0.0f, 1.0f);

    if (result.strength > 1.0e-7f) {
        /*
            Eigenvector corresponding to the largest eigenvalue.
            This is the edge normal.
        */
        theta = 0.5f * atan2f(2.0f * jxy, jxx - jyy);

        result.nx = cosf(theta);
        result.ny = sinf(theta);
    }

    return result;
}

static uint8_t linear_to_srgb8(float x)
{
    int index;

    x = clampf_local(x, 0.0f, 1.0f);
    index = (int)floorf(x * 4096.0f + 0.5f);

    if (index < 0)
        index = 0;
    if (index > 4096)
        index = 4096;

    return linear_to_srgb_lut[index];
}

/*
    Store premultiplied linear-light RGB plus alpha as ordinary
    straight-alpha sRGB RGBA.
*/
static void store_pixel(
    uint8_t *dst,
    float premul_r,
    float premul_g,
    float premul_b,
    float alpha)
{
    float r, g, b;

    alpha = clampf_local(alpha, 0.0f, 1.0f);

    if (alpha <= 1.0e-8f) {
        dst[0] = 0;
        dst[1] = 0;
        dst[2] = 0;
        dst[3] = 0;
        return;
    }

    r = clampf_local(premul_r / alpha, 0.0f, 1.0f);
    g = clampf_local(premul_g / alpha, 0.0f, 1.0f);
    b = clampf_local(premul_b / alpha, 0.0f, 1.0f);

    dst[0] = linear_to_srgb8(r);
    dst[1] = linear_to_srgb8(g);
    dst[2] = linear_to_srgb8(b);
    dst[3] = (uint8_t)floorf(alpha * 255.0f + 0.5f);
}

static int upscale_image(
    const FImage *src,
    uint8_t *dst,
    int dst_w,
    int dst_h)
{
    int ox, oy;

    for (oy = 0; oy < dst_h; ++oy) {
        /*
            Pixel-center mapping. This avoids a half-pixel shift.
        */
        float sy =
            ((float)oy + 0.5f) *
            ((float)src->h / (float)dst_h) - 0.5f;

        int nearest_y =
            (int)floorf(sy + 0.5f);

        int y0 = (int)floorf(sy) - FILTER_RADIUS;
        int y1 = (int)floorf(sy) + FILTER_RADIUS;

        nearest_y = clampi_local(nearest_y, 0, src->h - 1);
        y0 = clampi_local(y0, 0, src->h - 1);
        y1 = clampi_local(y1, 0, src->h - 1);

        for (ox = 0; ox < dst_w; ++ox) {
            float sx =
                ((float)ox + 0.5f) *
                ((float)src->w / (float)dst_w) - 0.5f;

            int nearest_x =
                (int)floorf(sx + 0.5f);

            int x0 = (int)floorf(sx) - FILTER_RADIUS;
            int x1 = (int)floorf(sx) + FILTER_RADIUS;

            EdgeInfo edge;
            float directional_strength;
            size_t nearest_index;
            uint8_t *out_pixel;

            nearest_x = clampi_local(nearest_x, 0, src->w - 1);
            x0 = clampi_local(x0, 0, src->w - 1);
            x1 = clampi_local(x1, 0, src->w - 1);

            nearest_index =
                (size_t)nearest_y * src->w + nearest_x;

            out_pixel =
                dst + ((size_t)oy * dst_w + ox) * 4;

            edge = get_edge_info(src, nearest_x, nearest_y);

            /*
                Flat-color locking.

                This keeps large cel fills exact instead of repeatedly
                averaging them. It also protects small hard details.
            */
            if (edge.strength < FLAT_GRADIENT) {
                store_pixel(
                    out_pixel,
                    src->r[nearest_index],
                    src->g[nearest_index],
                    src->b[nearest_index],
                    src->a[nearest_index]
                );
                continue;
            }

            /*
                Directional strength is high on long edges and low
                around corners. At a reliable edge, the filter becomes
                narrow across the edge and wider along it.
            */
            directional_strength =
                (edge.strength / EDGE_GRADIENT) *
                edge.coherence;

            directional_strength =
                clampf_local(
                    directional_strength,
                    0.0f,
                    1.0f
                );

            {
                float sigma_normal =
                    BASE_SIGMA -
                    0.38f * directional_strength;

                float sigma_tangent =
                    BASE_SIGMA +
                    0.20f * directional_strength;

                float inv_normal =
                    1.0f / (sigma_normal * sigma_normal);

                float inv_tangent =
                    1.0f / (sigma_tangent * sigma_tangent);

                float sum_weight = 0.0f;
                float sum_r = 0.0f;
                float sum_g = 0.0f;
                float sum_b = 0.0f;
                float sum_a = 0.0f;

                int yy, xx;

                for (yy = y0; yy <= y1; ++yy) {
                    for (xx = x0; xx <= x1; ++xx) {
                        float dx = (float)xx - sx;
                        float dy = (float)yy - sy;

                        float normal;
                        float tangent;
                        float exponent;
                        float weight;

                        size_t index;

                        /*
                            Only use oriented filtering when the
                            edge direction is trustworthy.
                        */
                        if (directional_strength > 0.05f) {
                            normal =
                                dx * edge.nx +
                                dy * edge.ny;

                            tangent =
                                -dx * edge.ny +
                                dy * edge.nx;
                        } else {
                            normal = dx;
                            tangent = dy;
                        }

                        exponent =
                            normal * normal * inv_normal +
                            tangent * tangent * inv_tangent;

                        weight = expf(-0.5f * exponent);

                        index = (size_t)yy * src->w + xx;

                        sum_weight += weight;
                        sum_r += src->r[index] * weight;
                        sum_g += src->g[index] * weight;
                        sum_b += src->b[index] * weight;
                        sum_a += src->a[index] * weight;
                    }
                }

                if (sum_weight <= 1.0e-12f) {
                    store_pixel(
                        out_pixel,
                        src->r[nearest_index],
                        src->g[nearest_index],
                        src->b[nearest_index],
                        src->a[nearest_index]
                    );
                } else {
                    float inv_weight = 1.0f / sum_weight;

                    store_pixel(
                        out_pixel,
                        sum_r * inv_weight,
                        sum_g * inv_weight,
                        sum_b * inv_weight,
                        sum_a * inv_weight
                    );
                }
            }
        }
    }

    return 1;
}

static uint8_t *read_entire_file(
    const char *filename,
    size_t *file_size)
{
    FILE *fp;
    long length;
    uint8_t *data;

    *file_size = 0;

    fp = fopen(filename, "rb");
    if (!fp)
        return NULL;

    if (fseek(fp, 0, SEEK_END) != 0) {
        fclose(fp);
        return NULL;
    }

    length = ftell(fp);
    if (length <= 0) {
        fclose(fp);
        return NULL;
    }

    if (fseek(fp, 0, SEEK_SET) != 0) {
        fclose(fp);
        return NULL;
    }

    data = (uint8_t *)malloc((size_t)length);
    if (!data) {
        fclose(fp);
        return NULL;
    }

    if (fread(data, 1, (size_t)length, fp) != (size_t)length) {
        free(data);
        fclose(fp);
        return NULL;
    }

    fclose(fp);

    *file_size = (size_t)length;
    return data;
}

static int write_entire_file(
    const char *filename,
    const uint8_t *data,
    size_t size)
{
    FILE *fp;
    size_t written;
    int close_result;

    fp = fopen(filename, "wb");
    if (!fp)
        return 0;

    written = fwrite(data, 1, size, fp);
    close_result = fclose(fp);

    return written == size && close_result == 0;
}

int main(int argc, char **argv)
{
    const char *input_name;
    const char *output_name;

    char *endptr;
    double scale;

    uint8_t *input_data = NULL;
    size_t input_size = 0;

    uint8_t *decoded_rgba = NULL;
    uint8_t *output_rgba = NULL;
    uint8_t *encoded_webp = NULL;

    size_t output_pixels;
    size_t output_bytes;
    size_t encoded_size;

    int input_w;
    int input_h;
    int output_w;
    int output_h;

    double output_w_double;
    double output_h_double;

    FImage source;
    int result = 1;

    if (argc != 4) {
        fprintf(
            stderr,
            "Usage: %s input.webp output.webp scale\n",
            argv[0]
        );
        return 1;
    }

    input_name = argv[1];
    output_name = argv[2];

    endptr = NULL;
    scale = strtod(argv[3], &endptr);

    if (!endptr ||
        *endptr != '\0' ||
        !isfinite(scale) ||
        scale <= 1.0 ||
        scale > 64.0) {
        fprintf(
            stderr,
            "Scale must be a number greater than 1 and at most 64.\n"
        );
        return 1;
    }

    init_color_tables();

    input_data = read_entire_file(input_name, &input_size);
    if (!input_data) {
        fprintf(stderr, "Could not read input file.\n");
        return 1;
    }

    decoded_rgba =
        WebPDecodeRGBA(
            input_data,
            input_size,
            &input_w,
            &input_h
        );

    free(input_data);
    input_data = NULL;

    if (!decoded_rgba) {
        fprintf(stderr, "Could not decode WebP.\n");
        return 1;
    }

    output_w_double = (double)input_w * scale;
    output_h_double = (double)input_h * scale;

    if (!isfinite(output_w_double) ||
        !isfinite(output_h_double) ||
        output_w_double > INT_MAX ||
        output_h_double > INT_MAX) {
        fprintf(stderr, "Output image is too large.\n");
        WebPFree(decoded_rgba);
        return 1;
    }

    output_w = (int)floor(output_w_double + 0.5);
    output_h = (int)floor(output_h_double + 0.5);

    if (output_w <= 0 ||
        output_h <= 0 ||
        output_w > INT_MAX / 4 ||
        !image_pixel_count(output_w, output_h, &output_pixels) ||
        output_pixels > SIZE_MAX / 4) {
        fprintf(stderr, "Invalid output dimensions.\n");
        WebPFree(decoded_rgba);
        return 1;
    }

    output_bytes = output_pixels * 4;

    if (!make_float_image(
            decoded_rgba,
            input_w,
            input_h,
            &source)) {
        fprintf(stderr, "Could not allocate source image.\n");
        WebPFree(decoded_rgba);
        return 1;
    }

    WebPFree(decoded_rgba);
    decoded_rgba = NULL;

    output_rgba = (uint8_t *)malloc(output_bytes);
    if (!output_rgba) {
        fprintf(stderr, "Could not allocate output image.\n");
        free_float_image(&source);
        return 1;
    }

    if (!upscale_image(
            &source,
            output_rgba,
            output_w,
            output_h)) {
        fprintf(stderr, "Upscaling failed.\n");
        free(output_rgba);
        free_float_image(&source);
        return 1;
    }

    /*
        Lossless output prevents the encoder from introducing new
        ringing or block artifacts.
    */
    encoded_size =
        WebPEncodeLosslessRGBA(
            output_rgba,
            output_w,
            output_h,
            output_w * 4,
            &encoded_webp
        );

    if (encoded_size == 0 || !encoded_webp) {
        fprintf(stderr, "Could not encode output WebP.\n");
        free(output_rgba);
        free_float_image(&source);
        return 1;
    }

    if (!write_entire_file(
            output_name,
            encoded_webp,
            encoded_size)) {
        fprintf(stderr, "Could not write output file.\n");
        result = 1;
    } else {
        printf(
            "Wrote %dx%d WebP to %s\n",
            output_w,
            output_h,
            output_name
        );
        result = 0;
    }

    WebPFree(encoded_webp);
    free(output_rgba);
    free_float_image(&source);

    return result;
}