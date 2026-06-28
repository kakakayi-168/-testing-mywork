/* =========================================================================
   js/ui/Joystick.js  —  SHARED
   Bottom-left virtual joystick. Reports a normalized vector (x: strafe,
   y: forward) in [-1,1]. Touch-first; also works with mouse for desktop.
   ========================================================================= */

export class Joystick {
  constructor(rootEl, knobEl, onChange) {
    this.root = rootEl;
    this.knob = knobEl;
    this.onChange = onChange;
    this.activeId = null;
    this.center = { x: 0, y: 0 };
    this.radius = 48;

    this.root.classList.remove("hidden");
    this._bind();
  }

  _bind() {
    const start = (e) => {
      const t = e.changedTouches ? e.changedTouches[0] : e;
      if (this.activeId !== null) return;
      this.activeId = t.identifier ?? "mouse";
      const r = this.root.getBoundingClientRect();
      this.center = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      this.radius = r.width / 2 - 14;
      this._move(t);
      e.preventDefault();
    };
    const move = (e) => {
      if (this.activeId === null) return;
      const t = this._find(e);
      if (t) {
        this._move(t);
        e.preventDefault();
      }
    };
    const end = (e) => {
      const t = this._find(e, true);
      if (t || e.type === "mouseup") this._reset();
    };

    this.root.addEventListener("touchstart", start, { passive: false });
    window.addEventListener("touchmove", move, { passive: false });
    window.addEventListener("touchend", end);
    window.addEventListener("touchcancel", end);

    this.root.addEventListener("mousedown", start);
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

  _move(t) {
    let dx = t.clientX - this.center.x;
    let dy = t.clientY - this.center.y;
    const dist = Math.hypot(dx, dy);
    if (dist > this.radius) {
      dx = (dx / dist) * this.radius;
      dy = (dy / dist) * this.radius;
    }
    this.knob.style.transform = `translate(${dx}px, ${dy}px)`;
    // forward is up (negative screen-y)
    this.onChange(dx / this.radius, -dy / this.radius);
  }

  _reset() {
    this.activeId = null;
    this.knob.style.transform = "translate(0,0)";
    this.onChange(0, 0);
  }
}
