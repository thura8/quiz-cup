"use client";

import { STAGE_TIERS } from "@/constants/quiz-cup-arena";

import Audience from "./studio-set/Audience";
import CentralStage from "./studio-set/CentralStage";
import Floor from "./studio-set/Floor";
import HostDesk from "./studio-set/HostDesk";
import Platforms from "./studio-set/Platforms";
import Walls from "./studio-set/Walls";

export { STAGE_TIERS };

export default function StudioSet({ reflections }: { reflections: boolean }) {
  return (
    <>
      <Floor reflections={reflections} />
      <CentralStage />
      <Platforms />
      <Audience />
      <Walls />
      <HostDesk />
    </>
  );
}
