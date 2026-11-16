"use client";

import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import { cn } from "cn";

function Switch({ className, ...props }: SwitchPrimitive.Root.Props) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "data-[checked]:border-primary-500 data-[checked]:bg-primary-500 inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-white/40 bg-transparent p-0.5 transition-colors outline-none",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="size-4 rounded-full bg-white transition-transform data-[checked]:translate-x-5"
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
