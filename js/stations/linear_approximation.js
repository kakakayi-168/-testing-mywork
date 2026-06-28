/* =========================================================================
   js/stations/linear_approximation.js   —   MEMBER 1  (Section 1)
   -------------------------------------------------------------------------
   OWNED BY: Team member 1.
   You can edit THIS FILE freely without affecting members 2 and 3.

   THEOREM (Linear Approximation):
     If f is differentiable at a, then for x near a:
            f(x) ≈ f(a) + f'(a)(x − a)
     The line  L(x) = f(a) + f'(a)(x − a)  is the best linear
     approximation (the tangent line) to f at x = a.

   This file matches the polish of the other section boards:
     • axis tick numbers + axis titles, at a readable size;
     • the little RGB orientation arrows removed (flat 2D chart);
     • the explanation panel docked in a CLEAR CORNER, fitted inside its box,
       with every step using the same line count so the font is identical;
     • the graph never overlaps the explanation;
     • two practical worked Examples reachable from on-board buttons.

   MATH → 3D MAPPING:
     - f(x) = x² (clear curvature, easy derivative). a = 1 ⇒ f(a)=1, f'(a)=2.
     - The curve is a glowing tube in the plot's XY plane.
     - (a, f(a)) is a pulsing marker (the tangency point).
     - The tangent line L(x) is a straight segment with slope f'(a).
     - Approximation error is shown by drop-lines between f(x) and L(x).
   ========================================================================= */

import * as THREE from "three";
import { registerStation } from "../core/StationRegistry.js";
import { BaseStation } from "./BaseStation.js";
import { makeTextSprite } from "../core/TextSprite.js";

/* =========================================================================
   SHARED HELPERS (self-contained copies, kept LOCAL to Member 1's file so this
   section stays independent of the other members' files).
   ========================================================================= */

/* Remove the X/Y/Z orientation arrows the shared MathPlot.addAxes() draws.
   This is a flat 2D chart with labelled axes + grid, so the arrows are clutter.
   addAxes() ran in _buildBoard() before buildGraph(), so the arrows already
   exist as children of the plot group; we just remove the ArrowHelpers. */
function removeOrientationArrows(plot) {
  const toRemove = [];
  for (const child of plot.children) {
    if (child instanceof THREE.ArrowHelper) toRemove.push(child);
  }
  for (const a of toRemove) {
    plot.remove(a);
    a.line?.geometry?.dispose?.();
    a.line?.material?.dispose?.();
    a.cone?.geometry?.dispose?.();
    a.cone?.material?.dispose?.();
  }
}

/* Add numeric tick labels + axis titles. The shared MathPlot draws the grid
   but no numbers, so the student can't read the scale without these. Labels
   are STATIC (added once in buildGraph), so the per-step clearDynamic() never
   wipes them. Handles negative ranges (this curve dips below 0). */
function addAxisLabels(plot, opts = {}) {
  const {
    xTicks, // array of x values to label
    yTicks, // array of y values to label
    xTitle = "x",
    yTitle = "y",
  } = opts;
  const cfg = plot.cfg;
  const halfW = cfg.width / 2;
  const halfH = cfg.height / 2;
  const boardHalfH = 2.2 / 2;
  const boardHalfW = 2.9 / 2;

  // ---- X-axis tick numbers, just below the bottom of the plot ----------
  for (const xv of xTicks) {
    if (xv < cfg.xMin || xv > cfg.xMax) continue;
    const label = makeTextSprite(fmt(xv), {
      worldHeight: 0.14,
      color: "#eef4ff",
      bold: true,
      align: "center",
    });
    const p = plot.toLocal(xv, cfg.yMin, 0.05);
    label.position.set(p.x, p.y - 0.12, 0.05);
    plot.add(label);
  }

  // ---- Y-axis tick numbers. Tuck them JUST INSIDE the left plot edge so a
  //      top-left panel (used by this station) never sits on top of them. ----
  for (const yv of yTicks) {
    if (yv < cfg.yMin || yv > cfg.yMax) continue;
    const label = makeTextSprite(fmt(yv), {
      worldHeight: 0.12,
      color: "#eef4ff",
      bold: true,
      align: "left",
    });
    const p = plot.toLocal(cfg.xMin, yv, 0.05);
    label.position.set(p.x + 0.03, p.y, 0.07); // just inside the left edge
    plot.add(label);
    // small tick guide
    plot.segment(cfg.xMin, yv, cfg.xMin + (cfg.xMax - cfg.xMin) * 0.02, yv, {
      color: 0x8fa3d8,
      radius: 0.004,
      dynamic: false,
    });
  }

  // ---- Axis titles -----------------------------------------------------
  const xt = makeTextSprite(xTitle, {
    worldHeight: 0.13,
    color: "#cdd8f5",
    bold: true,
    align: "center",
  });
  const xtp = plot.toLocal((cfg.xMin + cfg.xMax) / 2, cfg.yMin, 0.05);
  const xTitleY = Math.max(xtp.y - 0.28, -boardHalfH + 0.1);
  xt.position.set(0, xTitleY, 0.07);
  plot.add(xt);

  // y-title: horizontal caption in the BOTTOM-right free area (curve is high on
  // the right only near the top; bottom-right is clear), so it never collides
  // with the top-left panel or the y-numbers.
  const yt = makeTextSprite(yTitle, {
    worldHeight: 0.13,
    color: "#cdd8f5",
    bold: true,
    align: "right",
  });
  yt.position.set(halfW - 0.12, -halfH + 0.16, 0.07);
  plot.add(yt);
  void boardHalfW;
}

/* Dock the explanation panel in a clear TOP corner, fitted to the board and at
   a UNIFORM scale (no text distortion). For this station the curve rises to the
   top-RIGHT, so the clear zone — and the panel — is the top-LEFT. The y-axis
   tick numbers are tucked inside the plot (see addAxisLabels), so a top-left
   panel does not cover them. */
function placePanel(station, corner = "left") {
  const proj = station.projector;
  const scale = 0.32; // uniform → panel ≈ 1.09 m wide × 0.64 m tall
  proj.scale.setScalar(scale);

  const projW = 3.4 * scale;
  const projH = 2.0 * scale;
  const boardHalfW = 2.9 / 2;
  const boardHalfH = 2.2 / 2;
  const margin = 0.07;

  const xRight = boardHalfW - margin - projW / 2;
  const x = corner === "left" ? -xRight : xRight;
  const y = boardHalfH - margin - projH / 2;
  proj.position.set(x, y, 0.08);
  station._panelCorner = corner;
}

/* number formatter: clean integers, short decimals */
function fmt(v) {
  if (Math.abs(v - Math.round(v)) < 1e-9) return String(Math.round(v));
  return v.toFixed(1);
}

/* =========================================================================
   MAIN LESSON STATION  —  f(x) = x², a = 1
   ========================================================================= */
const f = (x) => x * x;
const fp = (x) => 2 * x;
const A = 1;
const FA = f(A);
const FPA = fp(A);
const L = (x) => FA + FPA * (x - A);

class LinearApproxStation extends BaseStation {
  // top-left dock (curve is high on the right; left is clear)
  _placeProjector() {
    placePanel(this, "left");
  }

  plotConfig() {
    // yMax must exceed f(xMax)=f(3)=9 so the parabola isn't clipped (a clamped
    // curve renders as a flat line at the ceiling). yMin slightly below 0 to
    // show the vertex sitting on the axis.
    return { xMin: -1, xMax: 3, yMin: -0.5, yMax: 9.5, width: 2.5, height: 1.6 };
  }

  buildGraph(plot) {
    this.mode = "lesson"; // "lesson" | "example1" | "example2"
    removeOrientationArrows(plot);
    // Lesson static-layer config (axis labels + x² curve). Drawn now so the
    // graph and its labelled axes are visible AT REST, before any Interact.
    this._lessonStatic = {
      xMin: -1,
      xMax: 3,
      yMin: -0.5,
      yMax: 9.5,
      xTicks: [-1, 0, 1, 2, 3],
      yTicks: [0, 2, 4, 6],
      xTitle: "x",
      yTitle: "f(x)",
      curve: f,
      curveRadius: 0.014,
    };
    this._drawAxesOnly(plot, this._lessonStatic);
  }

  /* Remove every static item we previously added (curve + axis labels + ticks),
     disposing their geometry. Leaves the grid/board (drawn by BaseStation). */
  _clearStatic(plot) {
    for (const ch of plot.children.slice()) {
      if (ch.userData && ch.userData.__la_static) {
        plot.remove(ch);
        ch.geometry?.dispose?.();
        if (ch.material) {
          (Array.isArray(ch.material) ? ch.material : [ch.material]).forEach((m) => m.dispose?.());
        }
      }
    }
  }

  /* Re-point the plot to a domain/range and draw the axis labels, optionally
     plus the curve. TAG everything static so the next switch removes it.
     At REST we draw axes only (drawCurve=false); on Interact we add the curve. */
  _drawStatic(plot, c, drawCurve = true) {
    this._clearStatic(plot); // wipe any prior static layer first

    plot.cfg.xMin = c.xMin;
    plot.cfg.xMax = c.xMax;
    plot.cfg.yMin = c.yMin;
    plot.cfg.yMax = c.yMax;
    plot.ux = plot.cfg.width / (c.xMax - c.xMin);
    plot.uy = plot.cfg.height / (c.yMax - c.yMin);

    const before = plot.children.length;
    addAxisLabels(plot, {
      xTicks: c.xTicks,
      yTicks: c.yTicks,
      xTitle: c.xTitle,
      yTitle: c.yTitle,
    });
    if (drawCurve) {
      plot.plotFunction(c.curve, { color: 0x4cc9f0, radius: c.curveRadius || 0.013, dynamic: false });
    }
    for (let i = before; i < plot.children.length; i++) {
      plot.children[i].userData = plot.children[i].userData || {};
      plot.children[i].userData.__la_static = true;
    }
  }

  /* Draw ONLY the axes/labels for the resting board (no curve). */
  _drawAxesOnly(plot, c) {
    this._drawStatic(plot, c, false);
  }

  // Swap the active step-set based on the chosen mode (Example buttons).
  begin() {
    if (this.mode === "example1") this.steps = this.defineExample1Steps();
    else if (this.mode === "example2") this.steps = this.defineExample2Steps();
    else {
      this.steps = this.defineSteps();
      // Lesson mode: NOW draw the curve (Interact pressed). At rest only the
      // axes are shown; the blue explanation curve appears here.
      this._drawStatic(this.plot, this._lessonStatic, true);
    }
    super.begin();
  }
  end() {
    super.end();
    this.mode = "lesson";
    // Return to the RESTING board: axes + labels only, NO curve, so the blue
    // explanation graph is hidden until the next Interact.
    this.plot.clearDynamic();
    this._drawAxesOnly(this.plot, this._lessonStatic);
  }

  defineSteps() {
    return [
      {
        board: {
          title: "1. Linear Approximation",
          accent: "#4cc9f0",
          body: [
            "Replace a curve with a straight line",
            "near a chosen point.",
            "Example: f(x) = x² (blue curve).",
            "We work near x = a = 1, f(a) = 1.",
            "Up close, a curve looks straight.",
          ],
        },
        enter: (plot) => {
          placePanel(this, "left");
          plot.marker(A, FA, { color: 0xf72585, pulse: true });
        },
      },
      {
        board: {
          title: "1. Slope from f '(a)",
          accent: "#ffd166",
          body: [
            "The best line is the tangent line.",
            "Its slope is the derivative f '(x).",
            "f '(x) = 2x, so f '(a) = f '(1) = 2.",
            "Rise 2 for every 1 across.",
            "Orange triangle shows the slope.",
          ],
        },
        enter: (plot) => {
          placePanel(this, "left");
          plot.marker(A, FA, { color: 0xf72585, pulse: true });
          plot.segment(A, FA, A + 1, FA, { color: 0xff8a65, radius: 0.01 });
          plot.segment(A + 1, FA, A + 1, FA + FPA, { color: 0xff8a65, radius: 0.01 });
        },
      },
      {
        board: {
          title: "1. The tangent line L(x)",
          accent: "#69f0ae",
          body: [
            "L(x) = f(a) + f '(a)(x − a)",
            "L(x) = 1 + 2(x − 1)",
            "       = 2x − 1.",
            "Yellow line = best linear approx.",
            "It hugs the curve near x = 1.",
          ],
        },
        enter: (plot) => {
          placePanel(this, "left");
          plot.marker(A, FA, { color: 0xf72585, pulse: true });
          plot.segment(plot.cfg.xMin, L(plot.cfg.xMin), plot.cfg.xMax, L(plot.cfg.xMax), {
            color: 0xffd166,
            radius: 0.016,
          });
        },
      },
      {
        board: {
          title: "1. Why 'x near a' matters",
          accent: "#f72585",
          body: [
            "Close to a: f(x) ≈ L(x) (tiny gap).",
            "At x = 1.2: f = 1.44, L = 1.40.",
            "Error ≈ 0.04 — very small.",
            "Far off: at x = 3, f = 9 but L = 5.",
            "Best only NEAR the point a.",
          ],
        },
        enter: (plot) => {
          placePanel(this, "left");
          plot.marker(A, FA, { color: 0xf72585, pulse: true });
          plot.segment(plot.cfg.xMin, L(plot.cfg.xMin), plot.cfg.xMax, L(plot.cfg.xMax), {
            color: 0xffd166,
            radius: 0.016,
          });
          for (const x of [1.2, 3]) {
            plot.marker(x, f(x), { color: 0x4cc9f0, pulse: false, size: 0.035 });
            plot.marker(x, L(x), { color: 0xffd166, pulse: false, size: 0.035 });
            plot.segment(x, f(x), x, L(x), { color: 0xff5252, radius: 0.008 });
          }
        },
      },
    ];
  }

  /* =====================================================================
     EXAMPLE 1 — Heated metal plate (practical area change)
     ---------------------------------------------------------------------
     A square metal plate of side s expands when heated. Its area is A = s².
     The side grows from 10 cm to 10.1 cm; estimate the area increase using
     the linear approximation (the differential).
     A(s)=s², A'(s)=2s, A'(10)=20. ΔA ≈ 20×0.1 = 2 cm² (true 2.01 cm²).
     Polynomial curve → no root symbols to render.
     ===================================================================== */
  defineExample1Steps() {
    const g = (s) => s * s; // area A = s²
    const gp = (s) => 2 * s; // A'(s) = 2s
    const a = 3;
    const Lg = (s) => g(a) + gp(a) * (s - a);
    const setup = (plot) => {
      this._drawStatic(plot, {
        xMin: 0,
        xMax: 6,
        yMin: -2,
        yMax: 36,
        xTicks: [0, 1, 2, 3, 4, 5, 6],
        yTicks: [0, 10, 20],
        xTitle: "s (cm)",
        yTitle: "A (cm²)",
        curve: g,
        curveRadius: 0.016, // thicker so the blue curve reads clearly
      });
      placePanel(this, "left");
    };
    return [
      {
        board: {
          title: "Example 1 — Tile area",
          accent: "#4cc9f0",
          body: [
            "A square tile has side s cm.",
            "Its area is A = s² (blue curve).",
            "The side grows from 3 to 3.2 cm.",
            "Estimate the new area.",
            "Easy base point: a = 3, A(3) = 9.",
          ],
        },
        enter: (plot) => {
          setup(plot);
          plot.marker(a, g(a), { color: 0xf72585, pulse: true });
        },
      },
      {
        board: {
          title: "Example 1 — The slope",
          accent: "#ffd166",
          body: [
            "Rate of area change: A'(s) = 2s.",
            "At a = 3: A'(3) = 2 × 3 = 6.",
            "Area grows ≈ 6 cm² per 1 cm of side.",
            "Tangent: L(s) = 9 + 6(s − 3).",
            "Yellow line = straight approximation.",
          ],
        },
        enter: (plot) => {
          setup(plot);
          plot.marker(a, g(a), { color: 0xf72585, pulse: true });
          plot.segment(plot.cfg.xMin, Lg(plot.cfg.xMin), plot.cfg.xMax, Lg(plot.cfg.xMax), {
            color: 0xffd166,
            radius: 0.016,
          });
        },
      },
      {
        board: {
          title: "Example 1 — The estimate",
          accent: "#69f0ae",
          body: [
            "Extra area ≈ A'(3) × Δs = 6 × 0.2.",
            "ΔA ≈ 1.2 cm².",
            "So A(3.2) ≈ 9 + 1.2 = 10.2 cm².",
            "True value = 3.2² = 10.24 cm².",
            "Line ≈ curve only NEAR s = 3.",
          ],
        },
        enter: (plot) => {
          setup(plot);
          plot.marker(a, g(a), { color: 0xf72585, pulse: true });
          plot.segment(plot.cfg.xMin, Lg(plot.cfg.xMin), plot.cfg.xMax, Lg(plot.cfg.xMax), {
            color: 0xffd166,
            radius: 0.016,
          });
          plot.marker(3.2, Lg(3.2), { color: 0xffd166, pulse: false, size: 0.035 });
        },
      },
    ];
  }

  /* =====================================================================
     EXAMPLE 2 — Expanding cube (practical volume change)
     ---------------------------------------------------------------------
     A cube of side s has volume V = s³. The side grows from 2 cm to 2.03 cm
     (e.g. thermal expansion / a coating); estimate the new volume.
     V(s)=s³, V'(s)=3s², V'(2)=12. V(2.03) ≈ 8 + 12×0.03 = 8.36 cm³
     (true 8.3654 cm³). Polynomial curve → no root symbols.
     ===================================================================== */
  defineExample2Steps() {
    const g = (s) => s * s * s; // volume V = s³
    const gp = (s) => 3 * s * s; // V'(s) = 3s²
    const a = 2;
    const Lg = (s) => g(a) + gp(a) * (s - a);
    const setup = (plot) => {
      this._drawStatic(plot, {
        xMin: 0,
        xMax: 4,
        yMin: -5,
        yMax: 64,
        xTicks: [0, 1, 2, 3, 4],
        yTicks: [0, 16, 32],
        xTitle: "s (cm)",
        yTitle: "V (cm³)",
        curve: g,
        curveRadius: 0.016, // thicker so the blue curve reads clearly
      });
      placePanel(this, "left");
    };
    return [
      {
        board: {
          title: "Example 2 — Cube volume",
          accent: "#4cc9f0",
          body: [
            "A cube has side s cm.",
            "Its volume is V = s³ (blue curve).",
            "The side grows from 2 to 2.2 cm.",
            "Estimate the new volume.",
            "Easy base point: a = 2, V(2) = 8.",
          ],
        },
        enter: (plot) => {
          setup(plot);
          plot.marker(a, g(a), { color: 0xf72585, pulse: true });
        },
      },
      {
        board: {
          title: "Example 2 — The slope",
          accent: "#ffd166",
          body: [
            "Rate of volume change: V'(s) = 3s².",
            "At a = 2: V'(2) = 3 × 4 = 12.",
            "Volume grows ≈ 12 cm³ per 1 cm side.",
            "Tangent: L(s) = 8 + 12(s − 2).",
            "Yellow line = straight approximation.",
          ],
        },
        enter: (plot) => {
          setup(plot);
          plot.marker(a, g(a), { color: 0xf72585, pulse: true });
          plot.segment(plot.cfg.xMin, Lg(plot.cfg.xMin), plot.cfg.xMax, Lg(plot.cfg.xMax), {
            color: 0xffd166,
            radius: 0.016,
          });
        },
      },
      {
        board: {
          title: "Example 2 — The estimate",
          accent: "#69f0ae",
          body: [
            "Extra volume ≈ V'(2) × Δs = 12 × 0.2.",
            "ΔV ≈ 2.4 cm³.",
            "So V(2.2) ≈ 8 + 2.4 = 10.4 cm³.",
            "True value = 2.2³ = 10.65 cm³.",
            "Curve bends above the line — see gap.",
          ],
        },
        enter: (plot) => {
          setup(plot);
          plot.marker(a, g(a), { color: 0xf72585, pulse: true });
          plot.segment(plot.cfg.xMin, Lg(plot.cfg.xMin), plot.cfg.xMax, Lg(plot.cfg.xMax), {
            color: 0xffd166,
            radius: 0.016,
          });
          plot.marker(2.2, Lg(2.2), { color: 0xffd166, pulse: false, size: 0.035 });
        },
      },
    ];
  }
}

/* =========================================================================
   EXAMPLE BUTTONS (HTML, left of the Interact button) — same pattern used on
   the Binomial/Poisson boards, kept LOCAL to this file. Shown only when the
   student is at THIS board; tapping one selects the example then triggers the
   normal Interact flow so Prev/Next/Exit drive the example steps.
   ========================================================================= */
function setupExampleButtons(station, stationTitle, idPrefix) {
  if (typeof document === "undefined") return;
  const interactBtn = document.getElementById("interact-btn");
  const hint = document.getElementById("proximity-hint");
  if (!interactBtn) return;

  const wrap = document.createElement("div");
  wrap.id = idPrefix + "-example-btns";
  wrap.style.cssText = [
    "position:fixed",
    "bottom:calc(40px + env(safe-area-inset-bottom,0px))",
    "right:calc(190px + env(safe-area-inset-right,0px))",
    "display:none",
    "flex-direction:column",
    "gap:10px",
    "z-index:20",
  ].join(";");

  const mkBtn = (label, mode) => {
    const b = document.createElement("button");
    b.textContent = label;
    b.style.cssText = [
      "padding:14px 18px",
      "font-size:15px",
      "font-weight:700",
      "color:#06121a",
      "background:linear-gradient(90deg,#7bdff2,#4cc9f0)",
      "border:none",
      "border-radius:16px",
      "box-shadow:0 6px 18px rgba(76,201,240,0.45)",
      "cursor:pointer",
      "white-space:nowrap",
    ].join(";");
    b.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      station.mode = mode;
      interactBtn.click();
    });
    b.addEventListener("touchstart", () => (b.style.transform = "scale(0.96)"), { passive: true });
    b.addEventListener("touchend", () => (b.style.transform = "scale(1)"), { passive: true });
    return b;
  };

  wrap.appendChild(mkBtn("Example 1", "example1"));
  wrap.appendChild(mkBtn("Example 2", "example2"));
  document.body.appendChild(wrap);

  const titleKey = (stationTitle || "").replace(/^[0-9.\s·]+/, ""); // "Linear Approximation"
  function refresh() {
    const interactVisible = !interactBtn.classList.contains("hidden");
    const hintText = hint ? hint.textContent || "" : "";
    const nearThisBoard = interactVisible && titleKey && hintText.includes(titleKey);
    wrap.style.display = nearThisBoard ? "flex" : "none";
    requestAnimationFrame(refresh);
  }
  requestAnimationFrame(refresh);
}

// --- register this station with the app ------------------------------------
registerStation({
  id: "linear-approx",
  title: "1 · Linear Approximation",
  section: "1",
  wall: { side: "left", t: -0.45, y: 1.7 },
  projectorSide: 1,
  create: (def, ctx) => {
    const station = new LinearApproxStation(def, ctx);
    try {
      setupExampleButtons(station, def.title, "linear");
    } catch (e) {
      console.warn("[linear] example buttons unavailable:", e?.message);
    }
    return station;
  },
});
