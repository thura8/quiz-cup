"use client";

import { OrbitControls, OrthographicCamera, PerspectiveCamera } from "@react-three/drei";
import { Canvas, type ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";

import { setOutlines, setToon } from "@/components/quiz-cup/arena/mascot/toon";
import { PlayerRig, type PoseSet } from "@/components/quiz-cup/arena/player-rig";
import type { QuizCupArenaPlayerStatus } from "@/types/quiz-cup";

import { type ConceptArt, VIEW_YAW, type ViewName, silhouetteSpan, toMeters } from "./concept-art";

export type CameraView = ViewName | "free";
export type MascotPose = QuizCupArenaPlayerStatus | "rest";
export type OverlayMode = "off" | "under" | "over";
export type Framing = "body" | "head";
export type Readout = {
  lateral: number;
  y: number;
  span: [number, number] | null;
};

const BACKGROUND = "#1d2033";
const FRAMES: Record<Framing, { look: number; visibleHeight: number; freePosition: [number, number, number] }> = {
  body: { look: 0.9, visibleHeight: 2.0, freePosition: [1.7, 1.5, 3.3] },
  head: { look: 1.59, visibleHeight: 0.45, freePosition: [0.45, 1.68, 0.9] },
};
const ART_BEHIND = -1.5;
const ART_IN_FRONT = 2;
const RIG_SEED = 3;

function ViewCamera({
  view,
  framing,
  freeCamera,
  headY,
  headScale,
}: {
  view: CameraView;
  framing: Framing;
  freeCamera: [number, number, number] | null;
  headY: number;
  headScale: number;
}) {
  const frame = FRAMES[framing];
  const lift = framing === "head" ? headY - frame.look : 0;
  const look = frame.look + lift;
  const visibleHeight = framing === "head" ? frame.visibleHeight * headScale : frame.visibleHeight;
  const [fx, fy, fz] = frame.freePosition;
  const freePosition = freeCamera ?? ([fx, fy + lift, fz] as [number, number, number]);
  const height = useThree((state) => state.size.height);
  if (view === "free") {
    return (
      <>
        <PerspectiveCamera makeDefault position={freePosition} fov={35} />
        <OrbitControls target={[0, look, 0]} enableDamping />
      </>
    );
  }
  const yaw = VIEW_YAW[view];
  return (
    <>
      <OrthographicCamera
        makeDefault
        position={[Math.sin(yaw) * 6, look, Math.cos(yaw) * 6]}
        zoom={height / visibleHeight}
        near={0.1}
        far={20}
        onUpdate={(camera) => camera.lookAt(0, look, 0)}
      />
      <OrbitControls target={[0, look, 0]} enableRotate={false} />
    </>
  );
}

function ArtPlane({
  art,
  view,
  mode,
  opacity,
  onReadout,
}: {
  art: ConceptArt;
  view: ViewName;
  mode: Exclude<OverlayMode, "off">;
  opacity: number;
  onReadout: (readout: Readout | null) => void;
}) {
  const frame = art.views[view];
  const pixelWidth = frame.right - frame.left + 1;
  const pixelHeight = frame.bottom - frame.top + 1;
  const mpp = frame.metersPerPixel;

  const texture = useMemo(() => {
    const t = new THREE.CanvasTexture(art.canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.repeat.set(pixelWidth / art.width, pixelHeight / art.height);
    t.offset.set(frame.left / art.width, 1 - (frame.bottom + 1) / art.height);
    return t;
  }, [art, frame, pixelWidth, pixelHeight]);
  useEffect(() => () => texture.dispose(), [texture]);

  const yaw = VIEW_YAW[view];
  const depth = mode === "over" ? ART_IN_FRONT : ART_BEHIND;
  const centerX = ((frame.left + frame.right + 1) / 2 - frame.feetX) * mpp;
  const centerY = (frame.bottom - (frame.top + frame.bottom + 1) / 2) * mpp;

  const readAt = (event: ThreeEvent<PointerEvent | MouseEvent>) => {
    if (!event.uv) return null;
    const px = frame.left + event.uv.x * pixelWidth;
    const py = frame.bottom + 1 - event.uv.y * pixelHeight;
    const [lateral, y] = toMeters(frame, px, py);
    return { lateral, y, span: silhouetteSpan(art, frame, px, py) };
  };

  return (
    <group rotation-y={yaw} position={[Math.sin(yaw) * depth, 0, Math.cos(yaw) * depth]}>
      <mesh
        position={[centerX, centerY, 0]}
        renderOrder={mode === "over" ? 10 : 0}
        onPointerMove={(event) => onReadout(readAt(event))}
        onPointerOut={() => onReadout(null)}
        onClick={(event) => {
          const readout = readAt(event);
          if (readout) void navigator.clipboard?.writeText(`[${readout.lateral.toFixed(3)}, ${readout.y.toFixed(3)}]`);
        }}
      >
        <planeGeometry args={[pixelWidth * mpp, pixelHeight * mpp]} />
        <meshBasicMaterial
          map={texture}
          transparent
          opacity={opacity}
          depthTest={mode !== "over"}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

function Model({
  model,
  pose,
  poses,
  toon,
  outlines,
}: {
  model: THREE.Object3D;
  pose: MascotPose;
  poses: PoseSet;
  toon: boolean;
  outlines: boolean;
}) {
  const rig = useMemo(() => new PlayerRig(model, RIG_SEED, poses), [model, poses]);
  const rest = useMemo(() => {
    const quaternions = new Map<THREE.Object3D, THREE.Quaternion>();
    model.traverse((object) => {
      if ((object as THREE.Bone).isBone) quaternions.set(object, object.quaternion.clone());
    });
    return { quaternions, y: model.position.y };
  }, [model]);

  useEffect(() => {
    if (pose !== "rest") return;
    rest.quaternions.forEach((quaternion, bone) => bone.quaternion.copy(quaternion));
    model.position.setY(rest.y);
  }, [model, pose, rest]);

  useEffect(() => {
    setToon(model, toon);
    return () => setToon(model, false);
  }, [model, toon]);

  useEffect(() => setOutlines(model, outlines), [model, outlines]);

  useFrame((state, delta) => {
    if (pose !== "rest") rig.update(state.clock.elapsedTime, Math.min(delta, 0.1), pose);
  });

  return <primitive object={model} />;
}

export default function MascotStage({
  model,
  art,
  view,
  framing,
  freeCamera = null,
  pose,
  poses,
  headY,
  headScale,
  overlay,
  opacity,
  toon,
  outlines,
  onReadout,
}: {
  model: THREE.Object3D;
  art: ConceptArt | null;
  view: CameraView;
  framing: Framing;
  freeCamera?: [number, number, number] | null;
  pose: MascotPose;
  poses: PoseSet;
  headY: number;
  headScale: number;
  overlay: OverlayMode;
  opacity: number;
  toon: boolean;
  outlines: boolean;
  onReadout: (readout: Readout | null) => void;
}) {
  return (
    <Canvas
      shadows
      gl={{
        toneMapping: THREE.ACESFilmicToneMapping,
        preserveDrawingBuffer: true,
      }}
    >
      <color attach="background" args={[BACKGROUND]} />
      <ViewCamera
        key={view + framing + freeCamera + headY + headScale}
        view={view}
        framing={framing}
        freeCamera={freeCamera}
        headY={headY}
        headScale={headScale}
      />
      <hemisphereLight args={["#dfe2ff", "#3a2c4a", 1.2]} />
      <directionalLight position={[2, 4, 5]} intensity={2.4} castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-3, 2.5, -4]} intensity={1.1} color="#a492ff" />
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <circleGeometry args={[1.2, 64]} />
        <meshStandardMaterial color="#2a2d4a" roughness={0.9} />
      </mesh>
      <Model model={model} pose={pose} poses={poses} toon={toon} outlines={outlines} />
      {art && view !== "free" && overlay !== "off" && (
        <ArtPlane art={art} view={view} mode={overlay} opacity={opacity} onReadout={onReadout} />
      )}
    </Canvas>
  );
}
