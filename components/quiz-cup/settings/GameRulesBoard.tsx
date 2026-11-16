"use client";

import { Gauge, ListOrdered, Shuffle, Timer, Users } from "lucide-react";

import {
  QUIZ_CUP_DIFFICULTY_SETTINGS,
  QUIZ_CUP_MAX_PLAYERS,
  QUIZ_CUP_QUESTION_COUNTS,
  QUIZ_CUP_QUESTION_MAX,
  QUIZ_CUP_QUESTION_MIN,
  QUIZ_CUP_SECONDS_PER_QUESTION,
} from "@/constants/quiz-cup";
import type { QuizCupSettings } from "@/types/quiz-cup";

import { Board, DifficultyBars } from "../QuizCupChalk";
import { CountStepper, SettingRow } from "./SettingControls";
import { SHOW_MAX_PLAYERS, type UpdateSetting } from "./types";

const difficultyOptions = QUIZ_CUP_DIFFICULTY_SETTINGS.map((difficulty) => ({
  value: difficulty.id,
  label: (
    <>
      {difficulty.bars == null ? (
        <Shuffle className="size-4" aria-hidden />
      ) : (
        <DifficultyBars filled={difficulty.bars} />
      )}
      <span className="body-2">{difficulty.label}</span>
    </>
  ),
}));

const countOptions = <T extends number>(values: readonly T[], unit: string) =>
  values.map((value) => ({ value, label: <span className="body-2">{`${value} ${unit}`}</span> }));

export default function GameRulesBoard({
  settings,
  update,
}: {
  settings: QuizCupSettings;
  update: UpdateSetting;
}) {
  const isPresetCount = (QUIZ_CUP_QUESTION_COUNTS as readonly number[]).includes(settings.questionCount);

  return (
    <Board>
      <SettingRow
        icon={Gauge}
        title="ความยาก"
        hint={settings.difficulty === "random" ? "คละง่าย ปานกลาง ยาก อย่างละเท่า ๆ กัน" : undefined}
        options={difficultyOptions}
        value={settings.difficulty}
        onChange={(value) => update("difficulty", value)}
      />
      <SettingRow
        icon={ListOrdered}
        title="จำนวนคำถาม"
        hint={`กำหนดเองได้ ${QUIZ_CUP_QUESTION_MIN}–${QUIZ_CUP_QUESTION_MAX} ข้อ`}
        options={countOptions(QUIZ_CUP_QUESTION_COUNTS, "ข้อ")}
        value={settings.questionCount}
        onChange={(value) => update("questionCount", value)}
        extra={
          <CountStepper
            value={settings.questionCount}
            active={!isPresetCount}
            onChange={(value) => update("questionCount", value)}
          />
        }
      />
      <SettingRow
        icon={Timer}
        title="เวลาตอบต่อข้อ"
        options={countOptions(QUIZ_CUP_SECONDS_PER_QUESTION, "วินาที")}
        value={settings.secondsPerQuestion}
        onChange={(value) => update("secondsPerQuestion", value)}
      />
      {SHOW_MAX_PLAYERS && (
        <SettingRow
          icon={Users}
          title="ผู้เล่นสูงสุด"
          hint="ไม่นับ Host"
          options={countOptions(QUIZ_CUP_MAX_PLAYERS, "คน")}
          value={settings.maxPlayers}
          onChange={(value) => update("maxPlayers", value)}
        />
      )}
    </Board>
  );
}
