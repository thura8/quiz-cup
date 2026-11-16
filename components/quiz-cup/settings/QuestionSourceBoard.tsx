"use client";

import { Layers, LayoutGrid } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import { QUIZ_CUP_CATEGORIES, QUIZ_CUP_SOURCES } from "@/constants/quiz-cup";
import { cn } from "@/lib/utils";
import type { QuizCupCategoryId, QuizCupSettings } from "@/types/quiz-cup";

import { Board, ChalkFrame, ChalkIcon } from "../QuizCupChalk";
import { BoardTitle, ChalkOption } from "./SettingControls";
import type { UpdateSetting } from "./types";

type Props = {
  settings: QuizCupSettings;
  update: UpdateSetting;
  onToggleCategory: (id: QuizCupCategoryId) => void;
};

function SourceOptions({ settings, update }: Pick<Props, "settings" | "update">) {
  return (
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
              <span className="font-display heading-5">{source.label}</span>
              <span className="caption text-neutral-300">{source.description}</span>
            </span>
          </span>
        </ChalkOption>
      ))}
    </div>
  );
}

function CategoryPicker({ settings, update, onToggleCategory }: Props) {
  const selectedCount = settings.categories.length;

  return (
    <div className="mt-6">
      <BoardTitle
        icon={LayoutGrid}
        title="เลือกหมวดวิชา"
        hint="เลือกได้หลายหมวด อย่างน้อย 1 หมวด"
        action={
          <div className="flex items-center gap-3">
            <span className="body-2 text-neutral-300">เลือกแล้ว {selectedCount} หมวด</span>
            {selectedCount > 0 && (
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
                checked ? "bg-primary/20" : "bg-white/5 hover:bg-white/10",
              )}
            >
              <ChalkFrame active={checked} className="rounded-2xl" />
              <Checkbox checked={checked} onCheckedChange={() => onToggleCategory(category.id)} />
              <ChalkIcon icon={category.icon} className="size-5" />
              <span className="body-2 relative leading-tight">{category.label}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

export default function QuestionSourceBoard(props: Props) {
  return (
    <Board>
      <BoardTitle icon={Layers} title="รูปแบบคำถาม" hint="เลือกว่าจะดึงคำถามจากไหน" />
      <SourceOptions settings={props.settings} update={props.update} />
      {props.settings.source === "custom" && <CategoryPicker {...props} />}
    </Board>
  );
}
