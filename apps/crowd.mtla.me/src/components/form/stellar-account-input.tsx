"use client";

import { Input } from "@/components/ui/input";
import { isValidStellarAccountId } from "@/lib/stellar-validation";
import { cn } from "@/lib/utils";
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
}: StellarAccountInputProps) {
  const isEmpty = value === "";
  const isValid = !isEmpty && isValidStellarAccountId(value);
  const hasError = error || (!isEmpty && !isValid) || (!allowEmpty && isEmpty && required);

  return (
    <div className={className}>
      <label
        className={cn(
          "block text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
          required && "after:content-['*'] after:ml-0.5 after:text-red-500",
        )}
      >
        {label}
      </label>

      {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}

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

      {error && <p className="text-sm text-red-500 mt-1">{error}</p>}

      {isValid && (
        <p className="text-sm text-green-600 mt-1">
          ✓ Valid Stellar account ID
        </p>
      )}
    </div>
  );
}
