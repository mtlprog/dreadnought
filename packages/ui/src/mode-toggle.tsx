"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useState } from "react";

const themes = [
  { value: "light", label: "LIGHT", icon: Sun },
  { value: "dark", label: "DARK", icon: Moon },
  { value: "system", label: "SYSTEM", icon: Monitor },
] as const;

export function ModeToggle() {
  const { theme: currentTheme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (theme: "light" | "dark" | "system") => {
    setIsOpen(false);
    setTheme(theme);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="!h-12 !w-12 !min-w-[3rem] flex-shrink-0 border-2 border-border bg-background/90 backdrop-blur-sm text-foreground hover:border-primary hover:bg-primary/10 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 flex items-center justify-center cursor-pointer"
        aria-label="Toggle theme"
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
            {themes.map((theme) => {
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
