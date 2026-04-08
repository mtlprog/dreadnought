"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useEffect } from "react";

interface ErrorPageProps {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}

export default function ProjectErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error("[crowd.mtla.me] project page error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-6">
        <div className="mb-8">
          <h1 className="text-6xl font-black text-destructive uppercase tracking-tighter mb-4">
            500
          </h1>
          <h2 className="text-2xl font-bold text-foreground uppercase mb-4">
            PROJECT LOAD FAILED
          </h2>
          <p className="text-lg font-mono text-muted-foreground mb-4">
            The project exists, but we couldn&apos;t reach the data source right now.
          </p>
          <p className="text-sm font-mono text-muted-foreground mb-8">
            This is usually a transient Stellar Horizon or IPFS gateway hiccup. Try again in a moment.
          </p>
          {error.digest !== undefined && (
            <p className="text-xs font-mono text-muted-foreground break-all mb-8">
              REF: {error.digest}
            </p>
          )}
        </div>

        <div className="space-y-4">
          <Button
            size="lg"
            className="w-full text-xl py-4"
            onClick={() => reset()}
          >
            RETRY
          </Button>

          <Link href="/">
            <Button
              size="lg"
              variant="outline"
              className="w-full text-xl py-4"
            >
              BACK TO PROJECTS
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
