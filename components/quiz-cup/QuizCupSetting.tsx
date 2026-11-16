"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  QUIZ_CUP_CATEGORIES,
  QUIZ_CUP_DEFAULT_SETTINGS,
  QUIZ_CUP_DIFFICULTY_SETTINGS,
  QUIZ_CUP_MAX_PLAYERS,
  QUIZ_CUP_QUESTION_COUNTS,
  QUIZ_CUP_QUESTION_MAX,
  QUIZ_CUP_QUESTION_MIN,
  clampQuestionCount,
  quizCupStartingEnergy,
  QUIZ_CUP_SECONDS_PER_QUESTION,
  QUIZ_CUP_SOURCES,
} from "@/constants/quiz-cup";
import { cn } from "@/lib/utils";
import type { QuizCupCategoryId, QuizCupSettings } from "@/types/quiz-cup";
import {
  ChevronDown,
  ChevronLeft,
  Gauge,
  Globe,
  Layers,
  LayoutGrid,
  ListOrdered,
  Minus,
  Plus,
  type LucideIcon,
  Play,
  Settings2,
  Shuffle,
  Timer,
  Users,
  Zap,
} from "lucide-react";
import { type CSSProperties, type ReactNode, useState } from "react";
import SoundToggle from "@/components/common/SoundToggle";
import QuizCupBackground from "./QuizCupBackground";
import { Board, ChalkFrame, ChalkIcon, DifficultyBars } from "./QuizCupChalk";

type Props = {
  defaultSettings?: QuizCupSettings;
  submitting?: boolean;
  onSubmit?: (settings: QuizCupSettings) => void;
  onBack?: () => void;
};

// Hidden until max players is settled with the 3D gameplay screen.
const SHOW_MAX_PLAYERS = false;

function BoardTitle({
  icon,
  title,
  hint,
  action,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <ChalkIcon icon={icon} className="size-7" />
      <div className="min-w-0 flex-1">
        <p className="font-display heading-5 text-white">{title}</p>
        {hint && <p className="caption text-neutral-300">{hint}</p>}
      </div>
      {action && <div className="max-sm:w-full max-sm:pl-10">{action}</div>}
    </div>
  );
}

function ChalkOption({
  selected,
  onClick,
  children,
  className,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "relative flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-2xl px-3 py-2 text-white transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/60",
        selected ? "bg-primary/20" : "bg-white/5 hover:bg-white/10",
        className,
      )}
    >
      <ChalkFrame active={selected} className="rounded-2xl" />
      <span className="relative flex items-center gap-2">{children}</span>
    </button>
  );
}

function SettingRow<T extends string | number>({
  icon,
  title,
  hint,
  options,
  value,
  onChange,
  extra,
}: {
  icon: LucideIcon;
  title: string;
  hint?: ReactNode;
  options: { value: T; label: ReactNode }[];
  value: T;
  onChange: (value: T) => void;
  /** An extra control after the options, sharing their grid. */
  extra?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-dashed border-white/20 py-4 last:border-b-0 lg:flex-row lg:items-center">
      <div className="flex items-center gap-3 lg:w-56 lg:shrink-0">
        <ChalkIcon icon={icon} />
        <div>
          <p className="body-1 font-semibold text-white">{title}</p>
          {hint && <p className="caption text-neutral-300">{hint}</p>}
        </div>
      </div>
      {/* On phones the extra control drops to its own full-width line. */}
      <div
        className="grid flex-1 grid-cols-[repeat(var(--cols),minmax(0,1fr))] gap-2 sm:grid-cols-[repeat(var(--cols-sm),minmax(0,1fr))]"
        style={
          {
            "--cols": options.length,
            "--cols-sm": options.length + (extra ? 1 : 0),
          } as CSSProperties
        }
      >
        {options.map((option) => (
          <ChalkOption
            key={option.value}
            selected={option.value === value}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </ChalkOption>
        ))}
        {extra && <div className="col-span-full sm:col-span-1">{extra}</div>}
      </div>
    </div>
  );
}

/** A typed question count with − / + nudges; lit when it isn't one of the presets. */
function CountStepper({
  value,
  active,
  onChange,
}: {
  value: number;
  active: boolean;
  onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);

  function commit() {
    if (draft == null) return;
    onChange(clampQuestionCount(Number(draft)));
    setDraft(null);
  }

  const nudge = (step: number) => {
    setDraft(null);
    onChange(clampQuestionCount(value + step));
  };

  return (
    <div
      className={cn(
        "relative flex min-h-12 items-center rounded-2xl px-1 text-white transition-colors",
        active ? "bg-primary/20" : "bg-white/5",
      )}
    >
      <ChalkFrame active={active} className="rounded-2xl" />
      <button
        type="button"
        aria-label="ลดจำนวนข้อ"
        disabled={value <= QUIZ_CUP_QUESTION_MIN}
        onClick={() => nudge(-1)}
        className="relative flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
      >
        <Minus className="size-4" />
      </button>
      <input
        type="number"
        inputMode="numeric"
        aria-label="กำหนดจำนวนข้อเอง"
        min={QUIZ_CUP_QUESTION_MIN}
        max={QUIZ_CUP_QUESTION_MAX}
        value={draft ?? value}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        className="body-2 relative w-full min-w-0 [appearance:textfield] bg-transparent text-center font-semibold outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <button
        type="button"
        aria-label="เพิ่มจำนวนข้อ"
        disabled={value >= QUIZ_CUP_QUESTION_MAX}
        onClick={() => nudge(1)}
        className="relative flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}

function SwitchRow({
  label,
  hint,
  checked,
  onCheckedChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-3">
      <span>
        <span className="body-1 block text-white">{label}</span>
        <span className="caption text-neutral-300">{hint}</span>
      </span>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </label>
  );
}

const QuizCupSetting = ({
  defaultSettings = QUIZ_CUP_DEFAULT_SETTINGS,
  submitting = false,
  onSubmit,
  onBack,
}: Props) => {
  const [settings, setSettings] = useState<QuizCupSettings>(defaultSettings);
  const [moreOpen, setMoreOpen] = useState(false);

  function update<K extends keyof QuizCupSettings>(
    key: K,
    value: QuizCupSettings[K],
  ) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  function toggleCategory(id: QuizCupCategoryId) {
    setSettings((prev) => ({
      ...prev,
      categories: prev.categories.includes(id)
        ? prev.categories.filter((c) => c !== id)
        : [...prev.categories, id],
    }));
  }

  const isCustom = settings.source === "custom";
  const needsCategory = isCustom && settings.categories.length === 0;
  const isPresetCount = (
    QUIZ_CUP_QUESTION_COUNTS as readonly number[]
  ).includes(settings.questionCount);
  const maxEnergy = quizCupStartingEnergy(settings.questionCount);

  const sourceLabel = QUIZ_CUP_SOURCES.find(
    (s) => s.id === settings.source,
  )?.label;
  const categoryLabels = QUIZ_CUP_CATEGORIES.filter((c) =>
    settings.categories.includes(c.id),
  ).map((c) => c.label);
  const summary: {
    icon: LucideIcon;
    label: string;
    value: ReactNode;
    /** Full-width content under the row, for values too long to sit beside the label. */
    detail?: ReactNode;
  }[] = [
    { icon: Layers, label: "รูปแบบคำถาม", value: sourceLabel },
    ...(isCustom
      ? [
          {
            icon: LayoutGrid,
            label: "หมวดที่เลือก",
            detail: categoryLabels.length > 0 && (
              <ul className="flex flex-wrap gap-1.5">
                {categoryLabels.map((label) => (
                  <li
                    key={label}
                    className="caption rounded-full border border-dashed border-white/40 px-2.5 py-0.5 text-neutral-200"
                  >
                    {label}
                  </li>
                ))}
              </ul>
            ),
            value:
              categoryLabels.length > 0 ? (
                `${categoryLabels.length} หมวด`
              ) : (
                <span className="text-primary-300">ยังไม่ได้เลือก</span>
              ),
          },
        ]
      : []),
    {
      icon: Gauge,
      label: "ความยาก",
      value: QUIZ_CUP_DIFFICULTY_SETTINGS.find(
        (d) => d.id === settings.difficulty,
      )?.label,
    },
    {
      icon: ListOrdered,
      label: "จำนวนคำถาม",
      value: `${settings.questionCount} ข้อ`,
    },
    {
      icon: Zap,
      label: "Energy ต่อคน",
      value: `${maxEnergy} Energy`,
    },
    {
      icon: Timer,
      label: "เวลาตอบต่อข้อ",
      value: `${settings.secondsPerQuestion} วินาที`,
    },
    ...(SHOW_MAX_PLAYERS
      ? [
          {
            icon: Users,
            label: "ผู้เล่นสูงสุด",
            value: `${settings.maxPlayers} คน`,
          },
        ]
      : []),
  ];

  return (
    <div className="relative flex h-dvh w-full flex-col overflow-hidden text-white">
      <QuizCupBackground />

      <nav className="relative z-20 container mx-auto flex items-center justify-between p-4">
        <Button
          variant="outline"
          className="bg-transparent px-6 text-white!"
          onClick={onBack}
        >
          <ChevronLeft className="size-4" />
          กลับ
        </Button>

        <div className="inline-flex items-center gap-2">
          <SoundToggle size="default" />
          <Button variant="outline" className="bg-transparent px-6 text-white!">
            TH
            <Globe className="size-4" />
          </Button>
        </div>
      </nav>

      <div className="relative z-10 mx-auto grid min-h-0 w-full max-w-7xl flex-1 gap-6 overflow-y-auto px-4 pb-4 sm:px-8 sm:pb-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:overflow-hidden">
        <div className="flex flex-col gap-6 lg:min-h-0 lg:overflow-y-auto lg:pr-2">
          <Board>
            <BoardTitle
              icon={Layers}
              title="รูปแบบคำถาม"
              hint="เลือกว่าจะดึงคำถามจากไหน"
            />
            <div className="grid gap-3 sm:grid-cols-3">
              {QUIZ_CUP_SOURCES.map((source) => (
                <ChalkOption
                  key={source.id}
                  selected={settings.source === source.id}
                  onClick={() => update("source", source.id)}
                  className="justify-start rounded-3xl py-3 sm:justify-center sm:py-5"
                >
                  <span className="flex items-center gap-3 text-left sm:flex-col sm:gap-2 sm:text-center">
                    <ChalkIcon icon={source.icon} className="size-8" />
                    <span className="flex flex-col sm:gap-2">
                      <span className="font-display heading-5">
                        {source.label}
                      </span>
                      <span className="caption text-neutral-300">
                        {source.description}
                      </span>
                    </span>
                  </span>
                </ChalkOption>
              ))}
            </div>

            {isCustom && (
              <div className="mt-6">
                <BoardTitle
                  icon={LayoutGrid}
                  title="เลือกหมวดวิชา"
                  hint="เลือกได้หลายหมวด อย่างน้อย 1 หมวด"
                  action={
                    <div className="flex items-center gap-3">
                      <span className="body-2 text-neutral-300">
                        เลือกแล้ว {settings.categories.length} หมวด
                      </span>
                      {settings.categories.length > 0 && (
                        <button
                          type="button"
                          onClick={() => update("categories", [])}
                          className="body-2 cursor-pointer text-white underline decoration-dashed underline-offset-4"
                        >
                          ล้างทั้งหมด
                        </button>
                      )}
                    </div>
                  }
                />
                <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4">
                  {QUIZ_CUP_CATEGORIES.map((category) => {
                    const checked = settings.categories.includes(category.id);
                    return (
                      <label
                        key={category.id}
                        className={cn(
                          "group/field-label relative flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl px-3 py-2 transition-colors",
                          checked
                            ? "bg-primary/20"
                            : "bg-white/5 hover:bg-white/10",
                        )}
                      >
                        <ChalkFrame active={checked} className="rounded-2xl" />
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleCategory(category.id)}
                        />
                        <ChalkIcon icon={category.icon} className="size-5" />
                        <span className="body-2 relative leading-tight">
                          {category.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </Board>

          <Board>
            <SettingRow
              icon={Gauge}
              title="ความยาก"
              hint={
                settings.difficulty === "random"
                  ? "คละง่าย ปานกลาง ยาก อย่างละเท่า ๆ กัน"
                  : undefined
              }
              options={QUIZ_CUP_DIFFICULTY_SETTINGS.map((d) => ({
                value: d.id,
                label: (
                  <>
                    {d.bars == null ? (
                      <Shuffle className="size-4" aria-hidden />
                    ) : (
                      <DifficultyBars filled={d.bars} />
                    )}
                    <span className="body-2">{d.label}</span>
                  </>
                ),
              }))}
              value={settings.difficulty}
              onChange={(v) => update("difficulty", v)}
            />
            <SettingRow
              icon={ListOrdered}
              title="จำนวนคำถาม"
              hint={`กำหนดเองได้ ${QUIZ_CUP_QUESTION_MIN}–${QUIZ_CUP_QUESTION_MAX} ข้อ`}
              options={QUIZ_CUP_QUESTION_COUNTS.map((n) => ({
                value: n,
                label: <span className="body-2">{n} ข้อ</span>,
              }))}
              value={settings.questionCount}
              onChange={(v) => update("questionCount", v)}
              extra={
                <CountStepper
                  value={settings.questionCount}
                  active={!isPresetCount}
                  onChange={(v) => update("questionCount", v)}
                />
              }
            />
            <SettingRow
              icon={Timer}
              title="เวลาตอบต่อข้อ"
              options={QUIZ_CUP_SECONDS_PER_QUESTION.map((n) => ({
                value: n,
                label: <span className="body-2">{n} วินาที</span>,
              }))}
              value={settings.secondsPerQuestion}
              onChange={(v) => update("secondsPerQuestion", v)}
            />
            {SHOW_MAX_PLAYERS && (
              <SettingRow
                icon={Users}
                title="ผู้เล่นสูงสุด"
                hint="ไม่นับ Host"
                options={QUIZ_CUP_MAX_PLAYERS.map((n) => ({
                  value: n,
                  label: <span className="body-2">{n} คน</span>,
                }))}
                value={settings.maxPlayers}
                onChange={(v) => update("maxPlayers", v)}
              />
            )}
          </Board>

          <Board>
            <button
              type="button"
              aria-expanded={moreOpen}
              onClick={() => setMoreOpen((open) => !open)}
              className="flex w-full cursor-pointer items-center gap-3 text-left"
            >
              <ChalkIcon icon={Settings2} className="size-7" />
              <span className="font-display heading-5 flex-1">
                ตั้งค่าเพิ่มเติม
                <span className="body-2 ml-2 font-sans text-neutral-300">
                  (ไม่บังคับ)
                </span>
              </span>
              <ChevronDown
                className={cn(
                  "size-6 transition-transform",
                  moreOpen && "rotate-180",
                )}
              />
            </button>
            {moreOpen && (
              <div className="mt-2 divide-y divide-dashed divide-white/20">
                <SwitchRow
                  label="สลับลำดับตัวเลือก"
                  hint="ตัวเลือกแต่ละข้อจะไม่อยู่ที่เดิม"
                  checked={settings.shuffleChoices}
                  onCheckedChange={(v) => update("shuffleChoices", v)}
                />
                <SwitchRow
                  label="เฉลยหลังจบแต่ละข้อ"
                  hint="แสดงคำตอบที่ถูกก่อนไปข้อถัดไป"
                  checked={settings.revealAnswer}
                  onCheckedChange={(v) => update("revealAnswer", v)}
                />
                <SwitchRow
                  label="โบนัสตอบเร็ว"
                  hint="ยิ่งตอบเร็ว ยิ่งได้คะแนนมาก"
                  checked={settings.speedBonus}
                  onCheckedChange={(v) => update("speedBonus", v)}
                />
              </div>
            )}
          </Board>
        </div>

        <aside className="flex flex-col gap-4 lg:min-h-0 lg:justify-between">
          <Board className="lg:min-h-0 lg:overflow-y-auto">
            <BoardTitle icon={ListOrdered} title="สรุปการตั้งค่า" />
            <dl className="divide-y divide-dashed divide-white/20">
              {summary.map((row) => (
                <div key={row.label} className="py-2.5">
                  <div className="flex items-start gap-3">
                    <row.icon className="mt-0.5 size-5 shrink-0 text-neutral-300" />
                    <dt className="body-2 flex-1 whitespace-nowrap text-neutral-300">
                      {row.label}
                    </dt>
                    <dd className="body-2 text-right font-semibold">
                      {row.value}
                    </dd>
                  </div>
                  {row.detail && <dd className="mt-2 pl-8">{row.detail}</dd>}
                </div>
              ))}
            </dl>
          </Board>

          <div className="flex flex-col gap-2">
            <Button
              size="xl"
              className="w-full"
              disabled={needsCategory || submitting}
              onClick={() => onSubmit?.(settings)}
            >
              <Play data-icon="inline-start" />
              {submitting ? "กำลังเริ่มเกม..." : "เริ่มเล่นเกม"}
            </Button>
            {needsCategory && (
              <p className="caption text-primary-300 text-center">
                เลือกอย่างน้อย 1 หมวดเพื่อเริ่มเกม
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default QuizCupSetting;
