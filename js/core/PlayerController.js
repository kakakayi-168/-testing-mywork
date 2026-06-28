/* =========================================================================
   js/core/PlayerController.js  —  SHARED
   First-person walking character with a camera rig.

   - Movement comes from the virtual joystick (mobile) or WASD (desktop sim).
   - Look comes from drag-anywhere (mobile) or mouse-drag (desktop).
   - Simple AABB collision against the room walls keeps you inside.
   - A small 3D avatar body (torso + head) follows the rig so that, in third-
     party reflections / shadows and when you look down, there's a visible
     character. The camera sits at eye height inside the head.

   The rig is a THREE.Group: position = feet on floor. Camera is a child at
   eyeHeight. Yaw is applied to the rig; pitch to the camera only.
   ========================================================================= */

import * as THREE from "three";

export class PlayerController extends THREE.Group {
  constructor(camera, options, colliders) {
    super();
    this.camera = camera;
    this.options = options;
    this.colliders = colliders || [];

    this.yaw = 0;
    this.pitch = 0;
    this.moveInput = new THREE.Vector2(0, 0); // x = strafe, y = forward
    this._tmp = new THREE.Vector3();

    // Camera sits at eye height
    camera.position.set(0, options.eyeHeight, 0);
    camera.rotation.set(0, 0, 0);
    this.add(camera);

    this._buildAvatar();

    // Spawn in the MIDDLE of the classroom, in the clear aisle between the two
    // desk rows, FACING the front wall (+Z) where the Binomial/Poisson boards
    // hang, so the student starts looking at a blackboard.
    this.position.set(0, 0, -0.8);
    this.yaw = Math.PI; // face +Z (front wall with boards)
  }

  _buildAvatar() {
    // A small, friendly low-poly avatar. Hidden from the camera's own view by
    // keeping it below/behind the eye; mostly seen in shadow + when looking down.
    const body = new THREE.Group();
    const skin = new THREE.MeshStandardMaterial({ color: 0xf2c9a0, roughness: 0.6 });
    const shirt = new THREE.MeshStandardMaterial({ color: 0x4cc9f0, roughness: 0.6 });
    const pants = new THREE.MeshStandardMaterial({ color: 0x2c3e66, roughness: 0.7 });

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.4, 6, 12), shirt);
    torso.position.y = 1.05;
    body.add(torso);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 16), skin);
    head.position.y = 1.42;
    body.add(head);

    for (const s of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.5, 4, 8), pants);
      leg.position.set(s * 0.09, 0.4, 0);
      body.add(leg);
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.4, 4, 8), shirt);
      arm.position.set(s * 0.26, 1.05, 0);
      body.add(arm);
    }
    body.castShadow = true;
    this.avatar = body;
    this.add(body);
  }

  setMoveInput(x, y) {
    this.moveInput.set(x, y);
  }

  /** Apply a look delta in pixels (from drag). */
  applyLook(dx, dy) {
    this.yaw -= dx * this.options.lookSensitivity;
    this.pitch -= dy * this.options.lookSensitivity;
    const lim = Math.PI / 2 - 0.05;
    this.pitch = Math.max(-lim, Math.min(lim, this.pitch));
  }

  update(dt) {
    // Orientation
    this.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;

    // Movement in the horizontal plane, relative to yaw
    const speed = this.options.moveSpeed;
    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));

    this._tmp.set(0, 0, 0);
    this._tmp.addScaledVector(forward, this.moveInput.y);
    this._tmp.addScaledVector(right, this.moveInput.x);
    if (this._tmp.lengthSq() > 1) this._tmp.normalize();
    this._tmp.multiplyScalar(speed * dt);

    // Collide-and-slide on each axis
    const next = this.position.clone();
    next.x += this._tmp.x;
    if (!this._hits(next.x, this.position.z)) this.position.x = next.x;
    next.z = this.position.z + this._tmp.z;
    if (!this._hits(this.position.x, next.z)) this.position.z = next.z;

    // Walk bob + avatar facing
    const moving = this.moveInput.lengthSq() > 0.01;
    if (moving) {
      this._bob = (this._bob || 0) + dt * 9;
      this.camera.position.y = this.options.eyeHeight + Math.sin(this._bob) * 0.015;
    } else {
      this.camera.position.y += (this.options.eyeHeight - this.camera.position.y) * 0.2;
    }
    // Keep avatar from poking through the camera: face move direction
    if (this.avatar) this.avatar.rotation.y = 0; // faces rig forward already
  }

  _hits(x, z) {
    const r = this.options.playerRadius;
    for (const c of this.colliders) {
      if (x + r > c.minX && x - r < c.maxX && z + r > c.minZ && z - r < c.maxZ) {
        return true;
      }
    }
    return false;
  }

  /** World position of the camera (for proximity checks). */
  get worldEye() {
    return this.localToWorld(new THREE.Vector3(0, this.options.eyeHeight, 0));
  }
}
