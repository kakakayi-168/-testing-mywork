/* =========================================================================
   js/core/StationRegistry.js  —  SHARED
   The glue that keeps the three team members independent.

   Each section file (linear_approximation.js, binomial_and_poisson.js,
   normal_distribution.js) imports `registerStation` and registers one or more
   stations with a unique id. main.js asks the registry to build them all.

   A member editing ONLY their section file can add/replace steps, change the
   graph, retitle the board — without touching any shared file or another
   member's file. The registry guarantees ids don't collide.
   ========================================================================= */

const _stations = [];

/**
 * Register a station factory.
 * @param {object} def
 *   id        : unique string
 *   title     : short label shown on the board header + proximity hint
 *   section   : "1" | "2.1" | "2.2" | "3.1" | "3.2"  (for ordering/labels)
 *   wall      : {side, t, y} anchor on the room (see Room.wallAnchor)
 *   projectorSide : +1 (projection right of board) or -1 (left)  [optional]
 *   plot      : MathPlot config override  [optional]
 *   create    : (def, ctx) => Station instance
 *                 def = this same object (so the station can read title/wall)
 *                 ctx = {options, room}
 */
export function registerStation(def) {
  if (_stations.some((s) => s.id === def.id)) {
    console.warn(`[StationRegistry] duplicate station id "${def.id}" ignored`);
    return;
  }
  _stations.push(def);
}

export function getStationDefs() {
  return _stations.slice();
}
