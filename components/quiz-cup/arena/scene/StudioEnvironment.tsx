"use client";

import { Environment, Lightformer } from "@react-three/drei";

import { STUDIO } from "@/constants/quiz-cup-studio";

export default function StudioEnvironment() {
  return (
    <Environment resolution={256} frames={1} environmentIntensity={0.4}>
      <color attach="background" args={["#08061f"]} />
      <Lightformer intensity={2.6} color="#7a5cff" position={[0, 3.2, -11]} scale={[7.2, 4, 1]} />
      <Lightformer intensity={1.8} color={STUDIO.coral} position={[-15.5, 6.8, -4]} rotation-y={Math.PI / 2} scale={[24, 0.5, 1]} />
      <Lightformer intensity={1.8} color={STUDIO.coral} position={[15.5, 6.8, -4]} rotation-y={-Math.PI / 2} scale={[24, 0.5, 1]} />
      <Lightformer intensity={1.1} color={STUDIO.blue} position={[-15.5, 4.3, -4]} rotation-y={Math.PI / 2} scale={[24, 2.6, 1]} />
      <Lightformer intensity={1.1} color={STUDIO.blue} position={[15.5, 4.3, -4]} rotation-y={-Math.PI / 2} scale={[24, 2.6, 1]} />
      <Lightformer intensity={1.6} color="#ffd59a" position={[0, 10, -3]} rotation-x={Math.PI / 2} scale={[14, 10, 1]} />
      <Lightformer intensity={1.4} color={STUDIO.gold} position={[0, 0.6, 12]} scale={[18, 0.4, 1]} />
    </Environment>
  );
}
