import { QUIZ_CUP_WAGERS } from "@/constants/quiz-cup";
import { cn } from "@/lib/utils";

import { Board, ChalkFrame } from "../QuizCupChalk";
import SectionLabel from "./SectionLabel";

type Props = {
  wager: number;
  outcome: { ifRight: number; ifWrong: number };
  locked: boolean;
  onChange: (wager: number) => void;
};

export default function WagerPicker({ wager, outcome, locked, onChange }: Props) {
  return (
    <Board className="bg-black/65 p-3 sm:p-3">
      <SectionLabel
        title="เดิมพัน"
        aside={
          <p className="caption">
            <span className="text-green-300">ถูก +{outcome.ifRight}</span>
            <span className="mx-1.5 text-neutral-500">/</span>
            <span className="text-primary-300">ผิด −{outcome.ifWrong}</span>
          </p>
        }
      />
      <div className="grid grid-cols-3 gap-2">
        {QUIZ_CUP_WAGERS.map((value) => {
          const active = wager === value;
          return (
            <button
              key={value}
              type="button"
              disabled={locked}
              aria-pressed={active}
              onClick={() => onChange(value)}
              className={cn(
                "relative h-11 rounded-2xl transition-[background-color,transform]",
                active ? "bg-highlight-yellow font-semibold text-black" : "bg-white/5",
                !locked && "cursor-pointer active:scale-95",
                !locked && !active && "hover:bg-white/10",
              )}
            >
              {!active && <ChalkFrame className="rounded-2xl border-white/70" />}
              <span className="body-1 relative">{value === 0 ? "ไม่เดิมพัน" : value}</span>
            </button>
          );
        })}
      </div>
    </Board>
  );
}
