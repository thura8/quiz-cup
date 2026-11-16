"use client";

import { drawNameTexture } from "@/components/quiz-cup/arena/arena-utils";
import { buildHostPodium } from "@/components/quiz-cup/arena/studio-host-podium";
import { studioPodiumTemplate } from "@/components/quiz-cup/arena/studio-podium";
import { STUDIO, STUDIO_STATUS_COLORS } from "@/constants/quiz-cup-studio";
import { Environment, Lightformer, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";

type Status = keyof typeof STUDIO_STATUS_COLORS;
const STATUSES = Object.keys(STUDIO_STATUS_COLORS) as Status[];
const STATUS_PARTS = ["ContestantPodium_LED_Top", "ContestantPodium_Screen_Border", "ContestantPodium_LED_Vertical"];

/** One contestant podium with its own materials, so status and name can be set here. */
function Contestant({ slot, x, status, name }: { slot: number; x: number; status: Status; name: string }) {
  const podium = useMemo(() => {
    const p = studioPodiumTemplate(slot).clone(true);
    p.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) m.material = (m.material as THREE.Material).clone();
    });
    return p;
  }, [slot]);

  useEffect(() => {
    podium.traverse((o) => {
      const mat = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
      if (mat && STATUS_PARTS.includes(mat.name)) mat.emissive.set(STUDIO_STATUS_COLORS[status]);
    });
  }, [podium, status]);

  useEffect(() => {
    const texture = drawNameTexture(name, getComputedStyle(document.body).fontFamily);
    podium.traverse((o) => {
      const mat = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
      if (mat?.name === "ContestantPodium_Screen_Display") {
        mat.map = texture;
        mat.emissiveMap = texture;
        mat.needsUpdate = true;
      }
    });
    return () => texture.dispose();
  }, [podium, name]);

  return <primitive object={podium} position={[x, 0, 0]} />;
}

/** Built inside <Canvas> so it only runs in the browser (textures need `document`). */
function Host() {
  const host = useMemo(() => buildHostPodium(), []);
  return <primitive object={host} position={[1.55, 0, -0.4]} scale={0.78} />;
}

/**
 * Dev viewer for the studio podiums (not part of the game): orbit with the mouse, switch
 * the contestant status to see the buzzer / screen LEDs change.
 */
export default function PodiumViewer() {
  const [status, setStatus] = useState<Status>("idle");

  return (
    <div className="relative h-dvh w-full" style={{ background: STUDIO.backdrop }}>
      <Canvas shadows camera={{ position: [0.6, 1.5, 3.4], fov: 40 }} gl={{ toneMapping: THREE.ACESFilmicToneMapping }}>
        <color attach="background" args={[STUDIO.backdrop]} />
        <hemisphereLight args={["#5a3cc0", "#07041a", 0.5]} />
        <spotLight position={[2, 5, 4]} intensity={60} angle={0.5} penumbra={0.7} color="#efe2ff" castShadow />
        <spotLight position={[-4, 3, 2]} intensity={30} angle={0.6} penumbra={0.9} color="#b25cff" />
        <directionalLight position={[0, 3, -4]} intensity={1.2} color="#9d6bff" />
        <Environment resolution={128} frames={1} environmentIntensity={0.5}>
          <Lightformer intensity={2} color={STUDIO.violet} position={[0, 4, -5]} scale={[10, 0.6, 1]} />
          <Lightformer intensity={1.6} color={STUDIO.gold} position={[0, 0.5, 5]} scale={[10, 0.4, 1]} />
          <Lightformer intensity={1.2} color="#c9a8ff" position={[0, 6, 1]} rotation-x={Math.PI / 2} scale={[5, 5, 1]} />
        </Environment>
        <mesh rotation-x={-Math.PI / 2} receiveShadow>
          <circleGeometry args={[8, 64]} />
          <meshStandardMaterial color="#141148" roughness={0.2} metalness={0.4} />
        </mesh>
        <Contestant slot={0} x={-1.05} status={status} name="แนน" />
        <Contestant slot={1} x={0} status={status} name="Bow" />
        <Host />
        <OrbitControls target={[0.3, 0.6, 0]} enableDamping />
        <EffectComposer multisampling={0}>
          <Bloom mipmapBlur luminanceThreshold={0.9} intensity={0.7} />
        </EffectComposer>
      </Canvas>
      <div className="absolute top-4 left-4 flex gap-2">
        {STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            className={`rounded-full px-3 py-1 text-sm text-white ${s === status ? "bg-white/30" : "bg-white/10"}`}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
