/* =========================================================================
   js/main.js  —  SHARED  (application entry point)

   Bootstraps the whole experience in the XR Blocks idiom:
     - builds an Options object,
     - constructs the scene/renderer/camera,
     - builds the Room, the PlayerController, and every registered Station,
     - runs the animation loop,
     - detects proximity to stations and drives the step-through UI,
     - explicitly supports a DESKTOP simulator (WASD + mouse-look + click) so
       desktop browsers work with no XR hardware, AND runs in mobile Safari /
       Chrome with touch controls and no headset.

   NOTE ON XR BLOCKS: the brief asks for the XR Blocks importmap + CDN, which
   index.html provides. We build on three.js (XR Blocks' own foundation) so the
   QR-code phone use-case is rock solid with zero build step. If you later run
   this on Android XR hardware, you can progressively enhance using the `xb`
   module that the importmap already exposes. See README for details.
   ========================================================================= */

import * as THREE from "three";

import { Options } from "./core/Options.js";
import { Room } from "./core/Room.js";
import { PlayerController } from "./core/PlayerController.js";
import { getStationDefs } from "./core/StationRegistry.js";

import { Joystick } from "./ui/Joystick.js";
import { TouchControls } from "./ui/TouchControls.js";
import { runOnboarding } from "./ui/Onboarding.js";

// Importing the section files triggers their registerStation() calls.
// Each member's file is independent; order here does not matter.
import "./stations/linear_approximation.js";
import "./stations/binomial_and_poisson.js";
import "./stations/normal_distribution.js";

class App {
  constructor() {
    this.options = new Options();
    this.clock = new THREE.Clock();
    this.stations = [];
    this.nearest = null;
    this.activeStation = null;
  }

  async init() {
    this._setupRenderer();
    this._setupScene();
    this._setupStations();
    this._setupControls();
    this._setupStepUI();
    window.addEventListener("resize", () => this._onResize());

    // Hide loading splash, run onboarding, then start.
    document.getElementById("loading").classList.add("hidden");
    this.renderer.setAnimationLoop(() => this._tick());

    await runOnboarding(this.options);
    this.started = true;
  }

  _setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: this.options.antialias,
      alpha: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.options.pixelRatioCap));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    document.getElementById("app").appendChild(this.renderer.domElement);
  }

  _setupScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0b1020);
    this.scene.fog = new THREE.Fog(0x0b1020, 14, 26);

    this.camera = new THREE.PerspectiveCamera(
      this.options.fov,
      window.innerWidth / window.innerHeight,
      this.options.near,
      this.options.far
    );

    this.room = new Room(this.options);
    this.scene.add(this.room);

    this.player = new PlayerController(this.camera, this.options, this.room.colliders);
    this.scene.add(this.player);
  }

  _setupStations() {
    const defs = getStationDefs();
    for (const def of defs) {
      try {
        const station = def.create(def, { options: this.options, room: this.room });
        this.scene.add(station);
        this.stations.push(station);
      } catch (err) {
        console.error(`[App] failed to build station "${def.id}":`, err);
      }
    }
    console.log(`[App] built ${this.stations.length} stations.`);
  }

  _setupControls() {
    // Virtual joystick (movement)
    this.joystick = new Joystick(
      document.getElementById("joystick"),
      document.getElementById("joystick-knob"),
      (x, y) => this.player.setMoveInput(x, y)
    );
    document.getElementById("joystick").classList.remove("hidden");

    // Drag-to-look, excluding HUD elements so gestures don't conflict
    const exclusions = [
      document.getElementById("joystick"),
      document.getElementById("interact-btn"),
      document.getElementById("step-controls"),
      document.getElementById("onboarding"),
    ];
    this.touch = new TouchControls((dx, dy) => {
      if (this.started) this.player.applyLook(dx, dy);
    }, exclusions);

    // Desktop simulator: WASD movement (explicitly enabled via Options)
    if (this.options.enableDesktopSimulator) this._setupDesktopKeys();
  }

  _setupDesktopKeys() {
    const keys = {};
    const apply = () => {
      const x = (keys["d"] ? 1 : 0) - (keys["a"] ? 1 : 0);
      const y = (keys["w"] ? 1 : 0) - (keys["s"] ? 1 : 0);
      this.player.setMoveInput(x, y);
    };
    window.addEventListener("keydown", (e) => {
      const k = e.key.toLowerCase();
      keys[k] = true;
      if (k === "e" || k === "enter") this._tryInteract();
      if (k === "escape") this._exitStation();
      apply();
    });
    window.addEventListener("keyup", (e) => {
      keys[e.key.toLowerCase()] = false;
      apply();
    });
  }

  _setupStepUI() {
    this.interactBtn = document.getElementById("interact-btn");
    this.stepControls = document.getElementById("step-controls");
    this.prevBtn = document.getElementById("prev-btn");
    this.nextBtn = document.getElementById("next-btn");
    this.exitBtn = document.getElementById("exit-btn");
    this.hint = document.getElementById("proximity-hint");

    this.interactBtn.addEventListener("click", () => this._tryInteract());
    this.nextBtn.addEventListener("click", () => this._step(1));
    this.prevBtn.addEventListener("click", () => this._step(-1));
    this.exitBtn.addEventListener("click", () => this._exitStation());
  }

  // ---- interaction flow ----------------------------------------------------
  _tryInteract() {
    if (this.activeStation || !this.nearest) return;
    this.activeStation = this.nearest;
    this.activeStation.begin();
    this.interactBtn.classList.add("hidden");
    this.stepControls.classList.remove("hidden");
    this.hint.classList.add("hidden");
    this._refreshStepButtons();
  }

  _exitStation() {
    if (!this.activeStation) return;
    this.activeStation.end();
    this.activeStation = null;
    this.stepControls.classList.add("hidden");
  }

  _step(dir) {
    if (!this.activeStation) return;
    if (dir > 0) this.activeStation.next();
    else this.activeStation.prev();
    this._refreshStepButtons();
  }

  _refreshStepButtons() {
    const s = this.activeStation;
    if (!s) return;
    this.prevBtn.disabled = !s.canPrev;
    this.nextBtn.disabled = !s.canNext;
    this.nextBtn.textContent = s.canNext ? `Next ›` : `Done`;
  }

  // ---- proximity detection -------------------------------------------------
  _updateProximity() {
    if (this.activeStation) return; // ignore while a lesson is open
    const eye = this.player.worldEye;
    let best = null;
    let bestDist = Infinity;
    for (const s of this.stations) {
      const d = eye.distanceTo(s.worldCenter);
      if (d < bestDist) {
        bestDist = d;
        best = s;
      }
    }
    if (best && bestDist <= this.options.interactDistance) {
      this.nearest = best;
      this.interactBtn.classList.remove("hidden");
      this.hint.textContent = `${best.def.title} — tap Interact`;
      this.hint.classList.remove("hidden");
    } else {
      this.nearest = null;
      this.interactBtn.classList.add("hidden");
      this.hint.classList.add("hidden");
    }
  }

  // ---- render loop ---------------------------------------------------------
  _tick() {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    if (this.started) this.player.update(dt);
    for (const s of this.stations) s.update(dt);
    this._updateProximity();
    this.renderer.render(this.scene, this.camera);
  }

  _onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.options.pixelRatioCap));
  }
}

// Boot when DOM is ready (mirrors the XR Blocks basic-example pattern).
document.addEventListener("DOMContentLoaded", () => {
  const app = new App();
  app.init().catch((e) => console.error("[App] init failed:", e));
});
