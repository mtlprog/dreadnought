"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function BackToDashboardInner() {
  const searchParams = useSearchParams();
  const date = searchParams.get("date");
  const href = date != null ? `/?date=${encodeURIComponent(date)}` : "/";

  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-electric-cyan hover:text-cyber-green transition-colors"
    >
      <ArrowLeft className="h-3 w-3" />
      BACK TO DASHBOARD
    </Link>
  );
}

export function BackToDashboard() {
  return (
    <Suspense fallback={
      <Link
        href="/"
        className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-electric-cyan hover:text-cyber-green transition-colors"
      >
        <ArrowLeft className="h-3 w-3" />
        BACK TO DASHBOARD
      </Link>
    }>
      <BackToDashboardInner />
    </Suspense>
  );
}
