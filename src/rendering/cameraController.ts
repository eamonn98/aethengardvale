import * as THREE from "three";
import type { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { CAMERA_CONFIG } from "../config/constants.ts";

/**
 * Manages diorama telephoto follow smoothing, screen shake, and dynamic tilt-shift uFocusY.
 */
export class CameraController {
  private shakeIntensity = 0;
  private readonly tmpVec = new THREE.Vector3();

  addShake(amount: number): void {
    this.shakeIntensity = Math.max(this.shakeIntensity, amount);
  }

  resetShake(): void {
    this.shakeIntensity = 0;
  }

  update(
    dt: number,
    camera: THREE.PerspectiveCamera,
    playerPos: { x: number; y: number; z: number },
    playerDir: { x: number; z: number },
    elapsed: number,
    hd2dPass: ShaderPass,
  ): void {
    const targetX = playerPos.x * 0.85 + playerDir.x * 0.9;
    const targetY = playerPos.y + CAMERA_CONFIG.followOffsetY;
    const targetZ = playerPos.z + CAMERA_CONFIG.followOffsetZ;

    const damp = 1 - Math.exp(-CAMERA_CONFIG.followDamping * dt);
    camera.position.x += (targetX - camera.position.x) * damp;
    camera.position.y += (targetY - camera.position.y) * damp;
    camera.position.z += (targetZ - camera.position.z) * damp;

    let shX = 0;
    let shY = 0;
    if (this.shakeIntensity > 0.002) {
      shX = (Math.random() - 0.5) * this.shakeIntensity;
      shY = (Math.random() - 0.5) * this.shakeIntensity;
      this.shakeIntensity *= Math.pow(0.002, dt);
    }

    camera.lookAt(
      camera.position.x * 0.96 + playerPos.x * 0.04 + shX,
      playerPos.y + 0.85 + shY,
      camera.position.z - CAMERA_CONFIG.followOffsetZ,
    );

    this.tmpVec.set(playerPos.x, playerPos.y + 0.8, playerPos.z).project(camera);
    const focusUniform = hd2dPass.uniforms.uFocusY;
    if (focusUniform) {
      focusUniform.value = Math.max(
        0.32,
        Math.min(0.66, this.tmpVec.y * 0.5 + 0.5),
      );
    }
    const timeUniform = hd2dPass.uniforms.uTime;
    if (timeUniform) {
      timeUniform.value = elapsed;
    }
  }
}
