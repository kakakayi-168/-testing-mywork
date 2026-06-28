/* =========================================================================
   js/stations/normal_distribution.js   —   MEMBER 3  (Sections 3.1 & 3.2)
   ========================================================================= */

import * as THREE from "three";
import { registerStation } from "../core/StationRegistry.js";
import { BaseStation } from "./BaseStation.js";
import { makeTextSprite } from "../core/TextSprite.js";

// ---------- 排版輔助函數 ----------

function placeProjectorInCorner(station, side = "right", minLeftX = null) {
  const proj = station.projector;
  const boardHalfW = 2.9 / 2;
  const boardHalfH = 2.2 / 2;
  const margin = 0.07;
  const rightEdge = boardHalfW - margin;

  let scale = 0.32;
  if (minLeftX !== null) {
    const wantW = Math.max(0.6, rightEdge - minLeftX);
    scale = Math.min(0.32, wantW / 3.4);
  }
  proj.scale.setScalar(scale);
  const projW = 3.4 * scale;
  const projH = 2.0 * scale;
  const x = rightEdge - projW / 2;
  const y = boardHalfH - margin - projH / 2;
  proj.position.set(x, y, 0.08);
  station._panelSide = "right";
  station._panelMinLeftX = minLeftX;
}

function setPanelSide(station, _side) {
  placeProjectorInCorner(station, "right", null);
}

function setPanelLeftAtK(station, k) {
  const cfg = station.plot.cfg;
  const ux = cfg.width / (cfg.xMax - cfg.xMin);
  const barHalf = 0.7 * ux * 0.5;
  const kLocalX = (k - (cfg.xMin + cfg.xMax) / 2) * ux;
  const leftEdge = kLocalX + barHalf + 0.02;
  placeProjectorInCorner(station, "right", leftEdge);
}

function setPanelLeftAtX(station, targetX) {
  const plot = station.plot;
  if (!plot) return;
  const cfg = plot.cfg;
  const ux = cfg.width / (cfg.xMax - cfg.xMin);
  const xLocal = (targetX - (cfg.xMin + cfg.xMax) / 2) * ux;
  const leftEdge = xLocal + 0.5;
  placeProjectorInCorner(station, "right", leftEdge);
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

// ====== addAxisLabels 加入 xTickOffset ======
function addAxisLabels(plot, opts = {}) {
  const {
    xTicks = null,
    xStep = 1,
    xMaxLabel = Infinity,
    yTicks = [0, 0.1, 0.2, 0.3],
    xTitle = "x",
    yTitle = "f(x)",
    xTickOffset = -0.12,
  } = opts;

  const cfg = plot.cfg;

  let xTickValues;
  if (xTicks && Array.isArray(xTicks)) {
    xTickValues = xTicks.filter((v) => v >= cfg.xMin && v <= cfg.xMax);
  } else {
    xTickValues = [];
    for (let k = Math.max(0, Math.ceil(cfg.xMin)); k <= cfg.xMax; k += xStep) {
      if (k > xMaxLabel) break;
      xTickValues.push(k);
    }
  }

  for (const xv of xTickValues) {
    const label = makeTextSprite(String(xv), {
      worldHeight: 0.14,
      color: "#eef4ff",
      bold: true,
      align: "center",
    });
    const p = plot.toLocal(xv, 0, 0.05);
    label.position.set(p.x, p.y + xTickOffset, 0.05);
    plot.add(label);
  }

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
    label.position.set(p.x + 0.02, p.y, 0.07);
    plot.add(label);
    plot.segment(cfg.xMin, yv, cfg.xMin + (cfg.xMax - cfg.xMin) * 0.02, yv, {
      color: 0x8fa3d8,
      radius: 0.004,
      dynamic: false,
    });
  }

  const boardHalfH = 2.2 / 2;
  const xTitleH = 0.13;
  const xt = makeTextSprite(xTitle, {
    worldHeight: xTitleH,
    color: "#eef4ff",
    bold: true,
    align: "center",
  });
  const xTickRowY = plot.toLocal(0, 0).y - 0.12;
  const xTitleY = Math.max(xTickRowY - 0.16, -boardHalfH + xTitleH / 2 + 0.03);
  xt.position.set(0, xTitleY, 0.07);
  plot.add(xt);

  const yt = makeTextSprite(yTitle, {
    worldHeight: 0.13,
    color: "#eef4ff",
    bold: true,
    align: "left",
  });
  yt.position.set(-halfW + 0.3, halfH - 0.13, 0.07);
  plot.add(yt);
}

// ---------- math helpers ----------
function normalPDF(x, mu, sigma) {
  return (
    (1 / (Math.sqrt(2 * Math.PI) * sigma)) *
    Math.exp(-((x - mu) ** 2) / (2 * sigma * sigma))
  );
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

function poissonPMF(lambda, k) {
  if (k < 0) return 0;
  let logp = -lambda + k * Math.log(lambda || 1e-300);
  for (let i = 2; i <= k; i++) logp -= Math.log(i);
  return Math.exp(logp);
}

/* =======================================================================
   3.1  NORMAL DISTRIBUTION  (右尾 Z-table 版本)
   ======================================================================= */
class NormalStation extends BaseStation {
  constructor(def, ctx) {
    super(def, ctx);
    this.mode = "lesson";
  }

  _placeProjector() {
    placeProjectorInCorner(this);
  }

  plotConfig() {
    return { xMin: -4, xMax: 4, yMin: 0, yMax: 0.6, width: 2.7, height: 1.8 };
  }

  buildGraph(plot) {
    removeOrientationArrows(plot);
    addAxisLabels(plot, {
      xTicks: [-4, -3, -2, -1, 0, 1, 2, 3, 4],
      yTicks: [0, 0.2, 0.4, 0.6],
      xTitle: "Z-score",
      yTitle: "P(X = x)",
      xTickOffset: -0.045,
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

  _bell(plot, mu, sigma, color = 0x4cc9f0) {
    plot.plotFunction((x) => normalPDF(x, mu, sigma), {
      color,
      radius: 0.014,
      clampY: false,
    });
    plot.marker(mu, normalPDF(mu, mu, sigma), { color: 0xf72585, size: 0.045 });
  }

  // ---------- 主課程 (Lesson) — 純理論，無例子 ----------
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

  // ---------- Example 1: 右尾表（area 由右去左） ----------
  defineExample1Steps() {
    const scaleFactor = 0.7;
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

  // ---------- Example 2: 不變 ----------
  defineExample2Steps() {
    const scaleFactor = 0.7;
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
   3.2  NORMAL APPROXIMATION TO THE BINOMIAL  (修改：放大面板、縮短標題、x軸改為"k")
   ======================================================================= */
class NormalApproxStation extends BaseStation {
  constructor(def, ctx) {
    super(def, ctx);
    this.mode = "lesson"; // "lesson" | "example1" | "example2"
  }

  // ----- projector (scale = 0.40) -----
  _placeProjector() {
    const proj = this.projector;
    const boardHalfW = 2.9 / 2;
    const boardHalfH = 2.2 / 2;
    const margin = 0.07;
    const rightEdge = boardHalfW - margin;

    const scale = 0.3415; //  0.32
    proj.scale.setScalar(scale);
    const projW = 3.4 * scale;
    const projH = 2.0 * scale;
    const x = rightEdge - projW / 2;
    const y = boardHalfH - margin - projH / 2;
    proj.position.set(x, y, 0.08);
    this._panelSide = "right";
    this._panelMinLeftX = null;
  }

  plotConfig() {
    return {
      xMin: -0.5,
      xMax: 20.5,
      yMin: 0,
      yMax: 0.22,
      width: 2.7,
      height: 1.8,
    };
  }

  buildGraph(plot) {
    this.N = 20;
    removeOrientationArrows(plot);
    addAxisLabels(plot, {
      xStep: 2,
      yTicks: [0, 0.1, 0.2],
      xTitle: "k", // 改為 "k"
      yTitle: "P(X = k)",
      xTickOffset: -0.045,
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

  // ---------- 主課程 (Lesson) — 標題已縮短 ----------
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

  // ---------- Example 1: Workplace Accidents (Binomial → Normal, Right-tail) ----------
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

  // ---------- Example 2: Defects  ----------
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

// ---------- Example 按鈕 ----------
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
    b.addEventListener(
      "touchstart",
      () => (b.style.transform = "scale(0.96)"),
      { passive: true },
    );
    b.addEventListener("touchend", () => (b.style.transform = "scale(1)"), {
      passive: true,
    });
    return b;
  };

  wrap.appendChild(mkBtn("Example 1", "example1"));
  wrap.appendChild(mkBtn("Example 2", "example2"));
  document.body.appendChild(wrap);

  const titleKey = (stationTitle || "").replace(/^[0-9.\s·]+/, "");
  function refresh() {
    const interactVisible = !interactBtn.classList.contains("hidden");
    const hintText = hint ? hint.textContent || "" : "";
    const nearThisBoard =
      interactVisible && titleKey && hintText.includes(titleKey);
    wrap.style.display = nearThisBoard ? "flex" : "none";
    requestAnimationFrame(refresh);
  }
  requestAnimationFrame(refresh);
}

// ---------- 註冊 ----------
registerStation({
  id: "normal",
  title: "3.1 · Normal Distribution",
  section: "3.1",
  wall: { side: "right", t: -0.45, y: 1.7 },
  projectorSide: -1,
  create: (def, ctx) => {
    const station = new NormalStation(def, ctx);
    try {
      setupExampleButtons(station, def.title, "normal");
    } catch (e) {
      console.warn("[normal] example buttons unavailable:", e?.message);
    }
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
    try {
      setupExampleButtons(station, def.title, "normal-approx");
    } catch (e) {
      console.warn("[normal-approx] example buttons unavailable:", e?.message);
    }
    return station;
  },
});
