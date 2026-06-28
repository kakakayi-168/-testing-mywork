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

// Compatibility wrapper: icy's lesson steps call setPanelSide(station, side).
// It simply re-docks the explanation panel on the right using this file's panel
// system. (Without this, stepping through a lesson threw a ReferenceError,
// which left the UI stuck so Exit appeared not to work.)
function setPanelSide(station, _side) {
  placeProjectorInCorner(station, "right", null);
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
  // X tick numbers: just below the x-axis line.
  for (const xv of xs) {
    if (xv < cfg.xMin || xv > cfg.xMax) continue;
    const label = makeTextSprite(String(xv), {
      worldHeight: 0.15, color: "#eef4ff", bold: true, align: "center",
    });
    const p = plot.toLocal(xv, baseY, 0.05);
    label.position.set(p.x, p.y - 0.13, 0.05);
    plot.add(label);
  }
  // Y tick numbers: tucked JUST INSIDE the left plot edge so the left-docked
  // panel never sits on top of them.
  for (const yv of yTicks) {
    if (yv < cfg.yMin || yv > cfg.yMax) continue;
    const label = makeTextSprite(Number.isInteger(yv) ? String(yv) : yv.toFixed(yv < 0.1 ? 2 : 1), {
      worldHeight: 0.14, color: "#eef4ff", bold: true, align: "left",
    });
    const p = plot.toLocal(cfg.xMin, yv, 0.05);
    label.position.set(p.x + 0.03, p.y, 0.07);
    plot.add(label);
  }
  // X-axis title: placed clearly BELOW the number row (extra gap so the title
  // and the numbers never overlap), but kept inside the board bottom.
  const xt = makeTextSprite(xTitle, {
    worldHeight: 0.14, color: "#cdd8f5", bold: true, align: "center",
  });
  const xRowY = plot.toLocal(0, baseY).y - 0.13;       // the number row
  const xTitleY = xRowY - 0.20;                         // clear gap below numbers
  xt.position.set(0, xTitleY, 0.07);
  plot.add(xt);
  // Y-axis title: bottom-right free area, away from panel and y-numbers.
  const yt = makeTextSprite(yTitle, {
    worldHeight: 0.14, color: "#cdd8f5", bold: true, align: "right",
  });
  yt.position.set(halfW - 0.12, -halfH + 0.16, 0.07);
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
    placeProjectorInCorner(this, "right");
  }
  plotOffset() {
    return { x: -0.3, y: 0.05 };
  }
  plotConfig() {
    // Same board-relative proportions as Member 2 (2.4 x 1.5) so all graphs
    // match in size once BaseStation scales the whole station.
    return { xMin: -4, xMax: 4, yMin: 0, yMax: 0.5, width: 1.6, height: 1.55 };
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
      // ----- Step 1a: 常態分佈簡介 -----
      {
        board: {
          title: "3.1 The Normal (Gaussian) curve",
          accent: "#4cc9f0",
          body: [
            "Normal distribution",
            "is a continuous probability distribution",
            "with a symmetric, bell-shaped curve.",
            "Defined by two parameters: σ > 0 and µ.",
          ],
        },
        enter: (plot) => this._bell(plot, 0, 1, 0x4cc9f0),
      },
      // ----- Step 1b: 公式 + 標準常態 -----
      {
        board: {
          title: "3.1 The Normal (Gaussian) curve",
          accent: "#4cc9f0",
          body: [
            "f(x) = 1/√(2πσ²)·exp(−(x−µ)²/(2σ²))",
            "for −∞ < x < ∞",
            "Here µ=0, σ=1 (the standard normal)",
          ],
        },
        enter: (plot) => this._bell(plot, 0, 1, 0x4cc9f0),
      },
      // ----- Step 2: µ moves it, σ stretches it (純概念，對比用虛線) -----
      {
        board: {
          title: "3.1 µ moves it, σ stretches it",
          accent: "#ffd166",
          body: [
            "E[X] = µ",
            "(the peak sits over x = µ)",
            "Var(X) = σ²",
            "(larger σ means a wider, flatter bell)",
            "The curve shifts with µ, spreads with σ.",
          ],
        },
        enter: (plot) => {
          plot.plotFunction((x) => normalPDF(x, 1, 1.5), {
            color: 0xffd166,
            radius: 0.008,
            clampY: false,
            dash: true,
          });
        },
      },
      // ----- Step 3a: Standardization — 概念 -----
      {
        board: {
          title: "3.1 Standardization: X → Z",
          accent: "#69f0ae",
          body: ["Any X ~ N(µ, σ²) becomes Z ~ N(0,1)", "via  Z = (X − µ) / σ"],
        },
        enter: (plot) => {
          plot.plotFunction((x) => normalPDF(x, 0, 1), {
            color: 0x69f0ae,
            radius: 0.014,
            clampY: false,
          });
          plot.marker(0, normalPDF(0, 0, 1), {
            color: 0x00c853,
            size: 0.06,
          });
        },
      },
      // ----- Step 3b: Why standardize? -----
      {
        board: {
          title: "3.1 Why standardize?",
          accent: "#69f0ae",
          body: [
            "Then a single Z-table answers",
            "can find all probability questions.",
            "Example: ",
            "standard curve with Z = 0.36 marked.",
          ],
        },
        enter: (plot) => {
          plot.plotFunction((x) => normalPDF(x, 0, 1), {
            color: 0x69f0ae,
            radius: 0.014,
            clampY: false,
          });
          const z = 0.36;
          const y = normalPDF(z, 0, 1);
          plot.marker(z - 0.195, y, {
            color: 0x00c853,
            size: 0.06,
          });
          plot.segment(z - 0.195, 0, z - 0.195, y + 0.15, {
            color: 0x00c853,
            radius: 0.02,
          });
          for (let x = z; x <= 3.5; x += 0.25) {
            plot.bar(x, normalPDF(x, 0, 1), {
              color: 0x69f0ae,
              widthMath: 0.22,
            });
          }
        },
      },
      // ----- Step 4: Reading the Z-table -----
      {
        board: {
          title: "3.1 Reading the Z-table",
          accent: "#f72585",
          body: [
            "Example:  P(Z < 0.36).",
            "Check the Z-table for Z = 0.36.",
            "P(Z > 0.36) = 0.3594.",
            "So P(Z < 0.36) = 1 − 0.3594 = 0.6406.",
          ],
        },
        enter: (plot) => {
          plot.plotFunction((x) => normalPDF(x, 0, 1), {
            color: 0x69f0ae,
            radius: 0.014,
            clampY: false,
          });
          const z = 0.36;
          const y = normalPDF(z, 0, 1);
          plot.marker(z - 0.195, y, {
            color: 0x00c853,
            size: 0.06,
          });
          plot.segment(z - 0.195, 0, z - 0.195, y + 0.15, {
            color: 0x00c853,
            radius: 0.02,
          });
          for (let x = z; x <= 3.5; x += 0.25) {
            plot.bar(x, normalPDF(x, 0, 1), {
              color: 0x69f0ae,
              widthMath: 0.22,
            });
          }
        },
      },
    ];
  }

  // ---- EXAMPLE 1: a Z-score probability question --------------------------
  defineExample1Steps() {
    const scaleFactor = 0.6;
    const mu = 0;
    const sigma = 0.5;
    const verticalExtension = 0.58;

    const Z1 = -1.0;
    const Z2 = 0.5;

    const drawBaseCurve = (plot) => {
      plot.plotFunction((x) => normalPDF(x, mu, sigma) * scaleFactor, {
        color: 0xf72585,
        radius: 0.015,
        clampY: false,
      });
    };

    const drawZMarker = (plot, z, color = 0xffd166) => {
      const y = normalPDF(z, mu, sigma) * scaleFactor;
      plot.marker(z, 0, { color, size: 0.06 });
      plot.segment(z, 0, z, verticalExtension, {
        color,
        radius: 0.015,
      });
    };

    const fillArea = (plot, xStart, xEnd, color, step = 0.15) => {
      for (let x = xStart; x <= xEnd; x += step) {
        plot.bar(x, normalPDF(x, mu, sigma) * scaleFactor, {
          color,
          widthMath: 0.12,
        });
      }
    };

    return [
      // Step 1: 設定
      {
        board: {
          title: "Question: Heights",
          accent: "#4cc9f0",
          body: [
            "Heights: X ~ N(µ = 68.0, σ = 3.0).",
            "Random sample of n = 25 students.",
            "SE = σ/√n = 0.6",
            "Find P(67.4 < X̄ < 68.3).",
          ],
        },
        enter: (plot) => {
          setPanelSide(this, "right");
          drawBaseCurve(plot);
          plot.marker(0, normalPDF(0, mu, sigma) * scaleFactor, {
            color: 0xffd166,
            size: 0.045,
          });
        },
      },
      // Step 2: Z₁ = -1，右尾填充 (由 -1 向右)
      {
        board: {
          title: "Ex1: Z₁ = (67.4 − 68.0) / 0.6",
          accent: "#b39ddb",
          body: [
            "Part (i): Find P(67.4 < X̄ < 68.3).",
            "Z₁ = (67.4 − 68.0) / 0.6 = −1.00",
            "Shaded right region: Z > -1",
            " (about 84.13% area).",
          ],
        },
        enter: (plot) => {
          setPanelSide(this, "right");
          drawBaseCurve(plot);
          fillArea(plot, Z1, 4.0, 0x9575cd);
          drawZMarker(plot, Z1, 0x9575cd);
        },
      },
      // Step 3: Z₂ = 0.5，右尾填充 (由 0.5 向右)
      {
        board: {
          title: "Ex1: Z₂ = (68.3 − 68.0) / 0.6",
          accent: "#ff8a65",
          body: [
            "Z₂ = (68.3 − 68.0) / 0.6 = +0.50",
            "Orange right region: Z > 0.5",
            "(about 30.85% area).",
            "Now we have the upper boundary.",
          ],
        },
        enter: (plot) => {
          setPanelSide(this, "right");
          drawBaseCurve(plot);
          fillArea(plot, Z2, 4.0, 0xff8a65);
          drawZMarker(plot, Z2, 0xff8a65);
        },
      },
      // Step 4: 雙色右尾填充
      {
        board: {
          title: "Ex1: Z-table values (upper tail)",
          accent: "#f72585",
          body: ["P(Z > 0.50) = 0.3085", "P(Z > -1.00) = 0.8413"],
        },
        enter: (plot) => {
          setPanelSide(this, "right");
          drawBaseCurve(plot);
          fillArea(plot, Z1, 4.0, 0x9575cd);
          fillArea(plot, Z2, 4.0, 0xff8a65);
          drawZMarker(plot, Z1, 0x9575cd);
          drawZMarker(plot, Z2, 0xff8a65);
        },
      },
      // Step 5: 中間區域 (黃色)
      {
        board: {
          title: "Ex1: Probability of the interval",
          accent: "#ffd166",
          body: ["P(−1.00 < Z < 0.50)", "= 0.8413 − 0.3085", "= 0.5328"],
        },
        enter: (plot) => {
          setPanelSide(this, "right");
          drawBaseCurve(plot);
          fillArea(plot, Z1, Z2, 0xffd166);
          drawZMarker(plot, Z1, 0xffd166);
          drawZMarker(plot, Z2, 0xffd166);
        },
      },
    ];
  }

  // ---- EXAMPLE 2: the 68–95–99.7 rule -------------------------------------
  defineExample2Steps() {
    const scaleFactor = 0.6;
    const mu = 0;
    const sigma = 0.5;
    const verticalExtension = 0.58;

    const Z1 = 0.1;
    const Z2 = 0.6;

    const drawBaseCurve = (plot) => {
      plot.plotFunction((x) => normalPDF(x, mu, sigma) * scaleFactor, {
        color: 0xf72585,
        radius: 0.015,
        clampY: false,
      });
    };

    const drawZMarker = (plot, z, color = 0xffd166) => {
      const y = normalPDF(z, mu, sigma) * scaleFactor;
      plot.marker(z, 0, { color, size: 0.06 });
      plot.segment(z, 0, z, verticalExtension, {
        color,
        radius: 0.015,
      });
    };

    const fillArea = (plot, xStart, xEnd, color, step = 0.15) => {
      for (let x = xStart; x <= xEnd; x += step) {
        plot.bar(x, normalPDF(x, mu, sigma) * scaleFactor, {
          color,
          widthMath: 0.12,
        });
      }
    };

    const addZLabel = (plot, z, label) => {
      const p = plot.toLocal(z, 0, 0.05);
      const sprite = makeTextSprite(label, {
        worldHeight: 0.12,
        color: "#ffd166",
        bold: true,
        align: "center",
      });
      sprite.position.set(p.x, p.y - 0.28, 0.05);
      plot.add(sprite);
    };

    return [
      {
        board: {
          title: "Question: Weight ",
          accent: "#4cc9f0",
          body: [
            "Weights: X ~ N(µ = 70 kg, σ = 10 kg).",
            "Random sample of n = 36 students.",
            "SE = 10/√36 = 1.6667",
            "Find P(68 < X̄ < 72).",
          ],
        },
        enter: (plot) => {
          setPanelSide(this, "right");
          drawBaseCurve(plot);
          plot.marker(0, normalPDF(0, mu, sigma) * scaleFactor, {
            color: 0xffd166,
            size: 0.045,
          });
        },
      },
      {
        board: {
          title: "Z1 calculation",
          accent: "#b39ddb",
          body: [
            "Z₁ = (68 − 70) / 1.6667 = −1.20",
            "But we want Z₁ = 0.1 for demonstration.",
            "Shaded region: Z > 0.1",
            "(around 46.02% area).",
          ],
        },
        enter: (plot) => {
          setPanelSide(this, "right");
          drawBaseCurve(plot);
          fillArea(plot, Z1, 4.0, 0x9575cd);
          drawZMarker(plot, Z1, 0x9575cd);
        },
      },
      {
        board: {
          title: "Z2 calculation",
          accent: "#ff8a65",
          body: [
            "Z₂ = (72 − 70) / 1.6667 = +1.20",
            "But we want Z₂ = 0.6 for demonstration.",
            "Orange region: Z > 0.6",
            "(about 27.43% area).",
            "Now we have both boundaries.",
          ],
        },
        enter: (plot) => {
          setPanelSide(this, "right");
          drawBaseCurve(plot);
          fillArea(plot, Z2, 4.0, 0xff8a65);
          drawZMarker(plot, Z2, 0xff8a65);
        },
      },
      {
        board: {
          title: "Z-table values ",
          accent: "#f72585",
          body: ["P(Z > 0.60) = 0.2743", "P(Z > 0.10) = 0.4602"],
        },
        enter: (plot) => {
          setPanelSide(this, "right");
          drawBaseCurve(plot);
          fillArea(plot, Z2, 4.0, 0xff8a65);
          fillArea(plot, Z1, Z2, 0x9575cd);
          drawZMarker(plot, Z1, 0x9575cd);
          drawZMarker(plot, Z2, 0xff8a65);
        },
      },
      {
        board: {
          title: "Probability of the interval",
          accent: "#ffd166",
          body: ["P(0.10 < Z < 0.60)", "= 0.4602 − 0.2743", "= 0.1859"],
        },
        enter: (plot) => {
          setPanelSide(this, "right");
          drawBaseCurve(plot);
          fillArea(plot, Z1, Z2, 0xffd166);
          drawZMarker(plot, Z1, 0xffd166);
          drawZMarker(plot, Z2, 0xffd166);
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
    placeProjectorInCorner(this, "right");
  }
  plotOffset() {
    return { x: -0.3, y: 0.05 };
  }
  plotConfig() {
    return { xMin: 0, xMax: 20.5, yMin: 0, yMax: 0.22, width: 1.6, height: 1.55 };
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
    // Clamp bar height to the plot's yMax so very tall bars (e.g. p=0.05 where
    // P(0),P(1) ≈ 0.37) never shoot off the top of the blackboard. A clamped
    // bar visibly hits the ceiling, which still reads as "very likely".
    const yCap = plot.cfg.yMax;
    for (let k = 0; k <= this.N; k++) {
      const prob = Math.min(binomPMF(this.N, p, k), yCap);
      plot.bar(k, prob, { color, widthMath: 0.75 });
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
          title: "Normal ≈ Binomial", // 縮短
          accent: "#4cc9f0",
          body: [
            "Binomial is discrete (bars)",
            "Normal is continuous (curve).",
            "The figure below shows:",
            "bars (discrete) vs curve (continuous).",
          ],
        },
        enter: (plot) => {
          this._bars(plot, 0.5);
          this._bell(plot, this.N * 0.5, Math.sqrt(this.N * 0.5 * 0.5));
        },
      },
      {
        board: {
          title: "Conditions for approximate",
          accent: "#4cc9f0",
          body: [
            "When np > 5 and n(1−p) > 5,",
            "we may approximate X by Normal distribution",
            "Here n = 20, p = 0.5 → np = 10,",
            "n(1−p) = 10. Both > 5. ✓",
            "The figure below is an example with n=20, p=0.5.",
          ],
        },
        enter: (plot) => {
          this._bars(plot, 0.5);
          this._bell(plot, this.N * 0.5, Math.sqrt(this.N * 0.5 * 0.5));
        },
      },
      {
        board: {
          title: "Mean, Variance and Std Dev",
          accent: "#ffd166",
          body: [
            "For µ = np = 20·0.5 = 10.",
            "σ² = np(1−p) = 20·0.5·0.5 = 5",
            "σ = √5 ≈ 2.24.",
            "Mean = 10, Variance = 5, Std Dev ≈ 2.24.",
          ],
        },
        enter: (plot) => {
          this._bars(plot, 0.5);
          this._bell(plot, this.N * 0.5, Math.sqrt(this.N * 0.5 * 0.5));
        },
      },
      {
        board: {
          title: "Match mean & variance",
          accent: "#ffd166",
          body: [
            "Overlay N(10, 5) on top of the bars.",
            "The curve traces the tops of the bars",
            "closely.",
          ],
        },
        enter: (plot) => {
          this._bars(plot, 0.5);
          this._bell(plot, this.N * 0.5, Math.sqrt(this.N * 0.5 * 0.5));
          // 加 marker 喺每個 k 嘅頂點
          for (let k = 1; k <= this.N; k++) {
            const prob = binomPMF(this.N, 0.5, k);
            plot.marker(k, prob, { color: 0x00c853, size: 0.025 });
          }
        },
      },
    ];
  }

  // ---- EXAMPLE 1: p shifted (n=20, p=0.3) ---------------------------------
  defineExample1Steps() {
    const n = 200;
    const p = 0.03;
    const mu = n * p; // 6
    const sigma = Math.sqrt(n * p * (1 - p)); // √5.82 ≈ 2.412

    return [
      // ===== Page 1: Question =====
      {
        board: {
          title: "Example: Workplace Accidents",
          accent: "#f72585",
          body: [
            "Question:A factory has 200 workers.Each",
            "worker has a 3% chance of having an accident",
            "in a year.Let X be the number of workers",
            "who have an accident in a year. As",
            "X ~ Binomial(n = 200, p = 0.03),Find P(X > 8) ",
            "using Normal approximation.",
          ],
        },
        enter: (plot) => {
          for (let k = 0; k <= 20; k++) {
            const prob = binomPMF(n, p, k);
            plot.bar(k, prob, { color: 0x2c6e8c, widthMath: 0.7 });
          }
          this._bell(plot, mu, sigma, 0xffd166);
        },
      },

      // ===== Page 2: Check conditions & Parameters =====
      {
        board: {
          title: "Solution ",
          accent: "#4cc9f0",
          body: [
            "np = 200 × 0.03 = 6 > 5  ✓",
            "n(1−p) = 200 × 0.97 = 194 > 5  ✓",
            "μ = np = 6",
            "σ = √(np(1−p)) = √5.82 ≈ 2.41",
          ],
        },
        enter: (plot) => {
          for (let k = 0; k <= 20; k++) {
            const prob = binomPMF(n, p, k);
            plot.bar(k, prob, { color: 0x2c6e8c, widthMath: 0.7 });
          }
          this._bell(plot, mu, sigma, 0xffd166);
          plot.marker(mu, normalPDF(mu, mu, sigma), {
            color: 0xf72585,
            size: 0.04,
          });
        },
      },

      // ===== Page 3: Z-score & Upper Tail (Right-tail) =====
      {
        board: {
          title: "Solution ",
          accent: "#4cc9f0",
          body: [
            "Z score = (8 − 6) / 2.41 = 0.83",
            "Using  Z-table:",
            "P(Z > 0.83) ≈ 0.2033",
            "So P(X > 8)  ≈ 0.2033",
          ],
        },
        enter: (plot) => {
          this._bell(plot, mu, sigma, 0xffd166);
          // 填藍色區域 (右尾: Z > 0.83, i.e., x > 8.5)
          const z = 0.83;
          const xStart = mu + z * sigma; // ≈ 8.5
          const step = (20 - xStart) / 13.5;
          for (let x = 9.1; x <= 20; x += step) {
            plot.bar(x, normalPDF(x, mu, sigma), {
              color: 0x2c6e8c,
              widthMath: step * 0.7,
            });
          }
          // 垂直線 + marker 喺 x = 8.5
          const yBound = normalPDF(8.5, mu, sigma);
          plot.segment(8.5, 0, 8.5, 0.2, {
            color: 0xff0000,
            radius: 0.02,
          });
          plot.marker(8.5, 0, { color: 0xff0000, size: 0.04, pulse: true });
        },
      },

      // ===== Page 4: Final Answer =====
      {
        board: {
          title: "Solution ",
          accent: "#ffd166",
          body: [
            "P(X > 8) = P(Z > 0.83)",
            "= 0.2033",
            "So about 20.3% chance that more than",
            "8 workers have an accident in a year.",
          ],
        },
        enter: (plot) => {
          this._bell(plot, mu, sigma, 0xffd166);
          const z = 0.83;
          const xStart = mu + z * sigma;
          const step = (20 - xStart) / 13.5;
          for (let x = 9.1; x <= 20; x += step) {
            plot.bar(x, normalPDF(x, mu, sigma), {
              color: 0x2c6e8c,
              widthMath: step * 0.7,
            });
          }
          plot.segment(8.5, 0, 8.5, 0.2, {
            color: 0xff0000,
            radius: 0.02,
          });
          plot.marker(8.5, 0, { color: 0xff0000, size: 0.04, pulse: true });
        },
      },
    ];
  }

  // ---- EXAMPLE 2: when approximation is POOR (small np) -------------------
  defineExample2Steps() {
    const n2 = 50;
    const p2 = 0.2;
    const mu2 = n2 * p2; // 10
    const sigma2 = Math.sqrt(n2 * p2 * (1 - p2)); // √8 ≈ 2.83

    return [
      // ===== Page 1: Question =====
      {
        board: {
          title: "Example: Defects",
          accent: "#69f0ae",
          body: [
            "Question:",
            "A factory produces 50 items.Each item has a ",
            "20% chance of being defective.Let X be",
            "the number of defective items.As ",
            "X ~ Binomial(n=50, p=0.2) so,Find P(X ≤ 5) ",
            "using Normal approximation.",
          ],
        },
        enter: (plot) => {
          for (let k = 0; k <= 20; k++) {
            const prob = binomPMF(n2, p2, k);
            plot.bar(k, prob, { color: 0x2c6e8c, widthMath: 0.7 });
          }
          // normal curve
          this._bell(plot, mu2, sigma2, 0xffd166);
        },
      },

      // ===== Page 2: Solution Step 1 (Mean & Variance) =====
      {
        board: {
          title: "Solution (Step 1)",
          accent: "#69f0ae",
          body: [
            "Check conditions for Normal approx:",
            "np = 50 × 0.2 = 10 > 5  ✓",
            "n(1−p) = 50 × 0.8 = 40 > 5  ✓",
            "So Normal approximation is valid.",
            "μ = np = 10",
            "σ = √(np(1−p)) = √(8) ≈ 2.83",
          ],
        },
        enter: (plot) => {
          for (let k = 0; k <= 20; k++) {
            const prob = binomPMF(n2, p2, k);
            plot.bar(k, prob, { color: 0x2c6e8c, widthMath: 0.7 });
          }
          this._bell(plot, mu2, sigma2, 0xffd166);
          plot.marker(mu2, normalPDF(mu2, mu2, sigma2), {
            color: 0xf72585,
            size: 0.04,
          });
        },
      },

      // ===== Page 3: Solution Step 2 (Upper Tail Method) =====
      {
        board: {
          title: "Solution (Step 2: Upper Tail)",
          accent: "#4cc9f0",
          body: [
            "Z-score:",
            "Z = (5 − 10) / 2.83 ≈ −1.77",
            "Using upper-tail Z-table:",
            "P(Z > −1.77) = 0.9616",
            " (The blue area in the figure below.)",
          ],
        },
        enter: (plot) => {
          this._bell(plot, mu2, sigma2, 0xffd166);
          // blue
          const step = (20 - 5) / 13.5;
          for (let x = 5.5; x <= 20; x += step) {
            plot.bar(x, normalPDF(x, mu2, sigma2), {
              color: 0x2c6e8c,
              widthMath: step * 0.7,
            });
          }
          //yellow
          for (let x = 0; x <= 4.55; x += step) {
            plot.bar(x, normalPDF(x, mu2, sigma2), {
              color: 0xffd166,
              widthMath: step * 0.7,
            });
          }

          const yBound = normalPDF(5, mu2, sigma2);
          plot.segment(5, 0, 5, 0.2, {
            color: 0xff0000,
            radius: 0.02,
          });
          plot.marker(5, 0, { color: 0xff0000, size: 0.04, pulse: true });
        },
      },

      // ===== Page 4: Solution Step 3 (Final Answer) =====
      {
        board: {
          title: "Solution (Step 3: Final Answer)",
          accent: "#ffd166",
          body: [
            "Since P(X ≤ 5) = 1 − P(X > 5),",
            "Answer = 1 − 0.9616 = 0.0384",
            "So about 3.84% chance that 5 or fewer",
            "items are defective.",
          ],
        },
        enter: (plot) => {
          this._bell(plot, mu2, sigma2, 0xffd166);
          const step = (20 - 5) / 13.5;
          for (let x = 0; x <= 4.55; x += step) {
            plot.bar(x, normalPDF(x, mu2, sigma2), {
              color: 0xffd166,
              widthMath: step * 0.7,
            });
          }
          const yBound = normalPDF(5, mu2, sigma2);
          plot.segment(5, 0, 5, 0.2, {
            color: 0xff0000,
            radius: 0.02,
          });
          plot.marker(5, 0, { color: 0xff0000, size: 0.04, pulse: true });
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
