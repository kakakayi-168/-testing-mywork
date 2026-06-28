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

   MATH → 3D MAPPING (how the equations become things in the room):
     - We pick a concrete curve f(x) = x²  (clear curvature, easy derivative).
     - a = 1, so f(a) = 1 and f'(x) = 2x ⇒ f'(a) = 2.
     - The curve is drawn as a glowing tube in the plot's XY plane.
     - The point (a, f(a)) becomes a pulsing 3D marker (the tangency point).
     - The tangent line L(x) becomes a straight 3D segment through that marker
       with slope f'(a); it visibly "extends" outward as the step plays.
     - "x near a" is shown by a second marker sliding along the x-axis toward a,
       with vertical drop-lines comparing f(x) (true) vs L(x) (approximation).
   ========================================================================= */

import * as THREE from "three";
import { registerStation } from "../core/StationRegistry.js";
import { BaseStation } from "./BaseStation.js";
import { makeTextSprite } from "../core/TextSprite.js";

/* -------------------------------------------------------------------------
   BINOMIAL-STYLE PRESENTATION HELPERS  (matches Member 2's look)
   -------------------------------------------------------------------------
   These mirror the helpers in binomial_and_poisson.js so this board has the
   SAME look: the explanation panel docked in the board's TOP-RIGHT corner,
   numeric axis labels, and no origin orientation arrows. Kept local to this
   file so it stays independent of the other members' files.
   --------------------------------------------------------------------------- */
const PANEL_SCALE = 0.50; // bigger text than binomial's 0.32, still on-board

function placeProjectorInCorner(station, side = "right", minLeftX = null) {
  const proj = station.projector;
  const boardHalfW = 2.9 / 2;
  const boardHalfH = 2.2 / 2;
  const margin = 0.07;

  let scale = PANEL_SCALE;
  if (minLeftX !== null) {
    const rightEdge = boardHalfW - margin;
    const wantW = Math.max(0.6, rightEdge - minLeftX);
    scale = Math.min(PANEL_SCALE, wantW / 3.4);
  }
  proj.scale.setScalar(scale);

  const projW = 3.4 * scale;
  const projH = 2.0 * scale;
  const y = boardHalfH - margin - projH / 2; // top corner
  let x;
  if (side === "left") {
    const leftEdge = -boardHalfW + margin; // pin left edge
    x = leftEdge + projW / 2; // grows rightward
  } else {
    const rightEdge = boardHalfW - margin; // pin right edge
    x = rightEdge - projW / 2; // grows leftward
  }
  proj.position.set(x, y, 0.08);
}

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

function addAxisLabels(plot, opts = {}) {
  const { xStep = 1, yTicks = [0, 0.1, 0.2, 0.3], xTitle = "x", yTitle = "y" } = opts;
  const cfg = plot.cfg;
  const halfW = cfg.width / 2;
  const halfH = cfg.height / 2;
  const baseY = (cfg.yMin <= 0 && cfg.yMax >= 0) ? 0 : cfg.yMin;

  for (let x = Math.ceil(cfg.xMin); x <= cfg.xMax; x += xStep) {
    const label = makeTextSprite(String(x), {
      worldHeight: 0.18, color: "#eef4ff", bold: true, align: "center",
    });
    const p = plot.toLocal(x, baseY, 0.05);
    label.position.set(p.x, p.y - 0.12, 0.05);
    plot.add(label);
  }
  for (const yv of yTicks) {
    if (yv < cfg.yMin || yv > cfg.yMax) continue;
    const label = makeTextSprite(Number.isInteger(yv) ? String(yv) : yv.toFixed(1), {
      worldHeight: 0.16, color: "#eef4ff", bold: true, align: "left",
    });
    const p = plot.toLocal(cfg.xMin, yv, 0.05);
    label.position.set(p.x + 0.02, p.y, 0.07);
    plot.add(label);
  }
  const xt = makeTextSprite(xTitle, {
    worldHeight: 0.17, color: "#eef4ff", bold: true, align: "center",
  });
  const xRowY = plot.toLocal(0, baseY).y - 0.12;
  xt.position.set(0, Math.max(xRowY - 0.16, -halfH), 0.07);
  plot.add(xt);
  const yt = makeTextSprite(yTitle, {
    worldHeight: 0.17, color: "#eef4ff", bold: true, align: "left",
  });
  yt.position.set(-halfW + 0.3, halfH - 0.13, 0.07);
  plot.add(yt);
}

// --- the concrete example used throughout this station ---------------------
const f = (x) => x * x; // f(x) = x^2
const fp = (x) => 2 * x; // f'(x) = 2x
const A = 1; // the point a
const FA = f(A); // f(a) = 1
const FPA = fp(A); // f'(a) = 2
const L = (x) => FA + FPA * (x - A); // L(x) = 1 + 2(x - 1)

/* Example buttons (same approach as Member 2): two floating buttons that, when
   the student is near THIS board, set the station mode and trigger the normal
   Interact flow so begin() builds the chosen example step-set. Purely additive;
   if anything here fails the core lesson still works. */
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

  const titleKey = (stationTitle || "").replace(/^[0-9.\s·]+/, "");
  function refresh() {
    const interactVisible = !interactBtn.classList.contains("hidden");
    const hintText = hint ? hint.textContent || "" : "";
    const nearThisBoard = interactVisible && titleKey && hintText.includes(titleKey);
    wrap.style.display = nearThisBoard ? "flex" : "none";
    requestAnimationFrame(refresh);
  }
  requestAnimationFrame(refresh);
}

class LinearApproxStation extends BaseStation {
  // Member-2-style: dock the explanation into the board's TOP-LEFT corner.
  // The curve/tangent action is on the right side here, so the left has space.
  _placeProjector() {
    placeProjectorInCorner(this, "left");
  }
  plotConfig() {
    // Same board-relative proportions as Member 2's boards (2.4 x 1.5), so the
    // whole-station scale in BaseStation makes all graphs match in size.
    return { xMin: -1, xMax: 3, yMin: -1, yMax: 5, width: 1.8, height: 1.7 };
  }

  buildGraph(plot) {
    // Static base curve f(x)=x^2 is drawn once (not dynamic): it stays for all
    // steps as the reference function. Steps add the tangent/markers on top.
    // Draw f(x)=x² only over the x-range where it stays within the board's
    // y-range (yMax=5 → x ≤ √5 ≈ 2.24), so the curve never shoots off the top
    // of the blackboard. clampY off since we already bound the range.
    const xTopLimit = Math.sqrt(plot.cfg.yMax); // x where x² = yMax
    plot.plotFunction(f, {
      color: 0x4cc9f0,
      radius: 0.014,
      dynamic: false,
      xMin: plot.cfg.xMin,
      xMax: Math.min(plot.cfg.xMax, xTopLimit),
      clampY: false,
    });
    // Binomial-style presentation: drop origin arrows, add numeric axis labels.
    removeOrientationArrows(plot);
    addAxisLabels(plot, {
      xStep: 1,
      yTicks: [-1, 0, 1, 2, 3, 4, 5],
      xTitle: "x",
      yTitle: "f(x)",
    });
    this.mode = "lesson"; // "lesson" | "example1" | "example2"
  }

  // Swap which step-set begin() builds, based on the Example buttons.
  begin() {
    if (this.mode === "example1") this.steps = this.defineExample1Steps();
    else if (this.mode === "example2") this.steps = this.defineExample2Steps();
    else this.steps = this.defineSteps();
    super.begin();
  }
  end() {
    super.end();
    this.mode = "lesson"; // next plain Interact returns to the concept lesson
  }

  // Draw the tangent line of g at point a0, CLIPPED to the board's x- and
  // y-range so it never shoots past the blackboard edge.
  _tangentClipped(plot, g, gp, a0, color = 0xffd166) {
    const L0 = (x) => g(a0) + gp(a0) * (x - a0);
    const { xMin, xMax, yMin, yMax } = plot.cfg;
    const slope = gp(a0);
    // candidate x where the line crosses the y-bounds, plus the x-bounds
    const cand = [xMin, xMax];
    if (Math.abs(slope) > 1e-9) {
      cand.push(a0 + (yMin - g(a0)) / slope);
      cand.push(a0 + (yMax - g(a0)) / slope);
    }
    // keep only x inside [xMin,xMax] whose y is inside [yMin,yMax]
    const ok = cand
      .filter((x) => x >= xMin - 1e-9 && x <= xMax + 1e-9)
      .filter((x) => L0(x) >= yMin - 1e-9 && L0(x) <= yMax + 1e-9);
    if (ok.length < 2) return; // line doesn't cross the visible area
    const xLo = Math.min(...ok);
    const xHi = Math.max(...ok);
    plot.segment(xLo, L0(xLo), xHi, L0(xHi), { color, radius: 0.013 });
  }

  defineSteps() {
    return [
      {
        board: {
          title: "Linear Approximation",
          accent: "#4cc9f0",
          body: [
            "Replace a curve with a",
            "straight line near a point.",
            "f(x) = x²  (blue curve).",
            "Zoom near x = a = 1.",
          ],
        },
        enter: (plot) => {
          plot.marker(A, FA, { color: 0xf72585, pulse: true });
        },
      },
      {
        board: {
          title: "Slope from f '(a)",
          accent: "#ffd166",
          body: [
            "Best line = tangent line.",
            "Slope is f '(x) = 2x.",
            "At a = 1:  f '(a) = 2.",
            "Rises 2 for every 1 across.",
          ],
        },
        enter: (plot) => {
          plot.marker(A, FA, { color: 0xf72585, pulse: true });
          plot.segment(A, FA, A + 1, FA, { color: 0xff8a65, radius: 0.01 });
          plot.segment(A + 1, FA, A + 1, FA + FPA, { color: 0xff8a65, radius: 0.01 });
        },
      },
      {
        board: {
          title: "The tangent line L(x)",
          accent: "#69f0ae",
          body: [
            "L(x) = f(a) + f '(a)(x−a)",
            "L(x) = 1 + 2(x−1) = 2x−1.",
            "Best linear fit at a = 1.",
            "Hugs the curve near x = 1.",
          ],
        },
        enter: (plot) => {
          plot.marker(A, FA, { color: 0xf72585, pulse: true });
          this._tangentClipped(plot, f, fp, A);
        },
      },
      {
        board: {
          title: "Why 'x near a' matters",
          accent: "#f72585",
          body: [
            "Near a:  f(x) ≈ L(x).",
            "x=1.2: f=1.44, L=1.40.",
            "Far off: x=3, f=9, L=5.",
            "Best only NEAR point a.",
          ],
        },
        enter: (plot) => {
          plot.marker(A, FA, { color: 0xf72585, pulse: true });
          this._tangentClipped(plot, f, fp, A);
          for (const x of [1.2, 3]) {
            plot.marker(x, f(x), { color: 0x4cc9f0, pulse: false, size: 0.035 });
            plot.marker(x, L(x), { color: 0xffd166, pulse: false, size: 0.035 });
            plot.segment(x, f(x), x, L(x), { color: 0xff5252, radius: 0.008 });
          }
        },
      },
    ];
  }

  // ---- EXAMPLE 1: linearize a different point on f(x)=x² -------------------
  defineExample1Steps() {
    const a0 = 2, fa0 = f(a0), fpa0 = fp(a0); // a=2, f=4, f'=4
    return [
      {
        board: {
          title: "Example 1 — a = 2",
          accent: "#4cc9f0",
          body: [
            "Same curve f(x) = x².",
            "Now linearize at a = 2.",
            "f(2) = 4,  f '(2) = 4.",
            "Tangent: L(x)=4+4(x−2).",
          ],
        },
        enter: (plot) => {
          plot.marker(a0, fa0, { color: 0xf72585, pulse: true });
          this._tangentClipped(plot, f, fp, a0);
        },
      },
      {
        board: {
          title: "Example 1 — estimate",
          accent: "#69f0ae",
          body: [
            "Estimate (2.1)² with L.",
            "L(2.1)=4+4(0.1)=4.4.",
            "True (2.1)² = 4.41.",
            "Error ≈ 0.01 — tiny!",
          ],
        },
        enter: (plot) => {
          plot.marker(a0, fa0, { color: 0xf72585, pulse: true });
          this._tangentClipped(plot, f, fp, a0);
          plot.marker(2.1, f(2.1), { color: 0x4cc9f0, pulse: false, size: 0.035 });
        },
      },
    ];
  }

  // ---- EXAMPLE 2: a different function, f(x)=√x near a=1 -------------------
  defineExample2Steps() {
    const g = (x) => Math.sqrt(Math.max(x, 0));
    const gp = (x) => 0.5 / Math.sqrt(Math.max(x, 1e-6));
    const a0 = 1;
    return [
      {
        board: {
          title: "Example 2 — √x",
          accent: "#4cc9f0",
          body: [
            "New function: f(x)=√x.",
            "Linearize at a = 1.",
            "f(1)=1,  f '(1)=½.",
            "L(x) = 1 + ½(x−1).",
          ],
        },
        enter: (plot) => {
          plot.plotFunction(g, { color: 0x4cc9f0, radius: 0.013, xMin: 0, xMax: 3 });
          plot.marker(a0, g(a0), { color: 0xf72585, pulse: true });
          this._tangentClipped(plot, g, gp, a0);
        },
      },
      {
        board: {
          title: "Example 2 — estimate",
          accent: "#69f0ae",
          body: [
            "Estimate √1.1 with L.",
            "L(1.1)=1+½(0.1)=1.05.",
            "True √1.1 ≈ 1.0488.",
            "Very close — good fit!",
          ],
        },
        enter: (plot) => {
          plot.plotFunction(g, { color: 0x4cc9f0, radius: 0.013, xMin: 0, xMax: 3 });
          plot.marker(a0, g(a0), { color: 0xf72585, pulse: true });
          this._tangentClipped(plot, g, gp, a0);
          plot.marker(1.1, g(1.1), { color: 0x4cc9f0, pulse: false, size: 0.035 });
        },
      },
    ];
  }
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
    setupExampleButtons(station, def.title, "linear");
    return station;
  },
});
