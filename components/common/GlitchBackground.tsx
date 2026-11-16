"use client";

import { cn } from "@/lib/utils";
import Image from "next/image";
import { type ReactNode } from "react";

const GLITCH_ROWS = 120;

type Props =
  | {
      src: string;
      imageClassName?: string;
      children?: never;
    }
  | { src?: never; imageClassName?: never; children: ReactNode };

function Fade({ children }: { children: ReactNode }) {
  return (
    <div className="absolute inset-0 flex flex-col items-start self-stretch bg-black/60 opacity-50">
      {children}
    </div>
  );
}

function TVGlitches({ children }: { children: ReactNode }) {
  return (
    <div className="flex w-full flex-col items-start self-stretch">
      {children}
    </div>
  );
}

function TVGlitch({ className }: { className: string }) {
  return <div className={cn("h-2 w-full self-stretch", className)} />;
}

const GlitchBackground = ({ src, imageClassName, children }: Props) => {
  const glitches = Array.from({ length: GLITCH_ROWS });

  return (
    <div className="absolute inset-0 overflow-hidden">
      {src ? (
        <Image
          src={src}
          alt=""
          fill
          priority
          className={cn("object-cover", imageClassName)}
        />
      ) : (
        children
      )}

      <Fade>
        {glitches.map((_, index) => (
          <TVGlitches key={index}>
            <TVGlitch className="bg-black/20" />
            <TVGlitch className="bg-black/10" />
          </TVGlitches>
        ))}
      </Fade>
    </div>
  );
};

export default GlitchBackground;
