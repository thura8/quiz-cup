import type { ReactNode } from "react";

export default function SectionLabel({ title, aside }: { title: string; aside?: ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between px-1">
      <p className="font-display subtitle">{title}</p>
      {aside}
    </div>
  );
}
