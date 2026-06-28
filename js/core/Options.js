/* =========================================================================
   js/core/Options.js  —  SHARED
   Central configuration object, written in the XR Blocks idiom (xb.Options).
   One place to tune the whole experience. Members should NOT need to edit
   this for normal section work.
   ========================================================================= */

export class Options {
  constructor(overrides = {}) {
    // ---- Renderer / camera -------------------------------------------------
    this.fov = 70;
    this.near = 0.05;
    this.far = 100;
    this.pixelRatioCap = 2; // cap devicePixelRatio for mobile perf
    this.antialias = true;

    // ---- Player / movement -------------------------------------------------
    this.eyeHeight = 1.6; // metres — standing eye height
    this.moveSpeed = 2.6; // metres / second
    this.lookSensitivity = 0.0028; // radians per pixel dragged
    this.playerRadius = 0.35; // collision capsule radius

    // ---- Room dimensions (metres) -----------------------------------------
    // A wide classroom. Stations hang on the walls.
    this.room = {
      width: 16, // X
      depth: 12, // Z
      height: 4.2, // Y
    };

    // ---- Interaction -------------------------------------------------------
    this.interactDistance = 5.0; // how close to enable "Interact" (roomy for phone)
    this.projectionFadeSpeed = 4.0; // wall-projection fade rate

    // ---- Desktop simulator -------------------------------------------------
    // Explicitly enable a desktop control scheme so the app is fully usable
    // in a desktop browser WITHOUT XR hardware (WASD + mouse-look + click).
    this.enableDesktopSimulator = true;

    // ---- Misc --------------------------------------------------------------
    this.onboardingDurationMs = 5000;

    Object.assign(this, overrides);
  }
}
