import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

import { ChalkFrame, ChoiceBadge } from "../QuizCupChalk";

type Props = {
  choices: string[];
  hiddenChoices: number[];
  selectedChoice: number | null;
  locked: boolean;
  onSelect: (index: number) => void;
};

export default function ChoiceList({ choices, hiddenChoices, selectedChoice, locked, onSelect }: Props) {
  return (
    <div className="flex flex-col gap-2">
      {choices.map((text, index) => {
        const hidden = hiddenChoices.includes(index);
        const selected = selectedChoice === index;
        const interactive = !locked && !hidden;
        return (
          <button
            key={index}
            type="button"
            disabled={locked || hidden}
            aria-pressed={selected}
            onClick={() => onSelect(index)}
            className={cn(
              "relative flex min-h-14 items-center gap-3 rounded-2xl px-3 py-2 text-left transition-[background-color,opacity,transform]",
              selected ? "bg-primary/30" : "bg-black/65",
              interactive && "cursor-pointer active:scale-[0.98]",
              interactive && !selected && "hover:bg-black/50",
              hidden && "opacity-30",
              locked && !selected && !hidden && "opacity-50",
            )}
          >
            <ChalkFrame active={selected} className={cn("rounded-2xl", !selected && "border-white/80")} />
            <ChoiceBadge index={index} />
            <span className={cn("body-1 relative flex-1 font-semibold", hidden && "line-through")}>{text}</span>
            {selected && <Check className="text-primary relative size-6 shrink-0" strokeWidth={3} />}
          </button>
        );
      })}
    </div>
  );
}
