# Hana flat experiment: shared-boundary trace

- File: `hana_flat_shared.svg` (181 KB, valid XML, 32 flat fills, no gradients, 32 paths).
- Source: `characters/hana/hana_light_normal.webp` (light base sprite).
- Tool: `tools/vtrace/trace_shared.py`, run as `trace_shared.py SPRITE OUT 32 1.5 5 25 1`.
- Method: k-means colours, 5x5 majority smoothing, merge of regions under 25 px. Every boundary between two regions is traced once, smoothed, and fitted once with cubic Beziers (1.5 px tolerance). Both regions reference the same control points. Coordinates use 1 decimal and relative `c` commands.
- Check: 3,389 interior boundaries, 0 failures (each used by exactly two paths with identical points).
- Fit vs the sprite: silhouette IoU 0.9915; colour RMSE 29.2 (flat fills cannot reproduce shading).
- Known limits: faint dark speckles along some outer edges; hair and dress shading blotchier than the original.
- Earlier 616 KB version (2 decimals, absolute coordinates) replaced by this one.
