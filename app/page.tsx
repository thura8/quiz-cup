import { QUIZ_CUP_BACKGROUND, QUIZ_CUP_LOGO } from "@/constants/quiz-cup";
import { LayoutGrid, MonitorPlay, Smartphone } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

function Entry({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-start gap-4 rounded-2xl border border-white/15 bg-black/60 p-5 text-left backdrop-blur transition-colors hover:bg-black/75"
    >
      <span className="bg-primary/25 flex size-11 shrink-0 items-center justify-center rounded-xl">
        {icon}
      </span>
      <span>
        <span className="font-display heading-5 block">{title}</span>
        <span className="body-2 text-neutral-300">{description}</span>
      </span>
    </Link>
  );
}

export default function Home() {
  return (
    <main
      className="relative flex min-h-dvh w-full items-center justify-center bg-cover bg-center p-6 text-white"
      style={{ backgroundImage: `url(${QUIZ_CUP_BACKGROUND})` }}
    >
      <div aria-hidden className="absolute inset-0 bg-black/55" />
      <div className="relative flex w-full max-w-md flex-col items-center gap-6">
        <Image src={QUIZ_CUP_LOGO} alt="Quiz Cup" width={260} height={140} priority className="h-auto w-56" />
        <p className="body-2 text-center text-neutral-300">
          UI playground · ข้อมูลจำลองทั้งหมด ไม่ต่อ backend / LINE
        </p>
        <div className="flex w-full flex-col gap-3">
          <Entry
            href="/host"
            icon={<MonitorPlay className="size-5" />}
            title="Host (จอใหญ่)"
            description="ล็อบบี้ + QR → ตั้งค่า → เวที 3D → เฉลย → โพเดียม บอทเข้าห้องและตอบเอง"
          />
          <Entry
            href="/player"
            icon={<Smartphone className="size-5" />}
            title="Player (มือถือ)"
            description="ใส่ชื่อ → รอ → ตอบ / เดิมพัน / Tactic → ผลแต่ละข้อ → สรุป"
          />
          <Entry
            href="/gallery"
            icon={<LayoutGrid className="size-5" />}
            title="Gallery"
            description="ทุกหน้าจอแบบนิ่ง เลือกดูทีละสถานะ"
          />
        </div>
      </div>
    </main>
  );
}
