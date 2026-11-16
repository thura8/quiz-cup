"use client";

import { cn } from "@/lib/utils";
import {
  type ComponentPropsWithoutRef,
  type ElementType,
  type FC,
  type HTMLAttributes,
  type ReactNode,
  type Ref,
  forwardRef,
  useId,
  useMemo,
} from "react";

interface ChalkEffectProps extends ComponentPropsWithoutRef<"input"> {
  as?: ElementType;
  children?: ReactNode;
  className?: string;
  variant?: "chalk" | "sketch" | "chalk-soft" | "icon";
}

export const ChalkEffect = forwardRef<HTMLElement, ChalkEffectProps>(
  function ChalkEffect(
    {
      as: Tag = "span",
      children,
      className,
      variant = "chalk",
      style,
      ...rest
    },
    ref,
  ) {
    const reactId = useId();
    const filterId = `chalk-effect-${reactId.replace(/:/g, "")}`;

    const filterDefs = useMemo(
      () => (
        <svg
          aria-hidden="true"
          focusable="false"
          className="pointer-events-none absolute h-0 w-0 overflow-hidden"
        >
          <defs>
            <filter
              id={filterId}
              x="-20%"
              y="-20%"
              width="140%"
              height="140%"
              filterUnits="objectBoundingBox"
              colorInterpolationFilters="sRGB"
            >
              {variant === "sketch" ? (
                <>
                  <feTurbulence
                    type="fractalNoise"
                    baseFrequency="0.5 0.5"
                    numOctaves="2"
                    seed="170"
                    result="sketchNoise"
                  />
                  <feDisplacementMap
                    in="SourceGraphic"
                    in2="sketchNoise"
                    scale="2"
                    xChannelSelector="R"
                    yChannelSelector="G"
                  />
                </>
              ) : variant === "icon" ? (
                <>
                  <feTurbulence
                    type="fractalNoise"
                    baseFrequency="0.9"
                    numOctaves="2"
                    seed="42"
                    result="iconNoise"
                  />
                  <feDisplacementMap
                    in="SourceGraphic"
                    in2="iconNoise"
                    scale="0.9"
                    xChannelSelector="R"
                    yChannelSelector="G"
                  />
                </>
              ) : (
                <>
                  <feTurbulence
                    type="fractalNoise"
                    baseFrequency="0.4"
                    numOctaves="2"
                    seed="12"
                    result="chalkNoise"
                  />
                  <feDisplacementMap
                    in="SourceGraphic"
                    in2="chalkNoise"
                    scale={variant === "chalk-soft" ? "2.1" : "6"}
                    xChannelSelector="R"
                    yChannelSelector="G"
                    result="chalkDisplaced"
                  />

                  <feTurbulence
                    type="fractalNoise"
                    baseFrequency="1"
                    numOctaves="2"
                    seed="7"
                    result="chalkGrainNoise"
                  />
                  <feColorMatrix
                    in="chalkGrainNoise"
                    type="matrix"
                    values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.33 0.33 0.33 0 0"
                    result="chalkGrainAlpha"
                  />
                  <feComponentTransfer
                    in="chalkGrainAlpha"
                    result="chalkGrainSoft"
                  >
                    <feFuncA
                      type="linear"
                      slope={variant === "chalk-soft" ? "0.2" : "0.35"}
                      intercept="0"
                    />
                  </feComponentTransfer>
                  <feComposite
                    in="chalkGrainSoft"
                    in2="chalkDisplaced"
                    operator="in"
                    result="chalkGrainMasked"
                  />
                  <feBlend
                    in="chalkGrainMasked"
                    in2="chalkDisplaced"
                    mode="multiply"
                  />
                </>
              )}
            </filter>
          </defs>
        </svg>
      ),
      [filterId, variant],
    );

    // @react-three/fiber adds three.js elements (<mesh> …) to JSX, so rendering a bare
    // ElementType collapses its props to `never`; render it as a plain HTML component.
    const Element = Tag as FC<HTMLAttributes<HTMLElement> & { ref?: Ref<HTMLElement> }>;

    return (
      <>
        {filterDefs}
        <Element
          ref={ref}
          className={cn(Tag === "span" && "inline-block", className)}
          style={{ filter: `url(#${filterId})`, ...style }}
          {...rest}
        >
          {children}
        </Element>
      </>
    );
  },
);
