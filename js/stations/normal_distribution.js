/* =========================================================================
   js/stations/normal_distribution.js   —   MEMBER 3  (Sections 3.1 & 3.2)
   -------------------------------------------------------------------------
   OWNED BY: Team member 3.
   You can edit THIS FILE freely without affecting members 1 and 2.
   This file registers TWO stations (Normal, Normal-approx-to-Binomial).

   SECTION 3.1 — Normal (Gaussian) Distribution:
     f(x) = 1/√(2πσ²) · exp( −(x−µ)² / (2σ²) ),   −∞ < x < ∞
     If X ~ N(µ, σ²): E[X] = µ, Var(X) = σ².
     Standardize:  Z = (X − µ) / σ ~ N(0, 1).
     Z-table example: P(Z < 0.36) = 1 − P(Z > 0.36) = 1 − 0.3594 = 0.6406.

   SECTION 3.2 — Normal approximation to the Binomial:
     If X ~ B(n, p) with np > 5 and n(1−p) > 5, then approximately
     X ~ N(µ = np, σ² = np(1−p)). Apply a continuity correction (±0.5).

   MATH → 3D MAPPING:
     - The density f(x) becomes a glowing bell-curve tube in the plot's XY plane.
     - µ (the mean) becomes a pulsing marker at the peak / center line.
     - σ (spread) is shown by re-plotting the curve wider/narrower between steps.
     - Standardization is shown by morphing the axis labels' meaning: the same
       bell is reused with µ=0, σ=1 and the Z=0.36 cut highlighted with a
       shaded region marker.
     - For 3.2 we overlay discrete binomial bars (reusing the same bar tool)
       UNDER the continuous bell so the approximation is literally visible.
   ========================================================================= */

import * as THREE from "three";
import { registerStation } from "../core/StationRegistry.js";
import { BaseStation } from "./BaseStation.js";
import { makeTextSprite } from "../core/TextSprite.js";

/* -------------------------------------------------------------------------
   BINOMIAL-STYLE PRESENTATION HELPERS  (matches Member 2's look)
   -------------------------------------------------------------------------
   Mirror the helpers in binomial_and_poisson.js so these boards share the same
   look: explanation panel docked TOP-RIGHT inside the board, numeric axis
   labels, no origin orientation arrows. Local to this file for independence.
   --------------------------------------------------------------------------- */
const PANEL_SCALE = 0.42; // bigger text than binomial's 0.32, still on-board

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
  const y = boardHalfH - margin - projH / 2;
  let x;
  if (side === "left") {
    x = (-boardHalfW + margin) + projW / 2;
  } else {
    x = (boardHalfW - margin) - projW / 2;
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
  const { xStep = 1, xTicks = null, yTicks = [0, 0.1, 0.2, 0.3], xTitle = "x", yTitle = "y" } = opts;
  const cfg = plot.cfg;
  const halfW = cfg.width / 2;
  const halfH = cfg.height / 2;
  const baseY = (cfg.yMin <= 0 && cfg.yMax >= 0) ? 0 : cfg.yMin;

  const xs = xTicks || (() => {
    const arr = [];
    for (let x = Math.ceil(cfg.xMin); x <= cfg.xMax; x += xStep) arr.push(x);
    return arr;
  })();
  for (const xv of xs) {
    if (xv < cfg.xMin || xv > cfg.xMax) continue;
    const label = makeTextSprite(String(xv), {
      worldHeight: 0.18, color: "#eef4ff", bold: true, align: "center",
    });
    const p = plot.toLocal(xv, baseY, 0.05);
    label.position.set(p.x, p.y - 0.12, 0.05);
    plot.add(label);
  }
  for (const yv of yTicks) {
    if (yv < cfg.yMin || yv > cfg.yMax) continue;
    const label = makeTextSprite(Number.isInteger(yv) ? String(yv) : yv.toFixed(yv < 0.1 ? 2 : 1), {
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

// ---------- math helpers ----------------------------------------------------
function normalPDF(x, mu, sigma) {
  return (1 / (Math.sqrt(2 * Math.PI) * sigma)) * Math.exp(-((x - mu) ** 2) / (2 * sigma * sigma));
}
function choose(n, k) {
  if (k < 0 || k > n) return 0;
  k = Math.min(k, n - k);
  let c = 1;
  for (let i = 0; i < k; i++) c = (c * (n - i)) / (i + 1);
  return c;
}
function binomPMF(n, p, k) {
  return choose(n, k) * Math.pow(p, k) * Math.pow(1 - p, n - k);
}

/* Example buttons (same approach as Member 2): two floating buttons that, when
   near THIS board, set the station mode and trigger the normal Interact flow so
   begin() builds the chosen example step-set. Purely additive. */
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

/* =======================================================================
   3.1  NORMAL DISTRIBUTION
   ======================================================================= */
class NormalStation extends BaseStation {
  // Member-2-style: dock the explanation into the board's top-right corner.
  _placeProjector() {
    placeProjectorInCorner(this, "left");
  }
  plotOffset() {
    return { x: 0.4, y: -0.15 };
  }
  plotConfig() {
    // Same board-relative proportions as Member 2 (2.4 x 1.5) so all graphs
    // match in size once BaseStation scales the whole station.
    return { xMin: -4, xMax: 4, yMin: 0, yMax: 0.5, width: 1.8, height: 1.7 };
  }
  buildGraph(plot) {
    removeOrientationArrows(plot);
    addAxisLabels(plot, {
      xStep: 1,
      yTicks: [0, 0.1, 0.2, 0.3, 0.4, 0.5],
      xTitle: "x  (or z)",
      yTitle: "f(x)",
    });
    this.mode = "lesson";
  }
  begin() {
    if (this.mode === "example1") this.steps = this.defineExample1Steps();
    else if (this.mode === "example2") this.steps = this.defineExample2Steps();
    else this.steps = this.defineSteps();
    super.begin();
  }
  end() {
    super.end();
    this.mode = "lesson";
  }

  _bell(plot, mu, sigma, color = 0x4cc9f0) {
    plot.plotFunction((x) => normalPDF(x, mu, sigma), {
      color,
      radius: 0.014,
      clampY: false,
    });
    plot.marker(mu, normalPDF(mu, mu, sigma), { color: 0xf72585, size: 0.045 });
  }

  defineSteps() {
    return [
      {
        board: {
          title: "3.1 Normal curve",
          accent: "#4cc9f0",
          body: [
            "Continuous, symmetric,",
            "bell-shaped curve.",
            "Two params: µ and σ.",
            "Here µ=0, σ=1 (standard).",
          ],
        },
        enter: (plot) => this._bell(plot, 0, 1, 0x4cc9f0),
      },
      {
        board: {
          title: "3.1 µ shifts, σ spreads",
          accent: "#ffd166",
          body: [
            "E[X] = µ → peak at x=µ.",
            "Var(X) = σ² → bigger σ,",
            "wider, flatter bell.",
            "Here µ=1, σ=1.5.",
          ],
        },
        enter: (plot) => this._bell(plot, 1, 1.5, 0xffd166),
      },
      {
        board: {
          title: "3.1 Standardize X → Z",
          accent: "#69f0ae",
          body: [
            "Z = (X − µ)/σ.",
            "Turns any normal into",
            "the N(0,1) curve.",
            "Point Z = 0.36 marked.",
          ],
        },
        enter: (plot) => {
          this._bell(plot, 0, 1, 0x69f0ae);
          plot.marker(0.36, normalPDF(0.36, 0, 1), { color: 0xff8a65, size: 0.04, pulse: false });
          plot.segment(0.36, 0, 0.36, normalPDF(0.36, 0, 1), { color: 0xff8a65, radius: 0.008 });
        },
      },
      {
        board: {
          title: "3.1 Reading the Z-table",
          accent: "#f72585",
          body: [
            "Find P(Z < 0.36).",
            "Upper tail = 0.3594.",
            "P = 1 − 0.3594",
            "  = 0.6406  (≈ 64%).",
          ],
        },
        enter: (plot) => {
          this._bell(plot, 0, 1, 0x4cc9f0);
          for (let x = -3.5; x <= 0.36; x += 0.25) {
            plot.bar(x, normalPDF(x, 0, 1), { color: 0x4cc9f0, widthMath: 0.22 });
          }
          plot.segment(0.36, 0, 0.36, normalPDF(0.36, 0, 1), { color: 0xff8a65, radius: 0.01 });
        },
      },
    ];
  }

  // ---- EXAMPLE 1: a Z-score probability question --------------------------
  defineExample1Steps() {
    return [
      {
        board: {
          title: "Example 1 — Z-score",
          accent: "#4cc9f0",
          body: [
            "Scores ~ N(µ=70, σ=10).",
            "What is P(X < 85)?",
            "Standardize the value:",
            "Z = (85−70)/10 = 1.5.",
          ],
        },
        enter: (plot) => {
          this._bell(plot, 0, 1, 0x4cc9f0);
          plot.marker(1.5, normalPDF(1.5, 0, 1), { color: 0xff8a65, size: 0.04, pulse: false });
          plot.segment(1.5, 0, 1.5, normalPDF(1.5, 0, 1), { color: 0xff8a65, radius: 0.008 });
        },
      },
      {
        board: {
          title: "Example 1 — answer",
          accent: "#69f0ae",
          body: [
            "P(Z < 1.5) from table",
            "= 0.9332.",
            "So about 93% score",
            "below 85.",
          ],
        },
        enter: (plot) => {
          this._bell(plot, 0, 1, 0x69f0ae);
          for (let x = -3.5; x <= 1.5; x += 0.25) {
            plot.bar(x, normalPDF(x, 0, 1), { color: 0x4cc9f0, widthMath: 0.22 });
          }
          plot.segment(1.5, 0, 1.5, normalPDF(1.5, 0, 1), { color: 0xff8a65, radius: 0.01 });
        },
      },
    ];
  }

  // ---- EXAMPLE 2: the 68–95–99.7 rule -------------------------------------
  defineExample2Steps() {
    return [
      {
        board: {
          title: "Example 2 — 68 rule",
          accent: "#4cc9f0",
          body: [
            "Within ±1σ of the mean",
            "lies about 68% of area.",
            "Shaded: z from −1 to 1.",
          ],
        },
        enter: (plot) => {
          this._bell(plot, 0, 1, 0x4cc9f0);
          for (let x = -1; x <= 1; x += 0.2) {
            plot.bar(x, normalPDF(x, 0, 1), { color: 0x69f0ae, widthMath: 0.18 });
          }
        },
      },
      {
        board: {
          title: "Example 2 — 95 rule",
          accent: "#69f0ae",
          body: [
            "Within ±2σ lies ~95%.",
            "Within ±3σ lies ~99.7%.",
            "Shaded: z from −2 to 2.",
          ],
        },
        enter: (plot) => {
          this._bell(plot, 0, 1, 0x69f0ae);
          for (let x = -2; x <= 2; x += 0.2) {
            plot.bar(x, normalPDF(x, 0, 1), { color: 0xffd166, widthMath: 0.18 });
          }
        },
      },
    ];
  }
}

/* =======================================================================
   3.2  NORMAL APPROXIMATION TO THE BINOMIAL
   ======================================================================= */
class NormalApproxStation extends BaseStation {
  _placeProjector() {
    placeProjectorInCorner(this, "left");
  }
  plotOffset() {
    return { x: 0.4, y: -0.15 };
  }
  plotConfig() {
    return { xMin: -0.5, xMax: 20.5, yMin: 0, yMax: 0.22, width: 1.8, height: 1.7 };
  }
  buildGraph(plot) {
    this.N = 20;
    this.mode = "lesson";
    removeOrientationArrows(plot);
    addAxisLabels(plot, {
      xTicks: [0, 4, 8, 12, 16, 20],
      yTicks: [0, 0.05, 0.1, 0.15, 0.2],
      xTitle: "k (successes)",
      yTitle: "P(X = k)",
    });
  }
  _bars(plot, p, color = 0x2c6e8c) {
    for (let k = 0; k <= this.N; k++) {
      plot.bar(k, binomPMF(this.N, p, k), { color, widthMath: 0.75 });
    }
  }
  _bell(plot, mu, sigma, color = 0xffd166) {
    plot.plotFunction((x) => normalPDF(x, mu, sigma), {
      color,
      radius: 0.013,
      xMin: 0,
      xMax: this.N,
      clampY: false,
    });
  }

  begin() {
    if (this.mode === "example1") this.steps = this.defineExample1Steps();
    else if (this.mode === "example2") this.steps = this.defineExample2Steps();
    else this.steps = this.defineSteps();
    super.begin();
  }
  end() {
    super.end();
    this.mode = "lesson";
  }

  defineSteps() {
    return [
      {
        board: {
          title: "3.2 Bell for bars?",
          accent: "#4cc9f0",
          body: [
            "Binomial = bars.",
            "Normal = smooth curve.",
            "OK if np>5 and n(1−p)>5.",
            "n=20, p=0.5 → both =10 ✓",
          ],
        },
        enter: (plot) => this._bars(plot, 0.5),
      },
      {
        board: {
          title: "3.2 Match µ and σ²",
          accent: "#ffd166",
          body: [
            "µ = np = 10.",
            "σ² = np(1−p) = 5.",
            "σ = √5 ≈ 2.24.",
            "Overlay N(10, 5).",
          ],
        },
        enter: (plot) => {
          this._bars(plot, 0.5);
          this._bell(plot, this.N * 0.5, Math.sqrt(this.N * 0.5 * 0.5));
          plot.marker(this.N * 0.5, normalPDF(this.N * 0.5, this.N * 0.5, Math.sqrt(5)), {
            color: 0xf72585,
            size: 0.04,
          });
        },
      },
      {
        board: {
          title: "3.2 ±0.5 correction",
          accent: "#69f0ae",
          body: [
            "Bars have width 1.",
            "P(X ≤ 10): go up to 10.5.",
            "P(X ≥ 10): start at 9.5.",
            "±0.5 covers each bar.",
          ],
        },
        enter: (plot) => {
          this._bars(plot, 0.5);
          this._bell(plot, this.N * 0.5, Math.sqrt(5));
          plot.segment(10.5, 0, 10.5, normalPDF(10.5, this.N * 0.5, Math.sqrt(5)) + 0.02, {
            color: 0xff8a65,
            radius: 0.012,
          });
          plot.marker(10.5, 0, { color: 0xff8a65, size: 0.035, pulse: true });
        },
      },
    ];
  }

  // ---- EXAMPLE 1: p shifted (n=20, p=0.3) ---------------------------------
  defineExample1Steps() {
    const p = 0.3, mu = this.N * p, sigma = Math.sqrt(this.N * p * (1 - p));
    return [
      {
        board: {
          title: "Example 1 — p = 0.3",
          accent: "#4cc9f0",
          body: [
            "n = 20, p = 0.3.",
            "np = 6, n(1−p) = 14.",
            "Both > 5, so OK ✓",
            "µ = 6, σ ≈ 2.05.",
          ],
        },
        enter: (plot) => {
          this._bars(plot, p);
          this._bell(plot, mu, sigma);
          plot.marker(mu, normalPDF(mu, mu, sigma), { color: 0xf72585, size: 0.04 });
        },
      },
      {
        board: {
          title: "Example 1 — shape",
          accent: "#69f0ae",
          body: [
            "Peak moves left to k=6.",
            "Curve still hugs bars.",
            "Skew is mild here,",
            "so the fit is good.",
          ],
        },
        enter: (plot) => {
          this._bars(plot, p);
          this._bell(plot, mu, sigma);
        },
      },
    ];
  }

  // ---- EXAMPLE 2: when approximation is POOR (small np) -------------------
  defineExample2Steps() {
    const p = 0.05, mu = this.N * p, sigma = Math.sqrt(this.N * p * (1 - p));
    return [
      {
        board: {
          title: "Example 2 — p = 0.05",
          accent: "#f72585",
          body: [
            "n = 20, p = 0.05.",
            "np = 1  (< 5!).",
            "Rule fails here.",
            "Bars are skewed.",
          ],
        },
        enter: (plot) => {
          this._bars(plot, p);
          plot.marker(1, binomPMF(this.N, p, 1), { color: 0xf72585, size: 0.04 });
        },
      },
      {
        board: {
          title: "Example 2 — poor fit",
          accent: "#ffd166",
          body: [
            "Overlay N(1, 0.95).",
            "Curve misses the bars",
            "and dips below zero.",
            "Use Poisson instead.",
          ],
        },
        enter: (plot) => {
          this._bars(plot, p);
          this._bell(plot, mu, sigma);
        },
      },
    ];
  }
}

// --- register both stations -------------------------------------------------
registerStation({
  id: "normal",
  title: "3.1 · Normal Distribution",
  section: "3.1",
  wall: { side: "right", t: -0.45, y: 1.7 },
  projectorSide: -1,
  create: (def, ctx) => {
    const station = new NormalStation(def, ctx);
    setupExampleButtons(station, def.title, "normal");
    return station;
  },
});

registerStation({
  id: "normal-approx",
  title: "3.2 · Normal ≈ Binomial",
  section: "3.2",
  wall: { side: "right", t: 0.45, y: 1.7 },
  projectorSide: -1,
  create: (def, ctx) => {
    const station = new NormalApproxStation(def, ctx);
    setupExampleButtons(station, def.title, "normalapprox");
    return station;
  },
});
