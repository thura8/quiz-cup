"use client";

import { cn } from "cn";
import Image from "next/image";

type Props = {
  src: string;
  name: string;
  bg: string;
  sizeClassName?: string;
  imageSize?: number;
  draggable?: boolean;
};

const AvatarCircle = ({
  src,
  name,
  bg,
  sizeClassName = "size-14 sm:size-16",
  imageSize = 128,
  draggable,
}: Props) => {
  return (
    <div
      className={cn("relative shrink-0 overflow-hidden rounded-full", sizeClassName)}
      style={{ backgroundColor: bg }}
    >
      <Image
        src={src}
        alt={`AVATAR-${name}`}
        width={imageSize}
        height={imageSize}
        draggable={draggable}
        className="size-full object-cover"
      />
    </div>
  );
};

export default AvatarCircle;
