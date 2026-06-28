/* =========================================================================
   js/stations/binomial_and_poisson.js   —   MEMBER 2  (Sections 2.1 & 2.2)
   -------------------------------------------------------------------------
   OWNED BY: Team member 2.
   You can edit THIS FILE freely without affecting members 1 and 3.
   This file registers TWO stations (Binomial, Poisson).

   SECTION 2.1 — Binomial Distribution:
     n independent trials, each success with prob p, q = 1−p.
     P(X = k) = C(n,k) pᵏ q⁽ⁿ⁻ᵏ⁾,   k = 0..n,   X ~ Binomial(n, p).

   SECTION 2.2 — Poisson Distribution:
     P(X = k) = e⁻λ λᵏ ⁄ k!,   k = 0,1,2,...   X ~ Poisson(λ).

   MATH → 3D MAPPING:
     - A probability mass function is naturally a bar chart, so each P(X=k)
       becomes a vertical 3D BAR at math-x = k whose height = probability.
     - Bars "grow" from the axis when a step begins (MathPlot animates scale.y).
     - The most likely outcome (mode) is highlighted with a glowing marker.
     - For the Normal-approximation teaser we overlay a smooth bell curve tube
       on top of the binomial bars (links to Member 3's section).
   ========================================================================= */

import * as THREE from "three";
import { registerStation } from "../core/StationRegistry.js";
import { BaseStation } from "./BaseStation.js";
import { makeTextSprite } from "../core/TextSprite.js";

// ---------- math helpers ----------------------------------------------------
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
function poissonPMF(lambda, k) {
  // e⁻λ λᵏ ⁄ k!  computed in log-space for stability
  let logp = -lambda + k * Math.log(lambda);
  for (let i = 2; i <= k; i++) logp -= Math.log(i);
  return Math.exp(logp);
}
function normalPDF(x, mu, sigma) {
  return (1 / (Math.sqrt(2 * Math.PI) * sigma)) * Math.exp(-((x - mu) ** 2) / (2 * sigma * sigma));
}

/* -------------------------------------------------------------------------
   PROJECTOR PLACEMENT OVERRIDE (Member 2)
   -------------------------------------------------------------------------
   By default BaseStation puts a large 3.4 x 2.0 m projection ~3 m to the side
   of the board, so on a phone it overflows its own text and covers the graph
   (and even spills onto the neighbouring board). We don't touch the shared
   files; instead we shrink the projector group and tuck it into the TOP-RIGHT
   CORNER of the board so the student sees BOTH the bars and the explanation at
   once. Scaling a THREE.Group + repositioning is fully local to this file.

   Geometry reference (board is centred on the station origin):
     board half-width  = 2.9 / 2 = 1.45 m   -> X in [-1.45, +1.45]
     board half-height = 2.2 / 2 = 1.10 m   -> Y in [-1.10, +1.10]
     projector native size = 3.4 x 2.0 m at scale 1
   We scale to ~38% (≈1.29 x 0.76 m): big enough to read on a 6" phone when the
   student is at interaction distance, small enough to leave the graph visible.
   --------------------------------------------------------------------------- */
function placeProjectorInCorner(station, side = "right", minLeftX = null) {
  // The panel docks in the TOP-RIGHT corner at a UNIFORM scale (so the text is
  // never stretched). It stays on the RIGHT (never covers the left-side y-axis),
  // and the plot's raised yMax keeps the bars in the lower band so the panel
  // sits in a clear top-right zone.
  //
  // Optional `minLeftX`: a plot x-coordinate the panel's LEFT edge must not go
  // past (used so the panel clears bars up to a given k). If supplied, we keep
  // the right edge pinned near the board edge and shrink the panel uniformly so
  // its left edge lands at minLeftX — text stays undistorted, just smaller.
  const proj = station.projector;
  const boardHalfW = 2.9 / 2;
  const boardHalfH = 2.2 / 2;
  const margin = 0.07;
  const rightEdge = boardHalfW - margin; // 1.38

  let scale = 0.32; // default uniform → panel ≈ 1.09 m wide
  if (minLeftX !== null) {
    // width so that rightEdge - width = minLeftX  → width = rightEdge - minLeftX
    const wantW = Math.max(0.6, rightEdge - minLeftX); // floor so text stays legible
    scale = Math.min(0.32, wantW / 3.4); // never larger than default
  }
  proj.scale.setScalar(scale);

  const projW = 3.4 * scale;
  const projH = 2.0 * scale;
  const x = rightEdge - projW / 2; // right edge pinned, panel grows leftward
  const y = boardHalfH - margin - projH / 2;
  proj.position.set(x, y, 0.08);
  station._panelSide = "right";
  station._panelMinLeftX = minLeftX;
}

/* Reposition the explanation panel. Default places it in the top-right corner
   at full size. Steps call this from enter(); since the panel is fixed on the
   right (clearing the left-side y-axis), this normally just ensures placement. */
function setPanelSide(station, _side) {
  // Reset to the DEFAULT full-size top-right placement (clears any per-step
  // shrink from a previous step like "Changing p").
  placeProjectorInCorner(station, "right", null);
}

/* Place the panel so its LEFT edge sits just right of bar k (so bars at ≤ k are
   fully visible). Used by the "Changing p" step where the p=0.8 bars peak near
   k=8: we want the panel to start at k=6. Converts k to the plot's local x via
   the same mapping the bars use, then nudges a hair right of that bar's edge. */
function setPanelLeftAtK(station, k) {
  const cfg = station.plot.cfg;
  const ux = cfg.width / (cfg.xMax - cfg.xMin); // metres per k
  const barHalf = 0.7 * ux * 0.5; // bars use widthMath 0.7
  const kLocalX = (k - (cfg.xMin + cfg.xMax) / 2) * ux; // bar centre x
  const leftEdge = kLocalX + barHalf + 0.02; // just right of bar k, small gap
  placeProjectorInCorner(station, "right", leftEdge);
}

/* -------------------------------------------------------------------------
   REMOVE THE ORIENTATION AXIS ARROWS (Member 2)
   -------------------------------------------------------------------------
   The shared MathPlot.addAxes() draws three small orientation arrows at the
   origin: X (red/orange), Y (green/light-blue), Z (blue). These are flat 2D
   probability charts with clearly labelled x (k) and y (P(X=k)) axes plus a
   grid, so the little arrows add nothing and just clutter the origin. We strip
   ALL of them here. (The bars/curves are Meshes, not ArrowHelpers, so they are
   never touched.)

   We can't edit the shared file, but addAxes() already ran in _buildBoard()
   before buildGraph(), so the arrows exist as children of the plot group and
   we can remove them after the fact.
   --------------------------------------------------------------------------- */
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

/* -------------------------------------------------------------------------
   AXIS LABELS (Member 2)
   -------------------------------------------------------------------------
   The shared MathPlot draws grid lines + the little RGB orientation axes, but
   it has no numeric tick labels — so the student can't read the actual k and
   probability values (your screenshot). We add them here, from our own file,
   using the same billboard text helper the rest of the project uses.

   These labels are STATIC (they never change between steps), so we add them in
   buildGraph() — that way the per-step clearDynamic() won't erase them.

   Coordinate bridge: plot.toLocal(mathX, mathY) -> local 3D position inside the
   plot group, exactly the same mapping the bars/markers use.
   --------------------------------------------------------------------------- */
function addAxisLabels(plot, opts = {}) {
  const {
    xStep = 1, // label every k = 0,1,2,...
    xMaxLabel = Infinity, // optionally stop labelling past some k (avoid clutter)
    yTicks = [0, 0.1, 0.2, 0.3], // probability gridlines to label
    xTitle = "k (number of successes)",
    yTitle = "P(X = k)",
  } = opts;

  const cfg = plot.cfg;
  const titleColor = "#9fb4e8";

  // ---- X-axis tick numbers: under each integer k -------------------------
  // Larger + bold so the values are as readable as the explanation text.
  // worldHeight 0.14 (bold) gives an on-board glyph close to the projector's
  // body text size once the sprite's internal padding is accounted for.
  for (let k = Math.max(0, Math.ceil(cfg.xMin)); k <= cfg.xMax; k += xStep) {
    if (k > xMaxLabel) break;
    const label = makeTextSprite(String(k), {
      worldHeight: 0.14,
      color: "#eef4ff",
      bold: true,
      align: "center",
    });
    // place just BELOW the x-axis (y = 0); keep clear of the board edge
    const p = plot.toLocal(k, 0, 0.05);
    label.position.set(p.x, p.y - 0.12, 0.05);
    plot.add(label);
  }

  // ---- Y-axis tick numbers: along the left edge --------------------------
  // The board leaves only ~0.15 m left of the plot, too narrow to hold both
  // these numbers and a vertical axis title outside the plot. So we tuck the
  // numbers JUST INSIDE the plot's left edge (slightly over the grid, which is
  // fine and common) — keeping them fully on-board and readable.
  const halfW = cfg.width / 2;
  const halfH = cfg.height / 2;
  for (const yv of yTicks) {
    if (yv < cfg.yMin || yv > cfg.yMax) continue;
    const label = makeTextSprite(yv.toFixed(yv === 0 ? 0 : 1), {
      worldHeight: 0.12,
      color: "#eef4ff",
      bold: true,
      align: "left",
    });
    const p = plot.toLocal(cfg.xMin, yv, 0.05);
    label.position.set(p.x + 0.02, p.y, 0.07); // just inside the left edge
    plot.add(label);
    // small tick guide line on the axis (thin static segment)
    plot.segment(cfg.xMin, yv, cfg.xMin + (cfg.xMax - cfg.xMin) * 0.02, yv, {
      color: 0x8fa3d8,
      radius: 0.004,
      dynamic: false,
    });
  }

  // ---- Axis titles -------------------------------------------------------
  // Geometry: plot area (cfg.width x cfg.height) is centred on the plot origin;
  // the surrounding board is 2.9 x 2.2 m. The bottom margin (~0.20 m) holds the
  // x-title; the cramped left margin can't hold a vertical title beside the
  // y-numbers, so the y-title sits as a horizontal caption in the free TOP-LEFT
  // area of the plot (the explanation panel is docked top-RIGHT, so no clash).
  // Both titles use the same large, bold size as the value numbers.
  const boardHalfH = 2.2 / 2; // 1.10 m hard limit

  // X-title: centred under the axis, placed below the tick-number row in the
  // bottom margin (the plot was sized to leave room), clamped on-board.
  const xTitleH = 0.13;
  const xt = makeTextSprite(xTitle, {
    worldHeight: xTitleH,
    color: "#eef4ff",
    bold: true,
    align: "center",
  });
  const xTickRowY = plot.toLocal(0, 0).y - 0.12; // where the k-numbers sit
  const xTitleY = Math.max(xTickRowY - 0.16, -boardHalfH + xTitleH / 2 + 0.03);
  xt.position.set(0, xTitleY, 0.07);
  plot.add(xt);

  // Y-title: horizontal caption in the top-left free area inside the plot.
  const yt = makeTextSprite(yTitle, {
    worldHeight: 0.13,
    color: "#eef4ff",
    bold: true,
    align: "left",
  });
  yt.position.set(-halfW + 0.3, halfH - 0.13, 0.07);
  plot.add(yt);
}

/* =======================================================================
   2.1  BINOMIAL
   ======================================================================= */
class BinomialStation extends BaseStation {
  constructor(def, ctx) {
    super(def, ctx);
  }
  // Member 2 override: dock the explanation into the board's top-right corner
  // instead of the large off-to-the-side default. See placeProjectorInCorner.
  _placeProjector() {
    placeProjectorInCorner(this);
  }
  plotConfig() {
    // X from 0..n=10 on the x-axis; probability 0..~0.3 on the y-axis.
    return { xMin: -0.5, xMax: 10.5, yMin: 0, yMax: 0.45, width: 2.0, height: 1.25 };
  }
  buildGraph(plot) {
    // Bars are dynamic (per step). Axis labels are static, added once here so
    // the per-step clearDynamic() never wipes them.
    this.N = 10;
    this.mode = "lesson"; // "lesson" | "example1" | "example2"
    removeOrientationArrows(plot); // flat 2D chart — drop the origin arrows
    addAxisLabels(plot, {
      xStep: 1, // k = 0..10
      yTicks: [0, 0.1, 0.2, 0.3, 0.4],
      xTitle: "k (successes)",
      yTitle: "P(X = k)",
    });
  }

  // Swap which step-set begin() builds, based on the mode chosen by the
  // Example buttons. main.js reads this.steps afterwards, so this is enough.
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
  _drawBars(plot, p, accent = 0x4cc9f0, highlightMode = true, n = this.N) {
    let mode = 0,
      modeP = 0;
    for (let k = 0; k <= n; k++) {
      const prob = binomPMF(n, p, k);
      if (prob > modeP) {
        modeP = prob;
        mode = k;
      }
      plot.bar(k, prob, { color: accent, widthMath: 0.7 });
    }
    // Marker sits exactly ON the top of the tallest bar (was floating above).
    if (highlightMode) plot.marker(mode, modeP, { color: 0xf72585, size: 0.04 });
    return { mode, modeP };
  }

  defineSteps() {
    return [
      {
        board: {
          title: "2.1 Binomial — the setup",
          accent: "#4cc9f0",
          body: [
            "Do n independent trials.",
            "Each succeeds with probability p.",
            "Write q = 1 − p (failure).",
            "X = total number of successes.",
            "Here: n = 10, p = 0.5.",
          ],
        },
        enter: (plot) => {
          setPanelSide(this, "right");
          this._drawBars(plot, 0.5, 0x4cc9f0);
        },
      },
      {
        board: {
          title: "2.1 The range of X",
          accent: "#69f0ae",
          body: [
            "X counts how many succeed.",
            "X can be 0, 1, 2, …, up to n.",
            "X ∈ {0, 1, 2, …, n}.",
            "With n = 10, that is 0 to 10.",
            "We write X ~ Binomial(n, p).",
          ],
        },
        enter: (plot) => {
          setPanelSide(this, "right");
          this._drawBars(plot, 0.5, 0x4cc9f0);
        },
      },
      {
        board: {
          title: "2.1 The PMF formula",
          accent: "#ffd166",
          body: [
            "P(X = k) = C(n,k) · pᵏ · q⁽ⁿ⁻ᵏ⁾",
            "C(n,k): ways to choose the k wins.",
            "pᵏ = the k successes.",
            "q⁽ⁿ⁻ᵏ⁾ = the n−k failures.",
            "Each bar height = P(X = k).",
          ],
        },
        enter: (plot) => {
          setPanelSide(this, "right");
          this._drawBars(plot, 0.5, 0x4cc9f0);
        },
      },
      {
        board: {
          title: "2.1 Changing p",
          accent: "#f72585",
          body: [
            "p sets where successes cluster.",
            "With p = 0.8, successes are common.",
            "Bars slide toward larger k (peak ≈ 8).",
            "Mean = n·p.",
            "Variance = n·p·q.",
          ],
        },
        enter: (plot) => {
          // p = 0.8 bars peak near k=8; dock the panel so its left edge sits at
          // k=6, keeping bars k≤6 fully visible to its left.
          setPanelLeftAtK(this, 6);
          this._drawBars(plot, 0.8, 0x69f0ae);
        },
      },
    ];
  }

  /* =====================================================================
     EXAMPLE 1 — Free-throw shooting (practical Binomial)
     ---------------------------------------------------------------------
     A player takes n = 10 free throws; each is made independently with
     probability p = 0.7. X = number made ~ Binomial(10, 0.7).
     Values verified: peak at k = 7 (=np), P(all 10) ≈ 0.028.
     ===================================================================== */
  defineExample1Steps() {
    const n = 10,
      p = 0.7;
    return [
      {
        board: {
          title: "Example 1 — Free throws",
          accent: "#4cc9f0",
          body: [
            "A player takes n = 10 free throws.",
            "Each shot is independent.",
            "Make probability p = 0.7 (q = 0.3).",
            "X = number of shots made.",
            "X ~ Binomial(10, 0.7).",
          ],
        },
        enter: (plot) => {
          setPanelSide(this, "right");
          this._drawBars(plot, p, 0x4cc9f0, true, n);
        },
      },
      {
        board: {
          title: "Example 1 — It's Binomial",
          accent: "#69f0ae",
          body: [
            "Fixed n, independent shots, same p.",
            "So X ~ Binomial(10, 0.7).",
            "P(X = k) = C(10,k)·0.7ᵏ·0.3⁽¹⁰⁻ᵏ⁾",
            "Each bar = chance of exactly k.",
            "Bars peak near the mean.",
          ],
        },
        enter: (plot) => {
          setPanelSide(this, "right");
          this._drawBars(plot, p, 0x69f0ae, true, n);
        },
      },
      {
        board: {
          title: "Example 1 — Reading the chart",
          accent: "#ffd166",
          body: [
            "Most likely: 7 made (≈ 27%).",
            "Mean = n·p = 10 × 0.7 = 7 shots.",
            "P(make all 10) = 0.7¹⁰ ≈ 0.028.",
            "A perfect round is rare.",
            "Misses are expected sometimes.",
          ],
        },
        enter: (plot) => {
          setPanelSide(this, "right");
          this._drawBars(plot, p, 0xffd166, true, n);
        },
      },
    ];
  }

  /* =====================================================================
     EXAMPLE 2 — Guessing a multiple-choice quiz
     ---------------------------------------------------------------------
     n = 8 questions, each with 4 choices, all guessed: p = 0.25.
     X = number correct ~ Binomial(8, 0.25).
     Values verified: peak at k = 2, P(0 correct) ≈ 0.100, P(≥4) ≈ 0.114.
     ===================================================================== */
  defineExample2Steps() {
    const n = 8,
      p = 0.25;
    return [
      {
        board: {
          title: "Example 2 — Guessing a quiz",
          accent: "#4cc9f0",
          body: [
            "A quiz has n = 8 questions.",
            "Each has 4 options; student guesses.",
            "Correct-guess prob p = 0.25 (q = 0.75).",
            "X = number of correct answers.",
            "X ~ Binomial(8, 0.25).",
          ],
        },
        enter: (plot) => {
          setPanelSide(this, "right");
          this._drawBars(plot, p, 0x4cc9f0, true, n);
        },
      },
      {
        board: {
          title: "Example 2 — It's Binomial",
          accent: "#69f0ae",
          body: [
            "8 independent guesses, same p.",
            "So X ~ Binomial(8, 0.25).",
            "P(X = k) = C(8,k)·0.25ᵏ·0.75⁽⁸⁻ᵏ⁾",
            "Each bar = chance of k correct.",
            "Bars peak at the low end.",
          ],
        },
        enter: (plot) => {
          setPanelSide(this, "right");
          this._drawBars(plot, p, 0x69f0ae, true, n);
        },
      },
      {
        board: {
          title: "Example 2 — Reading the chart",
          accent: "#ffd166",
          body: [
            "Most likely: 2 correct (≈ 31%).",
            "Mean = n·p = 8 × 0.25 = 2 correct.",
            "P(0 correct) = 0.75⁸ ≈ 0.100.",
            "P(4 or more) ≈ 0.114.",
            "Guessing rarely scores high.",
          ],
        },
        enter: (plot) => {
          setPanelSide(this, "right");
          this._drawBars(plot, p, 0xffd166, true, n);
        },
      },
    ];
  }
}

/* =======================================================================
   2.2  POISSON
   ======================================================================= */
class PoissonStation extends BaseStation {
  // Member 2 override: same top-right corner docking as the Binomial board.
  _placeProjector() {
    placeProjectorInCorner(this);
  }
  plotConfig() {
    return { xMin: -0.5, xMax: 12.5, yMin: 0, yMax: 0.32, width: 2.0, height: 1.25 };
  }
  buildGraph(plot) {
    this.KMAX = 12;
    this.mode = "lesson"; // "lesson" | "example1" | "example2" — chosen by the
    // HTML Example buttons (created in registerPoissonExampleButtons below). The
    // shared main.js calls begin()/next()/prev()/end() without knowing about
    // modes; we just swap which step-set begin() builds.
    removeOrientationArrows(plot); // flat 2D chart — drop the origin arrows
    addAxisLabels(plot, {
      xStep: 1, // k = 0..12
      yTicks: [0, 0.1, 0.2, 0.3],
      xTitle: "k (events)",
      yTitle: "P(X = k)",
    });
  }

  // Override begin(): rebuild the active step-set from the current mode, THEN
  // run the normal lifecycle. main.js reads this.steps / canNext / canPrev
  // afterwards, so swapping the array here is enough to repurpose Prev/Next.
  begin() {
    if (this.mode === "example1") this.steps = this.defineExample1Steps();
    else if (this.mode === "example2") this.steps = this.defineExample2Steps();
    else this.steps = this.defineSteps();
    super.begin();
  }

  // When a lesson/example ends, reset to the default lesson mode so the next
  // plain "Interact" tap shows the concept steps again.
  end() {
    super.end();
    this.mode = "lesson";
  }
  _drawBars(plot, lambda, accent) {
    let mode = 0,
      modeP = 0;
    for (let k = 0; k <= this.KMAX; k++) {
      const prob = poissonPMF(lambda, k);
      if (prob > modeP) {
        modeP = prob;
        mode = k;
      }
      plot.bar(k, prob, { color: accent, widthMath: 0.7 });
    }
    // Marker sits exactly ON the peak bar's top (was floating above).
    plot.marker(mode, modeP, { color: 0xf72585, size: 0.04 });
  }

  // ---- helpers for the Law of Rare Events steps --------------------------
  // Draw Binomial(n, p) bars — the MAIN subject of these steps. Solid and
  // prominent so the student can clearly see them shift toward the Poisson
  // target as n grows. Slightly narrower than full width so the pink reference
  // points behind/above each bar stay visible.
  _drawBinomBars(plot, n, p, accent = 0x4cc9f0) {
    for (let k = 0; k <= this.KMAX; k++) {
      const prob = binomPMF(n, p, k);
      if (prob > 1e-4) plot.bar(k, prob, { color: accent, widthMath: 0.66 });
    }
  }

  // Overlay the FIXED Poisson(λ) target as a LIGHT connected outline, so it
  // reads as a reference curve the bars converge onto — not as the dominant
  // graph. Thin line + small dots, kept deliberately understated.
  _drawPoissonReference(plot, lambda, color = 0xff5fa2) {
    let prev = null;
    for (let k = 0; k <= this.KMAX; k++) {
      const y = poissonPMF(lambda, k);
      if (prev && (prev.y > 1e-4 || y > 1e-4)) {
        plot.segment(prev.k, prev.y, k, y, { color, radius: 0.005 });
      }
      if (y > 1e-4) plot.marker(k, y, { color, size: 0.018, pulse: false });
      prev = { k, y };
    }
  }

  defineSteps() {
    return [
      {
        board: {
          title: "2.2 Poisson — rare events",
          accent: "#4cc9f0",
          body: [
            "Counts events in a fixed interval.",
            "Events are independent.",
            "Steady average rate λ > 0.",
            "X ∈ {0, 1, 2, …},  X ~ Poisson(λ).",
            "Here: λ = 3.",
          ],
        },
        enter: (plot) => this._drawBars(plot, 3, 0x4cc9f0),
      },
      {
        board: {
          title: "2.2 The PMF",
          accent: "#ffd166",
          body: [
            "P(X = k) = e⁻λ · λᵏ ⁄ k!",
            "λᵏ ⁄ k!: makes the peak shape.",
            "e⁻λ: keeps total probability 1.",
            "λ = 3: P(2) = P(3) exactly (tied peak).",
          ],
        },
        enter: (plot) => this._drawBars(plot, 3, 0x4cc9f0),
      },
      {
        board: {
          title: "2.2 Law of Rare Events",
          accent: "#69f0ae",
          body: [
            "Poisson approximates the Binomial when",
            "n is very large and p is very small,",
            "with λ = np held constant.",
            "Idea: many trials, each a rare success.",
            "Pink outline = fixed Poisson(λ = 3).",
          ],
        },
        // Show the target Poisson(3) outline alone first, so students learn
        // what shape the binomial will converge toward.
        enter: (plot) => {
          this._drawPoissonReference(plot, 3);
        },
      },
      {
        board: {
          title: "2.2 Start: moderate n, larger p",
          accent: "#4cc9f0",
          body: [
            "Hold λ = np = 3 constant.",
            "n = 10,  p = 0.3   (np = 3).",
            "Blue bars = Binomial(10, 0.3).",
            "They roughly follow the pink outline,",
            "but the fit is still loose.",
          ],
        },
        enter: (plot) => {
          this._drawBinomBars(plot, 10, 0.3, 0x4cc9f0);
          this._drawPoissonReference(plot, 3);
        },
      },
      {
        board: {
          title: "2.2 Larger n, smaller p",
          accent: "#ffd166",
          body: [
            "Keep λ = np = 3; push n up, p down.",
            "n = 30,  p = 0.1   (np = 3).",
            "More trials, rarer successes.",
            "Bars hug the pink outline more closely.",
          ],
        },
        enter: (plot) => {
          this._drawBinomBars(plot, 30, 0.1, 0xffd166);
          this._drawPoissonReference(plot, 3);
        },
      },
      {
        board: {
          title: "2.2 The limit: n → ∞, p → 0",
          accent: "#f72585",
          body: [
            "n = 100,  p = 0.03   (still np = 3).",
            "Bars now sit almost on the outline.",
            "As n → ∞, p → 0 with np = λ fixed:",
            "Binomial(n, p) → Poisson(λ).",
            "Rare event, many tries → Poisson.",
          ],
        },
        enter: (plot) => {
          this._drawBinomBars(plot, 100, 0.03, 0x69f0ae);
          this._drawPoissonReference(plot, 3);
        },
      },
    ];
  }

  /* =====================================================================
     EXAMPLE 1 — Typos in a book (practical Law of Rare Events)
     ---------------------------------------------------------------------
     A 500-page book; each page has a tiny p = 0.006 chance of a typo.
     n = 500 large, p small, λ = np = 3 typos expected per book.
     So "typos per book" ≈ Poisson(3). Numbers verified against the exact
     Binomial(500, 0.006): they match to ~3 decimals.
     ===================================================================== */
  defineExample1Steps() {
    const lambda = 3;
    return [
      {
        board: {
          title: "Example 1 — Typos in a book",
          accent: "#4cc9f0",
          body: [
            "A book has n = 500 pages.",
            "Each page may contain a typo,",
            "independently, with small p = 0.006.",
            "Count X = total typos in the book.",
          ],
        },
        enter: (plot) => this._drawBinomBars(plot, 500, 0.006, 0x4cc9f0),
      },
      {
        board: {
          title: "Example 1 — Why Poisson fits",
          accent: "#69f0ae",
          body: [
            "Many pages (large n), rare typo (small p):",
            "exactly the Law of Rare Events setting.",
            "λ = n·p = 500 × 0.006 = 3 typos expected.",
            "So X ≈ Poisson(λ = 3).",
          ],
        },
        enter: (plot) => {
          this._drawBinomBars(plot, 500, 0.006, 0x4cc9f0);
          this._drawPoissonReference(plot, lambda);
        },
      },
      {
        board: {
          title: "Example 1 — Reading the chart",
          accent: "#ffd166",
          body: [
            "Most likely: 2 or 3 typos (each ≈ 22%).",
            "P(exactly 0 typos) = e⁻³ ≈ 0.050.",
            "A perfectly clean book is rare (~5%).",
            "Bars (book model) match the Poisson outline.",
          ],
        },
        enter: (plot) => {
          this._drawBinomBars(plot, 500, 0.006, 0xffd166);
          this._drawPoissonReference(plot, lambda);
          plot.marker(0, poissonPMF(lambda, 0), { color: 0xff5fa2, size: 0.03, pulse: true });
        },
      },
      {
        board: {
          title: "Example 1 — The takeaway",
          accent: "#f72585",
          body: [
            "We replaced a hard Binomial(500, 0.006)",
            "with an easy Poisson(3) using λ = np.",
            "P(at least one typo) = 1 − e⁻³ ≈ 0.95.",
            "Rare event × many chances → Poisson.",
          ],
        },
        enter: (plot) => {
          this._drawBinomBars(plot, 500, 0.006, 0x69f0ae);
          this._drawPoissonReference(plot, lambda);
        },
      },
    ];
  }

  /* =====================================================================
     EXAMPLE 2 — Defective items on a production line
     ---------------------------------------------------------------------
     A factory makes n = 1000 items; each is defective independently with
     p = 0.002. n large, p small, λ = np = 2 defects expected per batch.
     So "defects per batch" ≈ Poisson(2). Verified vs Binomial(1000, 0.002).
     ===================================================================== */
  defineExample2Steps() {
    const lambda = 2;
    return [
      {
        board: {
          title: "Example 2 — Factory defects",
          accent: "#4cc9f0",
          body: [
            "A factory makes n = 1000 items a day.",
            "Each item is defective independently,",
            "with small probability p = 0.002.",
            "Count X = defective items per day.",
          ],
        },
        enter: (plot) => this._drawBinomBars(plot, 1000, 0.002, 0x4cc9f0),
      },
      {
        board: {
          title: "Example 2 — Why Poisson fits",
          accent: "#69f0ae",
          body: [
            "Huge batch (large n), rare defect (small p):",
            "the Law of Rare Events applies again.",
            "λ = n·p = 1000 × 0.002 = 2 defects expected.",
            "So X ≈ Poisson(λ = 2).",
          ],
        },
        enter: (plot) => {
          this._drawBinomBars(plot, 1000, 0.002, 0x4cc9f0);
          this._drawPoissonReference(plot, lambda);
        },
      },
      {
        board: {
          title: "Example 2 — Reading the chart",
          accent: "#ffd166",
          body: [
            "Most likely: 1 or 2 defects (each ≈ 27%).",
            "P(0 defects) = e⁻² ≈ 0.135.",
            "P(0 or 1 defect) ≈ 0.406.",
            "Bars (factory model) match the outline.",
          ],
        },
        enter: (plot) => {
          this._drawBinomBars(plot, 1000, 0.002, 0xffd166);
          this._drawPoissonReference(plot, lambda);
          plot.marker(0, poissonPMF(lambda, 0), { color: 0xff5fa2, size: 0.03, pulse: true });
        },
      },
      {
        board: {
          title: "Example 2 — The takeaway",
          accent: "#f72585",
          body: [
            "Binomial(1000, 0.002) is awkward to compute;",
            "Poisson(2) gives the same answers easily.",
            "P(at least one defect) = 1 − e⁻² ≈ 0.865.",
            "Quality control uses exactly this idea.",
          ],
        },
        enter: (plot) => {
          this._drawBinomBars(plot, 1000, 0.002, 0x69f0ae);
          this._drawPoissonReference(plot, lambda);
        },
      },
    ];
  }
}

// --- register both stations -------------------------------------------------
registerStation({
  id: "binomial",
  title: "2.1 · Binomial",
  section: "2.1",
  wall: { side: "front", t: -0.4, y: 1.7 },
  projectorSide: -1,
  create: (def, ctx) => {
    const station = new BinomialStation(def, ctx);
    try {
      setupExampleButtons(station, def.title, "binomial");
    } catch (e) {
      console.warn("[binomial] example buttons unavailable:", e?.message);
    }
    return station;
  },
});

registerStation({
  id: "poisson",
  title: "2.2 · Poisson",
  section: "2.2",
  wall: { side: "front", t: 0.4, y: 1.7 },
  projectorSide: 1,
  create: (def, ctx) => {
    const station = new PoissonStation(def, ctx);
    // Set up the two practical-example launch buttons (HTML, left of Interact).
    // Wrapped in try/catch: this is an additive enhancement, so if the DOM is
    // unavailable or anything goes wrong, the core lesson must still work.
    try {
      setupExampleButtons(station, def.title, "poisson");
    } catch (e) {
      console.warn("[poisson] example buttons unavailable:", e?.message);
    }
    return station;
  },
});

/* =========================================================================
   POISSON EXAMPLE BUTTONS (Member 2)
   -------------------------------------------------------------------------
   Adds "Example 1" and "Example 2" buttons to the LEFT of the shared Interact
   button. We can't edit index.html or main.js, so we create the buttons via
   the DOM from here and drive the existing lesson machinery:

     1. The student walks up to the Poisson board. The shared proximity logic
        un-hides the Interact button and writes the board title into the
        proximity hint. We watch for that and reveal our Example buttons too.
     2. Tapping an Example button sets station.mode and then programmatically
        clicks the real Interact button, so main.js runs its normal flow:
        it calls station.begin() (our override builds the example step-set),
        shows Prev/Next/Exit, and tracks activeStation. Exit/Prev/Next then
        work on the example steps with zero shared-file changes.

   This is purely additive: if anything here fails, the core lesson still works.
   ========================================================================= */
function setupExampleButtons(station, stationTitle, idPrefix) {
  if (typeof document === "undefined") return; // safe in non-browser (tests)

  const interactBtn = document.getElementById("interact-btn");
  const hint = document.getElementById("proximity-hint");
  if (!interactBtn) return;

  // Container holding the two example buttons, placed just left of Interact.
  const wrap = document.createElement("div");
  wrap.id = idPrefix + "-example-btns";
  wrap.style.cssText = [
    "position:fixed",
    "bottom:calc(40px + env(safe-area-inset-bottom,0px))",
    // sit to the LEFT of the Interact button (which is ~right:26px, width ~150px)
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
      // Choose the example, then trigger the standard interact flow.
      station.mode = mode;
      interactBtn.click();
    });
    // press feedback
    b.addEventListener("touchstart", () => (b.style.transform = "scale(0.96)"), { passive: true });
    b.addEventListener("touchend", () => (b.style.transform = "scale(1)"), { passive: true });
    return b;
  };

  wrap.appendChild(mkBtn("Example 1", "example1"));
  wrap.appendChild(mkBtn("Example 2", "example2"));
  document.body.appendChild(wrap);

  // Mirror the Interact button's visibility, but ONLY when THIS board is the
  // one in range (detected via the proximity hint text). When a lesson is open
  // the Interact button is hidden, so the example buttons hide too.
  const titleKey = (stationTitle || "").replace(/^[0-9.\s·]+/, ""); // e.g. "Poisson"
  function refresh() {
    const interactVisible = !interactBtn.classList.contains("hidden");
    const hintText = hint ? hint.textContent || "" : "";
    const nearThisBoard = interactVisible && titleKey && hintText.includes(titleKey);
    wrap.style.display = nearThisBoard ? "flex" : "none";
    requestAnimationFrame(refresh);
  }
  requestAnimationFrame(refresh);
}
