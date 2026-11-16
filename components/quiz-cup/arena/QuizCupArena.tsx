"use client";

import { Environment, Lightformer, PerformanceMonitor, useProgress } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

import {
  ARENA_HOST_POSITION,
  ARENA_QUALITY,
  STUDIO_CENTER,
  alongPlayerPath,
  podiumSlots,
  type ArenaQuality,
} from "@/constants/quiz-cup-arena";
import { cn } from "@/lib/utils";
import { STUDIO } from "@/constants/quiz-cup-studio";
import type { QuizCupArenaPhase, QuizCupArenaPlayer } from "@/types/quiz-cup";

import ArenaBeams from "./ArenaBeams";
import ArenaCamera from "./ArenaCamera";
import ArenaContestants, { ArenaHost, preloadArenaContestants } from "./ArenaContestants";
import ArenaStudio, { preloadArenaStudio } from "./ArenaStudio";
import { bakeStudioEnvironment } from "./BakedStudioProbe";
import PlayerTag from "./PlayerTag";
import StudioComposer from "./StudioComposer";

preloadArenaContestants();
preloadArenaStudio();

const BACKDROP = STUDIO.backdrop;
const TIERS: ArenaQuality[] = ["high", "medium", "low"];
const BEAM_STRENGTH: Record<QuizCupArenaPhase, number> = {
  intro: 1.6,
  question: 1.0,
  reveal: 1.35,
  leaderboard: 1.7,
};

/** Integrated / mobile / software GPUs start one or two tiers down. */
function initialTier(gl: WebGLRenderingContext | WebGL2RenderingContext): ArenaQuality {
  const info = gl.getExtension("WEBGL_debug_renderer_info");
  const renderer = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : "";
  if (/SwiftShader|llvmpipe|Software/i.test(renderer)) return "low";
  if (/Intel|Mali|Adreno|PowerVR/i.test(renderer)) return "medium";
  return "high";
}

/**
 * Real-time lights only for what moves or is placed per game: the podiums and players. The
 * arena itself is lit by its baked lightmaps. The light count never changes after mount, so
 * no shader is recompiled mid-game.
 */
function StageLights({ shadows }: { shadows: boolean }) {
  const key = useRef<THREE.SpotLight>(null);
  const players = useRef<THREE.SpotLight>(null);
  const host = useRef<THREE.SpotLight>(null);
  const left = useRef<THREE.SpotLight>(null);
  const right = useRef<THREE.SpotLight>(null);
  useEffect(() => {
    const [mid] = alongPlayerPath([2.2]);
    const playersMid: [number, number, number] = [mid.x, 1, mid.z];
    const aim: [React.RefObject<THREE.SpotLight | null>, [number, number, number]][] = [
      [key, [STUDIO_CENTER.x, 0.8, STUDIO_CENTER.z + 1]],
      [players, playersMid],
      [host, [ARENA_HOST_POSITION[0], 1.3, ARENA_HOST_POSITION[2]]],
      [left, [-5, 2.4, -6]],
      [right, [5, 2.4, -6]],
    ];
    for (const [ref, [x, y, z]] of aim) {
      ref.current?.target.position.set(x, y, z);
      ref.current?.target.updateMatrixWorld();
    }
  }, []);
  return (
    <>
      {/* Deep navy / violet ambient: sky violet, ground near-black. */}
      <hemisphereLight args={["#4a36b0", "#06041a", 0.3]} />
      {/* Warm overhead key on the central stage: the one shadow caster. */}
      <spotLight
        ref={key}
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
      {/* Warm specials: the contestant platform and the host. */}
      <spotLight ref={players} position={[-2.5, 8.8, 3]} color="#ffd6a0" intensity={170} angle={0.55} penumbra={0.7} distance={24} decay={2} />
      <spotLight ref={host} position={[6, 8.4, 3]} color="#ffd6a0" intensity={110} angle={0.32} penumbra={0.7} distance={20} decay={2} />
      {/* Cool colour washes from the sides: violet stage left, blue stage right. */}
      <spotLight ref={left} position={[-10, 6.5, 3]} color="#a45cff" intensity={130} angle={0.7} penumbra={0.9} distance={26} decay={2} />
      <spotLight ref={right} position={[10, 6.5, 3]} color="#5a6bff" intensity={130} angle={0.7} penumbra={0.9} distance={26} decay={2} />
      {/* Violet rim from the screen side, over everyone's shoulders. */}
      <directionalLight position={[0, 6, -14]} color="#9d6bff" intensity={1.3} />
    </>
  );
}

/**
 * Everything that could stall or flash is done here, while the loading cover is still up:
 * compile every shader, upload every texture, bake the studio's reflection probe, then compile
 * again for the new environment map. The show's first frames never hit a first-use compile.
 */
function Warmup({ onReady }: { onReady: () => void }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    let alive = true;
    let env: THREE.Texture | null = null;
    (async () => {
      await gl.compileAsync(scene, camera);
      if (!alive) return;
      scene.traverse((o) => {
        const material = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
        if (!material) return;
        for (const t of [material.map, material.lightMap, material.emissiveMap, material.normalMap, material.roughnessMap]) {
          if (t) gl.initTexture(t);
        }
      });
      env = bakeStudioEnvironment(gl, scene);
      await gl.compileAsync(scene, camera);
      if (!alive) return;
      gl.shadowMap.needsUpdate = true;
      requestAnimationFrame(() => alive && onReady());
    })();
    return () => {
      alive = false;
      if (env && scene.environment === env) scene.environment = null;
      env?.dispose();
    };
  }, [gl, scene, camera, onReady]);
  return null;
}

/** Shadows come only from podiums, which move only when the player count changes: the
 *  shadow map is drawn once per layout instead of every frame. */
function FrozenShadows({ version }: { version: number }) {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    gl.shadowMap.autoUpdate = false;
    gl.shadowMap.needsUpdate = true;
  }, [gl, version]);
  return null;
}

/** Plain DOM cover outside the Canvas (drei's <Html> as a Suspense fallback breaks under React 19). */
function LoadingCover({ ready }: { ready: boolean }) {
  const { progress } = useProgress();
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 transition-opacity duration-700",
        ready ? "opacity-0" : "opacity-100",
      )}
      style={{ background: BACKDROP }}
    >
      <div className="h-1 w-48 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-sky-400 transition-[width] duration-300"
          style={{ width: `${ready ? 100 : Math.min(progress, 99)}%` }}
        />
      </div>
      <span className="text-sm font-medium text-white/60">
        {progress < 100 ? "กำลังโหลดเวที…" : "เตรียมเวที…"}
      </span>
    </div>
  );
}

export type QuizCupArenaProps = {
  players: QuizCupArenaPlayer[];
  phase: QuizCupArenaPhase;
  /** Player to close in on (e.g. while revealing their answer). */
  focusPlayerId?: string | null;
  /** Force a tier (debug / host setting); otherwise picked from the GPU and adapted live. */
  quality?: ArenaQuality;
  className?: string;
  onReady?: () => void;
};

export default function QuizCupArena({
  players,
  phase,
  focusPlayerId = null,
  quality,
  className,
  onReady,
}: QuizCupArenaProps) {
  const [autoTier, setAutoTier] = useState<ArenaQuality>("high");
  const [ready, setReady] = useState(false);
  const [layoutVersion, setLayoutVersion] = useState(0);
  const tier = quality ?? autoTier;
  const tags = useRef<(HTMLElement | null)[]>([]);
  const settings = ARENA_QUALITY[tier];

  const slots = useMemo(() => podiumSlots(players.length), [players.length]);
  const focusIndex = focusPlayerId ? players.findIndex((p) => p.id === focusPlayerId) : -1;
  const focus = focusIndex >= 0 ? slots[focusIndex] : null;

  const onReadyRef = useRef(onReady);
  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);
  const handleReady = useCallback(() => {
    setReady(true);
    onReadyRef.current?.();
  }, []);
  const handleLayout = useCallback(() => setLayoutVersion((v) => v + 1), []);
  // The tier is chosen once, before the show (GPU detection), and never changes mid-game:
  // switching tiers swaps the floor material and the post-processing chain and toggles
  // shadows, i.e. recompiles shaders and rebuilds render targets = visible flashes.
  // If frames still drop, only the render resolution steps down (no shader changes), at
  // most twice.
  const [dprCap, setDprCap] = useState<number>(Infinity);
  const lowerResolution = useCallback(
    () => setDprCap((cap) => Math.max(1, Math.min(cap, settings.dpr) - 0.25)),
    [settings.dpr],
  );

  return (
    <div className={cn("relative h-full w-full overflow-hidden", className)} style={{ background: BACKDROP }}>
      <Canvas
        shadows={{ type: THREE.PCFShadowMap }} // r186 dropped PCFSoftShadowMap (r3f's default)
        dpr={[1, Math.min(settings.dpr, dprCap)]}
        camera={{ position: [1.6, 2.9, 10.8], fov: 50, near: 0.1, far: 90 }}
        gl={{
          antialias: true,
          powerPreference: "high-performance",
          stencil: false,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.05,
        }}
        onCreated={({ gl }) => {
          if (!quality) setAutoTier(initialTier(gl.getContext()));
        }}
      >
        <color attach="background" args={[BACKDROP]} />
        {/* Stage haze: far walls and audience sink into violet, the neon stays crisp (fog off). */}
        <fogExp2 attach="fog" args={[STUDIO.fog, 0.014]} />
        {/* Measured only once the show is running: loading and shader warm-up frames are slow by design */}
        {ready && !quality && (
          <PerformanceMonitor onDecline={lowerResolution} flipflops={2} onFallback={() => setDprCap(1)} />
        )}

        {/* Rendered once (frames = 1): dim coloured strips for the glossy floor and metal to reflect */}
        <Environment resolution={256} frames={1} environmentIntensity={0.4}>
          <color attach="background" args={["#08061f"]} />
          {/* What the glossy floor, podiums and trims reflect: the screen, the coral band,
              the blue wall bays, the warm rig overhead. */}
          <Lightformer intensity={2.6} color="#7a5cff" position={[0, 3.2, -11]} scale={[7.2, 4, 1]} />
          <Lightformer intensity={1.8} color={STUDIO.coral} position={[-13, 6.8, -4]} rotation-y={Math.PI / 2} scale={[20, 0.5, 1]} />
          <Lightformer intensity={1.8} color={STUDIO.coral} position={[13, 6.8, -4]} rotation-y={-Math.PI / 2} scale={[20, 0.5, 1]} />
          <Lightformer intensity={1.1} color={STUDIO.blue} position={[-13, 4.3, -4]} rotation-y={Math.PI / 2} scale={[20, 2.6, 1]} />
          <Lightformer intensity={1.1} color={STUDIO.blue} position={[13, 4.3, -4]} rotation-y={-Math.PI / 2} scale={[20, 2.6, 1]} />
          <Lightformer intensity={1.6} color="#ffd59a" position={[0, 10, -3]} rotation-x={Math.PI / 2} scale={[14, 10, 1]} />
          <Lightformer intensity={1.4} color={STUDIO.gold} position={[0, 0.6, 12]} scale={[18, 0.4, 1]} />
        </Environment>

        <StageLights shadows={settings.shadows} />

        <Suspense fallback={null}>
          <ArenaStudio pools={settings.beams} reflections={settings.reflections} />
          <ArenaHost />
          <ArenaContestants
            players={players}
            slots={slots}
            castShadows={settings.shadows}
            onLayout={handleLayout}
            tags={tags}
          />
          {settings.beams && <ArenaBeams strength={BEAM_STRENGTH[phase]} />}
          <Warmup onReady={handleReady} />
        </Suspense>

        <FrozenShadows version={layoutVersion + TIERS.indexOf(tier)} />
        <ArenaCamera phase={phase} focus={focus} ready={ready} />

        {/* Aetherwyn's pipeline: MSAA before bloom, GTAO on the high tier, dither, OutputPass. */}
        {settings.bloom && <StudioComposer ambientOcclusion={settings.reflections} />}
      </Canvas>
      {/* Head labels, positioned every frame by ArenaContestants */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {players.map((p, i) => (
          <div
            key={p.id}
            ref={(el) => {
              tags.current[i] = el;
            }}
            className="invisible absolute top-0 left-0 will-change-transform"
          >
            <PlayerTag player={p} />
          </div>
        ))}
      </div>
      <LoadingCover ready={ready} />
    </div>
  );
}
