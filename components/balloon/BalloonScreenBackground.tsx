"use client";

const SCANLINE: Record<8 | 16, string> = {
  8: "bg-[repeating-linear-gradient(to_bottom,#00000033_0px,#00000033_8px,#0000001A_8px,#0000001A_16px)]",
  16: "bg-[repeating-linear-gradient(to_bottom,#00000033_0px,#00000033_16px,#0000001A_16px,#0000001A_32px)]",
};

const GRADIENT_DIRECTION: Record<"0deg" | "180deg", string> = {
  "0deg": "bg-[linear-gradient(0deg,#222A2C_0%,#3A3F45_100%)]",
  "180deg": "bg-[linear-gradient(180deg,#222A2C_0%,#3A3F45_100%)]",
};

type Props = {
  image?: string;
  variant?: "room" | "compact" | "plain";
  gradientDirection?: keyof typeof GRADIENT_DIRECTION;
  scanlineSize?: keyof typeof SCANLINE;
};

const BalloonScreenBackground = ({
  image = "/balloon/bg-black.jpg",
  variant = "room",
  gradientDirection = "0deg",
  scanlineSize = 8,
}: Props) => {
  if (variant === "compact") {
    return (
      <>
        <div
          className={`absolute inset-0 ${GRADIENT_DIRECTION[gradientDirection]}`}
        />
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-60"
          style={{ backgroundImage: `url(${image})` }}
        />
        <div
          className={`pointer-events-none absolute inset-0 w-full ${SCANLINE[scanlineSize]}`}
        />
      </>
    );
  }

  return (
    <>
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${image})` }}
      />
      {variant === "room" && (
        <>
          <div className="absolute inset-0 bg-[linear-gradient(0deg,#222A2C_0%,#3A3F45_100%)] opacity-40" />
          <div className="absolute inset-0 bg-[linear-gradient(0deg,#00000099_20%,#00000000_100%)] opacity-60" />
        </>
      )}
      <div
        className={`pointer-events-none absolute inset-0 w-full ${SCANLINE[scanlineSize]}`}
      />
    </>
  );
};

export default BalloonScreenBackground;
