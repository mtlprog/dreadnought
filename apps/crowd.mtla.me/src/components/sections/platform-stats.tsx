"use client";

import type { PlatformStats } from "@/app/api/stats/route";
import { useEffect, useState } from "react";
import CountUp from "react-countup";

export function PlatformStatsSection() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check cache first
    const cachedStats = localStorage.getItem("platform-stats");
    const cachedTime = localStorage.getItem("platform-stats-time");

    const now = Date.now();
    const cacheAge = cachedTime ? now - parseInt(cachedTime) : Infinity;

    // Use cache if less than 60 seconds old
    if (cachedStats && cacheAge < 60000) {
      setStats(JSON.parse(cachedStats));
    } else {
      // Fetch fresh data
      fetch("/api/stats")
        .then((res) => res.json())
        .then((data) => {
          setStats(data);
          localStorage.setItem("platform-stats", JSON.stringify(data));
          localStorage.setItem("platform-stats-time", now.toString());
        })
        .catch((err) => console.error("Failed to load stats:", err));
    }

    // Trigger animation when component mounts
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  if (!stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-12 max-w-5xl mx-auto">
        {[1, 2, 3].map((i) => (
          <div key={i} className="text-center space-y-2">
            <div className="h-16 bg-border animate-pulse" />
            <div className="h-6 bg-border/50 animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-8 md:gap-12 max-w-6xl mx-auto px-4">
      {/* Total Funded */}
      <div className="text-center space-y-2 md:space-y-3 group hover:scale-105 transition-transform duration-300 min-w-0">
        <div className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-black text-primary font-mono tabular-nums break-words">
          {isVisible
            ? (
              <CountUp
                end={stats.totalFunded}
                duration={2.5}
                separator=","
              />
            )
            : (
              "0"
            )}
        </div>
        <div className="text-xs sm:text-sm md:text-base font-mono text-muted-foreground uppercase tracking-wider px-2">
          СОБРАНО <span className="text-primary block sm:inline">(EURMTL)</span>
        </div>
      </div>

      {/* Total Supporters */}
      <div className="text-center space-y-2 md:space-y-3 group hover:scale-105 transition-transform duration-300 min-w-0">
        <div className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-black text-secondary font-mono tabular-nums break-words">
          {isVisible ? <CountUp end={stats.totalSupporters} duration={2.5} /> : (
            "0"
          )}
        </div>
        <div className="text-xs sm:text-sm md:text-base font-mono text-muted-foreground uppercase tracking-wider px-2">
          ПОДДЕРЖАЛИ
        </div>
      </div>

      {/* Total Projects */}
      <div className="text-center space-y-2 md:space-y-3 group hover:scale-105 transition-transform duration-300 min-w-0">
        <div className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-black text-foreground font-mono tabular-nums break-words">
          {isVisible ? <CountUp end={stats.totalProjects} duration={2.5} /> : (
            "0"
          )}
        </div>
        <div className="text-xs sm:text-sm md:text-base font-mono text-muted-foreground uppercase tracking-wider px-2">
          ПРОЕКТОВ
        </div>
      </div>
    </div>
  );
}
