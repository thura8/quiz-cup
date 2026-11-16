"use client";

import { useId } from "react";

type Props = {
  color?: string;
  className?: string;
};

const AvatarBorder = ({ color = "#FB623D", className }: Props) => {
  const filterId = `avatar-border-${useId().replace(/:/g, "")}`;

  return (
    <svg
      viewBox="-12 -12 144 144"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <filter
          id={filterId}
          x="-20"
          y="-20"
          width="160"
          height="160"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.25"
            numOctaves="3"
            seed="6895"
          />
          <feDisplacementMap
            in="SourceGraphic"
            scale="8"
            xChannelSelector="R"
            yChannelSelector="G"
            result="displacedImage"
            width="100%"
            height="100%"
          />
        </filter>
      </defs>

      <rect
        x="8"
        y="8"
        width="104"
        height="104"
        rx="52"
        stroke={color}
        strokeWidth="8"
        filter={`url(#${filterId})`}
      />
    </svg>
  );
};

export default AvatarBorder;
