import * as THREE from "three";

import type { CastState } from "./cast-states";

export const GOLD = new THREE.Color("#f4b41a");
const GREEN = new THREE.Color("#3ee07a");
const MUTED = new THREE.Color("#7a3a66");

const DEFAULT_RING_GLOW = 0.55;
const BREATH_SPEED = 2.5;

export type Pose = {
  scaleX: number;
  scaleY: number;
  lift: number;
  roll: number;
  towardCamera: number;
  ringGlow: number;
};

type PoseInput = { time: number; sinceStateChange: number; ringColor: THREE.Color };

const restingPose = (): Pose => ({
  scaleX: 1,
  scaleY: 1,
  lift: 0,
  roll: 0,
  towardCamera: 0,
  ringGlow: DEFAULT_RING_GLOW,
});

const easeOutCubic = (progress: number) => 1 - Math.pow(1 - progress, 3);

function idlePose({ time }: PoseInput): Pose {
  return { ...restingPose(), scaleY: 1 + Math.sin(time * BREATH_SPEED) * 0.015 };
}

function thinkingPose({ time }: PoseInput): Pose {
  return {
    ...restingPose(),
    scaleY: 1 + Math.sin(time * BREATH_SPEED) * 0.01,
    roll: Math.sin(time * 1.8) * 0.03,
  };
}

function answeredPose({ sinceStateChange }: PoseInput): Pose {
  const progress = Math.min(1, sinceStateChange / 0.18);
  const pop = 1 + 0.06 * Math.sin((progress * Math.PI) / 2);
  return {
    ...restingPose(),
    scaleX: pop,
    scaleY: pop,
    towardCamera: 0.18 * progress,
    ringGlow: 0.6 + 3 * Math.exp(-sinceStateChange * 4),
  };
}

function correctPose({ time, ringColor }: PoseInput): Pose {
  const hop = Math.abs(Math.sin(time * 6));
  const landingSquash = hop < 0.15 ? 0.04 : 0;
  ringColor.copy(GOLD).lerp(GREEN, 0.5 + 0.5 * Math.sin(time * 5));
  return {
    ...restingPose(),
    lift: hop * 0.35,
    scaleY: 1 + 0.04 * hop - landingSquash,
    ringGlow: 1.6 + 0.6 * Math.sin(time * 6),
  };
}

function wrongPose({ sinceStateChange, ringColor }: PoseInput): Pose {
  const eased = easeOutCubic(Math.min(1, sinceStateChange / 0.7));
  ringColor.copy(GOLD).lerp(MUTED, eased);
  return {
    ...restingPose(),
    scaleY: 1 - 0.05 * eased,
    scaleX: 1 + 0.01 * eased,
    ringGlow: DEFAULT_RING_GLOW - 0.3 * eased,
  };
}

function missedPose({ time, sinceStateChange }: PoseInput): Pose {
  const joltDuration = 0.15;
  const settleTime = sinceStateChange - joltDuration;
  const lift =
    sinceStateChange < joltDuration
      ? 0.22 * Math.sin((Math.PI * sinceStateChange) / joltDuration)
      : 0.035 * Math.exp(-settleTime * 9) * Math.sin(settleTime * 38);
  return { ...restingPose(), lift, scaleY: 1 + Math.sin(time * BREATH_SPEED) * 0.012 };
}

const POSE_BY_STATE: Record<CastState, (input: PoseInput) => Pose> = {
  idle: idlePose,
  thinking: thinkingPose,
  answered: answeredPose,
  correct: correctPose,
  wrong: wrongPose,
  missed: missedPose,
};

export function poseFor(state: CastState, input: PoseInput): Pose {
  input.ringColor.copy(GOLD);
  return POSE_BY_STATE[state](input);
}
