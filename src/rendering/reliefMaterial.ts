import * as THREE from "three";

export interface ReliefMaterialParams {
  map: THREE.Texture;
  normalMap: THREE.Texture;
  normalScale?: number;
  roughnessMap?: THREE.Texture;
  heightMap?: THREE.Texture;
  parallaxScale?: number;
  reliefAO?: number;
  roughness?: number;
  metalness?: number;
  color?: THREE.ColorRepresentation;
}

const RELIEF_PARS_GLSL = /* glsl */ `
uniform sampler2D uHeightMap;
uniform float uParallaxScale;
uniform float uReliefAO;

vec2 computeReliefUv(vec2 baseUv, vec3 viewDirTS) {
  const float NUM_LAYERS = 8.0;
  float layerDepth = 1.0 / NUM_LAYERS;
  float currLayerDepth = 0.0;

  vec2 maxOffset = (viewDirTS.xy / max(viewDirTS.z, 0.35)) * uParallaxScale;
  vec2 deltaUv = maxOffset / NUM_LAYERS;

  vec2 currUv = baseUv;
  float currHeight = texture2D(uHeightMap, currUv).r;
  float currMapDepth = 1.0 - currHeight;

  for (int i = 0; i < 8; i++) {
    if (currLayerDepth >= currMapDepth) break;
    currUv -= deltaUv;
    currMapDepth = 1.0 - texture2D(uHeightMap, currUv).r;
    currLayerDepth += layerDepth;
  }

  // Binary relief refinement (4 iterations)
  vec2 stepUv = deltaUv * 0.5;
  float stepDepth = layerDepth * 0.5;
  currUv += stepUv;
  currLayerDepth -= stepDepth;

  for (int i = 0; i < 4; i++) {
    stepUv *= 0.5;
    stepDepth *= 0.5;
    float d = 1.0 - texture2D(uHeightMap, currUv).r;
    if (currLayerDepth < d) {
      currUv -= stepUv;
      currLayerDepth += stepDepth;
    } else {
      currUv += stepUv;
      currLayerDepth -= stepDepth;
    }
  }

  return currUv;
}
`;

const RELIEF_COMPUTE_UV_GLSL = /* glsl */ `
vec3 pSurfNorm = normalize(vNormal) * (gl_FrontFacing ? 1.0 : -1.0);
mat3 pTbn = getTangentFrame(-vViewPosition, pSurfNorm, vMapUv);
vec3 pVDir = normalize(vViewPosition);
vec3 pViewDirTS = normalize(vec3(
  dot(pTbn[0], pVDir),
  dot(pTbn[1], pVDir),
  dot(pTbn[2], pVDir)
));
vec2 reliefUv = computeReliefUv(vMapUv, pViewDirTS);
float reliefHeight = texture2D(uHeightMap, reliefUv).r;
`;

/**
 * Creates a PBR MeshStandardMaterial enhanced with tangent-space normals, roughness maps,
 * and steep parallax occlusion relief mapping + cavity AO when a heightMap is supplied.
 */
export function createReliefStandardMaterial(
  params: ReliefMaterialParams,
): THREE.MeshStandardMaterial {
  const nScale = params.normalScale ?? 1.0;
  const mat = new THREE.MeshStandardMaterial({
    map: params.map,
    normalMap: params.normalMap,
    normalScale: new THREE.Vector2(nScale, nScale),
    roughnessMap: params.roughnessMap ?? null,
    roughness: params.roughness ?? 1.0,
    metalness: params.metalness ?? 0.04,
    color: params.color ?? "#ffffff",
  });

  const heightMap = params.heightMap;
  const parallaxScale = params.parallaxScale ?? 0.025;
  const reliefAO = params.reliefAO ?? 0.22;

  if (heightMap && parallaxScale > 0) {
    mat.customProgramCacheKey = () => "aethelgard_relief_pom_v1";
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uHeightMap = { value: heightMap };
      shader.uniforms.uParallaxScale = { value: parallaxScale };
      shader.uniforms.uReliefAO = { value: reliefAO };

      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <map_pars_fragment>",
          `#include <map_pars_fragment>\n${RELIEF_PARS_GLSL}`,
        )
        .replace(
          "#include <map_fragment>",
          `${RELIEF_COMPUTE_UV_GLSL}\n#include <map_fragment>\ndiffuseColor.rgb *= mix(1.0 - uReliefAO, 1.0, reliefHeight);`,
        )
        .replace("texture2D( map, vMapUv )", "texture2D( map, reliefUv )")
        .replace(
          "texture2D( roughnessMap, vRoughnessMapUv )",
          "texture2D( roughnessMap, reliefUv )",
        )
        .replace(
          "texture2D( normalMap, vNormalMapUv )",
          "texture2D( normalMap, reliefUv )",
        );
    };
  }

  return mat;
}
