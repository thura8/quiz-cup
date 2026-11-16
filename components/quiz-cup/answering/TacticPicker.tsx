import { Zap } from "lucide-react";

import { QUIZ_CUP_TACTICS } from "@/constants/quiz-cup";
import { cn } from "@/lib/utils";
import type { QuizCupTacticId } from "@/types/quiz-cup";

import { Board, ChalkFrame, ChalkIcon } from "../QuizCupChalk";
import SectionLabel from "./SectionLabel";

type TacticInfo = (typeof QUIZ_CUP_TACTICS)[number];

function EnergyMeter({ energy, maxEnergy, pendingCost }: { energy: number; maxEnergy: number; pendingCost: number }) {
  return (
    <div className="flex items-center gap-1.5" aria-label={`Energy เหลือ ${energy} จาก ${maxEnergy}`}>
      <Zap className="text-highlight-yellow size-4 fill-current" />
      <span className="body-2 mr-1 font-semibold tabular-nums">{energy - pendingCost}</span>
      {Array.from({ length: maxEnergy }, (_, i) => (
        <span
          key={i}
          className={cn(
            "size-2.5 rounded-full border-2",
            i >= energy
              ? "border-white/30"
              : i >= energy - pendingCost
                ? "border-highlight-yellow animate-pulse"
                : "border-highlight-yellow bg-highlight-yellow",
          )}
        />
      ))}
    </div>
  );
}

function tacticHint(usedTactic: TacticInfo | undefined, energy: number) {
  if (usedTactic) return usedTactic.description;
  return energy > 0 ? "ข้อละ 1 Tactic เปลี่ยนได้ หัก Energy ตอนยืนยันคำตอบ" : "Energy หมดแล้ว";
}

type Props = {
  tactic: QuizCupTacticId | null;
  usedTactic: TacticInfo | undefined;
  energy: number;
  maxEnergy: number;
  pendingCost: number;
  locked: boolean;
  fiftyUsed: boolean;
  onPick: (id: QuizCupTacticId) => void;
};

export default function TacticPicker({
  tactic,
  usedTactic,
  energy,
  maxEnergy,
  pendingCost,
  locked,
  fiftyUsed,
  onPick,
}: Props) {
  return (
    <Board className="bg-black/65 p-3 sm:p-3">
      <SectionLabel
        title="Tactic"
        aside={<EnergyMeter energy={energy} maxEnergy={maxEnergy} pendingCost={pendingCost} />}
      />
      <div className="grid grid-cols-3 gap-2">
        {QUIZ_CUP_TACTICS.map((item) => {
          const active = tactic === item.id;
          const disabled = locked || fiftyUsed || (!active && energy < item.cost);
          return (
            <button
              key={item.id}
              type="button"
              disabled={disabled}
              aria-pressed={active}
              onClick={() => onPick(item.id)}
              className={cn(
                "relative flex flex-col items-center gap-1 rounded-2xl px-2 py-2.5 transition-[background-color,opacity,transform]",
                active ? "bg-primary/30" : "bg-white/5",
                !disabled && "cursor-pointer active:scale-95",
                !disabled && !active && "hover:bg-white/10",
                disabled && !active && "opacity-35",
              )}
            >
              <ChalkFrame active={active} className={cn("rounded-2xl", !active && "border-white/70")} />
              <ChalkIcon icon={item.icon} className="size-6" />
              <span className="body-2 relative font-semibold">{item.label}</span>
              <span className="caption relative inline-flex items-center gap-0.5 text-neutral-300">
                <Zap className="size-3" />
                {item.cost} Energy
              </span>
            </button>
          );
        })}
      </div>
      <p className="caption mt-2 min-h-[1.5em] text-center text-neutral-300">{tacticHint(usedTactic, energy)}</p>
    </Board>
  );
}
