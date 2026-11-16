"use client";

import { ARENA_HOST_POSITION, ARENA_HOST_YAW } from "@/constants/quiz-cup-arena";

import { freeze } from "../arena-utils";
import { buildHostPodium } from "../studio-host-podium";
import { useBuiltGroup } from "../use-built-group";

const HOST_DESK_SCALE = 0.92;

function buildHostDesk() {
  const group = buildHostPodium();
  group.position.set(...ARENA_HOST_POSITION);
  group.rotation.y = ARENA_HOST_YAW;
  group.scale.setScalar(HOST_DESK_SCALE);
  group.updateMatrixWorld(true);
  freeze(group);
  return group;
}

export default function HostDesk() {
  const group = useBuiltGroup(buildHostDesk);
  return <primitive object={group} />;
}
