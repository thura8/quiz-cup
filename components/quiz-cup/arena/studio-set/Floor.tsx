"use client";

import { MeshReflectorMaterial } from "@react-three/drei";
import { useEffect, useMemo } from "react";

import { wetFloorMaps } from "@/lib/three/procedural-textures";

const FLOOR_COLOR = "#0f0d35";
const MAP_REPEAT = 9;

function useWetFloorMaps() {
  const maps = useMemo(() => {
    const { normal, roughness } = wetFloorMaps();
    const normalMap = normal.clone();
    const roughnessMap = roughness.clone();
    for (const texture of [normalMap, roughnessMap]) {
      texture.repeat.set(MAP_REPEAT, MAP_REPEAT);
      texture.needsUpdate = true;
    }
    return { normal: normalMap, roughness: roughnessMap };
  }, []);

  useEffect(
    () => () => {
      maps.normal.dispose();
      maps.roughness.dispose();
    },
    [maps],
  );

  return maps;
}

export default function Floor({ reflections }: { reflections: boolean }) {
  const maps = useWetFloorMaps();

  return (
    <mesh rotation-x={-Math.PI / 2} receiveShadow>
      <circleGeometry args={[40, 72]} />
      {reflections ? (
        <MeshReflectorMaterial
          resolution={1024}
          blur={[140, 50]}
          mixBlur={0.6}
          mixStrength={9}
          mixContrast={1.15}
          mirror={0.75}
          depthScale={0.25}
          minDepthThreshold={0.6}
          maxDepthThreshold={1.4}
          distortion={0.12}
          distortionMap={maps.roughness}
          color={FLOOR_COLOR}
          metalness={0.6}
          roughness={0.4}
          roughnessMap={maps.roughness}
          normalMap={maps.normal}
          normalScale={[0.25, 0.25]}
        />
      ) : (
        <meshStandardMaterial
          color={FLOOR_COLOR}
          metalness={0.55}
          roughness={0.3}
          roughnessMap={maps.roughness}
          normalMap={maps.normal}
          normalScale={[0.25, 0.25]}
          envMapIntensity={1.4}
        />
      )}
    </mesh>
  );
}
