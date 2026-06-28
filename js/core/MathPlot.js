/* =========================================================================
   js/core/MathPlot.js  —  SHARED
   A small graphing toolkit the section authors use to draw their math in 3D.
   Everything is built in a LOCAL coordinate system (graph units) and then
   placed/scaled by the station. This is the bridge between "math" and "3D":

       world position = origin + (mathX * unit, mathY * unit, 0)

   So a curve y = f(x) on x∈[xMin,xMax] becomes a polyline in the XY plane of
   the plot group, with Z used only for small depth offsets (axes, glow).

   Members 1–3 should read the comments here; this is the main math→3D map.
   ========================================================================= */

import * as THREE from "three";

export class MathPlot extends THREE.Group {
  /**
   * @param {object} cfg
   *   xMin,xMax,yMin,yMax : math domain/range shown
   *   width,height        : physical size of plot area in METRES
   */
  constructor(cfg = {}) {
    super();
    this.cfg = Object.assign(
      { xMin: -3, xMax: 3, yMin: -2, yMax: 4, width: 2.6, height: 2.0 },
      cfg
    );
    // unit = metres per math-unit, separately for x and y
    this.ux = this.cfg.width / (this.cfg.xMax - this.cfg.xMin);
    this.uy = this.cfg.height / (this.cfg.yMax - this.cfg.yMin);
    this._dynamic = []; // objects we can clear between steps
  }

  /** Convert a math (x,y) point to a local 3D vector inside the plot. */
  toLocal(x, y, z = 0) {
    const lx = (x - (this.cfg.xMin + this.cfg.xMax) / 2) * this.ux;
    const ly = (y - (this.cfg.yMin + this.cfg.yMax) / 2) * this.uy;
    return new THREE.Vector3(lx, ly, z);
  }

  /** Draw the colored orientation axes (X red, Y green, Z blue). Small. */
  addAxes() {
    const o = this.toLocal(0, 0);
    const len = 0.32; // small, for orientation only (per brief §5)
    const mk = (dir, color) => {
      const arrow = new THREE.ArrowHelper(
        dir,
        o,
        len,
        color,
        len * 0.32,
        len * 0.2
      );
      this.add(arrow);
    };
    mk(new THREE.Vector3(1, 0, 0), 0xff5252); // X red
    mk(new THREE.Vector3(0, 1, 0), 0x69f0ae); // Y green
    mk(new THREE.Vector3(0, 0, 1), 0x4cc9f0); // Z blue
    return this;
  }

  /** Light reference grid + frame so the plot reads as a graph. */
  addGrid(stepX = 1, stepY = 1) {
    const g = new THREE.Group();
    const matMinor = new THREE.LineBasicMaterial({
      color: 0x3a4a78,
      transparent: true,
      opacity: 0.5,
    });
    const matAxis = new THREE.LineBasicMaterial({ color: 0x8fa3d8 });

    const verts = [];
    for (let x = Math.ceil(this.cfg.xMin); x <= this.cfg.xMax; x += stepX) {
      const a = this.toLocal(x, this.cfg.yMin);
      const b = this.toLocal(x, this.cfg.yMax);
      verts.push(a, b);
    }
    for (let y = Math.ceil(this.cfg.yMin); y <= this.cfg.yMax; y += stepY) {
      const a = this.toLocal(this.cfg.xMin, y);
      const b = this.toLocal(this.cfg.xMax, y);
      verts.push(a, b);
    }
    g.add(lineSegments(verts, matMinor));

    // bold axes through origin (if origin in view)
    const axisVerts = [];
    if (this.cfg.yMin <= 0 && this.cfg.yMax >= 0) {
      axisVerts.push(this.toLocal(this.cfg.xMin, 0), this.toLocal(this.cfg.xMax, 0));
    }
    if (this.cfg.xMin <= 0 && this.cfg.xMax >= 0) {
      axisVerts.push(this.toLocal(0, this.cfg.yMin), this.toLocal(0, this.cfg.yMax));
    }
    if (axisVerts.length) g.add(lineSegments(axisVerts, matAxis));

    this.add(g);
    return this;
  }

  /**
   * Plot y = fn(x) as a smooth tube so it's visible from any angle and on
   * small screens. Returns the mesh so callers can animate / remove it.
   * @param {function} fn         x -> y  (math units)
   * @param {object} opts         {color, radius, samples, dynamic, xMin, xMax}
   */
  plotFunction(fn, opts = {}) {
    const {
      color = 0x4cc9f0,
      radius = 0.012,
      samples = 160,
      dynamic = true,
      xMin = this.cfg.xMin,
      xMax = this.cfg.xMax,
      clampY = true,
    } = opts;

    const pts = [];
    for (let i = 0; i <= samples; i++) {
      const x = xMin + ((xMax - xMin) * i) / samples;
      let y = fn(x);
      if (!isFinite(y)) continue;
      if (clampY) y = Math.max(this.cfg.yMin - 1, Math.min(this.cfg.yMax + 1, y));
      pts.push(this.toLocal(x, y));
    }
    if (pts.length < 2) return null;

    const curve = new THREE.CatmullRomCurve3(pts);
    const geo = new THREE.TubeGeometry(curve, samples, radius, 8, false);
    const mat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.35,
      roughness: 0.5,
    });
    const mesh = new THREE.Mesh(geo, mat);
    this.add(mesh);
    if (dynamic) this._dynamic.push(mesh);
    return mesh;
  }

  /** A straight segment between two math points (e.g. a tangent / chord). */
  segment(x0, y0, x1, y1, opts = {}) {
    const { color = 0xffd166, radius = 0.012, dynamic = true } = opts;
    const a = this.toLocal(x0, y0);
    const b = this.toLocal(x1, y1);
    const curve = new THREE.LineCurve3(a, b);
    const geo = new THREE.TubeGeometry(curve, 1, radius, 8, false);
    const mat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.4,
      roughness: 0.5,
    });
    const mesh = new THREE.Mesh(geo, mat);
    this.add(mesh);
    if (dynamic) this._dynamic.push(mesh);
    return mesh;
  }

  /** A vertical "rod" bar from the x-axis up to height y (for histograms). */
  bar(x, y, opts = {}) {
    const { color = 0x4cc9f0, widthMath = 0.7, dynamic = true } = opts;
    const w = widthMath * this.ux;
    const h = Math.abs(y) * this.uy;
    const geo = new THREE.BoxGeometry(w, h, 0.04);
    const mat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.25,
      roughness: 0.45,
    });
    const mesh = new THREE.Mesh(geo, mat);
    const base = this.toLocal(x, 0);
    mesh.position.set(base.x, base.y + h / 2, 0.02);
    mesh.scale.y = 0.001; // start collapsed for "grow" animation
    mesh.userData.targetScaleY = 1;
    this.add(mesh);
    if (dynamic) this._dynamic.push(mesh);
    return mesh;
  }

  /** A glowing marker point (used for tangency / sample points). */
  marker(x, y, opts = {}) {
    const { color = 0xf72585, size = 0.045, dynamic = true, pulse = true } = opts;
    const group = new THREE.Group();
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(size, 20, 20),
      new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 1.1,
      })
    );
    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(size * 2.1, 20, 20),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.25,
        depthWrite: false,
      })
    );
    group.add(core, halo);
    const p = this.toLocal(x, y, 0.02);
    group.position.copy(p);
    if (pulse) group.userData.pulse = halo; // Playerless animator handles glow
    this.add(group);
    if (dynamic) this._dynamic.push(group);
    return group;
  }

  /** Remove everything added with dynamic:true (between steps). */
  clearDynamic() {
    for (const o of this._dynamic) {
      this.remove(o);
      o.traverse?.((c) => {
        c.geometry?.dispose?.();
        if (c.material) {
          (Array.isArray(c.material) ? c.material : [c.material]).forEach((m) =>
            m.dispose?.()
          );
        }
      });
    }
    this._dynamic.length = 0;
  }

  /** Per-frame updates (pulsing markers, bar growth). */
  update(dt, t) {
    for (const o of this._dynamic) {
      if (o.userData?.pulse) {
        const s = 1 + Math.sin(t * 4) * 0.18;
        o.userData.pulse.scale.setScalar(s);
        o.userData.pulse.material.opacity = 0.18 + 0.12 * (Math.sin(t * 4) * 0.5 + 0.5);
      }
      if (o.userData?.targetScaleY !== undefined && o.scale.y < o.userData.targetScaleY) {
        o.scale.y = Math.min(o.userData.targetScaleY, o.scale.y + dt * 2.5);
      }
    }
  }
}

function lineSegments(verts, mat) {
  const geo = new THREE.BufferGeometry().setFromPoints(verts);
  return new THREE.LineSegments(geo, mat);
}
