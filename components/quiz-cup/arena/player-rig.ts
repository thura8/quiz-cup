import * as THREE from "three";

import type { QuizCupArenaPlayerStatus } from "@/types/quiz-cup";

const BONES = [
  "Hips",
  "Spine",
  "Chest",
  "Neck",
  "Head",
  "UpperArmL",
  "UpperArmR",
  "ForearmL",
  "ForearmR",
] as const;
type Bone = (typeof BONES)[number];
type Pose = Partial<Record<Bone, [number, number, number]>>;

const READY: Pose = {
  Spine: [0.04, 0, 0],
  UpperArmL: [-0.55, 0, 0],
  UpperArmR: [-0.55, 0, 0],
  ForearmL: [-0.95, 0, 0],
  ForearmR: [-0.95, 0, 0],
};

const POSES: Record<QuizCupArenaPlayerStatus, Pose> = {
  idle: {
    UpperArmL: [-0.1, 0, 0.05],
    UpperArmR: [-0.1, 0, -0.05],
    ForearmL: [-0.25, 0, 0],
    ForearmR: [-0.25, 0, 0],
  },
  thinking: {
    ...READY,
    Head: [-0.1, 0, 0.15],
    UpperArmR: [-0.35, 0, 0.35],
    ForearmR: [-2.3, 0, 0],
  },
  answered: { ...READY, Chest: [-0.03, 0, 0] },
  correct: {
    Chest: [-0.08, 0, 0],
    Head: [-0.15, 0, 0],
    UpperArmL: [0, 0, 2.5],
    UpperArmR: [0, 0, -2.5],
    ForearmL: [0, 0, 0.5],
    ForearmR: [0, 0, -0.5],
  },
  wrong: {
    Spine: [0.15, 0, 0],
    Chest: [0.12, 0, 0],
    Neck: [0.15, 0, 0],
    Head: [0.3, 0, 0],
    UpperArmL: [-0.25, 0, 0],
    UpperArmR: [-0.25, 0, 0],
    ForearmL: [-0.6, 0, 0],
    ForearmR: [-0.6, 0, 0],
  },
  missed: {
    Head: [0, 0, 0.18],
    UpperArmL: [-0.2, 0, 0.35],
    UpperArmR: [-0.2, 0, -0.35],
    ForearmL: [-1.3, 0, 0],
    ForearmR: [-1.3, 0, 0],
  },
};

const EXPRESSION: Record<QuizCupArenaPlayerStatus, string | null> = {
  idle: "Smile",
  thinking: "Thinking",
  answered: "Confident",
  correct: "Happy",
  wrong: "Disappointed",
  missed: "Surprised",
};
const BLINK = "Blink";

const POSE_RATE = 7;
const FACE_RATE = 10;

type BoneState = {
  bone: THREE.Bone;
  rest: THREE.Quaternion;
  parent: THREE.Quaternion;
  parentInverse: THREE.Quaternion;
  current: THREE.Vector3;
};

const euler = new THREE.Euler();
const offset = new THREE.Quaternion();
const target = new THREE.Vector3();

export class PlayerRig {
  private bones: BoneState[] = [];
  private names: string[] = [];
  private weights = new Float32Array(0);
  private morphs: { influences: number[]; index: Int16Array }[] = [];
  private nextBlink: number;
  private blinkStart = -1;
  private random: number;
  private readonly seed: number;
  private readonly baseY: number;

  constructor(
    private readonly root: THREE.Object3D,
    seed: number,
  ) {
    this.seed = seed;
    this.random = seed * 7919 + 1;
    this.baseY = root.position.y;
    this.nextBlink = 1 + (seed % 3);
    const rootInverse = new THREE.Quaternion();
    root.updateMatrixWorld(true);
    root.getWorldQuaternion(rootInverse).invert();

    for (const name of BONES) {
      const bone = root.getObjectByName(name) as THREE.Bone | undefined;
      if (!bone?.parent) continue;
      const parent = bone.parent.getWorldQuaternion(new THREE.Quaternion()).premultiply(rootInverse);
      this.bones.push({
        bone,
        rest: bone.quaternion.clone(),
        parent,
        parentInverse: parent.clone().invert(),
        current: new THREE.Vector3(),
      });
    }
    const faces: THREE.Mesh[] = [];
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.morphTargetDictionary && mesh.morphTargetInfluences) faces.push(mesh);
    });
    this.names = [...new Set(faces.flatMap((m) => Object.keys(m.morphTargetDictionary!)))];
    this.weights = new Float32Array(this.names.length);
    this.morphs = faces.map((m) => ({
      influences: m.morphTargetInfluences!,
      index: Int16Array.from(this.names, (n) => m.morphTargetDictionary![n] ?? -1),
    }));
  }

  private rand() {
    this.random = (this.random * 1664525 + 1013904223) % 4294967296;
    return this.random / 4294967296;
  }

  update(t: number, dt: number, status: QuizCupArenaPlayerStatus) {
    const pose = POSES[status];
    const k = 1 - Math.exp(-dt * POSE_RATE);
    const s = this.seed;

    for (const b of this.bones) {
      const name = b.bone.name as Bone;
      const p = pose[name];
      target.set(p?.[0] ?? 0, p?.[1] ?? 0, p?.[2] ?? 0);
      if (name === "Chest") target.x += 0.025 * Math.sin(t * 1.7 + s);
      if (name === "Spine") target.z += 0.02 * Math.sin(t * 0.45 + s);
      if (name === "Head") {
        target.y += 0.12 * Math.sin(t * 0.3 + s * 1.7);
        target.x += 0.03 * Math.sin(t * 0.7 + s);
      }
      if (status === "correct" && (name === "UpperArmL" || name === "UpperArmR")) {
        target.z += (name === "UpperArmL" ? 1 : -1) * 0.18 * Math.sin(t * 9 + s);
      }
      b.current.lerp(target, k);

      offset.setFromEuler(euler.set(b.current.x, b.current.y, b.current.z));
      b.bone.quaternion.copy(b.parentInverse).multiply(offset).multiply(b.parent).multiply(b.rest);
    }

    this.root.position.y =
      this.baseY + (status === "correct" ? 0.035 * Math.abs(Math.sin(t * 4.5 + s)) : 0);

    this.updateFace(t, dt, EXPRESSION[status]);
  }

  private updateFace(t: number, dt: number, expression: string | null) {
    const k = 1 - Math.exp(-dt * FACE_RATE);
    if (t >= this.nextBlink) {
      this.blinkStart = t;
      this.nextBlink = t + 2.5 + this.rand() * 3;
    }
    const sinceBlink = t - this.blinkStart;
    const blink = sinceBlink >= 0 && sinceBlink < 0.16 ? Math.sin((sinceBlink / 0.16) * Math.PI) : 0;

    const { names, weights } = this;
    for (let i = 0; i < names.length; i++) {
      weights[i] += ((names[i] === expression ? 1 : 0) - weights[i]) * k;
    }
    for (const { influences, index } of this.morphs) {
      for (let i = 0; i < names.length; i++) {
        if (index[i] < 0) continue;
        influences[index[i]] = names[i] === BLINK ? Math.max(blink, weights[i]) : weights[i];
      }
    }
  }
}
