"use client";

import { DoorOpen, Globe, QrCode } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import QRCode from "react-qr-code";
import SoundToggle from "../common/SoundToggle";
import { Button } from "../ui/button";

type Props = {
  showLabels?: boolean;
  onLeave?: () => void;
  onLanguageToggle?: () => void;
  qrValue?: string;
};

const BalloonNav = ({
  showLabels = true,
  onLeave,
  onLanguageToggle,
  qrValue,
}: Props) => {
  const [qrOpen, setQrOpen] = useState(false);

  return (
    <nav className="relative z-30 container mx-auto flex items-center justify-between p-4">
      <Image
        src="/brand/logo.svg"
        alt="dd-join-joy-logo"
        width={120}
        height={120}
        loading="eager"
        className="h-auto w-full max-w-14 sm:max-w-30"
      />
      <div className="inline-flex items-center justify-center gap-2">
        <SoundToggle />
        {qrValue && (
          <div className="relative z-50">
            <Button
              variant="outline"
              size="sm"
              type="button"
              className="bg-transparent px-4 text-white!"
              aria-label="แสดง QR เข้าห้อง"
              onClick={() => setQrOpen((open) => !open)}
            >
              <QrCode className="size-4" />
            </Button>
            {qrOpen && (
              <div className="absolute top-full right-0 z-20 mt-2 rounded-xl bg-white p-3 shadow-xl">
                <QRCode value={qrValue} size={140} />
              </div>
            )}
          </div>
        )}
        <Button
          variant="outline"
          size="sm"
          type="button"
          className="border-red-500 bg-transparent px-4 text-red-500!"
          onClick={onLeave}
        >
          {showLabels && "ออกจากเกม"}
          <DoorOpen
            className="size-4 text-red-500"
            strokeWidth={showLabels ? undefined : 3}
          />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="bg-transparent px-4 text-white!"
          onClick={onLanguageToggle}
        >
          {showLabels && "TH"}
          <Globe className="size-4" />
        </Button>
      </div>
    </nav>
  );
};

export default BalloonNav;
