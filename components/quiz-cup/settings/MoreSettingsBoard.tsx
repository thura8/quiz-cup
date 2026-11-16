"use client";

import { ChevronDown, Settings2 } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";
import type { QuizCupSettings } from "@/types/quiz-cup";

import { Board, ChalkIcon } from "../QuizCupChalk";
import { SwitchRow } from "./SettingControls";
import type { UpdateSetting } from "./types";

export default function MoreSettingsBoard({
  settings,
  update,
}: {
  settings: QuizCupSettings;
  update: UpdateSetting;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Board>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((isOpen) => !isOpen)}
        className="flex w-full cursor-pointer items-center gap-3 text-left"
      >
        <ChalkIcon icon={Settings2} className="size-7" />
        <span className="font-display heading-5 flex-1">
          ตั้งค่าเพิ่มเติม
          <span className="body-2 ml-2 font-sans text-neutral-300">(ไม่บังคับ)</span>
        </span>
        <ChevronDown className={cn("size-6 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="mt-2 divide-y divide-dashed divide-white/20">
          <SwitchRow
            label="สลับลำดับตัวเลือก"
            hint="ตัวเลือกแต่ละข้อจะไม่อยู่ที่เดิม"
            checked={settings.shuffleChoices}
            onCheckedChange={(checked) => update("shuffleChoices", checked)}
          />
          <SwitchRow
            label="เฉลยหลังจบแต่ละข้อ"
            hint="แสดงคำตอบที่ถูกก่อนไปข้อถัดไป"
            checked={settings.revealAnswer}
            onCheckedChange={(checked) => update("revealAnswer", checked)}
          />
          <SwitchRow
            label="โบนัสตอบเร็ว"
            hint="ยิ่งตอบเร็ว ยิ่งได้คะแนนมาก"
            checked={settings.speedBonus}
            onCheckedChange={(checked) => update("speedBonus", checked)}
          />
        </div>
      )}
    </Board>
  );
}
