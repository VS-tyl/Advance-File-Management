"use client";

import type React from "react";
import { createPortal } from "react-dom";

export function DialogShell(props: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  widthClass?: string;
}) {
  if (typeof window === "undefined") return null;
  const { title, children, onClose, widthClass } = props;
  return createPortal(
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-3 sm:px-4 backdrop-blur-2xl animate-[fadeInUp_0.2s_ease-out]">
      <div
        className={[
          "max-h-[80vh] w-full overflow-hidden rounded-2xl border border-white/[0.08] bg-[rgba(28,28,30,0.95)] p-4 text-xs text-[#f5f5f7] shadow-[0_30px_80px_rgba(0,0,0,0.6),0_0_1px_rgba(255,255,255,0.1)] backdrop-blur-3xl sm:p-5",
          widthClass ?? "w-full max-w-xl",
        ].join(" ")}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-[12px] font-semibold uppercase tracking-[0.2em] text-[#a1a1a6]">
              {title}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-white/[0.08] bg-[rgba(44,44,46,0.9)] text-[11px] text-[#636366] transition-all duration-200 hover:border-[#22c55e]/30 hover:text-[#22c55e]"
          >
            ✕
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto pr-1">{children}</div>
      </div>
    </div>,
    document.body
  );
}
