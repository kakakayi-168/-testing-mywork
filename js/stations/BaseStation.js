/* =========================================================================
   js/stations/BaseStation.js  —  SHARED
   Base class every interaction point extends. It wires together:
     - a wall-mounted board (the graph + a title plaque)
     - a MathPlot graphing area
     - a WallProjector (the stylish wall projection that shows the text)
     - step navigation (next / prev / exit)

   Section authors subclass this and implement:
       buildGraph(plot)        -> draw the static parts of the graph
       defineSteps()           -> return an array of step objects:
            {
              board: {title, body:[...lines], accent},  // wall projection text
              enter(plot, anim) { ... }                  // animate graph for this step
            }

   They never touch movement, collision, UI, or rendering. That isolation is
   what lets members 1–3 work in parallel on separate files.
   ========================================================================= */

import * as THREE from "three";
import { MathPlot } from "../core/MathPlot.js";
import { WallProjector } from "../core/WallProjector.js";
import { makeTextSprite } from "../core/TextSprite.js";

export class BaseStation extends THREE.Group {
  /**
   * @param {object} def  the registry definition (id, title, wall, ...)
   * @param {object} ctx  {options, room}
   */
  constructor(def, ctx) {
    super();
    this.def = def;
    this.options = ctx.options;
    this.room = ctx.room;
    this.steps = [];
    this.current = 0;
    this.active = false;
    this._t = 0;

    this._mount(ctx.room);
    this._buildBoard();

    // Sub-class hooks
    this.buildGraph(this.plot);
    this.steps = this.defineSteps() || [];
  }

  // ---- to be overridden by section authors --------------------------------
  buildGraph(_plot) {}
  defineSteps() {
    return [];
  }
  // Optional plot shift (override to move the graph clear of the side panel).
  plotOffset() {
    return { x: 0, y: 0 };
  }

  // ---- mounting on the wall ------------------------------------------------
  _mount(room) {
    // Lift every board higher up the wall so the enlarged board keeps a clear
    // gap from the floor, and scale the WHOLE station (board + graph + axis
    // labels + corner explanation panel + title) up together as one unit.
    //
    // Scaling the group (rather than resizing the board mesh) is deliberate: it
    // keeps every station author's internal geometry — including Member 2's
    // corner-docked panel math in binomial_and_poisson.js — perfectly valid,
    // because everything grows by the same factor. Uniform for all stations.
    const STATION_SCALE = 1.4; // board+graph+panel ~40% bigger
    const MOUNT_Y = 2.3;       // raise so the bigger board clears the floor

    const a = room.wallAnchor(this.def.wall.side, this.def.wall.t ?? 0, MOUNT_Y);
    this.position.copy(a.pos);
    this.rotation.y = a.faceY;
    this.scale.setScalar(STATION_SCALE);
    this.anchor = a;
  }

  _buildBoard() {
    // Title plaque (billboard text) above the graph
    this.titleSprite = makeTextSprite(this.def.title, {
      worldHeight: 0.16,
      color: "#ffffff",
      bold: true,
      bg: "rgba(20,28,56,0.85)",
      padding: 22,
    });
    this.titleSprite.position.set(0, 1.2, 0.05);
    this.add(this.titleSprite);

    // The graph area (a framed board)
    const boardW = 2.9;
    const boardH = 2.2;
    const board = new THREE.Mesh(
      new THREE.PlaneGeometry(boardW, boardH),
      new THREE.MeshStandardMaterial({ color: 0x101a32, roughness: 0.7 })
    );
    board.position.z = 0.01;
    this.add(board);
    // thin frame
    const frame = new THREE.Mesh(
      new THREE.PlaneGeometry(boardW + 0.12, boardH + 0.12),
      new THREE.MeshStandardMaterial({ color: 0xc9a26a, roughness: 0.5 })
    );
    frame.position.z = 0.0;
    this.add(frame);

    // The plot lives slightly in front of the board surface. Stations can
    // override plotOffset() to shift the graph sideways/vertically so it clears
    // a corner-docked explanation panel (e.g. shift right when panel is left).
    const off = this.plotOffset();
    this.plot = new MathPlot(this.plotConfig());
    this.plot.position.set(off.x || 0, off.y || 0, 0.04);
    this.plot.addGrid();
    this.plot.addAxes();
    this.add(this.plot);

    // Wall projector: a large screen mounted ON the wall, offset to the side
    // so it reads as a separate "projection" surface. Placed in the station's
    // local frame, pushed outward along the wall and onto the wall plane.
    this.projector = new WallProjector({ width: 3.4, height: 2.0 });
    this._placeProjector();
    this.add(this.projector);
  }

  _placeProjector() {
    // Offset the projection to one side of the board along the wall, at a
    // comfortable reading height. Local +X runs along the wall.
    const side = this.def.projectorSide ?? 1; // +1 right, -1 left of board
    this.projector.position.set(side * 3.0, 0.15, 0.02);
  }

  plotConfig() {
    // Sensible default; section authors can override by setting this.def.plot
    return this.def.plot || { xMin: -3, xMax: 3, yMin: -2, yMax: 4, width: 2.4, height: 1.8 };
  }

  // ---- lifecycle -----------------------------------------------------------
  get worldCenter() {
    return this.localToWorld(new THREE.Vector3(0, 0, 0.2));
  }

  begin() {
    this.active = true;
    this.current = 0;
    this._applyStep(0);
  }

  end() {
    this.active = false;
    this.projector.hide();
    this.plot.clearDynamic();
  }

  next() {
    if (this.current < this.steps.length - 1) {
      this.current++;
      this._applyStep(this.current);
    }
  }

  prev() {
    if (this.current > 0) {
      this.current--;
      this._applyStep(this.current);
    }
  }

  get canNext() {
    return this.current < this.steps.length - 1;
  }
  get canPrev() {
    return this.current > 0;
  }
  get progressLabel() {
    return `${this.current + 1} / ${this.steps.length}`;
  }

  _applyStep(i) {
    const step = this.steps[i];
    if (!step) return;
    // Reset dynamic graph content, then let the step rebuild it
    this.plot.clearDynamic();
    if (step.board) {
      this.projector.show({
        title: `${step.board.title}`,
        body: step.board.body || [],
        accent: step.board.accent || "#4cc9f0",
      });
    }
    const anim = { t: 0 };
    step.enter?.(this.plot, anim);
  }

  update(dt) {
    this._t += dt;
    this.plot.update(dt, this._t);
    this.projector.update(dt);
    // gentle title bob so the board feels alive
    if (this.titleSprite) {
      this.titleSprite.position.y = 1.2 + Math.sin(this._t * 1.5) * 0.01;
    }
  }
}
