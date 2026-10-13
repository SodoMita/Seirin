# Hana flat experiment: shared-boundary trace

- File: `hana_flat_shared.svg` (616 KB, valid XML, 32 flat fills, no gradients, 32 paths).
- Source: `characters/hana/hana_light_normal.webp` (light base sprite).
- Tool: `tools/vtrace/trace_shared.py`, run as `trace_shared.py SPRITE OUT 32 0.6 3 12`.
- Method: k-means colours, 3x3 majority smoothing, merge of regions under 12 px; every boundary between two regions is traced once, smoothed, and fitted once with cubic Beziers (0.6 px). Both regions reference the same control points.
- Check: 6,560 interior boundaries, 0 failures (each used by exactly two paths with identical points).
- Fit vs the sprite: silhouette IoU 0.993; colour RMSE 26.5 (flat fills cannot reproduce shading).
- Known limits: faint dark speckles along some outer edges; hair and dress shading blotchier than the original.
