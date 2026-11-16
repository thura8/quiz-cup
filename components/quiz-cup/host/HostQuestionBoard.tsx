"use client";

import { QUIZ_CUP_CATEGORIES, QUIZ_CUP_DIFFICULTIES } from "@/constants/quiz-cup";
import { cn } from "@/lib/utils";
import type { QuizCupHostQuestion } from "@/types/quiz-cup";
import { Check } from "lucide-react";
import { CHOICE_LETTERS, DifficultyBars } from "../QuizCupChalk";

type Props = {
  question: QuizCupHostQuestion;
  correctChoice?: number | null;
};

const LETTER_STYLES = [
  "from-[#7fb2ff] to-[#2f6bff] shadow-[0_0_14px_rgb(63,130,255,0.7)]",
  "from-[#ff9ccc] to-[#ff3d96] shadow-[0_0_14px_rgb(255,61,150,0.7)]",
  "from-[#8ff5b9] to-[#22c56c] shadow-[0_0_14px_rgb(34,197,108,0.7)]",
  "from-[#ffe8a0] to-[#ffb020] shadow-[0_0_14px_rgb(255,176,32,0.7)]",
];

export function StudioLetter({ index, className }: { index: number; className?: string }) {
  return (
    <span
      className={cn(
        "font-studio flex size-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-b text-2xl font-extrabold text-[#1c0b4f] ring-2 ring-white/70",
        LETTER_STYLES[index],
        className,
      )}
    >
      {CHOICE_LETTERS[index]}
    </span>
  );
}

function Header({ question }: { question: QuizCupHostQuestion }) {
  const category = QUIZ_CUP_CATEGORIES.find((c) => c.id === question.category);
  const difficulty = QUIZ_CUP_DIFFICULTIES.find((d) => d.id === question.difficulty);
  const Icon = category?.icon;
  return (
    <div className="body-1 flex flex-wrap items-center justify-center gap-3">
      <span className="studio-title text-2xl">
        ข้อที่ {question.round}/{question.totalRounds}
      </span>
      {category && Icon && (
        <span className="studio-chip">
          <Icon className="size-4 text-[#ffbf47]" />
          {category.label}
        </span>
      )}
      {difficulty && (
        <span className="studio-chip">
          <DifficultyBars filled={difficulty.bars} />
          {difficulty.label}
        </span>
      )}
    </div>
  );
}

export const HostQuestionBoard = ({ question, correctChoice = null }: Props) => {
  const revealed = correctChoice != null;
  return (
    <div className="studio-panel animate-in fade-in zoom-in-95 slide-in-from-top-6 w-full max-w-5xl px-8 pt-6 pb-8 duration-500">
      <Header question={question} />
      <h2 className="font-studio mt-4 text-center text-5xl leading-tight font-extrabold text-balance text-white [text-shadow:0_3px_0_#2a0f6b,0_0_24px_rgb(143,92,255,0.6)]">
        {question.question}
      </h2>
      <ol className="mt-7 grid grid-cols-2 gap-4">
        {question.choices.map((choice, i) => {
          const right = revealed && i === correctChoice;
          return (
            <li
              key={i}
              data-state={right ? "right" : revealed ? "dim" : undefined}
              className="studio-tile flex items-center gap-4 px-4 py-3.5 transition-all duration-500 data-[state=right]:scale-105"
            >
              <StudioLetter index={i} />
              <span className="font-studio flex-1 text-3xl font-semibold text-white">{choice}</span>
              {right && <Check aria-label="คำตอบที่ถูก" className="size-10 text-[#ffe08a]" strokeWidth={3} />}
            </li>
          );
        })}
      </ol>
    </div>
  );
};

export const HostAnswerBanner = ({
  question,
  correctChoice,
}: {
  question: QuizCupHostQuestion;
  correctChoice: number;
}) => (
  <div className="studio-panel animate-in fade-in slide-in-from-top-4 w-full max-w-4xl px-6 py-3 duration-500">
    <div className="flex items-center gap-4">
      <span className="studio-title shrink-0 text-xl">
        ข้อ {question.round}/{question.totalRounds}
      </span>
      <p className="body-1 min-w-0 flex-1 truncate text-[#e9dcff]">{question.question}</p>
      <span className="studio-tile flex shrink-0 items-center gap-3 py-1 pr-5 pl-1" data-state="right">
        <StudioLetter index={correctChoice} className="size-10 text-xl" />
        <span className="font-studio text-2xl font-semibold text-white">{question.choices[correctChoice]}</span>
        <Check className="size-7 text-[#ffe08a]" strokeWidth={3} />
      </span>
    </div>
  </div>
);
