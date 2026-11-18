"use client";

import { PerformanceMonitor } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

import { ARENA_QUALITY, podiumSlots, type ArenaQuality } from "@/constants/quiz-cup-arena";
import { STUDIO } from "@/constants/quiz-cup-studio";
import { cn } from "@/lib/utils";
import type { QuizCupArenaPhase, QuizCupArenaPlayer } from "@/types/quiz-cup";

import ArenaBeams from "./ArenaBeams";
import ArenaCamera from "./ArenaCamera";
import ArenaContestants, { ArenaHost, preloadArenaContestants } from "./ArenaContestants";
import ArenaStudio, { preloadArenaStudio } from "./ArenaStudio";
import LoadingCover from "./LoadingCover";
import PlayerTag from "./PlayerTag";
import { FrozenShadows, SceneWarmup } from "./scene/SceneWarmup";
import StageLights from "./scene/StageLights";
import StudioEnvironment from "./scene/StudioEnvironment";
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

function ToneExposure({ exposure }: { exposure: number }) {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    gl.toneMappingExposure = exposure;
  }, [gl, exposure]);
  return null;
}

function detectQualityTier(gl: WebGLRenderingContext | WebGL2RenderingContext): ArenaQuality {
  const info = gl.getExtension("WEBGL_debug_renderer_info");
  const rendererName = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : "";
  if (/SwiftShader|llvmpipe|Software/i.test(rendererName)) return "low";
  if (/Intel|Mali|Adreno|PowerVR/i.test(rendererName)) return "medium";
  return "high";
}

export type QuizCupArenaProps = {
  players: QuizCupArenaPlayer[];
  phase: QuizCupArenaPhase;
  focusPlayerId?: string | null;
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
  const tagElements = useRef<(HTMLElement | null)[]>([]);
  const settings = ARENA_QUALITY[tier];

  const slots = useMemo(() => podiumSlots(players.length), [players.length]);
  const focusIndex = focusPlayerId ? players.findIndex((player) => player.id === focusPlayerId) : -1;
  const focusSlot = focusIndex >= 0 ? slots[focusIndex] : null;

  const onReadyRef = useRef(onReady);
  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);
  const handleReady = useCallback(() => {
    setReady(true);
    onReadyRef.current?.();
  }, []);
  const handleLayout = useCallback(() => setLayoutVersion((version) => version + 1), []);
  const [dprCap, setDprCap] = useState<number>(Infinity);
  const lowerResolution = useCallback(
    () => setDprCap((cap) => Math.max(1, Math.min(cap, settings.dpr) - 0.25)),
    [settings.dpr],
  );

  return (
    <div className={cn("relative h-full w-full overflow-hidden", className)} style={{ background: BACKDROP }}>
      <Canvas
        shadows={{ type: THREE.PCFShadowMap }}
        dpr={[1, Math.min(settings.dpr, dprCap)]}
        camera={{ position: [1.6, 2.9, 10.8], fov: 50, near: 0.1, far: 90 }}
        gl={{
          antialias: true,
          powerPreference: "high-performance",
          stencil: false,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: settings.exposure,
        }}
        onCreated={({ gl }) => {
          if (!quality) setAutoTier(detectQualityTier(gl.getContext()));
        }}
      >
        <color attach="background" args={[BACKDROP]} />
        <fogExp2 attach="fog" args={[STUDIO.fog, 0.014]} />
        {ready && !quality && (
          <PerformanceMonitor onDecline={lowerResolution} flipflops={2} onFallback={() => setDprCap(1)} />
        )}

        <ToneExposure exposure={settings.exposure} />
        <StudioEnvironment />

        <StageLights shadows={settings.shadows} />

        <Suspense fallback={null}>
          <ArenaStudio pools={settings.beams} reflections={settings.reflections} />
          <ArenaHost />
          <ArenaContestants
            players={players}
            slots={slots}
            castShadows={settings.shadows}
            onLayout={handleLayout}
            tags={tagElements}
          />
          {settings.beams && <ArenaBeams strength={BEAM_STRENGTH[phase]} />}
          <SceneWarmup onReady={handleReady} />
        </Suspense>

        <FrozenShadows version={layoutVersion + TIERS.indexOf(tier)} />
        <ArenaCamera phase={phase} focus={focusSlot} ready={ready} />

        {settings.bloom && <StudioComposer ambientOcclusion={settings.reflections} />}
      </Canvas>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {players.map((p, i) => (
          <div
            key={p.id}
            ref={(el) => {
              tagElements.current[i] = el;
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
