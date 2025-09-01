"use client";

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { StrKey } from "@stellar/stellar-sdk";
import React from "react";
import { type FieldPath, type FieldValues } from "react-hook-form";

export interface StellarAccountInputProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> {
  name: TName;
  label: string;
  placeholder?: string;
  description?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  allowEmpty?: boolean;
}

export function StellarAccountInput<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  name,
  label,
  placeholder = "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  description,
  required = false,
  disabled = false,
  className,
  allowEmpty = false,
}: StellarAccountInputProps<TFieldValues, TName>) {
  return (
    <FormField
      name={name}
      render={({ field }) => {
        const currentValue = field.value ?? "";
        const isEmpty = currentValue === "";

        // Validation state
        let hasError = false;

        if (!isEmpty && !StrKey.isValidEd25519PublicKey(currentValue)) {
          hasError = true;
        } else if (!allowEmpty && isEmpty && required) {
          hasError = true;
        }

        return (
          <FormItem className={className}>
            <FormLabel className={cn(required === true && "after:content-['*'] after:ml-0.5 after:text-red-500")}>
              {label}
            </FormLabel>

            {description !== undefined && description !== null && description !== "" && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}

            <FormControl>
              <Input
                {...field}
                type="text"
                placeholder={placeholder}
                disabled={disabled}
                className={cn(
                  hasError && "border-red-500 focus-visible:ring-red-500",
                  "font-mono text-sm",
                )}
                spellCheck={false}
                autoComplete="off"
              />
            </FormControl>

            <FormMessage />

            {currentValue !== "" && StrKey.isValidEd25519PublicKey(currentValue) && (
              <p className="text-sm text-green-600">
                ✓ Valid Stellar account ID
              </p>
            )}
          </FormItem>
        );
      }}
    />
  );
}

export default StellarAccountInput;
