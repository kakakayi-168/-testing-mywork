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

    // ---- Floor: warm parquet-style with subtle grid ---------------------
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x6b4f3a,
      roughness: 0.75,
      metalness: 0.05,
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.add(floor);

    // faint floor grid for depth perception while walking
    const grid = new THREE.GridHelper(Math.max(W, D), Math.max(W, D), 0x8a6f55, 0x5a4334);
    grid.material.transparent = true;
    grid.material.opacity = 0.35;
    grid.position.y = 0.01;
    this.add(grid);

    // ---- Ceiling --------------------------------------------------------
    const ceil = new THREE.Mesh(
      new THREE.PlaneGeometry(W, D),
      new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.95 })
    );
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = H;
    this.add(ceil);

    // ---- Walls (two-tone: dado + upper) ---------------------------------
    const upperMat = new THREE.MeshStandardMaterial({
      color: 0xdfe3ec,
      roughness: 0.95,
    });
    const dadoMat = new THREE.MeshStandardMaterial({
      color: 0x3b5a78,
      roughness: 0.85,
    });
    const dadoH = 1.1;

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
    this.add(new THREE.HemisphereLight(0xffffff, 0x60554a, 1.1));
    const key = new THREE.DirectionalLight(0xfff4e6, 1.0);
    key.position.set(W * 0.3, H, D * 0.2);
    this.add(key);

    // Ceiling light panels (visual + a bit of fill)
    for (let i = -1; i <= 1; i++) {
      const panel = new THREE.Mesh(
        new THREE.PlaneGeometry(2.4, 1.0),
        new THREE.MeshStandardMaterial({
          color: 0xffffff,
          emissive: 0xfff6e0,
          emissiveIntensity: 0.9,
        })
      );
      panel.rotation.x = Math.PI / 2;
      panel.position.set(i * 4.5, H - 0.02, 0);
      this.add(panel);
      const pl = new THREE.PointLight(0xfff4e6, 0.35, 14);
      pl.position.set(i * 4.5, H - 0.4, 0);
      this.add(pl);
    }

    // ---- Decorative classroom furniture ---------------------------------
    this._addDesks();
    this._addTeacherArea();
    this._addRug();
  }

  _addDesks() {
    const deskMat = new THREE.MeshStandardMaterial({ color: 0xc9a26a, roughness: 0.6 });
    const legMat = new THREE.MeshStandardMaterial({ color: 0x4a4a52, roughness: 0.4 });
    const chairMat = new THREE.MeshStandardMaterial({ color: 0x2b6e8c, roughness: 0.6 });

    const makeDesk = (x, z) => {
      const g = new THREE.Group();
      const top = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.06, 0.6), deskMat);
      top.position.y = 0.72;
      g.add(top);
      for (const [dx, dz] of [[-0.48, -0.24], [0.48, -0.24], [-0.48, 0.24], [0.48, 0.24]]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.72, 0.06), legMat);
        leg.position.set(dx, 0.36, dz);
        g.add(leg);
      }
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.05, 0.45), chairMat);
      seat.position.set(0, 0.45, 0.55);
      g.add(seat);
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.05), chairMat);
      back.position.set(0, 0.67, 0.77);
      g.add(back);
      g.position.set(x, 0, z);
      this.add(g);
    };

    // two tidy rows of desks facing the front (+Z), kept clear of the walls
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
      new THREE.MeshStandardMaterial({ color: 0x5a3d2b, roughness: 0.6 })
    );
    podium.position.set(-this.options.room.width / 2 + 2, 0.55, this.options.room.depth / 2 - 1.2);
    this.add(podium);
  }

  _addRug() {
    const rug = new THREE.Mesh(
      new THREE.PlaneGeometry(5, 3),
      new THREE.MeshStandardMaterial({ color: 0x6a2e3e, roughness: 0.9 })
    );
    rug.rotation.x = -Math.PI / 2;
    rug.position.set(0, 0.02, 0);
    this.add(rug);
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
