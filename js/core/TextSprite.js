/* =========================================================================
   js/core/TextSprite.js  —  SHARED
   Renders crisp text (including simple math notation) to a canvas, wraps it
   in a THREE.Sprite so it always billboards toward the camera but lives in
   real 3D space. This is the "xb.Text2D / sprite-based 3D text" mechanism the
   brief asks for.

   We render to a high-resolution canvas (for retina phones) and downscale via
   the sprite's world scale, so text stays sharp on a 6-inch screen.
   ========================================================================= */

import * as THREE from "three";

const DPR = 4; // supersample factor for crisp text on phones

/**
 * Create a billboarded text sprite.
 * @param {string|string[]} lines  One string, or array of lines.
 * @param {object} opts
 * @returns {THREE.Sprite} sprite with .userData.setText(lines) for updates
 */
export function makeTextSprite(lines, opts = {}) {
  const {
    fontSize = 44, // logical px
    fontFamily = '"Cambria Math", "Times New Roman", Georgia, serif',
    color = "#f4f8ff",
    bg = "rgba(0,0,0,0)",
    padding = 28,
    lineHeight = 1.32,
    align = "center",
    worldHeight = 0.28, // metres tall PER LINE (drives final size)
    bold = false,
  } = opts;

  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      transparent: true,
      depthTest: true,
      depthWrite: false,
    })
  );

  function render(text) {
    const arr = Array.isArray(text) ? text : String(text).split("\n");
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const weight = bold ? "700 " : "400 ";
    const font = `${weight}${fontSize * DPR}px ${fontFamily}`;
    ctx.font = font;

    // Measure
    let maxW = 0;
    for (const ln of arr) maxW = Math.max(maxW, ctx.measureText(ln).width);
    const padPx = padding * DPR;
    const lhPx = fontSize * DPR * lineHeight;
    canvas.width = Math.ceil(maxW + padPx * 2);
    canvas.height = Math.ceil(lhPx * arr.length + padPx * 2);

    // Re-apply (resizing the canvas resets the context)
    ctx.font = font;
    ctx.textBaseline = "middle";
    ctx.textAlign = align;

    if (bg && bg !== "rgba(0,0,0,0)") {
      ctx.fillStyle = bg;
      roundRect(ctx, 0, 0, canvas.width, canvas.height, 24 * DPR);
      ctx.fill();
    }

    ctx.fillStyle = color;
    const x =
      align === "center" ? canvas.width / 2 : align === "right" ? canvas.width - padPx : padPx;
    arr.forEach((ln, i) => {
      ctx.fillText(ln, x, padPx + lhPx * (i + 0.5));
    });

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.needsUpdate = true;

    if (sprite.material.map) sprite.material.map.dispose();
    sprite.material.map = tex;
    sprite.material.needsUpdate = true;

    // Scale sprite to keep a constant world height per line, preserving aspect.
    const aspect = canvas.width / canvas.height;
    const h = worldHeight * arr.length;
    sprite.scale.set(h * aspect, h, 1);
  }

  render(lines);

  // Allow live updates (used by step-through and animations)
  sprite.userData.setText = render;
  return sprite;
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
