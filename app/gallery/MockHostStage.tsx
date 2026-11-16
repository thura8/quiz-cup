"use client";

import QuizCupHostStage from "@/components/quiz-cup/host/QuizCupHostStage";
import { ARENA_MAX_PLAYERS, type ArenaQuality } from "@/constants/quiz-cup-arena";
import { cn } from "@/lib/utils";
import type { QuizCupHostPlayer, QuizCupHostQuestion } from "@/types/quiz-cup";
import { useEffect, useMemo, useState } from "react";

const NAMES = ["แนน", "โบว์", "ก้อง", "มายด์", "ต้น", "ฝน", "บีม", "เจ", "พลอย", "ภูมิ", "มิว", "ออม"];
const TOTAL_ROUNDS = 20;
const COUNTDOWN_SECONDS = 3;
const QUESTION_SECONDS = 15;

const QUESTIONS: (Omit<QuizCupHostQuestion, "round" | "totalRounds"> & { answer: number })[] = [
  {
    category: "english",
    difficulty: "easy",
    question: "พหูพจน์ของคำว่า child คือข้อใด",
    choices: ["childs", "children", "childes", "childrens"],
    answer: 1,
  },
  {
    category: "science",
    difficulty: "medium",
    question: "ดาวเคราะห์ดวงใดอยู่ใกล้ดวงอาทิตย์ที่สุด",
    choices: ["ดาวศุกร์", "ดาวอังคาร", "ดาวพุธ", "โลก"],
    answer: 2,
  },
  {
    category: "math",
    difficulty: "hard",
    question: "ผลบวกของมุมภายในรูปหกเหลี่ยมเท่ากับกี่องศา",
    choices: ["540°", "720°", "900°", "1080°"],
    answer: 1,
  },
];

type Phase = "countdown" | "question" | "reveal";
type Show = { phase: Phase; round: number; endsAt: string; answered: number[] };

const iso = (seconds: number) => new Date(Date.now() + seconds * 1000).toISOString();
const start = (phase: Phase, round: number): Show => ({
  phase,
  round,
  endsAt: iso(phase === "countdown" ? COUNTDOWN_SECONDS : QUESTION_SECONDS),
  answered: [],
});

function Chips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly T[];
  value: T | null;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium",
            value === o ? "bg-white text-black" : "bg-white/10 text-white",
          )}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

/** The host playing screen running on its own: countdown → question → reveal → next round. */
export default function MockHostStage({ onFinish }: { onFinish: () => void }) {
  const [count, setCount] = useState(6);
  const [quality, setQuality] = useState<ArenaQuality | "auto">("auto");
  const [show, setShow] = useState<Show>(() => ({ phase: "countdown", round: 1, endsAt: "", answered: [] }));
  const [panelOpen, setPanelOpen] = useState(true);
  // Freezes the show on the current phase (for looking at one camera shot).
  const [paused, setPaused] = useState(false);

  // Kick off on mount (the clock can't be read during render).
  useEffect(() => {
    const timer = setTimeout(() => setShow(start("countdown", 1)), 0);
    return () => clearTimeout(timer);
  }, []);

  // Countdown and question run out on their own; the reveal waits for the host.
  useEffect(() => {
    if (!show.endsAt || paused) return;
    const timer = setTimeout(() => {
      setShow((s) =>
        s.phase === "countdown" ? start("question", s.round) : { ...s, phase: "reveal", endsAt: "" },
      );
    }, Math.max(0, new Date(show.endsAt).getTime() - Date.now()));
    return () => clearTimeout(timer);
  }, [show.endsAt, paused]);

  const next = () => {
    if (show.round >= TOTAL_ROUNDS) onFinish();
    else setShow(start("countdown", show.round + 1));
  };

  // Players lock in one at a time, in a shuffled order. Odd rounds everyone answers (and the
  // question closes early); even rounds one player never does, so the clock runs out.
  useEffect(() => {
    if (show.phase !== "question" || paused) return;
    const timer = setInterval(() => {
      setShow((s) => {
        const left = Array.from({ length: count }, (_, i) => i).filter((i) => !s.answered.includes(i));
        if (left.length === 0 || (left.length === 1 && s.round % 2 === 0)) return s;
        return { ...s, answered: [...s.answered, left[(s.round * 7 + s.answered.length * 3) % left.length]] };
      });
    }, 1300);
    return () => clearInterval(timer);
  }, [show.phase, count, paused]);

  // Everyone has answered: reveal straight away (the backend does this in the real game), after
  // a beat so the last "answered" pop is heard.
  const allAnswered = show.phase === "question" && show.answered.length >= count;
  useEffect(() => {
    if (!allAnswered || paused) return;
    const timer = setTimeout(() => setShow((s) => ({ ...s, phase: "reveal", endsAt: "" })), 800);
    return () => clearTimeout(timer);
  }, [allAnswered, paused]);

  const q = QUESTIONS[(show.round - 1) % QUESTIONS.length];
  const question = useMemo<QuizCupHostQuestion>(
    () => ({ ...q, round: show.round, totalRounds: TOTAL_ROUNDS }),
    [q, show.round],
  );
  const players = useMemo<QuizCupHostPlayer[]>(
    () =>
      Array.from({ length: count }, (_, i) => {
        const answered = show.answered.includes(i);
        // Mock verdicts: every third answering player gets it wrong.
        const wrong = i % 3 === 2;
        const result = !answered ? "missed" : wrong ? "wrong" : "correct";
        const choice = !answered ? null : wrong ? (q.answer + 1 + (i % 3)) % 4 : q.answer;
        return { id: `p${i + 1}`, name: NAMES[i % NAMES.length], answered, result, choice };
      }),
    [count, show.answered, q.answer],
  );

  return (
    <div className="relative h-dvh w-full">
      <QuizCupHostStage
        phase={show.phase}
        question={question}
        players={players}
        endsAt={show.endsAt || undefined}
        durationSeconds={show.phase === "countdown" ? COUNTDOWN_SECONDS : QUESTION_SECONDS}
        correctChoice={q.answer}
        onNext={next}
        quality={quality === "auto" ? undefined : quality}
      />
      <div className="absolute bottom-4 left-4 z-40 flex w-72 flex-col gap-3 rounded-2xl bg-black/70 p-3 text-white">
        <button type="button" className="text-left text-xs text-white/60" onClick={() => setPanelOpen((o) => !o)}>
          {panelOpen ? "▾ mock controls" : "▸ mock controls"}
        </button>
        {panelOpen && (
          <>
            <Chips
              options={["countdown", "question", "reveal"] as const}
              value={show.phase}
              onChange={(p) => setShow((s) => (p === "reveal" ? { ...s, phase: p, endsAt: "" } : start(p, s.round)))}
            />
            <div className="flex gap-1">
              <button
                type="button"
                className="flex-1 rounded-full bg-white/10 px-3 py-1 text-xs"
                onClick={() => setShow(start("countdown", 1))}
              >
                เริ่มเกมใหม่ (ข้อ 1)
              </button>
              <button
                type="button"
                className="flex-1 rounded-full bg-white/10 px-3 py-1 text-xs"
                onClick={() => setShow(start("countdown", TOTAL_ROUNDS))}
              >
                ข้อสุดท้าย
              </button>
            </div>
            <label className="flex items-center gap-2 text-xs">
              <span className="w-16">ผู้เล่น {count}</span>
              <input
                type="range"
                min={1}
                max={ARENA_MAX_PLAYERS}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="flex-1 accent-sky-400"
              />
            </label>
            <Chips options={["auto", "high", "medium", "low"] as const} value={quality} onChange={setQuality} />
            <Chips options={["play", "pause"] as const} value={paused ? "pause" : "play"} onChange={(v) => setPaused(v === "pause")} />
          </>
        )}
      </div>
    </div>
  );
}
