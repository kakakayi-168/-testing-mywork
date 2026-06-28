/* =========================================================================
   js/core/WallProjector.js  —  SHARED
   The "projection on the wall" system requested in the brief.

   When a student steps through a lesson, the explanation text is rendered onto
   a large stylish panel mounted FLAT on the wall behind the station. Because
   it's mounted on the wall (not billboarded), it reads like a classroom
   projector screen. To keep it "visible from any viewing point", the panel is:
     - large and high-contrast (dark glass background, bright text),
     - emissive so it stays bright regardless of room lighting,
     - gently auto-scaled, and
     - paired with a soft glow frame.

   Each station owns one WallProjector. The station calls .show(textLines).
   ========================================================================= */

import * as THREE from "three";

const DPR = 3;

export class WallProjector extends THREE.Group {
  /**
   * @param {object} opts {width, height} of the projection screen in metres
   */
  constructor(opts = {}) {
    super();
    this.opts = Object.assign({ width: 3.4, height: 2.0 }, opts);
    this._targetOpacity = 0;
    this._build();
    this.visible = false;
  }

  _build() {
    const { width: W, height: H } = this.opts;

    // Glow frame behind the screen
    const frame = new THREE.Mesh(
      new THREE.PlaneGeometry(W + 0.18, H + 0.18),
      new THREE.MeshBasicMaterial({
        color: 0x4cc9f0,
        transparent: true,
        opacity: 0.0,
        depthWrite: false,
      })
    );
    frame.position.z = -0.012;
    this.add(frame);
    this._frame = frame;

    // The screen itself (canvas texture, emissive so it's always readable)
    this._mat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(W, H), this._mat);
    this.add(screen);
    this._screen = screen;

    // Title bar strip at top
    this._render({ title: "", body: [""] });
  }

  /**
   * Render content to the projection.
   * @param {object} content {title:string, body:string[], accent:hexCss}
   */
  _render(content) {
    const { title = "", body = [], accent = "#4cc9f0" } = content;
    const { width: W, height: H } = this.opts;

    const cw = Math.round(1024 * DPR * (W / H) * 0.5);
    const ch = Math.round(1024 * DPR * 0.5);
    const canvas = document.createElement("canvas");
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext("2d");

    // Background: dark frosted glass with a vertical gradient + vignette
    const grad = ctx.createLinearGradient(0, 0, 0, ch);
    grad.addColorStop(0, "rgba(14,20,42,0.96)");
    grad.addColorStop(1, "rgba(8,12,26,0.96)");
    ctx.fillStyle = grad;
    roundRect(ctx, 0, 0, cw, ch, 40 * DPR);
    ctx.fill();

    // Accent header band
    ctx.fillStyle = accent;
    roundRect(ctx, 0, 0, cw, 120 * DPR, 40 * DPR);
    ctx.fill();
    ctx.fillStyle = "rgba(8,12,26,0.96)";
    ctx.fillRect(0, 80 * DPR, cw, 50 * DPR);

    // Title
    ctx.fillStyle = "#06121a";
    ctx.font = `700 ${52 * DPR}px "Segoe UI", Roboto, sans-serif`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.fillText(title, 56 * DPR, 60 * DPR);

    // Body lines (math + prose). Auto-fit font to available height.
    const top = 170 * DPR;
    const bottom = ch - 60 * DPR;
    const avail = bottom - top;
    const n = Math.max(body.length, 1);
    let fs = Math.min(48 * DPR, (avail / n) * 0.62);
    fs = Math.max(fs, 22 * DPR);
    const lh = avail / n;

    ctx.textAlign = "left";
    body.forEach((line, i) => {
      const isMath = /[=≈∑√µσλπ∞]/.test(line) || /\bP\(|f\(|L\(/.test(line);
      ctx.font = `${isMath ? "italic " : ""}${fs}px ${
        isMath ? '"Cambria Math", Georgia, serif' : '"Segoe UI", Roboto, sans-serif'
      }`;
      ctx.fillStyle = isMath ? "#ffe39e" : "#eaf1ff";
      ctx.fillText(line, 56 * DPR, top + lh * (i + 0.5));
    });

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    tex.needsUpdate = true;
    if (this._mat.map) this._mat.map.dispose();
    this._mat.map = tex;
    this._mat.needsUpdate = true;
    this._frame.material.color.set(accent);
  }

  /** Show with content; fades in. */
  show(content) {
    this._render(content);
    this.visible = true;
    this._targetOpacity = 1;
  }

  /** Hide; fades out. */
  hide() {
    this._targetOpacity = 0;
  }

  update(dt) {
    const speed = 4.0;
    const o = this._mat.opacity;
    const next = o + (this._targetOpacity - o) * Math.min(1, dt * speed);
    this._mat.opacity = next;
    this._frame.material.opacity = next * 0.4;
    if (next < 0.01 && this._targetOpacity === 0) this.visible = false;
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
