/* =========================================================================
   js/ui/TouchControls.js  —  SHARED
   Drag-anywhere-to-look camera control. Ignores touches that start inside the
   joystick or on any HUD button, so movement and looking don't fight.
   Reports look deltas (dx, dy) in pixels via onLook callback.
   ========================================================================= */

export class TouchControls {
  constructor(onLook, exclusionEls = []) {
    this.onLook = onLook;
    this.exclusions = exclusionEls;
    this.activeId = null;
    this.last = { x: 0, y: 0 };
    this._bind();
  }

  _excluded(target) {
    return this.exclusions.some((el) => el && (el === target || el.contains(target)));
  }

  _bind() {
    const start = (e) => {
      const t = e.changedTouches ? e.changedTouches[0] : e;
      if (this._excluded(t.target)) return;
      if (this.activeId !== null) return;
      this.activeId = t.identifier ?? "mouse";
      this.last = { x: t.clientX, y: t.clientY };
    };
    const move = (e) => {
      if (this.activeId === null) return;
      const t = this._find(e);
      if (!t) return;
      const dx = t.clientX - this.last.x;
      const dy = t.clientY - this.last.y;
      this.last = { x: t.clientX, y: t.clientY };
      this.onLook(dx, dy);
      e.preventDefault();
    };
    const end = (e) => {
      const t = this._find(e, true);
      if (t || e.type === "mouseup") this.activeId = null;
    };

    window.addEventListener("touchstart", start, { passive: false });
    window.addEventListener("touchmove", move, { passive: false });
    window.addEventListener("touchend", end);
    window.addEventListener("touchcancel", end);

    // Desktop mouse-look
    window.addEventListener("mousedown", start);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", end);
  }

  _find(e, ended = false) {
    if (this.activeId === "mouse") return e;
    const list = ended ? e.changedTouches : e.touches;
    if (!list) return null;
    for (const t of list) if (t.identifier === this.activeId) return t;
    return null;
  }
}
