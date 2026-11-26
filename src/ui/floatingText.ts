import * as THREE from "three";

interface FloatingItem {
  el: HTMLDivElement;
  pos: THREE.Vector3;
  vy: number;
  life: number;
  maxLife: number;
}

/**
 * Projects world-space combat/pickup numbers onto the DOM overlay layer.
 */
export class FloatingTextLayer {
  private readonly layer: HTMLElement;
  private readonly items: FloatingItem[] = [];
  private readonly tmpVec = new THREE.Vector3();

  constructor(layer: HTMLElement) {
    this.layer = layer;
  }

  spawn(
    worldPos: THREE.Vector3,
    text: string,
    color = "#fff6cf",
    big = false,
  ): void {
    const el = document.createElement("div");
    el.className = "dmg-num";
    el.textContent = text;
    el.style.color = color;
    if (big) el.style.fontSize = "21px";
    this.layer.appendChild(el);
    this.items.push({
      el,
      pos: worldPos
        .clone()
        .add(new THREE.Vector3((Math.random() - 0.5) * 0.3, 1.35, 0)),
      vy: 1.85,
      life: 0.78,
      maxLife: 0.78,
    });
  }

  update(dt: number, camera: THREE.Camera): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    for (let i = this.items.length - 1; i >= 0; i--) {
      const f = this.items[i];
      if (!f) continue;
      f.life -= dt;
      f.pos.y += f.vy * dt;
      f.vy *= 0.94;
      this.tmpVec.copy(f.pos).project(camera);
      f.el.style.left = `${(this.tmpVec.x * 0.5 + 0.5) * w}px`;
      f.el.style.top = `${(-this.tmpVec.y * 0.5 + 0.5) * h}px`;
      f.el.style.opacity = String(Math.min(1, (f.life / f.maxLife) * 1.6));
      if (f.life <= 0) {
        f.el.remove();
        this.items.splice(i, 1);
      }
    }
  }

  clear(): void {
    for (const f of this.items) {
      f.el.remove();
    }
    this.items.length = 0;
  }
}
