"use client";

import { Minus, Plus, type LucideIcon } from "lucide-react";
import { type CSSProperties, type ReactNode, useState } from "react";

import { Switch } from "@/components/ui/switch";
import { QUIZ_CUP_QUESTION_MAX, QUIZ_CUP_QUESTION_MIN, clampQuestionCount } from "@/constants/quiz-cup";
import { cn } from "@/lib/utils";

import { ChalkFrame, ChalkIcon } from "../QuizCupChalk";

export function BoardTitle({
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

export function ChalkOption({
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

export function SettingRow<T extends string | number>({
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

export function CountStepper({
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

export function SwitchRow({
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
