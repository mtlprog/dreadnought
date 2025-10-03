"use client";

import { runClientEffect } from "@/lib/runtime";
import { getThemeEffect, setThemeEffect, type Theme } from "@/services/settings-client";
import { Effect, pipe } from "effect";
import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

const THEMES: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "LIGHT", icon: Sun },
  { value: "dark", label: "DARK", icon: Moon },
  { value: "system", label: "AUTO", icon: Monitor },
];

export function ThemeSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<Theme>("dark");

  useEffect(() => {
    const program = pipe(
      getThemeEffect(),
      Effect.tap((theme) => Effect.sync(() => setCurrentTheme(theme))),
    );

    void runClientEffect(program);
  }, []);

  const handleSelect = (theme: Theme) => {
    setIsOpen(false);
    setCurrentTheme(theme);

    const program = pipe(
      setThemeEffect(theme),
      Effect.tap(() => Effect.log(`Theme changed to: ${theme}`)),
    );

    // Use View Transitions API if available for smooth animation
    if (document.startViewTransition !== undefined) {
      document.startViewTransition(async () => {
        await runClientEffect(program);
        // Apply theme class immediately for smooth transition
        if (theme === "dark") {
          document.documentElement.classList.add("dark");
        } else if (theme === "light") {
          document.documentElement.classList.remove("dark");
        } else {
          // System theme detection
          const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
          if (isDark) {
            document.documentElement.classList.add("dark");
          } else {
            document.documentElement.classList.remove("dark");
          }
        }
      });
    } else {
      void runClientEffect(program).then(() => {
        // Fallback without View Transitions
        if (theme === "dark") {
          document.documentElement.classList.add("dark");
        } else if (theme === "light") {
          document.documentElement.classList.remove("dark");
        } else {
          const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
          if (isDark) {
            document.documentElement.classList.add("dark");
          } else {
            document.documentElement.classList.remove("dark");
          }
        }
      });
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="h-12 w-12 border-2 border-border bg-background/90 backdrop-blur-sm text-foreground hover:border-primary hover:bg-primary/10 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 flex items-center justify-center cursor-pointer"
        aria-label="Select theme"
      >
        <Sun className="w-5 h-5 dark:hidden transition-all duration-300" />
        <Moon className="w-5 h-5 hidden dark:block transition-all duration-300" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-32 border-2 border-border bg-background shadow-[0_0_20px_rgba(105,240,174,0.2)] z-50">
            {THEMES.map((theme) => {
              const Icon = theme.icon;
              return (
                <button
                  key={theme.value}
                  onClick={() => handleSelect(theme.value)}
                  className={`w-full h-10 px-4 text-xs font-bold uppercase tracking-wider transition-all duration-200 border-b border-border last:border-b-0 flex items-center gap-2 ${
                    currentTheme === theme.value
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground hover:bg-primary hover:text-primary-foreground"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {theme.label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
