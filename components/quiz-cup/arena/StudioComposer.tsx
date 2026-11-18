"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

class StudioAOPass extends GTAOPass {
  _overrideVisibility() {
    const hidden = (this as unknown as { _visibilityCache: THREE.Object3D[] })._visibilityCache;
    this.scene.traverse((object) => {
      const { isPoints, isLine, isSprite, material } = object as THREE.Object3D & {
        isPoints?: boolean;
        isLine?: boolean;
        isSprite?: boolean;
        material?: THREE.Material & { isShaderMaterial?: boolean };
      };
      if (
        object.visible &&
        (isPoints ||
          isLine ||
          isSprite ||
          (material &&
            !Array.isArray(material) &&
            (material.transparent || material.depthWrite === false || material.isShaderMaterial)))
      ) {
        object.visible = false;
        hidden.push(object);
      }
    });
  }
}

const SanitizeShader = {
  uniforms: { tDiffuse: { value: null as THREE.Texture | null }, uTexel: { value: new THREE.Vector2(1, 1) } },
  vertexShader:
    "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform vec2 uTexel; varying vec2 vUv;
    bool bad(vec3 c){ return any(isnan(c)) || any(isinf(c)); }
    void main(){
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      if (bad(c)) {
        vec3 sum = vec3(0.0); float n = 0.0;
        for (int i = 0; i < 4; i++) {
          vec2 o = i == 0 ? vec2(uTexel.x, 0.0) : i == 1 ? vec2(-uTexel.x, 0.0) : i == 2 ? vec2(0.0, uTexel.y) : vec2(0.0, -uTexel.y);
          vec3 s = texture2D(tDiffuse, vUv + o).rgb;
          if (!bad(s)) { sum += s; n += 1.0; }
        }
        c = n > 0.0 ? sum / n : vec3(0.0);
      }
      gl_FragColor = vec4(clamp(c, 0.0, 64.0), 1.0);
    }`,
};

const DitherShader = {
  uniforms: { tDiffuse: { value: null as THREE.Texture | null }, uTime: { value: 0 } },
  vertexShader:
    "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uTime; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
      c.rgb += (hash(vUv * vec2(1931.0, 1087.0) + fract(uTime) * 91.7) - 0.5) * 0.01 * (0.3 + l);
      gl_FragColor = c;
    }`,
};

export default function StudioComposer({ ambientOcclusion }: { ambientOcclusion: boolean }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const dpr = useThree((s) => s.viewport.dpr);

  const pipeline = useMemo(() => {
    const target = new THREE.WebGLRenderTarget(1, 1, {
      type: THREE.HalfFloatType,
      samples: 4,
      resolveDepthBuffer: false,
    });
    const composer = new EffectComposer(gl, target);
    composer.addPass(new RenderPass(scene, camera));

    const ao = new StudioAOPass(scene, camera, 1, 1);
    ao.updateGtaoMaterial({
      radius: 0.8,
      distanceExponent: 1.4,
      thickness: 1.2,
      scale: 1,
      samples: 16,
      distanceFallOff: 1,
      screenSpaceRadius: false,
    });
    ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, radiusExponent: 1, rings: 2, samples: 16 });
    ao.blendIntensity = 0.85;
    composer.addPass(ao);
    const sanitize = new ShaderPass(SanitizeShader);
    composer.addPass(sanitize);

    composer.addPass(new UnrealBloomPass(new THREE.Vector2(256, 256), 0.6, 0.5, 0.86));
    const dither = new ShaderPass(DitherShader);
    composer.addPass(dither);
    composer.addPass(new OutputPass());
    return { composer, ao, dither, sanitize };
  }, [gl, scene, camera]);

  useEffect(() => {
    pipeline.ao.enabled = ambientOcclusion;
  }, [pipeline, ambientOcclusion]);

  useEffect(() => {
    pipeline.composer.setPixelRatio(dpr);
    pipeline.composer.setSize(size.width, size.height);
    pipeline.sanitize.uniforms.uTexel.value.set(1 / (size.width * dpr), 1 / (size.height * dpr));
  }, [pipeline, size.width, size.height, dpr]);

  useEffect(() => () => pipeline.composer.dispose(), [pipeline]);

  useFrame((state, delta) => {
    pipeline.dither.uniforms.uTime.value = state.clock.elapsedTime;
    pipeline.composer.render(delta);
  }, 1);

  return null;
}
