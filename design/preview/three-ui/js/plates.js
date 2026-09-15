/* ============================================================================
 * Seirin "Holoframe" mockup — nine-slice plate geometry (DEV ONLY).
 * ---------------------------------------------------------------------------
 * A 3D panel is built the way a CSS border-image is: four corners that are
 * NEVER scaled, four edge strips that repeat only along their own axis, and a
 * centre that carries no image at all (procedural shader). Slice sizes come
 * from the measured manifest (build-textures.mjs), never from a guess.
 *
 * Guarantees, all asserted by tests/plates.test.mjs:
 *   - corner quads are exactly C x C px at every panel size (no stretching);
 *   - edge strips are exactly C px thick and repeat innerLen / tileLen times
 *     in UV (fractional repeat => the last tile is cropped, never squeezed);
 *   - UVs are mirrored (not rotated) on the flipped corners/edges so the
 *     ornament reads the right way round on all four sides;
 *   - geometry units are CSS pixels, centred on the origin, +Y up, so the mesh
 *     can be placed by unprojecting a DOM rect 1:1.
 *
 * Groups / materials:
 *   0 corners   -> clamp-sampled corner texture
 *   1 top+bot   -> RepeatWrapping edge_h texture
 *   2 left+right-> RepeatWrapping edge_v texture
 *   3 centre    -> procedural ShaderMaterial (no image)
 * UMD: the pure builder is importable in Node for tests.
 * ========================================================================= */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { var HF = (root.HF = root.HF || {}); HF.plates = factory(); }
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  /**
   * @param {number} w  panel width in css px (>= 2*C)
   * @param {number} h  panel height in css px (>= 2*C)
   * @param {number} C  corner/edge thickness in css px (measured, never scaled)
   * @param {number} eLen edge tile length in css px (measured)
   * @returns {{geometry:Object, meta:Object}} plain-data geometry (positions,
   *   uvs, groups, index) so it is testable without three; `toThree()` converts.
   */
  function buildPlate(w, h, C, eLen) {
    if (!(w >= 2 * C) || !(h >= 2 * C)) {
      throw new Error('plate ' + w + 'x' + h + ' below nine-slice minimum ' + (2 * C) + ' — switch frame variant, do not scale corners');
    }
    var hw = w / 2, hh = h / 2;
    var iw = w - 2 * C, ih = h - 2 * C;
    var pos = [], uv = [], idx = [];
    var groups = [{ start: 0, count: 0, mat: 0 }, { start: 0, count: 0, mat: 1 }, { start: 0, count: 0, mat: 2 }, { start: 0, count: 0, mat: 3 }];
    function pushGroup(g) { if (groups[g].count === 0) groups[g].start = idx.length; }
    function quad(g, x0, y0, x1, y1, u0, v0, u1, v1) {
      pushGroup(g);
      var b = pos.length / 3;
      pos.push(x0, y0, 0, x1, y0, 0, x1, y1, 0, x0, y1, 0);
      uv.push(u0, v0, u1, v0, u1, v1, u0, v1);
      idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
      groups[g].count += 6;
    }
    var rx = iw / eLen;          // fractional repeat: crops the last tile, keeps density
    var ry = ih / eLen;

    /* --- corners: exact C x C, mirrored UVs ------------------------------- */
    quad(0, -hw, hh - C, -hw + C, hh, 0, 0, 1, 1);                    // TL
    quad(0, hw - C, hh - C, hw, hh, 1, 0, 0, 1);                      // TR (mirror u)
    quad(0, -hw, -hh, -hw + C, -hh + C, 0, 1, 1, 0);                  // BL (mirror v)
    quad(0, hw - C, -hh, hw, -hh + C, 1, 1, 0, 0);                    // BR (mirror uv)

    /* --- horizontal edges: thickness C, tiles along x --------------------- */
    quad(1, -hw + C, hh - C, hw - C, hh, 0, 0, rx, 1);                // top
    quad(1, -hw + C, -hh, hw - C, -hh + C, 0, 1, rx, 0);              // bottom (mirror v)

    /* --- vertical edges: thickness C, tiles along y ----------------------- */
    quad(2, -hw, -hh + C, -hw + C, hh - C, 1, 0, 0, ry);              // left (mirror u)
    quad(2, hw - C, -hh + C, hw, hh - C, 0, 0, 1, ry);                // right

    /* --- centre: procedural, uv unused by its shader (px space instead) --- */
    quad(3, -hw + C, -hh + C, hw - C, hh - C, 0, 0, 1, 1);

    return {
      positions: pos, uvs: uv, index: idx, groups: groups,
      meta: { w: w, h: h, C: C, eLen: eLen, innerW: iw, innerH: ih, repeatX: rx, repeatY: ry },
    };
  }

  /** Convert the plain-data plate into a THREE.BufferGeometry with groups. */
  function toThree(plate) {
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(plate.positions, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(plate.uvs, 2));
    g.setIndex(plate.index);
    plate.groups.forEach(function (gr) { if (gr.count) g.addGroup(gr.start, gr.count, gr.mat); });
    g.computeVertexNormals();
    return g;
  }

  /**
   * Re-tile a BoxGeometry's UVs so a tiling map keeps constant px density on
   * every face regardless of the box's proportions (a 40x400 strut and a
   * 400x400 slab show the same grain). Face order: +x,-x,+y,-y,+z,-z.
   */
  function retileBoxUVs(geo, dims, tilePx) {
    var faces = [
      [dims[2], dims[1]], [dims[2], dims[1]],   // +x -x : z,y
      [dims[0], dims[2]], [dims[0], dims[2]],   // +y -y : x,z
      [dims[0], dims[1]], [dims[0], dims[1]],   // +z -z : x,y
    ];
    var uv = geo.attributes.uv;
    var per = 4; // BoxGeometry: 4 verts per face
    for (var f = 0; f < 6; f++) {
      var su = faces[f][0] / tilePx, sv = faces[f][1] / tilePx;
      for (var v = 0; v < per; v++) {
        var i = f * per + v;
        uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
      }
    }
    uv.needsUpdate = true;
    return geo;
  }

  return { buildPlate: buildPlate, toThree: toThree, retileBoxUVs: retileBoxUVs };
});
