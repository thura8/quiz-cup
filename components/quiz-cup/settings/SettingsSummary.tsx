"use client";

import { Gauge, Layers, LayoutGrid, ListOrdered, Play, Timer, Users, Zap, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  QUIZ_CUP_CATEGORIES,
  QUIZ_CUP_DIFFICULTY_SETTINGS,
  QUIZ_CUP_SOURCES,
  quizCupStartingEnergy,
} from "@/constants/quiz-cup";
import type { QuizCupSettings } from "@/types/quiz-cup";

import { Board } from "../QuizCupChalk";
import { BoardTitle } from "./SettingControls";
import { SHOW_MAX_PLAYERS } from "./types";

type SummaryRow = {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  detail?: ReactNode;
};

function CategoryChips({ labels }: { labels: string[] }) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {labels.map((label) => (
        <li
          key={label}
          className="caption rounded-full border border-dashed border-white/40 px-2.5 py-0.5 text-neutral-200"
        >
          {label}
        </li>
      ))}
    </ul>
  );
}

function categoryRow(settings: QuizCupSettings): SummaryRow {
  const labels = QUIZ_CUP_CATEGORIES.filter((category) => settings.categories.includes(category.id)).map(
    (category) => category.label,
  );
  const hasCategories = labels.length > 0;
  return {
    icon: LayoutGrid,
    label: "หมวดที่เลือก",
    detail: hasCategories && <CategoryChips labels={labels} />,
    value: hasCategories ? `${labels.length} หมวด` : <span className="text-primary-300">ยังไม่ได้เลือก</span>,
  };
}

function buildSummaryRows(settings: QuizCupSettings): SummaryRow[] {
  const rows: SummaryRow[] = [
    {
      icon: Layers,
      label: "รูปแบบคำถาม",
      value: QUIZ_CUP_SOURCES.find((source) => source.id === settings.source)?.label,
    },
  ];
  if (settings.source === "custom") rows.push(categoryRow(settings));
  rows.push(
    {
      icon: Gauge,
      label: "ความยาก",
      value: QUIZ_CUP_DIFFICULTY_SETTINGS.find((difficulty) => difficulty.id === settings.difficulty)?.label,
    },
    { icon: ListOrdered, label: "จำนวนคำถาม", value: `${settings.questionCount} ข้อ` },
    { icon: Zap, label: "Energy ต่อคน", value: `${quizCupStartingEnergy(settings.questionCount)} Energy` },
    { icon: Timer, label: "เวลาตอบต่อข้อ", value: `${settings.secondsPerQuestion} วินาที` },
  );
  if (SHOW_MAX_PLAYERS) rows.push({ icon: Users, label: "ผู้เล่นสูงสุด", value: `${settings.maxPlayers} คน` });
  return rows;
}

type Props = {
  settings: QuizCupSettings;
  needsCategory: boolean;
  submitting: boolean;
  onSubmit?: (settings: QuizCupSettings) => void;
};

export default function SettingsSummary({ settings, needsCategory, submitting, onSubmit }: Props) {
  const rows = buildSummaryRows(settings);

  return (
    <aside className="flex flex-col gap-4 lg:min-h-0 lg:justify-between">
      <Board className="lg:min-h-0 lg:overflow-y-auto">
        <BoardTitle icon={ListOrdered} title="สรุปการตั้งค่า" />
        <dl className="divide-y divide-dashed divide-white/20">
          {rows.map((row) => (
            <div key={row.label} className="py-2.5">
              <div className="flex items-start gap-3">
                <row.icon className="mt-0.5 size-5 shrink-0 text-neutral-300" />
                <dt className="body-2 flex-1 whitespace-nowrap text-neutral-300">{row.label}</dt>
                <dd className="body-2 text-right font-semibold">{row.value}</dd>
              </div>
              {row.detail && <dd className="mt-2 pl-8">{row.detail}</dd>}
            </div>
          ))}
        </dl>
      </Board>

      <div className="flex flex-col gap-2">
        <Button size="xl" className="w-full" disabled={needsCategory || submitting} onClick={() => onSubmit?.(settings)}>
          <Play data-icon="inline-start" />
          {submitting ? "กำลังเริ่มเกม..." : "เริ่มเล่นเกม"}
        </Button>
        {needsCategory && (
          <p className="caption text-primary-300 text-center">เลือกอย่างน้อย 1 หมวดเพื่อเริ่มเกม</p>
        )}
      </div>
    </aside>
  );
}
