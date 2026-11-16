"use client";

import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import { cn } from "cn";
import { CheckIcon } from "lucide-react";

function Checkbox({ className, ...props }: CheckboxPrimitive.Root.Props) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 data-checked:border-primary-500 data-checked:bg-primary-500 group-has-focus-visible/field-label:data-checked:border-primary-500 relative flex size-4.5 shrink-0 items-center justify-center rounded-[3px] border-2 border-white bg-transparent transition-shadow outline-none group-has-focus-visible/field-label:ring-0 group-has-focus-visible/field-label:not-data-checked:border-white after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:ring-[3px] focus-visible:ring-white/50 aria-invalid:ring-[3px] data-checked:text-white data-disabled:cursor-not-allowed data-disabled:border-neutral-300 data-disabled:bg-neutral-200 data-disabled:data-checked:border-neutral-300 data-disabled:data-checked:bg-neutral-300 data-disabled:data-checked:text-neutral-700",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid size-full place-content-center text-current transition-none"
      >
        <CheckIcon className="size-full! text-black" strokeWidth={4} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
