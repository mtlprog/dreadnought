import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center font-bold uppercase tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border-2",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-accent border-primary transition-all duration-200",
        destructive:
          "bg-destructive text-destructive-foreground hover:opacity-90 border-destructive transition-all duration-200",
        outline:
          "border-border bg-background hover:bg-destructive hover:text-white hover:border-destructive transition-all duration-200",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-destructive hover:text-white border-secondary transition-all duration-200",
        ghost: "border-transparent hover:bg-destructive hover:text-white transition-all duration-200",
        link:
          "text-primary underline-offset-4 hover:underline hover:text-destructive border-transparent transition-all duration-200",
      },
      size: {
        default: "h-12 px-8 py-3 text-lg",
        sm: "h-10 px-6 py-2 text-base",
        lg: "h-16 px-12 py-4 text-xl",
        icon: "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants>
{
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, asChild = false, ...props }: Readonly<ButtonProps>,
    ref: Readonly<React.Ref<HTMLButtonElement>>,
  ) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
