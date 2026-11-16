"use client";

import { CSSProperties, useId, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
};

const RoughText = ({ children, className, style }: Props) => {
  const filterId = `rough-text-${useId().replace(/:/g, "")}`;

  return (
    <span
      className={className}
      style={{ filter: `url(#${filterId})`, ...style }}
    >
      {children}
      <svg width="0" height="0" className="absolute">
        <defs>
          <filter
            id={filterId}
            x="-10%"
            y="-50%"
            width="120%"
            height="200%"
            filterUnits="objectBoundingBox"
            primitiveUnits="userSpaceOnUse"
            colorInterpolationFilters="sRGB"
          >
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.9"
              numOctaves="3"
              seed="3440"
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="2.5"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>
    </span>
  );
};

export default RoughText;
