# Hana flat experiment: shared-boundary trace (flat source, sub-pixel boundaries)

- File: `hana_flat_shared.svg` (82 KB, valid XML, 15 flat fills, no gradients, 15 paths).
- Source: a flat, gradient-free render of the light Hana, generated from `characters/hana/hana_light_normal.webp` with the flat prompt (`prompts/42_light_flat_experiment.txt`).
- Tool: `tools/vtrace/trace_shared.py`, run as `trace_shared.py flat_src.png OUT 16 1.0 3 25 1 1.5 4 5.0`.
- Method: k-means colours, 3x3 majority smoothing, merge of regions under 25 px, figure mask smoothed (sigma 1.5 px). The label map is upsampled 4x and each region's indicator is blurred (sigma 5 on the 4x grid, about 1.25 px) before tracing, so boundaries are sub-pixel and not pixel staircases. Every boundary is traced once, smoothed, and fitted once with cubic Beziers (1.0 px). Both regions reference the same control points. Coordinates use 1 decimal and relative `c` commands.
- Check: 711 interior boundaries, 0 failures (each used by exactly two paths with identical points).
- Fit vs the flat source: silhouette IoU 0.992; colour RMSE 7.4.
- Known limits: small dents remain along the hair edge at high zoom; the right eye and the ribbon lose detail; the lower skirt is one blue block.
- Earlier versions (1x boundaries, gradient sprite source) are superseded.
