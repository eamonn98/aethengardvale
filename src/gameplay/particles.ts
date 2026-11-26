import * as THREE from "three";

interface FxParticle {
  mesh: THREE.Mesh<THREE.BoxGeometry, THREE.MeshBasicMaterial>;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
}

const MOTE_COUNT = 160;

/**
 * Manages ambient sunlit dust motes and pooled/cached burst cube particles.
 */
export class ParticleSystem {
  private readonly scene: THREE.Scene;
  private readonly moteGeo: THREE.BufferGeometry;
  private readonly moteMat: THREE.PointsMaterial;
  private readonly motes: THREE.Points;
  private readonly motePhases = new Float32Array(MOTE_COUNT);
  private readonly particleGeo = new THREE.BoxGeometry(0.14, 0.14, 0.14);
  private readonly materialCache = new Map<string, THREE.MeshBasicMaterial>();
  private readonly fxParticles: FxParticle[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    this.moteGeo = new THREE.BufferGeometry();
    const motePos = new Float32Array(MOTE_COUNT * 3);
    for (let i = 0; i < MOTE_COUNT; i++) {
      motePos[i * 3] = (Math.random() - 0.5) * 40;
      motePos[i * 3 + 1] = 0.6 + Math.random() * 7.5;
      motePos[i * 3 + 2] = (Math.random() - 0.5) * 34;
      this.motePhases[i] = Math.random() * Math.PI * 2;
    }
    this.moteGeo.setAttribute("position", new THREE.BufferAttribute(motePos, 3));
    this.moteMat = new THREE.PointsMaterial({
      color: "#fff1b8",
      size: 0.14,
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.motes = new THREE.Points(this.moteGeo, this.moteMat);
    this.scene.add(this.motes);
  }

  private getMaterial(color: string): THREE.MeshBasicMaterial {
    let mat = this.materialCache.get(color);
    if (!mat) {
      mat = new THREE.MeshBasicMaterial({ color });
      this.materialCache.set(color, mat);
    }
    return mat;
  }

  spawnBurst(
    pos: THREE.Vector3,
    color: string,
    count = 10,
    speed = 4.2,
  ): void {
    const mat = this.getMaterial(color);
    for (let i = 0; i < count; i++) {
      const m = new THREE.Mesh(this.particleGeo, mat);
      m.position.copy(pos);
      const ang = Math.random() * Math.PI * 2;
      const spd = (0.4 + Math.random() * 0.8) * speed;
      this.scene.add(m);
      this.fxParticles.push({
        mesh: m,
        vx: Math.cos(ang) * spd,
        vy: 2.0 + Math.random() * 3.4,
        vz: Math.sin(ang) * spd,
        life: 0.38 + Math.random() * 0.25,
        maxLife: 0.63,
      });
    }
  }

  update(dt: number, elapsed: number): void {
    const posAttr = this.moteGeo.attributes.position as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;
    for (let i = 0; i < MOTE_COUNT; i++) {
      const phase = this.motePhases[i] ?? 0;
      const idx = i * 3;
      arr[idx] = (arr[idx] ?? 0) + Math.sin(elapsed * 0.5 + phase) * dt * 0.25;
      arr[idx + 1] =
        (arr[idx + 1] ?? 0) + Math.cos(elapsed * 0.7 + phase) * dt * 0.12;
      arr[idx + 2] =
        (arr[idx + 2] ?? 0) + Math.cos(elapsed * 0.4 + phase) * dt * 0.18;
    }
    posAttr.needsUpdate = true;

    for (let i = this.fxParticles.length - 1; i >= 0; i--) {
      const p = this.fxParticles[i];
      if (!p) continue;
      p.life -= dt;
      p.vy -= 11.0 * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y = Math.max(0.05, p.mesh.position.y + p.vy * dt);
      p.mesh.position.z += p.vz * dt;
      p.mesh.scale.setScalar(Math.max(0.01, p.life / p.maxLife));
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.fxParticles.splice(i, 1);
      }
    }
  }

  clear(): void {
    for (const p of this.fxParticles) {
      this.scene.remove(p.mesh);
    }
    this.fxParticles.length = 0;
  }

  dispose(): void {
    this.clear();
    this.scene.remove(this.motes);
    this.moteGeo.dispose();
    this.moteMat.dispose();
    this.particleGeo.dispose();
    for (const mat of this.materialCache.values()) {
      mat.dispose();
    }
    this.materialCache.clear();
  }
}
