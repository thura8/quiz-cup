import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import type { Metadata, Viewport } from "next";
import { Kanit, Noto_Sans_Thai, Sriracha } from "next/font/google";
import "./globals.css";

const notoSansThai = Noto_Sans_Thai({
  subsets: ["latin", "thai"],
  variable: "--font-noto-sans-thai",
});

const sriracha = Sriracha({
  subsets: ["latin", "thai"],
  weight: "400",
  variable: "--font-sriracha",
});

/** Chunky game-show lettering for the host stage (Thai + Latin). */
const kanit = Kanit({
  subsets: ["latin", "thai"],
  weight: ["600", "800"],
  variable: "--font-kanit",
});

export const viewport: Viewport = {
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: { default: "Quiz Cup UI", template: "%s · Quiz Cup UI" },
  description: "Quiz Cup UI playground with mock data.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="th"
      className={cn("h-full", "antialiased", "font-sans", notoSansThai.variable, sriracha.variable, kanit.variable)}
    >
      <body className="flex min-h-full flex-col">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
