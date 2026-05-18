"use client";

import type React from "react";
import { GlassFilter } from "@/components/ui/liquid-glass";

interface LiquidShellProps {
  children: React.ReactNode;
}

export function LiquidShell({ children }: LiquidShellProps) {
  return (
    <div className="min-h-screen h-full w-full relative overflow-hidden flex items-stretch justify-center bg-[#0a0a0a]">
      <GlassFilter />

      <div className="pointer-events-none absolute inset-0 -z-20 bg-[#0a0a0a]" />

      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 15% 5%, rgba(34,197,94,0.06) 0%, transparent 60%)," +
            "radial-gradient(ellipse 50% 40% at 85% 95%, rgba(34,197,94,0.04) 0%, transparent 55%)",
        }}
      />

      <div
        className="pointer-events-none absolute -z-10"
        style={{
          width: "800px",
          height: "800px",
          top: "40%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(34,197,94,0.07) 0%, rgba(22,163,74,0.03) 40%, transparent 70%)",
          filter: "blur(80px)",
        }}
      />

      <div className="flex min-h-screen w-full items-stretch justify-center px-1 py-1 sm:px-4 sm:py-6 lg:px-8 lg:py-8">
        <div className="relative flex h-full w-full max-w-10xl items-stretch overflow-hidden rounded-[28px] border border-white/[0.08] bg-[rgba(28,28,30,0.72)] backdrop-blur-[80px] shadow-[0_40px_120px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.05),inset_0_1px_0_rgba(34,197,94,0.04)]">
          {children}
        </div>
      </div>
    </div>
  );
}
