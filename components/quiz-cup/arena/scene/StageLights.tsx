"use client";

import { type RefObject, useEffect, useRef } from "react";
import * as THREE from "three";

import { ARENA_HOST_POSITION, PLAYER_ARC, STUDIO_CENTER, arcPoint } from "@/constants/quiz-cup-arena";

type Point = [number, number, number];

function playerWingTarget(side: -1 | 1): Point {
  const { x, z } = arcPoint(side, PLAYER_ARC.first + 2.6);
  return [x, 1, z];
}

export default function StageLights({ shadows }: { shadows: boolean }) {
  const keyLight = useRef<THREE.SpotLight>(null);
  const leftWing = useRef<THREE.SpotLight>(null);
  const rightWing = useRef<THREE.SpotLight>(null);
  const hostLight = useRef<THREE.SpotLight>(null);
  const leftFill = useRef<THREE.SpotLight>(null);
  const rightFill = useRef<THREE.SpotLight>(null);
  useEffect(() => {
    const targets: [RefObject<THREE.SpotLight | null>, Point][] = [
      [keyLight, [STUDIO_CENTER.x, 0.8, STUDIO_CENTER.z + 1]],
      [leftWing, playerWingTarget(-1)],
      [rightWing, playerWingTarget(1)],
      [hostLight, [ARENA_HOST_POSITION[0], 1.3, ARENA_HOST_POSITION[2]]],
      [leftFill, [-5, 2.4, -6]],
      [rightFill, [5, 2.4, -6]],
    ];
    for (const [ref, [x, y, z]] of targets) {
      ref.current?.target.position.set(x, y, z);
      ref.current?.target.updateMatrixWorld();
    }
  }, []);
  return (
    <>
      <hemisphereLight args={["#4a36b0", "#06041a", 0.3]} />
      <spotLight
        ref={keyLight}
        position={[0, 9.4, 1.5]}
        color="#ffd9a0"
        intensity={160}
        angle={0.5}
        penumbra={0.6}
        distance={26}
        decay={2}
        castShadow={shadows}
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0002}
        shadow-normalBias={0.035}
        shadow-camera-near={3}
        shadow-camera-far={26}
      />
      <spotLight ref={leftWing} position={[-4.6, 8.8, -1.5]} color="#ffd6a0" intensity={150} angle={0.5} penumbra={0.7} distance={24} decay={2} />
      <spotLight ref={rightWing} position={[4.6, 8.8, -1.5]} color="#ffd6a0" intensity={150} angle={0.5} penumbra={0.7} distance={24} decay={2} />
      <spotLight ref={hostLight} position={[0, 8.4, 2.5]} color="#ffd6a0" intensity={110} angle={0.3} penumbra={0.7} distance={20} decay={2} />
      <spotLight ref={leftFill} position={[-10, 6.5, 3]} color="#a45cff" intensity={130} angle={0.7} penumbra={0.9} distance={26} decay={2} />
      <spotLight ref={rightFill} position={[10, 6.5, 3]} color="#5a6bff" intensity={130} angle={0.7} penumbra={0.9} distance={26} decay={2} />
      <directionalLight position={[0, 6, -14]} color="#9d6bff" intensity={1.3} />
    </>
  );
}
