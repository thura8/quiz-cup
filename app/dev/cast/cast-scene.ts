import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import { GOLD, poseFor } from "./cast-animation";
import { type CastState, type Frame, fullCellFrame } from "./cast-states";
import { keyWhiteBackground } from "./sprite-sheet";

export const BACKGROUND_COLOR = 0x14182e;
const PEDESTAL_COUNT = 6;
const PEDESTAL_SPACING = 2.05;
const PEDESTAL_ARC_DEPTH = 0.32;
const PEDESTAL_TOP = 0.3;
const IDLE_SPRITE_HEIGHT = 2.5;
const PHASE_STEP = 0.37;

type Character = {
  sprite: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  texture: THREE.Texture;
  ring: THREE.MeshStandardMaterial;
  phase: number;
  basePosition: THREE.Vector3;
};

export type CastScene = {
  setState: (state: CastState) => void;
  setSheet: (image: HTMLImageElement) => void;
  dispose: () => void;
};

function createRenderer(container: HTMLElement) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);
  return renderer;
}

function createCamera(container: HTMLElement, renderer: THREE.WebGLRenderer) {
  const camera = new THREE.PerspectiveCamera(38, container.clientWidth / container.clientHeight, 0.1, 100);
  camera.position.set(0, 2.7, 11);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 1.35, -0.8);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.minDistance = 4;
  controls.maxDistance = 20;
  controls.update();
  return { camera, controls };
}

function addLightsAndFloor(scene: THREE.Scene) {
  const key = new THREE.DirectionalLight("#fff2d6", 1.8);
  key.position.set(2, 9, 6);
  const rim = new THREE.DirectionalLight("#6c5ce7", 1.0);
  rim.position.set(-4, 4, -8);
  scene.add(key, rim, new THREE.HemisphereLight("#8a90c8", "#0b0d1a", 0.45));

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(40, 64),
    new THREE.MeshStandardMaterial({ color: "#101426", roughness: 0.95, metalness: 0 }),
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);
}

function buildPedestal() {
  const group = new THREE.Group();
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.78, 0.84, 0.22, 64),
    new THREE.MeshStandardMaterial({ color: "#253482", roughness: 0.45, metalness: 0.15 }),
  );
  base.position.y = 0.11;
  const ringMaterial = new THREE.MeshStandardMaterial({
    color: GOLD,
    emissive: GOLD.clone(),
    emissiveIntensity: 0.55,
    roughness: 0.3,
    metalness: 0.6,
  });
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.05, 64), ringMaterial);
  ring.position.y = 0.245;
  const top = new THREE.Mesh(
    new THREE.CylinderGeometry(0.72, 0.76, 0.04, 64),
    new THREE.MeshStandardMaterial({ color: "#161d42", roughness: 0.55, metalness: 0.1 }),
  );
  top.position.y = PEDESTAL_TOP - 0.02;
  group.add(base, ring, top);
  return { group, ringMaterial };
}

function createFeetAnchoredPlane() {
  const geometry = new THREE.PlaneGeometry(1, 1);
  geometry.translate(0, 0.5, 0);
  return geometry;
}

function addCharacters(scene: THREE.Scene) {
  const characters: Character[] = [];
  const spriteGeometry = createFeetAnchoredPlane();
  for (let i = 0; i < PEDESTAL_COUNT; i++) {
    const offsetFromCenter = i - (PEDESTAL_COUNT - 1) / 2;
    const x = offsetFromCenter * PEDESTAL_SPACING;
    const z = -PEDESTAL_ARC_DEPTH * offsetFromCenter * offsetFromCenter;

    const { group, ringMaterial } = buildPedestal();
    group.position.set(x, 0, z);
    scene.add(group);

    const texture = new THREE.Texture();
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      fog: false,
      side: THREE.DoubleSide,
    });
    const sprite = new THREE.Mesh(spriteGeometry, material);
    sprite.position.set(x, PEDESTAL_TOP, z);
    sprite.visible = false;
    scene.add(sprite);
    characters.push({
      sprite,
      texture,
      ring: ringMaterial,
      phase: i * PHASE_STEP,
      basePosition: sprite.position.clone(),
    });
  }
  return characters;
}

function disposeScene(scene: THREE.Scene) {
  scene.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry.dispose();
    const material = mesh.material as THREE.MeshBasicMaterial;
    material.map?.dispose();
    material.dispose();
  });
}

export function createCastScene(container: HTMLElement): CastScene {
  const renderer = createRenderer(container);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BACKGROUND_COLOR);
  scene.fog = new THREE.FogExp2(BACKGROUND_COLOR, 0.035);

  const { camera, controls } = createCamera(container, renderer);
  addLightsAndFloor(scene);
  const characters = addCharacters(scene);

  let currentState: CastState = "idle";
  let stateStartedAt = 0;
  let frames: Record<CastState, Frame> | null = null;
  const timer = new THREE.Timer();
  timer.connect(document);

  const currentFrame = (): Frame => frames?.[currentState] ?? fullCellFrame(currentState);

  const applyFrameToTextures = () => {
    const frame = currentFrame();
    for (const character of characters) {
      character.texture.offset.set(...frame.offset);
      character.texture.repeat.set(...frame.repeat);
    }
  };

  const setSheet = (image: HTMLImageElement) => {
    const { canvas, frames: measuredFrames } = keyWhiteBackground(image);
    frames = measuredFrames;
    for (const character of characters) {
      character.texture.dispose();
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
      character.texture = texture;
      character.sprite.material.map = texture;
      character.sprite.material.needsUpdate = true;
      character.sprite.visible = true;
    }
    applyFrameToTextures();
  };

  const setState = (state: CastState) => {
    currentState = state;
    stateStartedAt = timer.getElapsed();
    applyFrameToTextures();
  };

  const ringColor = new THREE.Color();

  const animateCharacter = (character: Character, now: number, width: number, height: number) => {
    const pose = poseFor(currentState, {
      time: now + character.phase,
      sinceStateChange: now - stateStartedAt,
      ringColor,
    });

    const { sprite, basePosition } = character;
    sprite.quaternion.copy(camera.quaternion);
    if (pose.roll) sprite.rotateZ(pose.roll);
    sprite.scale.set(width * pose.scaleX, height * pose.scaleY, 1);
    sprite.position.copy(basePosition);
    sprite.position.y += pose.lift;
    if (pose.towardCamera) {
      const towardCamera = camera.position.clone().sub(basePosition).setY(0).normalize();
      sprite.position.addScaledVector(towardCamera, pose.towardCamera);
    }

    character.ring.color.copy(ringColor);
    character.ring.emissive.copy(ringColor);
    character.ring.emissiveIntensity = pose.ringGlow;
  };

  renderer.setAnimationLoop((time) => {
    timer.update(time);
    const now = timer.getElapsed();
    controls.update();
    const frame = currentFrame();
    const height = IDLE_SPRITE_HEIGHT * frame.height;
    const width = height * frame.aspect;
    for (const character of characters) animateCharacter(character, now, width, height);
    renderer.render(scene, camera);
  });

  const onResize = () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  };
  window.addEventListener("resize", onResize);

  const dispose = () => {
    window.removeEventListener("resize", onResize);
    renderer.setAnimationLoop(null);
    timer.dispose();
    controls.dispose();
    disposeScene(scene);
    renderer.dispose();
    container.removeChild(renderer.domElement);
  };

  return { setState, setSheet, dispose };
}
