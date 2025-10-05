import * as React from "react";

import { cn } from "@dreadnought/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  readonly placeholder?: string; // Explicit property to avoid empty object type
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }: Readonly<InputProps>, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-12 w-full border-2 border-border bg-input px-4 py-3 text-lg font-mono text-foreground ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
