import * as THREE from "three";
import { HD2D_DEFAULTS } from "../config/constants.ts";

export interface HD2DShaderDefinition {
  uniforms: {
    tDiffuse: { value: THREE.Texture | null };
    uResolution: { value: THREE.Vector2 };
    uFocusY: { value: number };
    uFocusBand: { value: number };
    uBlurAmount: { value: number };
    uDofEnabled: { value: number };
    uTime: { value: number };
  };
  vertexShader: string;
  fragmentShader: string;
}

export function createHD2DPostShader(
  width: number,
  height: number,
): HD2DShaderDefinition {
  return {
    uniforms: {
      tDiffuse: { value: null },
      uResolution: { value: new THREE.Vector2(width, height) },
      uFocusY: { value: HD2D_DEFAULTS.focusY },
      uFocusBand: { value: HD2D_DEFAULTS.focusBand },
      uBlurAmount: { value: HD2D_DEFAULTS.blurAmount },
      uDofEnabled: { value: 1.0 },
      uTime: { value: 0.0 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D tDiffuse;
      uniform vec2 uResolution;
      uniform float uFocusY;
      uniform float uFocusBand;
      uniform float uBlurAmount;
      uniform float uDofEnabled;
      uniform float uTime;
      varying vec2 vUv;

      void main() {
        vec2 texel = 1.0 / uResolution;
        float distFromFocus = abs(vUv.y - uFocusY);
        float blurMask = smoothstep(uFocusBand, 0.50, distFromFocus);
        if (vUv.y < uFocusY) {
          blurMask = smoothstep(uFocusBand * 0.92, 0.46, distFromFocus) * 1.05;
        }
        float radius = blurMask * 4.2 * uBlurAmount * uDofEnabled;

        vec3 col = texture2D(tDiffuse, vUv).rgb;
        if (radius > 0.25) {
          vec3 acc = col;
          float wSum = 1.0;
          const int TAPS = 12;
          for (int i = 0; i < TAPS; i++) {
            float fi = float(i);
            float angle = fi * 2.39996323;
            float r = sqrt((fi + 0.5) / float(TAPS)) * radius;
            vec2 off = vec2(cos(angle), sin(angle)) * texel * r;
            vec3 s = texture2D(tDiffuse, vUv + off).rgb;
            float lum = dot(s, vec3(0.299, 0.587, 0.114));
            float w = 1.0 + smoothstep(0.65, 1.0, lum) * 0.65;
            acc += s * w;
            wSum += w;
          }
          col = acc / wSum;
        }

        col = pow(max(col, 0.0), vec3(1.03));
        col *= vec3(1.05, 1.01, 0.94);
        float luma = dot(col, vec3(0.299, 0.587, 0.114));
        vec3 shadowTint = vec3(0.95, 0.97, 1.04);
        vec3 hiTint = vec3(1.05, 1.02, 0.95);
        col *= mix(shadowTint, hiTint, smoothstep(0.15, 0.78, luma));

        vec2 centered = (vUv - 0.5) * vec2(1.12, 1.05);
        float vig = 1.0 - smoothstep(0.38, 0.86, length(centered));
        col *= mix(0.46, 1.0, vig);

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  };
}
