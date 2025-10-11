"use client";

import { Card } from "@/components/ui/card";
import React from "react";

interface FilterTogglePanelProps {
  hideIlliquidTokens: boolean;
  onHideIlliquidTokensChange: (value: boolean) => void;
}

export function FilterTogglePanel({ hideIlliquidTokens, onHideIlliquidTokensChange }: FilterTogglePanelProps) {
  return (
    <Card className="p-4 border-0 bg-card text-card-foreground">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="text-sm font-mono uppercase tracking-wider text-steel-gray">ФИЛЬТРЫ:</span>

          {/* Hide Illiquid Tokens Toggle */}
          <label className="flex items-center gap-3 cursor-pointer group">
            <div className="relative">
              <input
                type="checkbox"
                checked={hideIlliquidTokens}
                onChange={(e) => onHideIlliquidTokensChange(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-steel-gray/30 border-2 border-steel-gray peer-checked:bg-cyber-green/20 peer-checked:border-cyber-green transition-colors duration-200" />
              <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-steel-gray peer-checked:bg-cyber-green peer-checked:translate-x-5 transition-transform duration-200" />
            </div>
            <span className="text-sm font-mono uppercase tracking-wider text-foreground group-hover:text-cyber-green transition-colors">
              СКРЫТЬ НЕЛИКВИДНЫЕ ТОКЕНЫ
            </span>
          </label>
        </div>

        {/* Info indicator */}
        {hideIlliquidTokens && (
          <div className="text-xs font-mono text-warning-amber uppercase tracking-wider">
            ФИЛЬТР АКТИВЕН
          </div>
        )}
      </div>
    </Card>
  );
}
