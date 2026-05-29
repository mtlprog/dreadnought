"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function DashboardLink({ href }: { href: string }) {
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

function BackToDashboardInner() {
  const searchParams = useSearchParams();
  const date = searchParams.get("date");
  const href = date !== null ? `/?date=${encodeURIComponent(date)}` : "/";

  return <DashboardLink href={href} />;
}

export function BackToDashboard() {
  return (
    <Suspense fallback={<DashboardLink href="/" />}>
      <BackToDashboardInner />
    </Suspense>
  );
}
