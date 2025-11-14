"use client";

import { PRESET_ACCOUNTS } from "@/types";
import { Input, Label } from "@dreadnought/ui";
import { useState } from "react";

interface AccountSelectorProps {
  value: string;
  onChange: (accountId: string) => void;
}

export function AccountSelector({ value, onChange }: AccountSelectorProps) {
  const [isCustom, setIsCustom] = useState(
    !PRESET_ACCOUNTS.some((acc) => acc.id === value),
  );

  const handlePresetChange = (presetId: string) => {
    if (presetId === "custom") {
      setIsCustom(true);
      onChange("");
    } else {
      setIsCustom(false);
      onChange(presetId);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="account-preset" className="text-sm font-mono uppercase mb-2 block">
          Select Account
        </Label>
        <select
          id="account-preset"
          value={isCustom ? "custom" : value}
          onChange={(e) => handlePresetChange(e.target.value)}
          className="w-full border-2 border-border bg-background text-foreground p-3 font-mono text-sm uppercase focus:outline-none focus:border-primary"
        >
          {PRESET_ACCOUNTS.map((account) => (
            <option key={account.id} value={account.id}>
              {account.label}
            </option>
          ))}
          <option value="custom">Custom Account ID</option>
        </select>
      </div>

      {isCustom && (
        <div>
          <Label htmlFor="custom-account" className="text-sm font-mono uppercase mb-2 block">
            Enter Account ID
          </Label>
          <Input
            id="custom-account"
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="G..."
            className="w-full font-mono"
          />
        </div>
      )}
    </div>
  );
}
