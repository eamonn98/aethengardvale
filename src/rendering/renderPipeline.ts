import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { CAMERA_CONFIG, HD2D_DEFAULTS } from "../config/constants.ts";
import { createHD2DPostShader } from "./hd2dShader.ts";

/**
 * Owns the Three.js WebGLRenderer, Scene, Camera, 3-point lighting, and HD-2D EffectComposer.
 */
export class RenderPipeline {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly composer: EffectComposer;
  readonly bloomPass: UnrealBloomPass;
  readonly hd2dPass: ShaderPass;
  private dofEnabled = true;

  constructor(container: HTMLElement) {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("#27333b");
    this.scene.fog = new THREE.FogExp2("#2b3639", 0.0175);

    this.camera = new THREE.PerspectiveCamera(
      CAMERA_CONFIG.fov,
      width / height,
      CAMERA_CONFIG.near,
      CAMERA_CONFIG.far,
    );
    this.camera.position.set(
      CAMERA_CONFIG.initialPos.x,
      CAMERA_CONFIG.initialPos.y,
      CAMERA_CONFIG.initialPos.z,
    );

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));

    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      HD2D_DEFAULTS.bloomStrength,
      HD2D_DEFAULTS.bloomRadius,
      HD2D_DEFAULTS.bloomThreshold,
    );
    this.composer.addPass(this.bloomPass);

    this.hd2dPass = new ShaderPass(createHD2DPostShader(width, height));
    this.composer.addPass(this.hd2dPass);

    this.setupLighting();
  }

  private setupLighting(): void {
    const hemiLight = new THREE.HemisphereLight("#bfd9eb", "#3b3224", 0.72);
    this.scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight("#fff0c9", 2.25);
    sunLight.position.set(-14, 24, 15);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(2048, 2048);
    sunLight.shadow.camera.near = 2;
    sunLight.shadow.camera.far = 70;
    const sc = 26;
    sunLight.shadow.camera.left = -sc;
    sunLight.shadow.camera.right = sc;
    sunLight.shadow.camera.top = sc;
    sunLight.shadow.camera.bottom = -sc;
    sunLight.shadow.bias = -0.0005;
    sunLight.shadow.normalBias = 0.025;
    this.scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight("#f2b672", 0.45);
    rimLight.position.set(16, 10, -18);
    this.scene.add(rimLight);
  }

  setDofEnabled(enabled: boolean): void {
    this.dofEnabled = enabled;
    const dofUniform = this.hd2dPass.uniforms.uDofEnabled;
    if (dofUniform) {
      dofUniform.value = enabled ? 1.0 : 0.0;
    }
    this.bloomPass.enabled = enabled;
  }

  isDofEnabled(): boolean {
    return this.dofEnabled;
  }

  resize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.composer.setSize(width, height);
    this.bloomPass.setSize(width, height);
    const resUniform = this.hd2dPass.uniforms.uResolution;
    if (resUniform && resUniform.value instanceof THREE.Vector2) {
      resUniform.value.set(width, height);
    }
  }

  render(): void {
    this.composer.render();
  }

  dispose(): void {
    this.composer.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
