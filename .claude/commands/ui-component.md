Create UI component: $ARGUMENTS

Design and implement retrofuturistic UI component:

DESIGN REQUIREMENTS:
- Large, oversized elements (min 48px touch targets)
- ZERO border-radius (except loaders)
- High contrast colors only (black/white/green/cyan)
- Monospace fonts for data
- Angular, sharp edges
- Terminal/cathode display aesthetic

STRUCTURE:
```tsx
"use client"

import { cn } from "@dreadnought/utils/cn"
import { Effect } from "effect"

export interface ComponentProps {
  className?: string
  size?: "sm" | "default" | "lg" | "xl"
}

export function Component({ className, size = "default" }: ComponentProps) {
  // Use Effect-based hooks if needed
  return (
    <div className={cn(
      "border-2 border-cyber-green bg-deep-black text-stark-white",
      "font-mono uppercase tracking-wider",
      sizes[size],
      className
    )}>
      {/* Content */}
    </div>
  )
}
```

Include hover states, loading states, and error states.
Use text indicators over icons where possible.
