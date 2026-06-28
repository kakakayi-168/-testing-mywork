/* =========================================================================
   js/core/Room.js  —  SHARED
   Builds the classroom environment: floor, walls, ceiling, lighting, desks,
   a teacher's area, and decorative touches. Also exposes wall anchor points
   where stations + their wall projections attach.

   Coordinate convention:
     - Room is centered at origin on X/Z.
     - +Z is "front" (toward the main board wall), -Z is "back" (entry).
     - Floor at y=0, ceiling at room.height.
   ========================================================================= */

import * as THREE from "three";

export class Room extends THREE.Group {
  constructor(options) {
    super();
    this.options = options;
    this.colliders = []; // AABBs for wall collision
    this._build();
  }

  _build() {
    const { width: W, depth: D, height: H } = this.options.room;

    // ---- Floor: grey institutional carpet (PolyU teaching room) ---------
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x55585e, // grey carpet
      roughness: 0.95,
      metalness: 0.0,
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.add(floor);

    // very faint carpet-seam grid for depth perception while walking
    const grid = new THREE.GridHelper(Math.max(W, D), Math.max(W, D), 0x6a6d73, 0x4c4f55);
    grid.material.transparent = true;
    grid.material.opacity = 0.15; // softer than before
    grid.position.y = 0.01;
    this.add(grid);

    // ---- Ceiling --------------------------------------------------------
    const ceil = new THREE.Mesh(
      new THREE.PlaneGeometry(W, D),
      new THREE.MeshStandardMaterial({ color: 0xf7f7f4, roughness: 0.95 })
    );
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = H;
    this.add(ceil);

    // ---- Walls (two-tone: dado + upper) ---------------------------------
    const upperMat = new THREE.MeshStandardMaterial({
      color: 0xedeae3, // warm off-white
      roughness: 0.92,
    });
    const dadoMat = new THREE.MeshStandardMaterial({
      color: 0x9aa6b2, // soft grey-blue lower band
      roughness: 0.8,
    });
    const dadoH = 1.0;

    const addWall = (w, x, z, ry) => {
      const wall = new THREE.Group();
      const upper = new THREE.Mesh(new THREE.PlaneGeometry(w, H - dadoH), upperMat);
      upper.position.y = dadoH + (H - dadoH) / 2;
      const dado = new THREE.Mesh(new THREE.PlaneGeometry(w, dadoH), dadoMat);
      dado.position.y = dadoH / 2;
      wall.add(upper, dado);
      wall.position.set(x, 0, z);
      wall.rotation.y = ry;
      this.add(wall);
    };

    // Front wall (+Z), back wall (-Z), left (-X), right (+X). Faces inward.
    addWall(W, 0, D / 2, Math.PI); // front, normal toward -Z (into room)
    addWall(W, 0, -D / 2, 0); // back
    addWall(D, -W / 2, 0, Math.PI / 2); // left
    addWall(D, W / 2, 0, -Math.PI / 2); // right

    // Wall colliders (thin AABB slabs just inside each wall)
    const t = 0.2;
    this.colliders.push(aabb(-W / 2 - t, W / 2 + t, -D / 2 - t, -D / 2)); // back
    this.colliders.push(aabb(-W / 2 - t, W / 2 + t, D / 2, D / 2 + t)); // front
    this.colliders.push(aabb(-W / 2 - t, -W / 2, -D / 2 - t, D / 2 + t)); // left
    this.colliders.push(aabb(W / 2, W / 2 + t, -D / 2 - t, D / 2 + t)); // right

    // ---- Lighting -------------------------------------------------------
    this.add(new THREE.HemisphereLight(0xffffff, 0x9a9a9a, 1.2)); // cooler bounce
    const key = new THREE.DirectionalLight(0xffffff, 0.9);
    key.position.set(W * 0.3, H, D * 0.2);
    this.add(key);

    // Ceiling light panels (visual + a bit of fill)
    for (let i = -1; i <= 1; i++) {
      const panel = new THREE.Mesh(
        new THREE.PlaneGeometry(2.6, 1.1),
        new THREE.MeshStandardMaterial({
          color: 0xffffff,
          emissive: 0xfdfdff, // cool white panel glow
          emissiveIntensity: 1.0,
        })
      );
      panel.rotation.x = Math.PI / 2;
      panel.position.set(i * 4.5, H - 0.02, 0);
      this.add(panel);
      const pl = new THREE.PointLight(0xffffff, 0.4, 16);
      pl.position.set(i * 4.5, H - 0.4, 0);
      this.add(pl);
    }

    // ---- Decorative classroom furniture ---------------------------------
    this._addArchitecture(); // NEW: structural detail that reshapes the feel
    this._addDesks();
    this._addTeacherArea();
    this._addRug();
    this._addPolyUAccents(); // cosmetic-only PolyU touches (safe zones)
  }

  _addDesks() {
    const oak = new THREE.MeshStandardMaterial({ color: 0xb08d57, roughness: 0.5 });
    const oakDark = new THREE.MeshStandardMaterial({ color: 0x8a6a3e, roughness: 0.55 });
    const panelMat = new THREE.MeshStandardMaterial({ color: 0xe9e6df, roughness: 0.7 }); // light modesty panel
    const chairShell = new THREE.MeshStandardMaterial({ color: 0xa02838, roughness: 0.55 }); // PolyU red
    const chrome = new THREE.MeshStandardMaterial({ color: 0xc4c7cc, roughness: 0.25, metalness: 0.7 });

    // Modern fixed-bench desk: a continuous worktop on two solid side panels,
    // a light modesty panel across the front, and a thin oak front edge. Reads
    // far more like a real lecture-room bench than four stick legs.
    const makeDesk = (x, z) => {
      const g = new THREE.Group();

      const top = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.05, 0.62), oak);
      top.position.y = 0.74;
      top.castShadow = true;
      g.add(top);

      const edge = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.04, 0.03), oakDark);
      edge.position.set(0, 0.72, 0.31);
      g.add(edge);

      // solid side panels instead of legs
      for (const sx of [-0.72, 0.72]) {
        const side = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.72, 0.55), panelMat);
        side.position.set(sx, 0.37, 0);
        g.add(side);
      }
      // modesty panel across the front
      const modesty = new THREE.Mesh(new THREE.BoxGeometry(1.46, 0.42, 0.03), panelMat);
      modesty.position.set(0, 0.5, -0.28);
      g.add(modesty);

      // two modern shell chairs on chrome stems
      for (const cx of [-0.38, 0.38]) {
        const seat = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.06, 0.42), chairShell);
        seat.position.set(cx, 0.46, 0.62);
        seat.castShadow = true;
        g.add(seat);
        const back = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.5, 0.05), chairShell);
        back.position.set(cx, 0.72, 0.82);
        g.add(back);
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.46, 10), chrome);
        stem.position.set(cx, 0.23, 0.62);
        g.add(stem);
        const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.03, 16), chrome);
        foot.position.set(cx, 0.02, 0.62);
        g.add(foot);
      }

      g.position.set(x, 0, z);
      this.add(g);
    };

    // two tidy rows of benches facing the front (+Z), kept clear of the walls
    for (let row = 0; row < 2; row++) {
      for (let col = -1; col <= 1; col++) {
        makeDesk(col * 2.6, -2 + row * 2.4);
      }
    }
  }

  _addTeacherArea() {
    // A small podium near the front wall
    const podium = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 1.1, 0.5),
      new THREE.MeshStandardMaterial({ color: 0xb08d57, roughness: 0.55 })
    );
    podium.position.set(-this.options.room.width / 2 + 2, 0.55, this.options.room.depth / 2 - 1.2);
    this.add(podium);
  }

  _addRug() {
    const rug = new THREE.Mesh(
      new THREE.PlaneGeometry(5, 3),
      new THREE.MeshStandardMaterial({ color: 0x7a2230, roughness: 0.9 })
    );
    rug.rotation.x = -Math.PI / 2;
    rug.position.set(0, 0.02, 0);
    this.add(rug);
  }

  /**
   * Structural architectural detail that makes the room read as a modern PolyU
   * lecture room rather than a plain box. All NEW geometry, all placed flush
   * against existing wall surfaces or on the ceiling — never changing room
   * dimensions, the wall meshes, colliders, or wallAnchor(). Nothing protrudes
   * into the walking area or over a board: the front slat wall sits 4 cm off
   * the front wall while the boards mount at a larger inset in front of it.
   */
  _addArchitecture() {
    const { width: W, depth: D, height: H } = this.options.room;
    const dadoH = 1.0;

    // ---- Front teaching wall: vertical timber slat feature -------------
    // A bank of warm vertical wood slats across the front wall, the signature
    // look of PolyU's renovated teaching walls. Sits flush (z just inside the
    // +Z wall); the boards float in front of it, so no overlap.
    const slatMat = new THREE.MeshStandardMaterial({ color: 0x9c7846, roughness: 0.55 });
    const slatGapMat = new THREE.MeshStandardMaterial({ color: 0x3b2f23, roughness: 0.8 });
    // dark backing so gaps between slats read as shadow lines
    const backing = new THREE.Mesh(new THREE.PlaneGeometry(W, H - dadoH), slatGapMat);
    backing.position.set(0, dadoH + (H - dadoH) / 2, D / 2 - 0.025);
    backing.rotation.y = Math.PI;
    this.add(backing);
    const slatCount = Math.floor(W / 0.22);
    const slatH = H - dadoH - 0.1;
    for (let i = 0; i < slatCount; i++) {
      const x = -W / 2 + 0.12 + i * 0.22;
      const slat = new THREE.Mesh(new THREE.BoxGeometry(0.12, slatH, 0.03), slatMat);
      slat.position.set(x, dadoH + (H - dadoH) / 2, D / 2 - 0.04);
      this.add(slat);
    }

    // ---- Acoustic ceiling tile grid ------------------------------------
    // A grid of recessed tiles + thin frame lines just below the ceiling.
    const tileMat = new THREE.MeshStandardMaterial({ color: 0xeceae5, roughness: 0.95 });
    const tMat = new THREE.MeshStandardMaterial({ color: 0xbfc2c7, roughness: 0.6, metalness: 0.2 });
    const tileSize = 1.2;
    const nx = Math.floor(W / tileSize);
    const nz = Math.floor(D / tileSize);
    const ox = -(nx * tileSize) / 2 + tileSize / 2;
    const oz = -(nz * tileSize) / 2 + tileSize / 2;
    for (let ix = 0; ix < nx; ix++) {
      for (let iz = 0; iz < nz; iz++) {
        const tile = new THREE.Mesh(new THREE.PlaneGeometry(tileSize * 0.96, tileSize * 0.96), tileMat);
        tile.rotation.x = Math.PI / 2;
        tile.position.set(ox + ix * tileSize, H - 0.05, oz + iz * tileSize);
        this.add(tile);
      }
    }
    // thin T-bar grid lines (a few long strips, cheap)
    for (let ix = 0; ix <= nx; ix++) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, D), tMat);
      bar.position.set(ox - tileSize / 2 + ix * tileSize, H - 0.04, 0);
      this.add(bar);
    }
    for (let iz = 0; iz <= nz; iz++) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(W, 0.02, 0.03), tMat);
      bar.position.set(0, H - 0.04, oz - tileSize / 2 + iz * tileSize);
      this.add(bar);
    }

    // ---- Skirting / baseboard around the room --------------------------
    const skirtMat = new THREE.MeshStandardMaterial({ color: 0x3a3f47, roughness: 0.6 });
    const skirtH = 0.12;
    const addSkirt = (len, x, z, ry) => {
      const s = new THREE.Mesh(new THREE.BoxGeometry(len, skirtH, 0.03), skirtMat);
      s.position.set(x, skirtH / 2, z);
      s.rotation.y = ry;
      this.add(s);
    };
    addSkirt(W, 0, D / 2 - 0.02, 0);
    addSkirt(W, 0, -D / 2 + 0.02, 0);
    addSkirt(D, -W / 2 + 0.02, 0, Math.PI / 2);
    addSkirt(D, W / 2 - 0.02, 0, Math.PI / 2);

    // ---- Vertical reveal lines on the side walls -----------------------
    // Slim recessed grooves that break up the flat side walls (modern look).
    const revealMat = new THREE.MeshStandardMaterial({ color: 0xd6d2ca, roughness: 0.9 });
    for (const sx of [-W / 2 + 0.03, W / 2 - 0.03]) {
      const ry = sx < 0 ? Math.PI / 2 : Math.PI / 2;
      for (let i = -2; i <= 2; i++) {
        const reveal = new THREE.Mesh(new THREE.BoxGeometry(0.02, H - dadoH - 0.2, 0.04), revealMat);
        reveal.position.set(sx, dadoH + (H - dadoH) / 2, i * 1.8);
        reveal.rotation.y = ry;
        this.add(reveal);
      }
    }
  }

  /**
   * Cosmetic-only PolyU accents. Every object here is NEW and placed in a safe
   * zone: the dado stripe sits flush (2 cm) against each wall so it never
   * intrudes into the room or over a board; the window band, clock, and plants
   * live on/near the BACK wall (−Z), which holds no interaction boards. None of
   * this touches room dimensions, wall geometry, colliders, or wallAnchor().
   */
  _addPolyUAccents() {
    const { width: W, depth: D, height: H } = this.options.room;
    const dadoH = 1.0; // matches the wall dado height above
    const RED = 0xa02838;

    // --- Thin PolyU-red accent stripe along the top of the dado, each wall ---
    const stripeH = 0.06;
    const stripeMat = new THREE.MeshStandardMaterial({
      color: RED,
      roughness: 0.6,
      emissive: RED,
      emissiveIntensity: 0.12,
    });
    const addStripe = (len, x, z, ry) => {
      const s = new THREE.Mesh(new THREE.BoxGeometry(len, stripeH, 0.015), stripeMat);
      s.position.set(x, dadoH, z);
      s.rotation.y = ry;
      this.add(s);
    };
    // flush just inside each wall surface (slightly inset so it never pokes out)
    addStripe(W, 0, D / 2 - 0.03, 0); // front
    addStripe(W, 0, -D / 2 + 0.03, 0); // back
    addStripe(D, -W / 2 + 0.03, 0, Math.PI / 2); // left
    addStripe(D, W / 2 - 0.03, 0, Math.PI / 2); // right

    // --- Back-wall window band (no boards there) ---------------------------
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0xbcd4e6,
      transparent: true,
      opacity: 0.4,
      roughness: 0.1,
      metalness: 0.0,
    });
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x3a3f47, roughness: 0.5 });
    const winY = dadoH + (H - dadoH) * 0.55;
    const winW = 2.2;
    const winH = 1.3;
    for (let i = -1; i <= 1; i++) {
      const x = i * 3.0;
      // frame
      const frame = new THREE.Mesh(new THREE.BoxGeometry(winW + 0.12, winH + 0.12, 0.04), frameMat);
      frame.position.set(x, winY, -D / 2 + 0.04);
      this.add(frame);
      // glass
      const glass = new THREE.Mesh(new THREE.PlaneGeometry(winW, winH), glassMat);
      glass.position.set(x, winY, -D / 2 + 0.06);
      this.add(glass);
      // a simple mullion
      const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.04, winH, 0.05), frameMat);
      mullion.position.set(x, winY, -D / 2 + 0.065);
      this.add(mullion);
    }

    // --- A wall clock on the back wall -------------------------------------
    const clock = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.22, 0.04, 24),
      new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.5 })
    );
    clock.rotation.x = Math.PI / 2;
    clock.position.set(W / 2 - 1.2, H - 0.8, -D / 2 + 0.05);
    this.add(clock);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.22, 0.02, 8, 24),
      new THREE.MeshStandardMaterial({ color: RED, roughness: 0.5 })
    );
    ring.position.set(W / 2 - 1.2, H - 0.8, -D / 2 + 0.07);
    this.add(ring);

    // --- Two potted plants in the back corners (clear of desks & paths) ----
    const makePlant = (x, z) => {
      const g = new THREE.Group();
      const pot = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.12, 0.3, 12),
        new THREE.MeshStandardMaterial({ color: 0x6b4f3a, roughness: 0.7 })
      );
      pot.position.y = 0.15;
      g.add(pot);
      const foliage = new THREE.Mesh(
        new THREE.SphereGeometry(0.28, 12, 12),
        new THREE.MeshStandardMaterial({ color: 0x3f7d4f, roughness: 0.85 })
      );
      foliage.position.y = 0.55;
      foliage.scale.y = 1.3;
      g.add(foliage);
      g.position.set(x, 0, z);
      this.add(g);
    };
    makePlant(-W / 2 + 0.7, -D / 2 + 0.7); // back-left corner
    makePlant(W / 2 - 0.7, -D / 2 + 0.7); // back-right corner
  }

  /**
   * Returns world-space anchor data for mounting a station on a wall.
   * @param {'front'|'back'|'left'|'right'} side
   * @param {number} t   position along the wall, -1..1 (0 = center)
   * @param {number} y   mount height (metres)
   */
  wallAnchor(side, t = 0, y = 1.7) {
    const { width: W, depth: D } = this.options.room;
    const inset = 0.06; // sit just off the wall surface
    switch (side) {
      case "front":
        return { pos: new THREE.Vector3((t * W) / 2 * 0.8, y, D / 2 - inset), faceY: Math.PI };
      case "back":
        return { pos: new THREE.Vector3((t * W) / 2 * 0.8, y, -D / 2 + inset), faceY: 0 };
      case "left":
        return { pos: new THREE.Vector3(-W / 2 + inset, y, (t * D) / 2 * 0.8), faceY: Math.PI / 2 };
      case "right":
        return { pos: new THREE.Vector3(W / 2 - inset, y, (t * D) / 2 * 0.8), faceY: -Math.PI / 2 };
    }
  }
}

function aabb(minX, maxX, minZ, maxZ) {
  return { minX, maxX, minZ, maxZ };
}
