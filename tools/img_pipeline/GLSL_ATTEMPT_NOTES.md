# GLSL/GPU upscale attempt — why it was abandoned (2026-07-29)

The user asked for GPU/GLSL-shader-based sprite upscaling instead of the
ImageMagick CLI pipeline. This is the record of what was tried and why
`upscale_filter.c` (plain scalar C, no GPU) is what actually shipped.

## What was tried

1. **Headless Chromium + Playwright WebGL2.** Extracted a Chromium binary
   from `@sparticuz/chromium` (per `design/HANDOFF.md`'s recipe) and
   confirmed a real `WebGL 2.0 (OpenGL ES 3.0 Chromium) | WebKit WebGL`
   context via `page.evaluate(() => canvas.getContext('webgl2'))`. This
   worked, but launching a full browser process (and driving it via
   Playwright's IPC) to run one fragment shader on a handful of PNGs is a
   large amount of machinery for the job — flagged by the project owner as
   likely slower than a standalone program, which is correct: browser
   startup and page lifecycle cost far more than the actual shader pass.

2. **Standalone headless EGL/GLES2 via SwiftShader's own libEGL.so /
   libGLESv2.so** (extracted from the same `@sparticuz/chromium` package,
   which bundles SwiftShader as its software GL/Vulkan backend). Wrote
   `gl_upscale.c`: a ~450-line C program that `dlopen`s those two shared
   objects directly (no browser, no X server), declares minimal EGL/GLES2
   prototypes itself (no system Mesa/EGL headers are installed and
   `apt-get` cannot reach `deb.debian.org` from this sandbox), creates a
   headless EGL pbuffer context, compiles a Catmull-Rom-bicubic +
   unsharp + saturation GLSL ES fragment shader, renders a full-screen quad
   into an offscreen framebuffer at the target resolution, and reads back
   the result with `glReadPixels`. Image I/O used the vendored
   `stb_image.h` / `stb_image_write.h` single-header libraries (public
   domain, pulled via the `stb.c` npm package — pip's `stb` package is an
   unrelated Python image loader, not the C headers).

   This got as far as loading both `.so` files and resolving every EGL/GLES
   symbol, but `eglInitialize` failed:
   ```
   ERR: vk_renderer.cpp (VerifyExtensionsPresent): Extension not supported: VK_EXT_headless_surface
   ERR: Display.cpp (initialize): ANGLE Display::initialize error 0: Internal Vulkan error (-7)
   ```
   The bundled ANGLE build backing this particular `libGLESv2.so` routes
   GLES2 through its Vulkan backend (which itself runs on SwiftShader's
   *software* Vulkan implementation), and that Vulkan backend expects a
   `VK_EXT_headless_surface`-capable ICD that this specific bundled
   SwiftShader Vulkan ICD does not advertise in a pbuffer-only headless
   setup. Fixing this would mean either finding/building a version of
   ANGLE/SwiftShader configured for the older direct GL passthrough instead
   of the Vulkan-backed path, or driving it through an actual (even if
   off-screen) Chromium `Display` initialization path — i.e., back to
   option 1's browser-process cost.

## Decision

Stopped chasing the ANGLE/Vulkan stack per the project owner's steer: a full
GPU/shader pipeline is not worth it for what is, per output image, a single
resize + light filter pass. `upscale_filter.c` implements the *identical
math* the GLSL fragment shader would have run (Catmull-Rom bicubic resample,
3x3-box-blur-based unsharp mask, luma-preserving saturation lift) as a plain
scalar C loop over the pixel buffer. No GPU, no GLSL, no browser, no
dlopen'd vendor `.so` files — just `stb_image.h`/`stb_image_write.h` and
`libm`. It builds and runs correctly in this sandbox and produces the same
visual result a shader pass would, without depending on a GPU stack this
environment cannot fully initialize.

If GPU/shader upscaling becomes a hard requirement later, the two concrete
next steps recorded here are: (a) find or build an ANGLE/SwiftShader
combination that supports a direct headless GL(ES) path without going
through Vulkan's surface-extension requirements, or (b) accept the
Chromium-launch cost from attempt 1, which is confirmed working.
