"use client";

import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { isValidStellarAccountId } from "@/lib/stellar-validation";
import { cn } from "@/lib/utils";
import { HelpCircle } from "lucide-react";
import React from "react";

export interface StellarAccountInputProps {
  name: string;
  label: string;
  placeholder?: string;
  description?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  allowEmpty?: boolean;
  value: string;
  onChange: (value: string) => void;
  error?: string | undefined;
  tooltip?: string;
}

export function StellarAccountInput({
  name,
  label,
  placeholder = "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  description,
  required = false,
  disabled = false,
  className,
  allowEmpty = false,
  value,
  onChange,
  error,
  tooltip,
}: StellarAccountInputProps) {
  const isEmpty = value === "";
  const isValid = !isEmpty && isValidStellarAccountId(value);
  const hasError = error !== undefined || (!isEmpty && !isValid)
    || (!allowEmpty && isEmpty && required === true);

  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <label
          className={cn(
            "block text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
            required && "after:content-['*'] after:ml-0.5 after:text-red-500",
          )}
        >
          {label}
        </label>
        {tooltip !== undefined && (
          <Tooltip delayDuration={200}>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center justify-center w-4 h-4 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-colors"
                aria-label="Show help information"
                tabIndex={0}
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              align="start"
              className="max-w-xs font-mono text-xs border-primary"
            >
              <p>{tooltip}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {description !== undefined && <p className="text-sm text-muted-foreground mt-1">{description}</p>}

      <Input
        name={name}
        type="text"
        placeholder={placeholder}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          hasError && "border-red-500 focus-visible:ring-red-500",
          "font-mono text-sm mt-2",
        )}
        spellCheck={false}
        autoComplete="off"
      />

      {error !== undefined && <p className="text-sm text-red-500 mt-1">{error}</p>}

      {isValid === true && (
        <p className="text-sm text-green-600 mt-1">
          ✓ Valid Stellar account ID
        </p>
      )}
    </div>
  );
}
